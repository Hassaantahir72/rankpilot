const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'rankpilot',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Managed PostgreSQL (including Supabase) must use TLS in production.
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
    ? {
        // Keep TLS enabled. Managed poolers may use a private/self-signed chain;
        // set DB_SSL_CA to the provider CA for strict verification, or explicitly
        // set DB_SSL_REJECT_UNAUTHORIZED=false as a documented temporary fallback.
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}),
      }
    : undefined,
});

pool.on('error', (err) => console.error('PostgreSQL pool error:', err));

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('   Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env');
  } else {
    console.log('✅ PostgreSQL connected');
    release();
  }
});

// Helper: query with values
const query = (text, params) => pool.query(text, params);

// Helper: get single row
const queryOne = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
};

// Helper: get all rows
const queryAll = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};

// Helper: insert and return row
const insertOne = async (text, params) => {
  const result = await pool.query(text + ' RETURNING *', params);
  return result.rows[0];
};

module.exports = { pool, query, queryOne, queryAll, insertOne };
