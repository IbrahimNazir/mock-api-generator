const { query } = require('../db/db');
const Resource = require('../models/Resource');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

class MockController {
  static async validateSchema(schema, data) {
    if (!schema) return true; // No schema means no validation
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      throw new Error(`Data does not match schema: ${ajv.errorsText(validate.errors)}`);
    }
    return true;
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

  static async getAllResources(req, res) {
    try {
      const { username, apiPath, endpointPath } = req.params;
      // Resolve endpoint
      const endpointQuery = `
        SELECT e.*, a.user_id, a.is_public
        FROM endpoints e
        JOIN apis a ON e.api_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE u.username = $1
          AND a.base_path = $2
          AND e.path = $3
          AND 'GET' = ANY(e.methods)
      `;
      const endpointResult = await query(endpointQuery, [username, `/${apiPath}`, `/${endpointPath}`]);
      const endpoint = endpointResult.rows[0];
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found or GET method not supported' });
      }

      // Check access
      if (!endpoint.is_public && (req.user?.id !== endpoint.user_id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Fetch resources
      const resources = await Resource.findByEndpointId(endpoint.id);
      const data = resources.map(resource => {return {  ...resource.data,id: resource.id}}); // Include resource ID in response
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getResourceById(req, res) {
    try {
      const { username, apiPath, endpointPath, resourceId } = req.params;

      // Resolve endpoint
      const endpointQuery = `
        SELECT e.*, a.user_id, a.is_public
        FROM endpoints e
        JOIN apis a ON e.api_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE u.username = $1
          AND a.base_path = $2
          AND e.path = $3
          AND 'GET' = ANY(e.methods)
      `;
      const endpointResult = await query(endpointQuery, [username, `/${apiPath}`, `/${endpointPath}`]);
      const endpoint = endpointResult.rows[0];

      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found or GET method not supported' });
      }

      // Check access
      if (!endpoint.is_public && ( req.user?.id !== endpoint.user_id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Fetch resource
      const resource = await Resource.findById(resourceId);
      if (!resource || resource.endpoint_id !== endpoint.id) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      res.json({ ...resource.data, id: resource.id});
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createResource(req, res) {
    try {
      const { username, apiPath, endpointPath } = req.params;
      const { data } = req.body;
      console.log('Creating resource with data:', data);

      if (!data) {
        return res.status(400).json({ error: 'Data is required' });
      }

      // Resolve endpoint
      const endpointQuery = `
        SELECT e.*, a.user_id, a.is_public
        FROM endpoints e
        JOIN apis a ON e.api_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE u.username = $1
          AND a.base_path = $2
          AND e.path = $3
          AND 'POST' = ANY(e.methods)
      `;
      const endpointResult = await query(endpointQuery, [username, `/${apiPath}`, `/${endpointPath}`]);
      console.log('endpointResult: ',endpointResult);
      const endpoint = endpointResult.rows[0];

      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found or POST method not supported' });
      }

      if (!endpoint.is_public && ( req.user?.id !== endpoint.user_id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Validate data against schema
      // if (endpoint.schema) {
      //   await MockController.validateSchema(endpoint.schema, data);
      // }
      console.log("Creating resource for endpoint:", endpoint.id);
      // Create resource
      const resource = await Resource.create({ endpoint_id: endpoint.id, data });
      res.status(201).json({ ...resource.data, id: resource.id});
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateResource(req, res) {
    try {
      const { username, apiPath, endpointPath, resourceId } = req.params;
      const { data } = req.body;

      if (!data) {
        return res.status(400).json({ error: 'Data is required' });
      }

      // Resolve endpoint
      const endpointQuery = `
        SELECT e.*, a.user_id, a.is_public
        FROM endpoints e
        JOIN apis a ON e.api_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE u.username = $1
          AND a.base_path = $2
          AND e.path = $3
          AND 'PUT' = ANY(e.methods)
      `;
      const endpointResult = await query(endpointQuery, [username, `/${apiPath}`, `/${endpointPath}`]);
      const endpoint = endpointResult.rows[0];

      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found or PUT method not supported' });
      }

      // Check access (only owner can update)
      if (!endpoint.is_public && (req.user?.id !== endpoint.user_id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Fetch resource
      const resource = await Resource.findById(resourceId);
      if (!resource || resource.endpoint_id !== endpoint.id) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Validate data against schema
      // if (endpoint.schema) {
      //   await MockController.validateSchema(endpoint.schema, data);
      // }

      // Update resource
      const updatedResource = await Resource.update(resourceId, { data });
      res.json({ ...updatedResource.data, id: updatedResource.id});
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async patchResource(req, res) {
    try {
      const { username, apiPath, endpointPath, resourceId } = req.params;
      const { data } = req.body;

      if (!data) {
        return res.status(400).json({ error: 'Data is required' });
      }

      // Resolve endpoint
      const endpointQuery = `
        SELECT e.*, a.user_id, a.is_public
        FROM endpoints e
        JOIN apis a ON e.api_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE u.username = $1
          AND a.base_path = $2
          AND e.path = $3
          AND 'PATCH' = ANY(e.methods)
      `;
      const endpointResult = await query(endpointQuery, [username, `/${apiPath}`, `/${endpointPath}`]);
      const endpoint = endpointResult.rows[0];

      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found or PATCH method not supported' });
      }

      // // Check access (only owner can update)
      if (!endpoint.is_public && (req.user?.id !== endpoint.user_id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Fetch resource
      const resource = await Resource.findById(resourceId);
      if (!resource || resource.endpoint_id !== endpoint.id) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Merge partial data with existing data
      const mergedData = await MockController.mergeData(resource.data, data);

      // Validate merged data against schema
      // if (endpoint.schema) {
      //   await MockController.validateSchema(endpoint.schema, mergedData);
      // }

      // Update resource  
      const updatedResource = await Resource.update(resourceId, { data: mergedData });
      res.json({ ...updatedResource.data, id: resource.id});
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  static async deleteResource(req, res) {
    try {
      const { username, apiPath, endpointPath, resourceId } = req.params;

      // Resolve endpoint
      const endpointQuery = `
        SELECT e.*, a.user_id, a.is_public
        FROM endpoints e
        JOIN apis a ON e.api_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE u.username = $1
          AND a.bas e_path = $2
          AND e.path = $3
          AND 'DELETE' = ANY(e.methods)
      `;
      const endpointResult = await query(endpointQuery, [username, `/${apiPath}`, `/${endpointPath}`]);
      const endpoint = endpointResult.rows[0];

      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found or DELETE method not supported' });
      }

      // Check access (only owner can update)
      // if (!req.user || req.user.id !== endpoint.user_id) {
      //   return res.status(403).json({ error: 'Unauthorized' });
      // }

      // Fetch resource
      const resource = await Resource.findById(resourceId);
      if (!resource || resource.endpoint_id !== endpoint.id) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Validate data against schema
      // if (endpoint.schema) {
      //   await MockController.validateSchema(endpoint.schema, data);
      // }

      // Update resource
      const deletedResource = await Resource.delete(resourceId);
      res.json(deletedResource.data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = MockController;