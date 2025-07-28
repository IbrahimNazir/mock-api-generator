const { query } = require('../db/db');
// const { v4: uuidv4 } = require('uuid');

class Api {
  static async create({ user_id, name, version, description, base_path, is_public }) {
    // const id = uuidv4();
    const text = `
      INSERT INTO apis (user_id, name, version, description, base_path, is_public, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    const values = [user_id, name, version, description, base_path, is_public ?? true];
    const result = await query(text, values);
    return result.rows[0];
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

  static async update(id, { name, version, description, base_path, is_public }) {
    const text = `
      UPDATE apis
      SET name = COALESCE($1, name),
          version = COALESCE($2, version),
          description = COALESCE($3, description),
          base_path = COALESCE($4, base_path),
          is_public = COALESCE($5, is_public),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    const values = [name, version, description, base_path, is_public, id];
    const result = await query(text, values);
    return result.rows[0];
  }

  static async delete(id) {
    const text = 'DELETE FROM apis WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }
}

module.exports = Api;