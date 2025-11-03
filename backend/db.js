import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
const wantSSL = String(process.env.DATABASE_SSL || '').toLowerCase();
const sslEnabled = wantSSL === '1' || wantSSL === 'true' || !!connectionString; // default SSL when using DATABASE_URL

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    });

const query = (text, params) => pool.query(text, params);

export default { pool, query };

// Optional: log unexpected pool errors (helps diagnose connection resets)
pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});
