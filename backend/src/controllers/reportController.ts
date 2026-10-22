import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { Block, ReportFilter, ColumnMeta } from '../types';
import { computeMetric, computeChart, computeTable } from '../services/aggregator';
import { exportReportToPDF } from '../services/pdfExporter';
import { ValidationError } from '../middleware/errorHandler';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireOwnReport(reportId: string, userId: string) {
  const { rows } = await pool.query(
    `SELECT r.id, r.dataset_id, r.title, r.blocks, r.filters,
            d.column_meta
     FROM reports r
     JOIN datasets d ON d.id = r.dataset_id
     WHERE r.id = $1 AND r.user_id = $2`,
    [reportId, userId]
  );
  if (!rows[0]) throw Object.assign(new Error('Report not found'), { status: 404 });
  return rows[0];
}

// ── Controllers ───────────────────────────────────────────────────────────────

export async function listReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.title, r.created_at, r.updated_at,
              d.name AS dataset_name, d.id AS dataset_id
       FROM reports r
       JOIN datasets d ON d.id = r.dataset_id
       WHERE r.user_id = $1
       ORDER BY r.updated_at DESC`,
      [req.user!.id]
    );
    res.json({ reports: rows });
  } catch (err) { next(err); }
}

export async function createReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { dataset_id, title } = req.body ?? {};
    if (!dataset_id) throw new ValidationError('dataset_id is required');

    // Verify the dataset belongs to this user
    const ds = await pool.query(
      'SELECT id FROM datasets WHERE id = $1 AND user_id = $2',
      [dataset_id, req.user!.id]
    );
    if (!ds.rows[0]) return res.status(404).json({ error: 'Dataset not found' });

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO reports (user_id, dataset_id, title)
       VALUES ($1, $2, $3) RETURNING id`,
      [req.user!.id, dataset_id, title?.trim() || 'Untitled Report']
    );

    const report = await pool.query(
      'SELECT * FROM reports WHERE id = $1',
      [rows[0].id]
    );
    res.status(201).json({ report: report.rows[0] });
  } catch (err) { next(err); }
}

export async function getReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const report = await requireOwnReport(req.params.id, req.user!.id);
    res.json({ report });
  } catch (err: any) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
}

export async function updateReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, blocks, filters } = req.body ?? {};

    // Validate blocks is an array if provided
    if (blocks !== undefined && !Array.isArray(blocks))
      throw new ValidationError('blocks must be an array');

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title.trim()); }
    if (blocks !== undefined) { fields.push(`blocks = $${idx++}`); values.push(JSON.stringify(blocks)); }
    if (filters !== undefined) { fields.push(`filters = $${idx++}`); values.push(JSON.stringify(filters)); }

    if (!fields.length) throw new ValidationError('Nothing to update');

    values.push(req.params.id, req.user!.id);

    const { rowCount } = await pool.query(
      `UPDATE reports SET ${fields.join(', ')}
       WHERE id = $${idx} AND user_id = $${idx + 1}`,
      values
    );
    if (!rowCount) return res.status(404).json({ error: 'Report not found' });

    const updated = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    res.json({ report: updated.rows[0] });
  } catch (err) { next(err); }
}

export async function deleteReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM reports WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted' });
  } catch (err) { next(err); }
}

/**
 * POST /api/reports/:id/compute
 * Body: { block: Block }
 * Returns the computed result with full show-your-work explanation.
 * Enforces ownership — the report must belong to the calling user.
 */
export async function computeBlock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reportRow = await requireOwnReport(req.params.id, req.user!.id);
    const block: Block = req.body?.block;
    if (!block?.type) throw new ValidationError('block.type is required');

    const columns: ColumnMeta[] = reportRow.column_meta;
    const filters: ReportFilter = reportRow.filters;
    const datasetId: string = reportRow.dataset_id;

    let result;

    switch (block.type) {
      case 'metric':
        result = await computeMetric(
          pool, datasetId, block.column, block.aggregation,
          columns, filters, block.groupBy
        );
        break;
      case 'chart':
        result = await computeChart(
          pool, datasetId, block.xAxis, block.yAxis,
          block.aggregation, columns, filters
        );
        break;
      case 'table':
        result = await computeTable(
          pool, datasetId, block.columns, block.sortColumn,
          block.sortDirection, block.limit, columns, filters
        );
        break;
      default:
        throw new ValidationError('Text blocks have no computation');
    }

    res.json({ result });
  } catch (err: any) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
}

/**
 * GET /api/reports/:id/export/pdf
 * Streams a PDF of the full report.
 */
export async function exportReportPDF(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reportRow = await requireOwnReport(req.params.id, req.user!.id);
    const pdfBuffer = await exportReportToPDF({
      report: {
        id: reportRow.id,
        user_id: req.user!.id,
        dataset_id: reportRow.dataset_id,
        title: reportRow.title,
        blocks: reportRow.blocks,
        filters: reportRow.filters,
        created_at: reportRow.created_at,
        updated_at: reportRow.updated_at,
      },
      columns: reportRow.column_meta,
      pool,
    });

    const safeName = reportRow.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'report';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
}
