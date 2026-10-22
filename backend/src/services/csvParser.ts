import fs from 'fs';
import { parse } from 'csv-parse';
import { BadRow, ColumnMeta } from '../types';
import { buildColumnMeta, sanitiseColumnName } from '../utils/columnTypeDetector';

export interface ParsedCSV {
  columnMeta: ColumnMeta[];
  validRows: Array<Record<string, string>>;
  badRows: BadRow[];
  rowCount: number;        // total attempted (excl. header)
  validRowCount: number;
  encoding: string;
}

/**
 * Parse a CSV file from disk.
 *
 * - Handles missing values (blank cells → empty string, recorded in column stats)
 * - Rows with wrong column count are flagged as bad (not silently dropped)
 * - Duplicate header names are de-duplicated with a suffix
 * - Column names are sanitised to safe identifiers
 */
export async function parseCSV(filePath: string): Promise<ParsedCSV> {
  const raw = fs.readFileSync(filePath);

  // Detect UTF-8 BOM
  const hasBOM = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const encoding = hasBOM ? 'utf-8 (BOM)' : 'utf-8';
  const content = hasBOM ? raw.slice(3).toString('utf8') : raw.toString('utf8');

  // Check for non-UTF-8 sequences (rough check)
  if (content.includes('\ufffd')) {
    throw new Error(
      'File appears to be encoded in a non-UTF-8 encoding. Please re-save as UTF-8.'
    );
  }

  return new Promise((resolve, reject) => {
    const records: string[][] = [];

    const parser = parse(content, {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on('readable', () => {
      let rec: string[];
      while ((rec = parser.read()) !== null) {
        records.push(rec);
      }
    });

    parser.on('error', (err) => {
      reject(new Error(`CSV parse error: ${err.message}`));
    });

    parser.on('end', () => {
      if (records.length === 0) {
        return reject(new Error('The CSV file is empty'));
      }

      // ── Header row ────────────────────────────────────────────────
      const rawHeaders = records[0];
      if (rawHeaders.length === 0) {
        return reject(new Error('CSV has no header row'));
      }

      // De-duplicate headers
      const headerCount: Record<string, number> = {};
      const headers = rawHeaders.map((h) => {
        const safe = sanitiseColumnName(h || 'unnamed');
        headerCount[safe] = (headerCount[safe] || 0) + 1;
        return headerCount[safe] > 1 ? `${safe}_${headerCount[safe]}` : safe;
      });

      const expectedCols = headers.length;

      // ── Collect all values per column ─────────────────────────────
      const columnValues: Record<string, string[]> = {};
      headers.forEach((h) => (columnValues[h] = []));

      const dataRecords = records.slice(1);
      const validRows: Array<Record<string, string>> = [];
      const badRows: BadRow[] = [];

      dataRecords.forEach((rec, idx) => {
        const rowNumber = idx + 2; // 1-indexed, +1 for header

        // Build a raw_data object for error reporting
        const rawData: Record<string, string> = {};
        rawHeaders.forEach((h, i) => {
          rawData[h] = rec[i] ?? '';
        });

        if (rec.length !== expectedCols) {
          badRows.push({
            row_number: rowNumber,
            raw_data: rawData,
            reason: `Expected ${expectedCols} columns but found ${rec.length}`,
          });
          return;
        }

        const rowObj: Record<string, string> = {};
        headers.forEach((h, i) => {
          const val = rec[i] ?? '';
          rowObj[h] = val;
          columnValues[h].push(val);
        });
        validRows.push(rowObj);
      });

      // ── Build column metadata ──────────────────────────────────────
      const columnMeta: ColumnMeta[] = rawHeaders.map((rawName, i) => {
        const safeName = headers[i];
        return buildColumnMeta(safeName, rawName, columnValues[safeName] ?? []);
      });

      resolve({
        columnMeta,
        validRows,
        badRows,
        rowCount: dataRecords.length,
        validRowCount: validRows.length,
        encoding,
      });
    });
  });
}
