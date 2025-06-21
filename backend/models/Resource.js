const { query } = require('../db/db');
const { v4: uuidv4 } = require('uuid');

class Resource {
  static async create({ endpoint_id, data }) {
    const id = uuidv4();
    const text = `
      INSERT INTO resources (id, endpoint_id, data, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const values = [id, endpoint_id, JSON.stringify(data)];
    const result = await query(text, values);
    return result.rows[0];
  }

  static async findById(id) {
    const text = 'SELECT * FROM resources WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  static async findByEndpointId(endpoint_id) {
    const text = 'SELECT * FROM resources WHERE endpoint_id = $1 ORDER BY created_at DESC';
    const result = await query(text, [endpoint_id]);
    return result.rows;
  }

  static async update(id, { data }) {
    const text = `
      UPDATE resources
      SET data = COALESCE($1, data),
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const values = [data ? JSON.stringify(data) : null, id];
    const result = await query(text, values);
    return result.rows[0];
  }

  static async delete(id) {
    const text = 'DELETE FROM resources WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }
}

module.exports = Resource;