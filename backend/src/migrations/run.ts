/**
 * Database migration runner.
 * Usage:  npm run db:setup
 *
 * Reads all *.sql files in this directory (sorted), executes each one
 * against the DATABASE_URL in .env, and records which migrations have
 * already run in the `migrations` table so they are idempotent.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  const client = await pool.connect();
  try {
    // Ensure the migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename VARCHAR(255) PRIMARY KEY,
        ran_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const dir = path.join(__dirname);
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ Applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('\n🎉 Database setup complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
