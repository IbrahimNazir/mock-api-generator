const { pool } = require('../db/db');

async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Enable uuid-ossp extension and verify
    console.log('Enabling uuid-ossp extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    const extCheck = await client.query(
      "SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';"
    );
    if (extCheck.rows.length === 0) {
      throw new Error('Failed to enable uuid-ossp extension');
    }
    console.log('uuid-ossp extension enabled');

    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table created');

    // Create apis table
    console.log('Creating apis table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS apis (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL,
        description TEXT,
        base_path VARCHAR(255) NOT NULL UNIQUE,
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_apis_base_path ON apis(base_path);
    `);
    console.log('Apis table created');

    // Create endpoints table
    console.log('Creating endpoints table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS endpoints (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        api_id UUID NOT NULL,
        path VARCHAR(255) NOT NULL,
        methods TEXT[] NOT NULL DEFAULT '{GET,POST,PATCH,DELETE,PUT}',
        description TEXT,
        mock_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        mock_count INTEGER NOT NULL,
        faker_seed BIGINT,
        schema JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE,
        CONSTRAINT methods_not_empty CHECK (array_length(methods, 1) >= 1),
        CONSTRAINT valid_methods CHECK (methods && ARRAY['GET', 'POST', 'PATCH', 'DELETE', 'PUT']::TEXT[]),
        CONSTRAINT unique_path_per_api UNIQUE (api_id, path)
      );
      CREATE INDEX IF NOT EXISTS idx_endpoints_path ON endpoints(path);
    `);
    console.log('Endpoints table created');

    // Create endpoint_relationships table
    // console.log('Creating endpoint_relationships table...');
    // await client.query(`
    //   CREATE TABLE IF NOT EXISTS endpoint_relationships (
    //     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    //     endpoint1_id UUID NOT NULL,
    //     endpoint2_id UUID NOT NULL,
    //     relationship_type TEXT CHECK (relationship_type IN ('one-to-one', 'one-to-many')) NOT NULL DEFAULT 'one-to-many',
    //     is_master_detail_relationship BOOLEAN NOT NULL DEFAULT TRUE,
    //     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    //     FOREIGN KEY (endpoint1_id) REFERENCES endpoints(id) ON DELETE CASCADE,
    //     FOREIGN KEY (endpoint2_id) REFERENCES endpoints(id) ON DELETE CASCADE,
    //     UNIQUE (endpoint1_id, endpoint2_id)
    //   );
    // `);
    // console.log('Endpoint_relationships table created');

    // Create resources table
    console.log('Creating resources table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        endpoint_id UUID NOT NULL,
        parent_resource_ids varchar(255),
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_parent_resource_ids ON resources(parent_resource_ids);
    `);
    console.log('Resources table created');

    
    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration().catch((err) => console.error('Migration error:', err));