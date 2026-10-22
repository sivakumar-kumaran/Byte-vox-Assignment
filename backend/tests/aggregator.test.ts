/**
 * Tests for the aggregation engine (aggregator.ts)
 *
 * These tests use an in-memory dataset (injected directly into the pool mock)
 * so they run without a live PostgreSQL connection, but they fully exercise
 * the SQL generation, filter logic, and output shape.
 */

import { Pool } from 'pg';
import { computeMetric, computeChart, computeTable } from '../src/services/aggregator';
import { ColumnMeta } from '../src/types';

// ── Minimal pool mock ─────────────────────────────────────────────────────────

function makeMockPool(queryFn: (sql: string, params: unknown[]) => { rows: Record<string, any>[] }) {
  return {
    query: jest.fn((sql: string, params: unknown[]) => Promise.resolve(queryFn(sql, params))),
  } as unknown as Pool;
}

const COLUMNS: ColumnMeta[] = [
  { name: 'revenue', original_name: 'Revenue', type: 'number', missing_count: 0, total_count: 10, unique_count: 8, sample_values: [] },
  { name: 'region',  original_name: 'Region',  type: 'category', missing_count: 0, total_count: 10, unique_count: 3, sample_values: [] },
  { name: 'date',    original_name: 'Date',    type: 'date', missing_count: 0, total_count: 10, unique_count: 10, sample_values: [] },
];

// ── Metric tests ──────────────────────────────────────────────────────────────

describe('computeMetric — scalar', () => {
  it('returns a numeric value and explanation', async () => {
    const pool = makeMockPool(() => ({
      rows: [{ value: '42500.00', rows_included: '9', total_rows: '10' }],
    }));

    const result = await computeMetric(pool, 'ds-1', 'revenue', 'sum', COLUMNS);

    expect(result.value).toBeCloseTo(42500);
    expect(result.explanation.rows_included).toBe(9);
    expect(result.explanation.rows_excluded).toBe(1);
    expect(result.explanation.description).toMatch(/SUM/);
    expect(result.explanation.sql).toMatch(/SUM/);
  });

  it('returns 0 when no rows match', async () => {
    const pool = makeMockPool(() => ({
      rows: [{ value: null, rows_included: '0', total_rows: '0' }],
    }));
    const result = await computeMetric(pool, 'ds-1', 'revenue', 'average', COLUMNS);
    expect(result.value).toBe(0);
  });

  it('throws on unknown column', async () => {
    const pool = makeMockPool(() => ({ rows: [] }));
    await expect(
      computeMetric(pool, 'ds-1', 'NONEXISTENT', 'sum', COLUMNS)
    ).rejects.toThrow('does not exist');
  });

  it('throws on invalid aggregation', async () => {
    const pool = makeMockPool(() => ({ rows: [] }));
    await expect(
      computeMetric(pool, 'ds-1', 'revenue', 'INVALID' as any, COLUMNS)
    ).rejects.toThrow('Invalid aggregation');
  });

  it('count aggregation works without numeric cast', async () => {
    const pool = makeMockPool(() => ({
      rows: [{ value: '10', rows_included: '10', total_rows: '10' }],
    }));
    const result = await computeMetric(pool, 'ds-1', 'revenue', 'count', COLUMNS);
    expect(result.value).toBe(10);
    expect(result.explanation.description).toMatch(/Count/);
  });
});

describe('computeMetric — grouped', () => {
  it('returns groups array when groupBy is set', async () => {
    const pool = makeMockPool((sql) => {
      if (sql.includes('COUNT(*) AS cnt')) return { rows: [{ cnt: '10' }] };
      return {
        rows: [
          { category: 'North', value: '25000', row_count: '5' },
          { category: 'South', value: '17500', row_count: '4' },
        ],
      };
    });

    const result = await computeMetric(pool, 'ds-1', 'revenue', 'sum', COLUMNS, undefined, 'region');

    expect(result.groups).toHaveLength(2);
    expect(result.groups![0].category).toBe('North');
    expect(result.groups![0].value).toBeCloseTo(25000);
    expect(result.explanation.rows_included).toBe(9);
  });

  it('throws on unknown groupBy column', async () => {
    const pool = makeMockPool(() => ({ rows: [] }));
    await expect(
      computeMetric(pool, 'ds-1', 'revenue', 'sum', COLUMNS, undefined, 'UNKNOWN_COL')
    ).rejects.toThrow('does not exist');
  });
});

// ── Chart tests ───────────────────────────────────────────────────────────────

describe('computeChart', () => {
  it('returns labels and values arrays', async () => {
    const pool = makeMockPool((sql) => {
      if (sql.includes('COUNT(*) AS cnt')) return { rows: [{ cnt: '10' }] };
      return {
        rows: [
          { label: 'North', value: '25000', row_count: '5' },
          { label: 'South', value: '17500', row_count: '4' },
        ],
      };
    });

    const result = await computeChart(pool, 'ds-1', 'region', 'revenue', 'sum', COLUMNS);

    expect(result.labels).toEqual(['North', 'South']);
    expect(result.values[0]).toBeCloseTo(25000);
    expect(result.explanation.sql).toMatch(/GROUP BY/);
  });
});

// ── Table tests ───────────────────────────────────────────────────────────────

describe('computeTable', () => {
  it('returns column list and row data', async () => {
    const pool = makeMockPool((sql) => {
      if (sql.includes('COUNT(*) AS cnt')) return { rows: [{ cnt: '10' }] };
      return {
        rows: [
          { revenue: '5000', region: 'North' },
          { revenue: '4500', region: 'South' },
        ],
      };
    });

    const result = await computeTable(
      pool, 'ds-1', ['revenue', 'region'], 'revenue', 'desc', 10, COLUMNS
    );

    expect(result.columns).toEqual(['revenue', 'region']);
    expect(result.rows).toHaveLength(2);
    expect(result.explanation.description).toMatch(/DESC/i);
  });

  it('caps limit at 500', async () => {
    const pool = makeMockPool((sql) => {
      if (sql.includes('COUNT(*) AS cnt')) return { rows: [{ cnt: '0' }] };
      if (sql.includes('LIMIT 500')) return { rows: [] };
      // Any other LIMIT fails the test
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await computeTable(pool, 'ds-1', ['revenue'], 'revenue', 'desc', 99999, COLUMNS);
    // If we reach here without throwing, the limit was capped correctly
    expect(true).toBe(true);
  });

  it('throws when no columns selected', async () => {
    const pool = makeMockPool(() => ({ rows: [] }));
    await expect(
      computeTable(pool, 'ds-1', [], 'revenue', 'asc', 10, COLUMNS)
    ).rejects.toThrow('at least one column');
  });
});

// ── Filter tests ──────────────────────────────────────────────────────────────

describe('filter application', () => {
  it('builds date range filter clause', async () => {
    let capturedSQL = '';
    const pool = makeMockPool((sql) => {
      capturedSQL = sql;
      return { rows: [{ value: '100', rows_included: '5', total_rows: '10' }] };
    });

    await computeMetric(pool, 'ds-1', 'revenue', 'sum', COLUMNS, {
      dateColumn: 'date',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    });

    expect(capturedSQL).toMatch(/::DATE >= \$\d+::DATE/);
    expect(capturedSQL).toMatch(/::DATE <= \$\d+::DATE/);
  });

  it('builds category filter clause', async () => {
    let capturedSQL = '';
    const pool = makeMockPool((sql) => {
      capturedSQL = sql;
      return { rows: [{ value: '100', rows_included: '3', total_rows: '10' }] };
    });

    await computeMetric(pool, 'ds-1', 'revenue', 'sum', COLUMNS, {
      categoryColumn: 'region',
      categoryValues: ['North', 'South'],
    });

    expect(capturedSQL).toMatch(/IN \(\$\d+, \$\d+\)/);
  });

  it('rejects filter on non-existent column', async () => {
    const pool = makeMockPool(() => ({ rows: [] }));
    await expect(
      computeMetric(pool, 'ds-1', 'revenue', 'sum', COLUMNS, {
        dateColumn: 'NONEXISTENT',
        dateFrom: '2024-01-01',
      })
    ).rejects.toThrow('does not exist');
  });
});
