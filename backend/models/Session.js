const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Session {
  static async create(sessionData) {
    const { userId, refreshToken, userAgent, ipAddress, expiresAt } = sessionData;
    const id = uuidv4();
    
    const query = `
      INSERT INTO sessions (id, user_id, refresh_token, user_agent, ip_address, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [id, userId, refreshToken, userAgent, ipAddress, expiresAt];
    const result = await db.query(query, values);
    
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    const result = await db.query(query, [id]);
    
    return result.rows[0];
  }

  static async findByRefreshToken(refreshToken) {
    const query = 'SELECT * FROM sessions WHERE refresh_token = $1 AND is_active = true';
    const result = await db.query(query, [refreshToken]);
    
    return result.rows[0];
  }

  static async findActiveByUser(userId) {
    const query = `
      SELECT * FROM sessions
      WHERE user_id = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    
    return result.rows;
  }

  static async deactivate(id) {
    const query = `
      UPDATE sessions
      SET is_active = false
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [id]);
    
    return result.rows[0];
  }

  static async deactivateAllForUser(userId, exceptSessionId = null) {
    let query = `
      UPDATE sessions
      SET is_active = false
      WHERE user_id = $1 AND is_active = true
    `;
    
    const values = [userId];
    
    if (exceptSessionId) {
      query += ' AND id != $2';
      values.push(exceptSessionId);
    }
    
    query += ' RETURNING *';
    
    const result = await db.query(query, values);
    
    return result.rows;
  }

  static async deleteExpired() {
    const query = `
      DELETE FROM sessions
      WHERE expires_at < CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    const result = await db.query(query);
    
    return result.rows;
  }
}

module.exports = Session;