import { Response, NextFunction } from 'express';
import fs from 'fs';
import { pool, withTransaction } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { parseCSV } from '../services/csvParser';

/**
 * GET /api/datasets
 * List all datasets belonging to the authenticated user.
 * Ownership is enforced via WHERE user_id = $1 — not only in the screen.
 */
export async function listDatasets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, original_filename, row_count, valid_row_count,
              column_meta, file_size_bytes, created_at
       FROM datasets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ datasets: rows });
  } catch (err) { next(err); }
}

/**
 * POST /api/datasets
 * Upload and parse a CSV file.
 */
export async function uploadDataset(req: AuthRequest, res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const parsed = await parseCSV(file.path);

    const datasetId = await withTransaction(async (client) => {
      // Insert dataset metadata
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO datasets
           (user_id, name, original_filename, row_count, valid_row_count,
            column_meta, bad_rows, file_size_bytes, encoding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          req.user!.id,
          req.body.name?.trim() || file.originalname.replace(/\.csv$/i, ''),
          file.originalname,
          parsed.rowCount,
          parsed.validRowCount,
          JSON.stringify(parsed.columnMeta),
          JSON.stringify(parsed.badRows),
          file.size,
          parsed.encoding,
        ]
      );
      const datasetId = rows[0].id;

      // Bulk-insert valid rows as JSONB
      // Use a single multi-value INSERT in batches of 500 to stay within parameter limits
      const BATCH = 500;
      for (let i = 0; i < parsed.validRows.length; i += BATCH) {
        const batch = parsed.validRows.slice(i, i + BATCH);
        const values: unknown[] = [];
        const placeholders = batch.map((row, j) => {
          const base = j * 3;
          values.push(datasetId, i + j, JSON.stringify(row));
          return `($${base + 1}, $${base + 2}, $${base + 3})`;
        });
        await client.query(
          `INSERT INTO dataset_rows (dataset_id, row_index, data) VALUES ${placeholders.join(',')}`,
          values
        );
      }

      return datasetId;
    });

    // Clean up temp file after successful DB insert
    fs.unlink(file.path, () => {});

    const { rows } = await pool.query(
      `SELECT id, name, original_filename, row_count, valid_row_count,
              column_meta, bad_rows, file_size_bytes, encoding, created_at
       FROM datasets WHERE id = $1`,
      [datasetId]
    );

    res.status(201).json({ dataset: rows[0] });
  } catch (err) {
    // Clean up temp file on error too
    if (file?.path) fs.unlink(file.path, () => {});
    next(err);
  }
}

/**
 * GET /api/datasets/:id
 * Returns full dataset metadata including column profile.
 * Enforces ownership at the query level.
 */
export async function getDataset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, original_filename, row_count, valid_row_count,
              column_meta, bad_rows, file_size_bytes, encoding, created_at
       FROM datasets
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Dataset not found' });
    res.json({ dataset: rows[0] });
  } catch (err) { next(err); }
}

/**
 * DELETE /api/datasets/:id
 * Deletes dataset and all rows (CASCADE). Enforces ownership.
 */
export async function deleteDataset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM datasets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Dataset not found' });
    res.json({ message: 'Dataset deleted' });
  } catch (err) { next(err); }
}
