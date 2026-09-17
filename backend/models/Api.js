const { query, pool } = require('../db/db');
const { HttpError } = require('../utils/httpError');

const UNIQUE_VIOLATION = '23505';

/** Translate a unique-index violation into a 409 the API layer can return. */
function translateUniqueError(error, { base_path, version }) {
  if (error && error.code === UNIQUE_VIOLATION) {
    if (error.constraint === 'uq_apis_default_per_base_path') {
      return new HttpError(409, 'DEFAULT_VERSION_EXISTS', `Another version of ${base_path} is already the default`);
    }
    return new HttpError(409, 'API_VERSION_EXISTS', `API ${base_path} already has a version ${version}`);
  }
  return error;
}

class Api {
  static async create({ user_id, name, version, description, base_path, is_public, is_default, deprecated, sunset_at }) {
    const text = `
      INSERT INTO apis (user_id, name, version, description, base_path, is_public, is_default, deprecated, sunset_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;
    const values = [user_id, name, version, description, base_path, is_public ?? true, is_default ?? false, deprecated ?? false, sunset_at ?? null];
    try {
      const result = await query(text, values);
      return result.rows[0];
    } catch (error) {
      throw translateUniqueError(error, { base_path, version });
    }
  }

  static async findById(id) {
    const text = 'SELECT * FROM apis WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const text = 'SELECT * FROM apis ORDER BY created_at DESC';
    const result = await query(text);
    return result.rows;
  }

  static async findByUserId(user_id) {
    const text = 'SELECT * FROM apis WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await query(text, [user_id]);
    return result.rows;
  }

  /** Every version of the API mounted at /:username/:base_path. */
  static async findVersionsByUsernameAndBasePath(username, base_path) {
    const text = `
      SELECT a.*
      FROM apis a
      JOIN users u ON a.user_id = u.id
      WHERE u.username = $1 AND a.base_path = $2
      ORDER BY a.created_at ASC
    `;
    const result = await query(text, [username, base_path]);
    return result.rows;
  }

  /** Every version sharing (user_id, base_path) with the given API row. */
  static async findVersionsOf(api) {
    const text = 'SELECT * FROM apis WHERE user_id = $1 AND base_path = $2 ORDER BY created_at ASC';
    const result = await query(text, [api.user_id, api.base_path]);
    return result.rows;
  }

  static async update(id, { name, version, description, base_path, is_public, is_default, deprecated, sunset_at }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (is_default === true) {
        // Only one default per (user_id, base_path); demote siblings first.
        await client.query(`
          UPDATE apis SET is_default = FALSE
          WHERE is_default = TRUE AND id <> $1
            AND (user_id, base_path) = (SELECT user_id, base_path FROM apis WHERE id = $1)
        `, [id]);
      }
      const text = `
        UPDATE apis
        SET name = COALESCE($1, name),
            version = COALESCE($2, version),
            description = COALESCE($3, description),
            base_path = COALESCE($4, base_path),
            is_public = COALESCE($5, is_public),
            is_default = COALESCE($6, is_default),
            deprecated = COALESCE($7, deprecated),
            sunset_at = CASE WHEN $9::boolean THEN $8::timestamptz ELSE sunset_at END,
            updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `;
      const values = [
        name, version, description, base_path, is_public, is_default, deprecated,
        sunset_at === undefined ? null : sunset_at, sunset_at !== undefined, id,
      ];
      const result = await client.query(text, values);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw translateUniqueError(error, { base_path: base_path || '(unchanged)', version: version || '(unchanged)' });
    } finally {
      client.release();
    }
  }

  /**
   * Create a new version of an existing API by cloning its endpoints (and,
   * optionally, their resources) in a single transaction.
   */
  static async createVersion(source, { version, description, is_public, is_default, clone_resources }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (is_default) {
        await client.query(
          'UPDATE apis SET is_default = FALSE WHERE user_id = $1 AND base_path = $2 AND is_default = TRUE',
          [source.user_id, source.base_path],
        );
      }
      const apiResult = await client.query(`
        INSERT INTO apis (user_id, name, version, description, base_path, is_public, is_default, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        source.user_id, source.name, version, description ?? source.description,
        source.base_path, is_public ?? source.is_public, is_default ?? false,
      ]);
      const api = apiResult.rows[0];

      const endpoints = (await client.query('SELECT * FROM endpoints WHERE api_id = $1 ORDER BY created_at ASC', [source.id])).rows;
      const clonedEndpoints = [];
      let resourceCount = 0;
      for (const ep of endpoints) {
        const epResult = await client.query(`
          INSERT INTO endpoints (api_id, path, methods, description, mock_enabled, mock_count, faker_seed, schema, pagination_config, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING *
        `, [api.id, ep.path, ep.methods, ep.description, ep.mock_enabled, ep.mock_count, ep.faker_seed, ep.schema, ep.pagination_config]);
        const cloned = epResult.rows[0];
        clonedEndpoints.push(cloned);
        if (clone_resources) {
          const copied = await client.query(`
            INSERT INTO resources (endpoint_id, parent_resource_ids, data, created_at, updated_at)
            SELECT $1, parent_resource_ids, data, created_at, updated_at
            FROM resources WHERE endpoint_id = $2
            RETURNING id
          `, [cloned.id, ep.id]);
          resourceCount += copied.rowCount;
        }
      }
      await client.query('COMMIT');
      return { api, endpoints: clonedEndpoints, resource_count: resourceCount };
    } catch (error) {
      await client.query('ROLLBACK');
      throw translateUniqueError(error, { base_path: source.base_path, version });
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const text = 'DELETE FROM apis WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }
}

module.exports = Api;
