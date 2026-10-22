import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set. Copy backend/.env.example to backend/.env and fill it in.');
}

const isRemoteOrSsl =
  process.env.NODE_ENV === 'production' ||
  Boolean(
    process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.includes('sslmode') ||
     process.env.DATABASE_URL.includes('neon.tech') ||
     process.env.DATABASE_URL.includes('supabase') ||
     process.env.DATABASE_URL.includes('aws'))
  );

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteOrSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on('error', (err: any) => {
  // ECONNRESET or 57P01 can happen when serverless Postgres (like Neon) closes idle sockets
  if (err?.code === 'ECONNRESET' || err?.code === '57P01' || err?.message?.includes('ECONNRESET')) {
    return;
  }
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/** Utility: run a query inside a transaction */
export async function withTransaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
