const Api = require('../models/Api');

class ApiController {
  static async createApi(req, res) {
    try {
      const { name, version, description, base_path, is_public } = req.body;
      if (!name || !version) {
        return res.status(400).json({ error: 'Name and version are required' });
      }
      const api = await Api.create({
        user_id: req.user.id,
        name,
        version,
        description,
        base_path,
        is_public,
      });
      res.status(201).json(api);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getApi(req, res) {
    try {
      const api = await Api.findById(req.params.id);
      if (!api) {
        return res.status(404).json({ error: 'API not found' });
      }
      if (!api.is_public && api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      res.json(api);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAllApis(req, res) {
    try {
      const apis = await Api.findAll();
      const accessibleApis = apis.filter(api => api.is_public || api.user_id === req.user.id);
      res.json(accessibleApis);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateApi(req, res) {
    try {
      const api = await Api.findById(req.params.id);
      if (!api) {
        return res.status(404).json({ error: 'API not found' });
      }
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const updatedApi = await Api.update(req.params.id, req.body);
      res.json(updatedApi);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteApi(req, res) {
    try {
      const api = await Api.findById(req.params.id);
      if (!api) {
        return res.status(404).json({ error: 'API not found' });
      }
      if (api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      await Api.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ApiController;