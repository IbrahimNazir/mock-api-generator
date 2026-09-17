const Resource = require('../models/Resource');
const Validator = require('../utils/schemaValidator');
const { filterData } = require('../utils/filterData');
const { HttpError, toResponse } = require('../utils/httpError');
const { parseSort, sortItems } = require('../utils/sortData');
const { parsePaginationParams, paginate } = require('../utils/pagination');
const { resourceEtag, bodyEtag, ifNoneMatchSatisfied, assertIfMatch } = require('../utils/etag');
const { resolveMockEndpoint, appendListHeader } = require('../services/mockResolver');
const { RESERVED_QUERY_PARAMS } = require('../utils/queryParams');

// Row metadata a client may sort by even though it isn't part of the payload.
const META_FIELDS = ['id', 'created_at', 'updated_at'];

function sendError(res, error) {
  if (res.headersSent) return;
  const { status, body } = toResponse(error);
  if (status >= 500) console.error(error);
  res.status(status).json(body);
}

function present(resource) {
  return { ...resource.data, id: resource.id };
}

class MockController {

  /**
   * Validates data against a JSON schema using AJV
   * Throws formatted error if invalid
   */
  static async validateSchema(schema, data) {
    try {
      await Validator.validate(schema, data);
      return true;
    } catch (err) {
      throw new HttpError(400, 'VALIDATION_FAILED', err.message);
    }
  }

  static async mergeData(existingData, partialData) {
    // Deep merge for nested objects
    const merged = { ...existingData };
    for (const [key, value] of Object.entries(partialData)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && existingData[key]) {
        merged[key] = await MockController.mergeData(existingData[key], value);
      } else {
        merged[key] = value;
      }
    }
    return merged;
  }

  /**
   * Load a resource that belongs to the endpoint, or throw 404.
   */
  static async loadOwnedResource(endpoint, resourceId) {
    const resource = await Resource.findById(resourceId);
    if (!resource || resource.endpoint_id !== endpoint.id) {
      throw new HttpError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
    }
    return resource;
  }

  /**
   * GET /:username/:apiPath/:endpointPath
   *
   * Pipeline: fetch → filter → sort → paginate → ETag.
   * Without pagination params the response is a bare array (legacy shape);
   * with them it is `{ data, pagination, links }` (see utils/pagination.js).
   */
  static async getAllResources(req, res) {
    try {
      const { endpoint } = await resolveMockEndpoint(req, res, 'GET');

      const rows = await Resource.findByEndpointId(endpoint.id);
      const meta = new Map(rows.map(r => [r.id, r]));
      let items = rows.map(present);

      // 1. Filter (always before pagination, whatever the style)
      const hasFilters = Object.keys(req.query).some(k => !RESERVED_QUERY_PARAMS.includes(k));
      if (hasFilters) {
        items = filterData(req, res, items);
      }

      // 2. Sort (stable total order; cursors are bound to it)
      const sortFields = parseSort(req.query.sort);
      const sample = items[0];
      if (sample) {
        for (const f of sortFields) {
          if (!(f.field in sample) && !META_FIELDS.includes(f.field)) {
            throw new HttpError(400, 'INVALID_SORT', `Unknown sort field: ${f.field}`);
          }
        }
      }
      const getValue = (item, field) => (field in item ? item[field] : meta.get(item.id)?.[field]);
      items = sortItems(items, sortFields, getValue);

      // 3. Paginate
      const params = parsePaginationParams(req.query, endpoint.pagination_config);
      let body = items;
      if (params) {
        const page = paginate(items, params, {
          path: `${req.baseUrl}${req.path}`,
          query: req.query,
          sortFields,
          getValue,
        });
        body = page.body;
        for (const [name, value] of Object.entries(page.headers)) {
          if (name === 'Link') appendListHeader(res, 'Link', value);
          else res.set(name, value);
        }
      }

      // 4. Conditional GET
      const etag = bodyEtag(body);
      res.set('ETag', etag);
      if (ifNoneMatchSatisfied(req.get('If-None-Match'), etag)) {
        return res.status(304).end();
      }
      return res.json(body);
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async getResourceById(req, res) {
    try {
      const { endpoint } = await resolveMockEndpoint(req, res, 'GET');
      const resource = await MockController.loadOwnedResource(endpoint, req.params.resourceId);

      const etag = resourceEtag(resource);
      res.set('ETag', etag);
      res.set('Last-Modified', new Date(resource.updated_at).toUTCString());
      if (ifNoneMatchSatisfied(req.get('If-None-Match'), etag)) {
        return res.status(304).end();
      }
      return res.json(present(resource));
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async createResource(req, res) {
    try {
      const data = req.body;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new HttpError(400, 'BODY_REQUIRED', 'Request body must be a JSON object');
      }
      const { endpoint } = await resolveMockEndpoint(req, res, 'POST');

      // Validate data against schema
      if (endpoint.mock_enabled && endpoint.schema) {
        await MockController.validateSchema(endpoint.schema, data);
      }
      const resource = await Resource.create({ endpoint_id: endpoint.id, data });
      res.set('ETag', resourceEtag(resource));
      res.set('Location', `${req.baseUrl}${req.path.replace(/\/$/, '')}/${resource.id}`);
      return res.status(201).json(present(resource));
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async updateResource(req, res) {
    try {
      const data = req.body;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new HttpError(400, 'BODY_REQUIRED', 'Request body must be a JSON object');
      }
      const { endpoint } = await resolveMockEndpoint(req, res, 'PUT');
      const resource = await MockController.loadOwnedResource(endpoint, req.params.resourceId);

      // Optimistic concurrency: If-Match must equal the current ETag when supplied.
      assertIfMatch(req.get('If-Match'), resourceEtag(resource));

      const updatedResource = await Resource.update(resource.id, { data });
      res.set('ETag', resourceEtag(updatedResource));
      return res.json(present(updatedResource));
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async patchResource(req, res) {
    try {
      const data = req.body;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new HttpError(400, 'BODY_REQUIRED', 'Request body must be a JSON object');
      }
      const { endpoint } = await resolveMockEndpoint(req, res, 'PATCH');
      const resource = await MockController.loadOwnedResource(endpoint, req.params.resourceId);

      assertIfMatch(req.get('If-Match'), resourceEtag(resource));

      // Merge partial data with existing data
      const mergedData = await MockController.mergeData(resource.data, data);
      const updatedResource = await Resource.update(resource.id, { data: mergedData });
      res.set('ETag', resourceEtag(updatedResource));
      return res.json(present(updatedResource));
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async deleteResource(req, res) {
    try {
      const { endpoint } = await resolveMockEndpoint(req, res, 'DELETE');
      const resource = await MockController.loadOwnedResource(endpoint, req.params.resourceId);

      assertIfMatch(req.get('If-Match'), resourceEtag(resource));

      const deletedResource = await Resource.delete(resource.id);
      return res.json(present(deletedResource));
    } catch (error) {
      return sendError(res, error);
    }
  }
}

module.exports = MockController;
