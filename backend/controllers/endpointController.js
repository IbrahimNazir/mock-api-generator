const Endpoint = require('../models/Endpoint');
const Api = require('../models/Api');
const ResourceController = require('./resourceController');
const Resource = require('../models/Resource');
const { concatenateAndDeleteNestedKey } = require('../utils/filterData');
const { STYLES: PAGINATION_STYLES } = require('../utils/pagination');

class EndpointController {
  /**
   * Validate the optional per-endpoint pagination configuration:
   * { default_style?, default_limit?, max_limit?, always_paginate? }
   */
  static validatePaginationConfig(config) {
    if (config === undefined || config === null) return;
    if (typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('pagination_config must be an object');
    }
    const allowed = ['default_style', 'default_limit', 'max_limit', 'always_paginate'];
    for (const key of Object.keys(config)) {
      if (!allowed.includes(key)) {
        throw new Error('Unknown pagination_config key: ' + key + '. Allowed: ' + allowed.join(', '));
      }
    }
    const { default_style, default_limit, max_limit, always_paginate } = config;
    if (default_style !== undefined && !PAGINATION_STYLES.includes(default_style)) {
      throw new Error('pagination_config.default_style must be one of ' + PAGINATION_STYLES.join(', '));
    }
    for (const [key, val] of Object.entries({ default_limit, max_limit })) {
      if (val !== undefined && (!Number.isInteger(val) || val < 1 || val > 1000)) {
        throw new Error('pagination_config.' + key + ' must be an integer between 1 and 1000');
      }
    }
    if (default_limit !== undefined && max_limit !== undefined && default_limit > max_limit) {
      throw new Error('pagination_config.default_limit must not exceed max_limit');
    }
    if (always_paginate !== undefined && typeof always_paginate !== 'boolean') {
      throw new Error('pagination_config.always_paginate must be a boolean');
    }
  }

  static validateSchema(schema) {
    if (!schema) return; // Schema is optional
    if (typeof schema !== 'object' || schema === null) {
      throw new Error('Schema must be a valid JSON object');
    }
    try {
      JSON.stringify(schema); // Ensure schema is JSON-serializable
    } catch (error) {
      throw new Error('Schema must be valid JSON: ' + error.message);
    }
    if (!schema.type) {
      throw new Error('Schema must have a "type" field');
    }
    const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null', 'relationship'];
    if (!validTypes.includes(schema.type)) {
      throw new Error(`Invalid type: ${schema.type}`);
    }
    if (schema.type === 'object' && schema.properties) {
      Object.values(schema.properties).forEach(prop => EndpointController.validateSchema(prop));
    }
    if (schema.type === 'array' && schema.items) {
      EndpointController.validateSchema(schema.items);
    }
  }

  static validateMethods(methods) {
    if (!Array.isArray(methods) || methods.length === 0) {
      throw new Error('Methods must be a non-empty array');
    }
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    for (const method of methods) {
      if (!validMethods.includes(method.toUpperCase())) {
        throw new Error(`Invalid HTTP method: ${method}`);
      }
    }
    try {
      JSON.stringify(methods); // Ensure methods is JSON-serializable
    } catch (error) {
      throw new Error('Methods must be valid JSON: ' + error.message);
    }
  }

  static async createEndpoint(req, res) {
    try {
      const { api_id, path, methods, description, mock_enabled, mock_count, faker_seed, schema, pagination_config } = req.body;
      if (!api_id || !path || !methods) {
        return res.status(400).json({ error: 'API ID, path, and methods are required' });
      }
      EndpointController.validateMethods(methods);
      if (schema) {
        EndpointController.validateSchema(schema);
      }
      EndpointController.validatePaginationConfig(pagination_config);
      const api = await Api.findById(api_id);
      if (!api) {
        return res.status(404).json({ error: 'API not found' });
      }
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const endpoint = await Endpoint.create({
        api_id,
        path,
        methods,
        description,
        mock_enabled,
        mock_count,
        faker_seed,
        schema,
        pagination_config
      });
      
      // Generate mock data if mock_enabled is true and mock_count is provided
      let resources = [];
      if (mock_enabled && mock_count > 0 && schema) {
        const mockData = await ResourceController.generateMockData(schema, mock_count, faker_seed);
        for (const data of mockData) {
          const parentResourceIds = concatenateAndDeleteNestedKey(data, 'parentResourceIds' );
          const resource = await Resource.create({ endpoint_id: endpoint.id, data, parent_resource_Ids: parentResourceIds });
          resources.push(resource);
        }
      }
      
      res.status(201).json({ endpoint, resources });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getEndpoint(req, res) {
    try {
      const endpoint = await Endpoint.findById(req.params.id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const api = await Api.findById(endpoint.api_id);
      if (!api.is_public && api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      res.json(endpoint);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getEndpointsByApi(req, res) {
    try {
      const api = await Api.findById(req.params.apiId);
      if (!api) {
        return res.status(404).json({ error: 'API not found' });
      }
      if (!api.is_public && api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const endpoints = await Endpoint.findByApiId(req.params.apiId);
      res.json(endpoints);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateEndpoint(req, res) {
    try {
      const { api_id, path, methods, description, mock_enabled, mock_count, faker_seed, schema, pagination_config } = req.body;
      // Validate required fields
      if (!api_id || !path || !methods) {
        return res.status(400).json({ error: 'API ID, path, and methods are required' });
      }

      // Validate methods and schema
      EndpointController.validateMethods(methods);
      if (schema) {
        EndpointController.validateSchema(schema);
      }
      EndpointController.validatePaginationConfig(pagination_config);
      // Check if endpoint exists
      const endpoint = await Endpoint.findById(req.params.id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }

      // Verify API exists and user authorization
      const api = await Api.findById(api_id);
      if (!api) {
        return res.status(404).json({ error: 'API not found' });
      }
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Update endpoint
      const updatedEndpoint = await Endpoint.update(req.params.id, {
        api_id,
        path,
        methods,
        description,
        mock_enabled,
        mock_count,
        faker_seed,
        schema,
        pagination_config
      });

      // Delete existing resources
      await Resource.deleteByEndpointId(endpoint.id);

      // Generate new mock data if enabled
      let resources = [];
      if (mock_enabled && mock_count > 0 && schema) {
        const mockData = await ResourceController.generateMockData(schema, mock_count, faker_seed);
        for (const data of mockData) {
          const parentResourceIds = concatenateAndDeleteNestedKey(data, 'parentResourceIds');
          const resource = await Resource.create({ 
            endpoint_id: endpoint.id, 
            data, 
            parent_resource_Ids: parentResourceIds 
          });
          resources.push(resource);
        }
      }

      res.status(200).json({ endpoint: updatedEndpoint, resources });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
}

  static async deleteEndpoint(req, res) {
    try {
      const endpoint = await Endpoint.findById(req.params.id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const api = await Api.findById(endpoint.api_id);
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      await Endpoint.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = EndpointController;