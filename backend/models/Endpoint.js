const { query } = require('../db/db');
const { v4: uuidv4 } = require('uuid');

class Endpoint {
  static async create({ api_id, path, methods, description, mock_enabled, mock_count, faker_seed, schema }) {
    const id = uuidv4();
    const text = `
      INSERT INTO endpoints (id, api_id, path, methods, description, mock_enabled, mock_count, faker_seed, schema, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;
    const values = [
      id,
      api_id,
      path,
      methods,
      description,
      mock_enabled,
      mock_count,
      faker_seed,
      schema ? JSON.stringify(schema) : null
    ];
    const result = await query(text, values);
    return result.rows[0];
  }

  static async findById(id) {
    const text = 'SELECT * FROM endpoints WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  static async findByApiId(api_id) {
    const text = 'SELECT * FROM endpoints WHERE api_id = $1 ORDER BY created_at DESC';
    const result = await query(text, [api_id]);
    return result.rows;
  }

  static async update(id, { path, methods, description, mock_enabled, mock_count, faker_seed, schema }) {
    const text = `
      UPDATE endpoints
      SET path = COALESCE($1, path),
          methods = COALESCE($2, methods),
          description = COALESCE($3, description),
          mock_enabled = COALESCE($4, mock_enabled),
          mock_count = COALESCE($5, mock_count),
          faker_seed = COALESCE($6, faker_seed),
          schema = COALESCE($7, schema),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const values = [
      path,
      methods,
      description,
      mock_enabled,
      mock_count,
      faker_seed,
      schema ? JSON.stringify(schema) : null,
      id
    ];
    const result = await query(text, values);
    return result.rows[0];
  }

  static async delete(id) {
    const text = 'DELETE FROM endpoints WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }
}

module.exports = Endpoint;