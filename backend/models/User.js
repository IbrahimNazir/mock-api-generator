const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/passwordUtils');

class User {
  static async create(userData) {
    const { username, email, password, role = 'user' } = userData;
    const id = uuidv4();
    const hashedPassword = await hashPassword(password);
    
    const query = `
      INSERT INTO users (id, username, email, password, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, created_at
    `;
    
    const values = [id, username, email, hashedPassword, role];
    const result = await db.query(query, values);
    
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, username, email, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [username]);
    
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    
    return result.rows[0];
  }

  static async update(id, userData) {
    const { username, email, password, role, is_active } = userData;
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (username !== undefined) {
      updateFields.push(`username = $${paramIndex}`);
      values.push(username);
      paramIndex++;
    }
    
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }
    
    if (password !== undefined) {
      const hashedPassword = await hashPassword(password);
      updateFields.push(`password = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }
    
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 0) {
      return null;
    }
    
    values.push(id);
    
    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, role, is_active, created_at, updated_at
    `;
    
    const result = await db.query(query, values);
    
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    
    return result.rows[0];
  }
  
  static async getApis(userId) {
    const query = 'SELECT * FROM apis WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [userId]);
    
    return result.rows;
  }
}

module.exports = User;