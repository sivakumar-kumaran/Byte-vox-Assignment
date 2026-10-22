/**
 * Tests for CSV parser (csvParser.ts)
 *
 * Written to test real file I/O using temporary files.
 * Covers: valid CSV, missing values, wrong column count, empty file,
 *         BOM handling, non-UTF-8 encoding errors.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseCSV } from '../src/services/csvParser';

function writeTempCSV(content: string, ext = '.csv'): string {
  const file = path.join(os.tmpdir(), `test-${Date.now()}${ext}`);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function writeTempCSVBuffer(buf: Buffer, ext = '.csv'): string {
  const file = path.join(os.tmpdir(), `test-${Date.now()}${ext}`);
  fs.writeFileSync(file, buf);
  return file;
}

afterEach(() => {
  // nothing to clean up — OS tmp files are ephemeral
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('parseCSV — valid files', () => {
  it('parses a well-formed CSV correctly', async () => {
    const file = writeTempCSV([
      'Name,Revenue,Region,Date',
      'Alice,1500,North,2024-01-10',
      'Bob,2300,South,2024-02-15',
      'Carol,800,East,2024-03-01',
    ].join('\n'));

    const result = await parseCSV(file);

    expect(result.rowCount).toBe(3);
    expect(result.validRowCount).toBe(3);
    expect(result.badRows).toHaveLength(0);
    expect(result.columnMeta).toHaveLength(4);

    const revCol = result.columnMeta.find((c) => c.original_name === 'Revenue')!;
    expect(revCol.type).toBe('number');

    const regCol = result.columnMeta.find((c) => c.original_name === 'Region')!;
    expect(regCol.type).toBe('category');

    const dateCol = result.columnMeta.find((c) => c.original_name === 'Date')!;
    expect(dateCol.type).toBe('date');
  });

  it('records missing values without discarding the row', async () => {
    const file = writeTempCSV([
      'Name,Revenue,Region',
      'Alice,,North',
      'Bob,2300,',
      ',800,East',
    ].join('\n'));

    const result = await parseCSV(file);

    expect(result.validRowCount).toBe(3); // all rows valid (just have blanks)
    expect(result.badRows).toHaveLength(0);

    const revCol = result.columnMeta.find((c) => c.original_name === 'Revenue')!;
    expect(revCol.missing_count).toBe(1); // Alice has blank Revenue
  });

  it('strips UTF-8 BOM and still parses correctly', async () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const csv = Buffer.from('Name,Value\nAlice,100\n', 'utf8');
    const file = writeTempCSVBuffer(Buffer.concat([bom, csv]));

    const result = await parseCSV(file);

    expect(result.encoding).toBe('utf-8 (BOM)');
    expect(result.columnMeta[0].original_name).toBe('Name'); // BOM removed
    expect(result.validRowCount).toBe(1);
  });

  it('handles comma-formatted numbers (1,234.56)', async () => {
    const file = writeTempCSV([
      'Product,Sales',
      'Widget,"1,234.56"',
      'Gadget,"2,000.00"',
    ].join('\n'));

    const result = await parseCSV(file);
    const salesCol = result.columnMeta.find((c) => c.original_name === 'Sales')!;
    // Comma-formatted numbers should be detected as 'number'
    expect(salesCol.type).toBe('number');
  });
});

// ── Bad row detection ─────────────────────────────────────────────────────────

describe('parseCSV — bad rows', () => {
  it('flags rows with wrong column count as bad (not silently dropped)', async () => {
    const file = writeTempCSV([
      'Name,Revenue,Region',
      'Alice,1500,North',
      'Bob,2300',           // only 2 columns — bad
      'Carol,800,East',
    ].join('\n'));

    const result = await parseCSV(file);

    expect(result.rowCount).toBe(3);
    expect(result.validRowCount).toBe(2);
    expect(result.badRows).toHaveLength(1);
    expect(result.badRows[0].row_number).toBe(3); // row 3 (1-indexed, header = row 1)
    expect(result.badRows[0].reason).toMatch(/Expected 3 columns but found 2/);
  });

  it('includes raw data in bad row report', async () => {
    const file = writeTempCSV([
      'A,B',
      'x,y,EXTRA', // 3 cols instead of 2
    ].join('\n'));

    const result = await parseCSV(file);
    expect(result.badRows[0].raw_data).toBeDefined();
  });
});

// ── Error cases ───────────────────────────────────────────────────────────────

describe('parseCSV — error cases', () => {
  it('throws on empty file', async () => {
    const file = writeTempCSV('');
    await expect(parseCSV(file)).rejects.toThrow('empty');
  });

  it('throws on file with only a header and no data rows (does not crash)', async () => {
    const file = writeTempCSV('Name,Revenue,Region\n');
    const result = await parseCSV(file);
    // Not an error — just 0 data rows
    expect(result.rowCount).toBe(0);
    expect(result.validRowCount).toBe(0);
  });

  it('detects replacement character from bad encoding', async () => {
    // Simulate a file with the UTF-8 replacement character (from corrupted encoding)
    const file = writeTempCSV('Name,Value\nAlice\uFFFD,100\n');
    await expect(parseCSV(file)).rejects.toThrow('non-UTF-8');
  });

  it('de-duplicates repeated header names', async () => {
    const file = writeTempCSV([
      'Value,Value,Value',
      '1,2,3',
    ].join('\n'));

    const result = await parseCSV(file);
    const names = result.columnMeta.map((c) => c.name);
    // All three should be unique
    expect(new Set(names).size).toBe(3);
  });
});

// ── Column type detection ─────────────────────────────────────────────────────

describe('column type heuristics', () => {
  it('detects mostly-numeric column as number even with some blanks', async () => {
    const file = writeTempCSV([
      'Score',
      '95', '87', '91', '78', '88',
      '94', '76', '',  '83', '90',  // 1 blank out of 10
    ].join('\n'));

    const result = await parseCSV(file);
    expect(result.columnMeta[0].type).toBe('number');
  });

  it('detects low-cardinality text column as category', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ['A', 'B', 'C'][i % 3]);
    const file = writeTempCSV(['Status', ...rows].join('\n'));
    const result = await parseCSV(file);
    expect(result.columnMeta[0].type).toBe('category');
  });

  it('detects high-cardinality text as text, not category', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => `unique-value-${i}`);
    const file = writeTempCSV(['Description', ...rows].join('\n'));
    const result = await parseCSV(file);
    expect(result.columnMeta[0].type).toBe('text');
  });
});
