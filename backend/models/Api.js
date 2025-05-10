const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Api {
  static async create(apiData) {
    const { name, description, endpoints, userId } = apiData;
    const id = uuidv4();
    
    const query = `
      INSERT INTO apis (id, name, description, endpoints, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [id, name, description, JSON.stringify(endpoints), userId];
    const result = await db.query(query, values);
    
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT * FROM apis ORDER BY created_at DESC';
    const result = await db.query(query);
    
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM apis WHERE id = $1';
    const result = await db.query(query, [id]);
    
    return result.rows[0];
  }

  static async update(id, apiData) {
    const { name, description, endpoints } = apiData;
    
    const query = `
      UPDATE apis
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          endpoints = COALESCE($3, endpoints),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    const values = [
      name,
      description,
      endpoints ? JSON.stringify(endpoints) : null,
      id
    ];
    
    const result = await db.query(query, values);
    
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM apis WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    
    return result.rows[0];
  }
}

module.exports = Api;