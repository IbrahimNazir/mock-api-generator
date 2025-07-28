const { query } = require('../db/db');
// const { v4: uuidv4 } = require('uuid');

class EndpointRelationship {
  static async create({ endpoint1_id, endpoint2_id, relationship_type, is_master_detail_relationship }) {
    // const id = uuidv4();
    const text = `
      INSERT INTO Endpoint_Relationships (endpoint1_id, endpoint2_id, relationship_type, is_master_detail_relationship, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const values = [id, endpoint1_id, endpoint2_id, relationship_type ?? 'one-to-many', is_master_detail_relationship ?? true];
    const result = await query(text, values);
    return result.rows[0];
  }

  static async findById(id) {
    const text = 'SELECT * FROM Endpoint_Relationships WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const text = 'SELECT * FROM Endpoint_Relationships ORDER BY created_at DESC';
    const result = await query(text);
    return result.rows;
  }

  static async findByEndpointId(endpoint_id) {
    const text = 'SELECT * FROM Endpoint_Relationships WHERE endpoint1_id = $1 ORDER BY created_at DESC';
    const result = await query(text, [endpoint_id]);
    return result.rows;
  }

  static async delete(id) {
    const text = 'DELETE FROM Endpoint_Relationships WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }
  
  static async deleteByEndpointId(endpoint_id) {
    const text = 'DELETE FROM Endpoint_Relationships WHERE endpoint1_id = $1 OR endpoint2_id = $1 RETURNING *';
    const result = await query(text, [endpoint_id]);
    return result.rows[0];
  }
}

module.exports = EndpointRelationship;