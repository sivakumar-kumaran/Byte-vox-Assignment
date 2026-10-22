import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { Block, ReportFilter, ColumnMeta } from '../types';
import { computeMetric, computeChart, computeTable } from '../services/aggregator';
import { ValidationError } from '../middleware/errorHandler';

// ── Owner operations ──────────────────────────────────────────────────────────

/**
 * POST /api/share/create
 * Body: { report_id, expires_in_days? }
 */
export async function createShareLink(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { report_id, expires_in_days } = req.body ?? {};
    if (!report_id) throw new ValidationError('report_id is required');

    // Verify the report belongs to this user
    const rpt = await pool.query(
      'SELECT id FROM reports WHERE id = $1 AND user_id = $2',
      [report_id, req.user!.id]
    );
    if (!rpt.rows[0]) return res.status(404).json({ error: 'Report not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = expires_in_days
      ? new Date(Date.now() + Number(expires_in_days) * 86_400_000)
      : null;

    const { rows } = await pool.query(
      `INSERT INTO share_links (report_id, owner_id, token, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [report_id, req.user!.id, token, expiresAt]
    );

    res.status(201).json({ link: rows[0] });
  } catch (err) { next(err); }
}

/**
 * GET /api/share/list/:reportId
 * Returns all share links for a report (owner only).
 */
export async function listShareLinks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Enforce ownership: the report must belong to the calling user
    const rpt = await pool.query(
      'SELECT id FROM reports WHERE id = $1 AND user_id = $2',
      [req.params.reportId, req.user!.id]
    );
    if (!rpt.rows[0]) return res.status(404).json({ error: 'Report not found' });

    const { rows } = await pool.query(
      `SELECT id, token, expires_at, revoked, created_at
       FROM share_links
       WHERE report_id = $1 AND owner_id = $2
       ORDER BY created_at DESC`,
      [req.params.reportId, req.user!.id]
    );
    res.json({ links: rows });
  } catch (err) { next(err); }
}

/**
 * GET /api/share/all
 * Returns all share links created by this user across all reports.
 */
export async function listAllUserShareLinks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      `SELECT sl.id, sl.token, sl.expires_at, sl.revoked, sl.created_at, sl.report_id,
              r.title AS report_title, r.dataset_id, d.name AS dataset_name
       FROM share_links sl
       JOIN reports r ON r.id = sl.report_id
       LEFT JOIN datasets d ON d.id = r.dataset_id
       WHERE sl.owner_id = $1
       ORDER BY sl.created_at DESC`,
      [req.user!.id]
    );
    res.json({ links: rows });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/share/revoke/:linkId
 * Instantly revokes a share link.
 */
export async function revokeShareLink(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { rowCount } = await pool.query(
      'UPDATE share_links SET revoked = TRUE WHERE id = $1 AND owner_id = $2',
      [req.params.linkId, req.user!.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Share link not found' });
    res.json({ message: 'Link revoked' });
  } catch (err) { next(err); }
}

// ── Public viewer (no auth) ───────────────────────────────────────────────────

async function resolveShareToken(token: string) {
  const { rows } = await pool.query(
    `SELECT sl.id, sl.revoked, sl.expires_at,
            r.id AS report_id, r.title, r.blocks, r.filters, r.dataset_id,
            d.column_meta
     FROM share_links sl
     JOIN reports r ON r.id = sl.report_id
     JOIN datasets d ON d.id = r.dataset_id
     WHERE sl.token = $1`,
    [token]
  );
  const row = rows[0];
  if (!row) return { error: 'This share link does not exist', status: 404 };
  if (row.revoked) return { error: 'This share link has been revoked', status: 410 };
  if (row.expires_at && new Date(row.expires_at) < new Date())
    return { error: 'This share link has expired', status: 410 };
  return { row };
}

/**
 * GET /api/share/:token
 * Returns the report as the owner built it (read-only, no raw data).
 * Does NOT expose: raw row data, the owner's identity, other reports.
 */
export async function viewSharedReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { error, status, row } = await resolveShareToken(req.params.token);
    if (error) return res.status(status!).json({ error });

    res.json({
      report: {
        id: row.report_id,
        title: row.title,
        blocks: row.blocks,
        filters: row.filters,
        dataset_id: row.dataset_id,
        column_meta: row.column_meta,
      },
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/share/:token/compute
 * Body: { block: Block }
 * Computes a block for a shared report. Viewer cannot reach raw rows,
 * other reports, or any other user's data.
 */
export async function computeSharedBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const { error, status, row } = await resolveShareToken(req.params.token);
    if (error) return res.status(status!).json({ error });

    const block: Block = req.body?.block;
    if (!block?.type) throw new ValidationError('block.type is required');

    const columns: ColumnMeta[] = row.column_meta;
    const filters: ReportFilter = row.filters;
    const datasetId: string = row.dataset_id;

    let result;
    switch (block.type) {
      case 'metric':
        result = await computeMetric(pool, datasetId, block.column, block.aggregation, columns, filters, block.groupBy);
        break;
      case 'chart':
        result = await computeChart(pool, datasetId, block.xAxis, block.yAxis, block.aggregation, columns, filters);
        break;
      case 'table':
        result = await computeTable(pool, datasetId, block.columns, block.sortColumn, block.sortDirection, block.limit, columns, filters);
        break;
      default:
        throw new ValidationError('Text blocks have no computation');
    }

    res.json({ result });
  } catch (err) { next(err); }
}
