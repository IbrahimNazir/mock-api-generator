const { faker } = require('@faker-js/faker');
const Endpoint = require('../models/Endpoint');
const Resource = require('../models/Resource');

class ResourceController {
  static generateMockData(schema, count, seed) {
    const data = [];
    for (let i = 0; i < count; i++) {
      if (seed) {
        faker.seed(seed+i); // Set seed for reproducible results
      }
      const mockItem = {};
      if (schema.type === 'object' && schema.properties) {
        Object.entries(schema.properties).forEach(([key, prop]) => {
          if (prop.faker) {
            const [module, method] = prop.faker.split('.');
            if (faker[module] && faker[module][method]) {
              mockItem[key] = faker[module][method]();
            } else {
              mockItem[key] = prop.default || null;
            }
          } else if (prop.type === 'object' && prop.properties) {
            mockItem[key] = ResourceController.generateMockData(prop, 1, seed+1)[0];
          } else {
            mockItem[key] = prop.default || null;
          }
        });
      }
      data.push(mockItem);
    }
    return data;
  }

  static async createMockData(req, res) {
    try {
      const { endpoint_id, count } = req.body;
      if (!endpoint_id || !count || count <= 0) {
        return res.status(400).json({ error: 'Endpoint ID and positive count are required' });
      }
      const endpoint = await Endpoint.findById(endpoint_id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      if (!endpoint.mock_enabled) {
        return res.status(400).json({ error: 'Mocking is not enabled for this endpoint' });
      }
      if (!endpoint.schema) {
        return res.status(400).json({ error: 'No schema defined for this endpoint' });
      }
      const mockData = ResourceController.generateMockData(endpoint.schema, count, endpoint.faker_seed);
      const resources = [];
      for (const data of mockData) {
        const resource = await Resource.create({ endpoint_id, data });
        resources.push(resource);
      }
      res.status(201).json(resources);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createResource(req, res) {
    try {
      const { endpoint_id, data } = req.body;
      if (!endpoint_id || !data) {
        return res.status(400).json({ error: 'Endpoint ID and data are required' });
      }
      const endpoint = await Endpoint.findById(endpoint_id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const resource = await Resource.create({ endpoint_id, data });
      res.status(201).json(resource);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getResource(req, res) {
    try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      res.json(resource);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getResourcesByEndpoint(req, res) {
    try {
      const resources = await Resource.findByEndpointId(req.params.endpointId);
      res.json(resources);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateResource(req, res) {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: 'Data is required' });
      }
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      const updatedResource = await Resource.update(req.params.id, { data });
      res.json(updatedResource);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteResource(req, res) {
    try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      await Resource.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ResourceController;