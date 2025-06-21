const Schema = require('../models/schema');
const Endpoint = require('../models/endpoint');
const Api = require('../models/api');

class SchemaController {
  static validateSchema(schema) {
    if (!schema || typeof schema !== 'object') {
      throw new Error('Schema must be a valid JSON object');
    }
    if (!schema.type) {
      throw new Error('Schema must have a "type" field');
    }
    const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];
    if (!validTypes.includes(schema.type)) {
      throw new Error(`Invalid type: ${schema.type}`);
    }
    // Add more validation as needed (e.g., format, enum, properties)
    if (schema.type === 'object' && schema.properties) {
      Object.values(schema.properties).forEach(prop => this.validateSchema(prop));
    }
    if (schema.type === 'array' && schema.items) {
      this.validateSchema(schema.items);
    }
  }

  static async createSchema(req, res) {
    try {
      const { endpoint_id, schema } = req.body;
      if (!endpoint_id || !schema) {
        return res.status(400).json({ error: 'Endpoint ID and schema are required' });
      }
      const endpoint = await Endpoint.findById(endpoint_id);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const api = await Api.findById(endpoint.api_id);
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      this.validateSchema(schema);
      const createdSchema = await Schema.create({ endpoint_id, schema });
      res.status(201).json(createdSchema);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSchema(req, res) {
    try {
      const schema = await Schema.findById(req.params.id);
      if (!schema) {
        return res.status(404).json({ error: 'Schema not found' });
      }
      const endpoint = await Endpoint.findById(schema.endpoint_id);
      const api = await Api.findById(endpoint.api_id);
      if (!api.is_public && api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      res.json(schema);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getSchemasByEndpoint(req, res) {
    try {
      const endpoint = await Endpoint.findById(req.params.endpointId);
      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const api = await Api.findById(endpoint.api_id);
      if (!api.is_public && api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const schemas = await Schema.findByEndpointId(req.params.endpointId);
      res.json(schemas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSchema(req, res) {
    try {
      const { schema } = req.body;
      if (!schema) {
        return res.status(400).json({ error: 'Schema is required' });
      }
      const existingSchema = await Schema.findById(req.params.id);
      if (!existingSchema) {
        return res.status(404).json({ error: 'Schema not found' });
      }
      const endpoint = await Endpoint.findById(existingSchema.endpoint_id);
      const api = await Api.findById(endpoint.api_id);
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      this.validateSchema(schema);
      const updatedSchema = await Schema.update(req.params.id, { schema });
      res.json(updatedSchema);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteSchema(req, res) {
    try {
      const schema = await Schema.findById(req.params.id);
      if (!schema) {
        return res.status(404).json({ error: 'Schema not found' });
      }
      const endpoint = await Endpoint.findById(schema.endpoint_id);
      const api = await Api.findById(endpoint.api_id);
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      await Schema.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SchemaController;