const Api = require('../models/Api');
const { HttpError, toResponse } = require('../utils/httpError');
const { isSemver, compareSemver } = require('../utils/version');

function sendError(res, error) {
  const { status, body } = toResponse(error);
  if (status >= 500) console.error(error);
  res.status(status).json(body);
}

/** Validate the lifecycle fields shared by create / update / createVersion. */
function validateLifecycle({ version, is_default, deprecated, sunset_at }, { requireVersion = false } = {}) {
  if (requireVersion && !version) {
    throw new HttpError(400, 'VERSION_REQUIRED', 'Version is required');
  }
  if (version !== undefined && !isSemver(version)) {
    throw new HttpError(400, 'INVALID_VERSION', 'Version must be semantic (x.y.z), e.g. 1.0.0');
  }
  for (const [key, val] of Object.entries({ is_default, deprecated })) {
    if (val !== undefined && typeof val !== 'boolean') {
      throw new HttpError(400, 'INVALID_FIELD', `${key} must be a boolean`);
    }
  }
  if (sunset_at !== undefined && sunset_at !== null && Number.isNaN(new Date(sunset_at).getTime())) {
    throw new HttpError(400, 'INVALID_FIELD', 'sunset_at must be an ISO-8601 date or null');
  }
}

class ApiController {
  static async createApi(req, res) {
    try {
      const { name, version, description, base_path, is_public, is_default, deprecated, sunset_at } = req.body;
      if (!name || !version) {
        return res.status(400).json({ error: 'Name and version are required', code: 'INVALID_FIELD' });
      }
      validateLifecycle({ version, is_default, deprecated, sunset_at });
      const api = await Api.create({
        user_id: req.user.id,
        name,
        version,
        description,
        base_path,
        is_public,
        is_default,
        deprecated,
        sunset_at,
      });
      res.status(201).json(api);
    } catch (error) {
      sendError(res, error);
    }
  }

  /** GET /apis/:id/versions — every version sharing this API's base path. */
  static async getVersions(req, res) {
    try {
      const api = await Api.findById(req.params.id);
      if (!api) {
        return res.status(404).json({ error: 'API not found', code: 'API_NOT_FOUND' });
      }
      if (!api.is_public && api.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized', code: 'FORBIDDEN' });
      }
      const versions = (await Api.findVersionsOf(api)).sort((a, b) => compareSemver(a.version, b.version));
      res.json({ base_path: api.base_path, versions });
    } catch (error) {
      sendError(res, error);
    }
  }

  /**
   * POST /apis/:id/versions — clone this API (endpoints, optionally resources)
   * into a new version under the same base path.
   * Body: { version, description?, is_public?, is_default?, clone_resources? }
   */
  static async createVersion(req, res) {
    try {
      const source = await Api.findById(req.params.id);
      if (!source) {
        return res.status(404).json({ error: 'API not found', code: 'API_NOT_FOUND' });
      }
      if (source.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized', code: 'FORBIDDEN' });
      }
      const { version, description, is_public, is_default, clone_resources } = req.body || {};
      validateLifecycle({ version, is_default }, { requireVersion: true });
      const result = await Api.createVersion(source, {
        version, description, is_public, is_default: is_default ?? false,
        clone_resources: clone_resources !== false,
      });
      res.status(201).json(result);
    } catch (error) {
      sendError(res, error);
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
      const { name, version, description, base_path, is_public, is_default, deprecated, sunset_at } = req.body || {};
      validateLifecycle({ version, is_default, deprecated, sunset_at });
      const updatedApi = await Api.update(req.params.id, {
        name, version, description, base_path, is_public, is_default, deprecated, sunset_at,
      });
      res.json(updatedApi);
    } catch (error) {
      sendError(res, error);
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