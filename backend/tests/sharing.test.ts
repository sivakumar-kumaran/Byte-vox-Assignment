/**
 * Integration tests for the sharing system.
 *
 * Tests that expired links, revoked links, and another user's reports
 * CANNOT be opened — enforced at the server level, not just UI.
 *
 * Requires a live PostgreSQL connection (DATABASE_URL in .env).
 * Run: npm test -- --testPathPattern=sharing
 */

import request from 'supertest';
import { pool } from '../src/config/database';
import app from '../src/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ── Test helpers ──────────────────────────────────────────────────────────────

let userAToken: string;
let userBToken: string;
let userAId: string;
let userBId: string;
let datasetId: string;
let reportId: string;
let shareLinkToken: string;

async function dbQuery(sql: string, params: unknown[] = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────
jest.setTimeout(30000);

beforeAll(async () => {
  // Create User A
  const hashA = await bcrypt.hash('passwordA123', 10);
  const [userA] = await dbQuery(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [`test-a-${Date.now()}@example.com`, hashA, 'Test User A']
  );
  userAId = userA.id;

  // Create User B
  const hashB = await bcrypt.hash('passwordB123', 10);
  const [userB] = await dbQuery(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [`test-b-${Date.now()}@example.com`, hashB, 'Test User B']
  );
  userBId = userB.id;

  // Get tokens by logging in
  const loginA = await request(app).post('/api/auth/login').send({
    email: (await dbQuery('SELECT email FROM users WHERE id = $1', [userAId]))[0].email,
    password: 'passwordA123',
  });
  userAToken = loginA.body.token;

  const loginB = await request(app).post('/api/auth/login').send({
    email: (await dbQuery('SELECT email FROM users WHERE id = $1', [userBId]))[0].email,
    password: 'passwordB123',
  });
  userBToken = loginB.body.token;

  // Create a dataset owned by User A
  const [ds] = await dbQuery(
    `INSERT INTO datasets (user_id, name, original_filename, row_count, valid_row_count, column_meta, bad_rows)
     VALUES ($1, 'Test Dataset', 'test.csv', 5, 5, '[]', '[]') RETURNING id`,
    [userAId]
  );
  datasetId = ds.id;

  // Create a report owned by User A
  const [rpt] = await dbQuery(
    `INSERT INTO reports (user_id, dataset_id, title)
     VALUES ($1, $2, 'Test Report') RETURNING id`,
    [userAId, datasetId]
  );
  reportId = rpt.id;
});

afterAll(async () => {
  // Clean up test data
  if (userAId) await dbQuery('DELETE FROM users WHERE id = $1', [userAId]);
  if (userBId) await dbQuery('DELETE FROM users WHERE id = $1', [userBId]);
  await pool.end();
});

// ── Auth tests ────────────────────────────────────────────────────────────────

describe('Authentication', () => {
  it('returns 401 for protected routes without token', async () => {
    const res = await request(app).get('/api/datasets');
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/datasets')
      .set('Authorization', 'Bearer totally.invalid.token');
    expect(res.status).toBe(401);
  });
});

// ── Ownership enforcement ─────────────────────────────────────────────────────

describe('Ownership enforcement', () => {
  it("User B cannot read User A's dataset", async () => {
    const res = await request(app)
      .get(`/api/datasets/${datasetId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404); // not 403 — we don't reveal existence
  });

  it("User B cannot read User A's report", async () => {
    const res = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });

  it("User B cannot update User A's report", async () => {
    const res = await request(app)
      .put(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Hijacked!' });
    expect(res.status).toBe(404);
  });

  it("User B cannot delete User A's report", async () => {
    const res = await request(app)
      .delete(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });

  it("User B cannot create a share link for User A's report", async () => {
    const res = await request(app)
      .post('/api/share/create')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ report_id: reportId });
    expect(res.status).toBe(404);
  });
});

// ── Share link lifecycle ──────────────────────────────────────────────────────

describe('Share link — active link', () => {
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/share/create')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ report_id: reportId });
    shareLinkToken = res.body.link.token;
  });

  it('returns the report for a valid share token (no auth required)', async () => {
    const res = await request(app).get(`/api/share/${shareLinkToken}`);
    expect(res.status).toBe(200);
    expect(res.body.report.title).toBe('Test Report');
  });

  it('does NOT expose raw row data in the shared view', async () => {
    const res = await request(app).get(`/api/share/${shareLinkToken}`);
    expect(res.body).not.toHaveProperty('rows');
    expect(res.body).not.toHaveProperty('raw_data');
  });
});

describe('Share link — expired link', () => {
  let expiredToken: string;

  beforeAll(async () => {
    // Insert an already-expired link directly in the DB
    expiredToken = crypto.randomBytes(32).toString('hex');
    await dbQuery(
      `INSERT INTO share_links (report_id, owner_id, token, expires_at)
       VALUES ($1, $2, $3, NOW() - INTERVAL '1 day')`,
      [reportId, userAId, expiredToken]
    );
  });

  it('returns 410 Gone for an expired link', async () => {
    const res = await request(app).get(`/api/share/${expiredToken}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/expired/i);
  });
});

describe('Share link — revoked link', () => {
  let revokedToken: string;
  let linkId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/share/create')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ report_id: reportId });
    revokedToken = res.body.link.token;
    linkId = res.body.link.id;
  });

  it('returns 200 before revocation', async () => {
    const res = await request(app).get(`/api/share/${revokedToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 410 Gone immediately after revocation', async () => {
    // Revoke the link
    await request(app)
      .patch(`/api/share/revoke/${linkId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    const res = await request(app).get(`/api/share/${revokedToken}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/revoked/i);
  });

  it('User B cannot revoke User A\'s share link', async () => {
    // Create a new link first
    const createRes = await request(app)
      .post('/api/share/create')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ report_id: reportId });
    const newLinkId = createRes.body.link.id;

    const res = await request(app)
      .patch(`/api/share/revoke/${newLinkId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });
});

describe('Share link — nonexistent token', () => {
  it('returns 404 for a random token', async () => {
    const res = await request(app).get(`/api/share/${crypto.randomBytes(32).toString('hex')}`);
    expect(res.status).toBe(404);
  });
});
