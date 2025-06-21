const Endpoint = require('../models/Endpoint');
const Api = require('../models/api');
const ResourceController = require('./resourceController');
const Resource = require('../models/resource');

class EndpointController {
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
    const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];
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
        console.log(req.body);
      const { api_id, path, methods, description, mock_enabled, mock_count, faker_seed, schema } = req.body;
      if (!api_id || !path || !methods) {
        return res.status(400).json({ error: 'API ID, path, and methods are required' });
      }
      EndpointController.validateMethods(methods);
      if (schema) {
        EndpointController.validateSchema(schema);
      }
      console.log('Creating endpoint with schema:', schema);
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
        schema
      });
      
      // Generate mock data if mock_enabled is true and mock_count is provided
      let resources = [];
      if (mock_enabled && mock_count > 0 && schema) {
        const mockData = ResourceController.generateMockData(schema, mock_count, faker_seed);
        for (const data of mockData) {
          const resource = await Resource.create({ endpoint_id: endpoint.id, data });
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
      const { path, methods, description, mock_enabled, mock_count, faker_seed, schema } = req.body;
      const endpoint = await Endpoint.findById(req.params.id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const api = await Api.findById(endpoint.api_id);
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      if (methods) {
        EndpointController.validateMethods(methods);
      }
      if (schema) {
        EndpointController.validateSchema(schema);
      }
      const updatedEndpoint = await Endpoint.update(req.params.id, {
        path,
        methods,
        description,
        mock_enabled,
        mock_count,
        faker_seed,
        schema
      });
      res.json(updatedEndpoint);
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