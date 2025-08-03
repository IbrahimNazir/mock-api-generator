const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.NODE_ENV === 'development' ? process.env.DATABASE_URL_DEV : process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};