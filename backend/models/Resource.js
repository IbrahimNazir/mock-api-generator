const db = require('../config/db');
const format = require('pg-format');

class Resource {
  static async create(apiId, resourcePath, data) {
    const query = `
      INSERT INTO resources (api_id, resource_path, data)
      VALUES ($1, $2, $3)
      ON CONFLICT (api_id, resource_path) 
      DO UPDATE SET data = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [apiId, resourcePath, JSON.stringify(data)];
    const result = await db.query(query, values);
    
    return result.rows[0];
  }

  static async findByApiAndPath(apiId, resourcePath) {
    const query = 'SELECT * FROM resources WHERE api_id = $1 AND resource_path = $2';
    const result = await db.query(query, [apiId, resourcePath]);
    
    return result.rows[0];
  }

  static async upsertMany(resources) {
    if (!resources.length) return [];
    
    const values = resources.map(resource => [
      resource.apiId,
      resource.resourcePath,
      JSON.stringify(resource.data)
    ]);
    
    const query = format(`
      INSERT INTO resources (api_id, resource_path, data)
      VALUES %L
      ON CONFLICT (api_id, resource_path) 
      DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, values);
    
    const result = await db.query(query);
    
    return result.rows;
  }

  static async findAll(apiId) {
    const query = 'SELECT * FROM resources WHERE api_id = $1';
    const result = await db.query(query, [apiId]);
    
    return result.rows;
  }

  static async update(apiId, resourcePath, data) {
    const query = `
      UPDATE resources
      SET data = $3, updated_at = CURRENT_TIMESTAMP
      WHERE api_id = $1 AND resource_path = $2
      RETURNING *
    `;
    
    const values = [apiId, resourcePath, JSON.stringify(data)];
    const result = await db.query(query, values);
    
    return result.rows[0];
  }

  static async delete(apiId, resourcePath) {
    const query = 'DELETE FROM resources WHERE api_id = $1 AND resource_path = $2 RETURNING *';
    const result = await db.query(query, [apiId, resourcePath]);
    
    return result.rows[0];
  }

  static async deleteByApiId(apiId) {
    const query = 'DELETE FROM resources WHERE api_id = $1 RETURNING *';
    const result = await db.query(query, [apiId]);
    
    return result.rows;
  }
}

module.exports = Resource;