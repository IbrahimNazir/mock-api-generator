const { query } = require('../db/db');
// const { v4: uuidv4 } = require('uuid');

class Resource {
  static async create({ endpoint_id, data, parent_resource_Ids }) {
    // const id = uuidv4();
    parent_resource_Ids = parent_resource_Ids || null;
    const text = `
      INSERT INTO resources (endpoint_id, parent_resource_ids, data, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const values = [endpoint_id, parent_resource_Ids, JSON.stringify(data)];
    const result = await query(text, values);
    return result.rows[0];
  }

  static async findById(id) {
    const text = 'SELECT * FROM resources WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  static async findByEndpointId(endpoint_id, page, limit) {
    const text = `SELECT * FROM resources WHERE endpoint_id = $1 ORDER BY created_at DESC${ page || limit  ? ' LIMIT $2 OFFSET $3' : ''}`;
    const limits = (page || limit) ? [limit || 10, (page - 1) * limit || 0] : [];
    console.log("text: ", text, "endpoint_id: ", endpoint_id, "limits: ",limits)
    const result = await query(text, [endpoint_id, ...limits]);
    console.log("results :", result.rows)
    return result.rows;
  }
  
  static async findIdsByEndpointId(endpoint_id) {
    const text = `SELECT id FROM resources WHERE endpoint_id = $1 ORDER BY created_at DESC`;
    const result = await query(text, [endpoint_id]);
    console.log("results :", result.rows)
    return result.rows;
  }
  
  static async findTotalCountByEndpointId(endpoint_id) {
    const text = `SELECT COUNT(Id) FROM resources WHERE endpoint_id = $1`;
    const result = await query(text, [endpoint_id]);
    return result.rows[0].count;
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

  static async deleteByEndpointId(endpoint_id) {
    const text = 'DELETE FROM resources WHERE endpoint_id = $1 RETURNING id';
    const result = await query(text, [endpoint_id]);
    return result.rows;
  }
}

module.exports = Resource;