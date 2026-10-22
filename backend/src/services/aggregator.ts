/**
 * Aggregation engine — the heart of "show your work".
 *
 * All queries use:
 *  - Column name VALIDATION against known dataset metadata before any SQL is built
 *  - PARAMETERIZED values for all user-supplied filter values
 *  - JSONB string-key access for column names (after validation, safe to embed as string literal)
 *
 * The only string interpolation used is for validated column names, which must:
 *  1. Exist in the dataset's stored column_meta
 *  2. Match /^[a-zA-Z0-9_\-]{1,64}$/ after sanitisation at upload time
 *
 * Single quotes in JSONB keys are escaped before embedding.
 */

import { Pool } from 'pg';
import {
  AggregationType,
  ReportFilter,
  MetricResult,
  ChartResult,
  TableResult,
  ColumnMeta,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape single quotes for JSONB key embedding (defense-in-depth) */
function escapeKey(key: string): string {
  return key.replace(/'/g, "''");
}

/** Validate a column name against known metadata — throws if unknown */
function requireColumn(name: string, columns: ColumnMeta[]): ColumnMeta {
  const col = columns.find((c) => c.name === name);
  if (!col) throw new Error(`Column "${name}" does not exist in this dataset`);
  return col;
}

/** Validate an aggregation type */
function requireAggregation(agg: string): AggregationType {
  const valid: AggregationType[] = ['sum', 'average', 'count', 'min', 'max'];
  if (!valid.includes(agg as AggregationType)) {
    throw new Error(`Invalid aggregation "${agg}". Must be one of: ${valid.join(', ')}`);
  }
  return agg as AggregationType;
}

/** SQL aggregate function name */
function aggFn(agg: AggregationType): string {
  const map: Record<AggregationType, string> = {
    sum: 'SUM',
    average: 'AVG',
    count: 'COUNT',
    min: 'MIN',
    max: 'MAX',
  };
  return map[agg];
}

/**
 * Generates SQL to safely extract a numeric value from JSONB data.
 * Strips currency symbols (€, $, £), commas, spaces.
 * Returns NULL if non-numeric or empty, allowing PostgreSQL aggregates to skip them safely.
 */
function safeNumericSql(key: string): string {
  const clean = `REGEXP_REPLACE(TRIM(COALESCE(data->>'${key}', '')), '[^0-9.-]', '', 'g')`;
  return `CASE WHEN ${clean} ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (${clean})::NUMERIC ELSE NULL END`;
}

/**
 * Safely extracts a date expression from JSONB data without crashing on bad date strings.
 */
function safeDateSql(key: string): string {
  return `(CASE WHEN (data->>'${key}') ~ '^\\d{4}-\\d{2}-\\d{2}' THEN SUBSTRING(data->>'${key}' FROM 1 FOR 10) ELSE NULL END)::DATE`;
}

/**
 * Build the WHERE clause fragment for report-level filters.
 * Returns { clause, params } where params are appended to the caller's params array.
 */
function buildFilterClause(
  filters: ReportFilter | undefined,
  columns: ColumnMeta[],
  startParamIdx: number
): { clause: string; params: unknown[]; descriptions: string[] } {
  if (!filters) return { clause: '', params: [], descriptions: [] };

  const conditions: string[] = [];
  const params: unknown[] = [];
  const descriptions: string[] = [];
  let idx = startParamIdx;

  if (filters.dateColumn && (filters.dateFrom || filters.dateTo)) {
    requireColumn(filters.dateColumn, columns);
    const k = escapeKey(filters.dateColumn);

    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      conditions.push(
        `${safeDateSql(k)} >= $${idx++}::DATE`
      );
      descriptions.push(`${filters.dateColumn} ≥ ${filters.dateFrom}`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      conditions.push(
        `${safeDateSql(k)} <= $${idx++}::DATE`
      );
      descriptions.push(`${filters.dateColumn} ≤ ${filters.dateTo}`);
    }
  }

  if (filters.categoryColumn && filters.categoryValues?.length) {
    requireColumn(filters.categoryColumn, columns);
    const k = escapeKey(filters.categoryColumn);
    const placeholders = filters.categoryValues.map((_, i) => `$${idx + i}`).join(', ');
    params.push(...filters.categoryValues);
    idx += filters.categoryValues.length;
    conditions.push(`(data->>'${k}') IN (${placeholders})`);
    descriptions.push(
      `${filters.categoryColumn} in [${filters.categoryValues.join(', ')}]`
    );
  }

  const clause = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
  return { clause, params, descriptions };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute a metric aggregation (sum/avg/count/min/max) for one column,
 * optionally grouped by a category column.
 */
export async function computeMetric(
  pool: Pool,
  datasetId: string,
  columnName: string,
  aggregation: string,
  columns: ColumnMeta[],
  filters?: ReportFilter,
  groupByColumn?: string
): Promise<MetricResult> {
  const col = requireColumn(columnName, columns);
  const agg = requireAggregation(aggregation);
  const colKey = escapeKey(columnName);

  const params: unknown[] = [datasetId];
  const { clause: filterClause, params: filterParams, descriptions } = buildFilterClause(
    filters, columns, 2
  );
  params.push(...filterParams);

  const numExpr = agg === 'count' ? null : safeNumericSql(colKey);

  if (groupByColumn) {
    requireColumn(groupByColumn, columns);
    const grpKey = escapeKey(groupByColumn);
    const grpNumExpr = agg === 'count' ? '*' : safeNumericSql(colKey);

    const sql = `
      SELECT
        COALESCE(data->>'${grpKey}', '(blank)') AS category,
        ${aggFn(agg)}(${grpNumExpr}) AS value,
        COUNT(*) AS row_count
      FROM dataset_rows
      WHERE dataset_id = $1
      ${filterClause}
      ${agg === 'count' ? '' : `AND ${safeNumericSql(colKey)} IS NOT NULL`}
      GROUP BY data->>'${grpKey}'
      ORDER BY value DESC NULLS LAST
    `;

    const totalRes = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM dataset_rows WHERE dataset_id = $1 ${filterClause}`,
      params
    );
    const total = parseInt(totalRes.rows[0]?.cnt || '0', 10);

    const result = await pool.query<{ category: string; value: string; row_count: string }>(
      sql, params
    );

    const groups = result.rows.map((r) => ({
      category: r.category,
      value: parseFloat(r.value) || 0,
      row_count: parseInt(r.row_count, 10),
    }));

    const included = groups.reduce((s, g) => s + g.row_count, 0);

    return {
      value: groups[0]?.value ?? 0,
      groups,
      explanation: {
        description: `${aggFn(agg)} of "${col.original_name}" grouped by "${groupByColumn}", applied to ${included} of ${total} rows.`,
        sql: sql.replace(/\s+/g, ' ').trim(),
        filters_applied: descriptions,
        rows_included: included,
        rows_excluded: total - included,
        total_rows: total,
      },
    };
  }

  // ── Scalar (ungrouped) ───────────────────────────────────────────────────

  const sql = `
    SELECT
      ${agg === 'count'
        ? 'COUNT(*) AS value'
        : `${aggFn(agg)}(${numExpr}) AS value`
      },
      COUNT(*) FILTER (
        WHERE ${agg === 'count'
          ? 'TRUE'
          : `${safeNumericSql(colKey)} IS NOT NULL`
        }
      ) AS rows_included,
      COUNT(*) AS total_rows
    FROM dataset_rows
    WHERE dataset_id = $1
    ${filterClause}
  `;

  const res = await pool.query<{
    value: string | null;
    rows_included: string;
    total_rows: string;
  }>(sql, params);

  const row = res.rows[0] ?? { value: '0', rows_included: '0', total_rows: '0' };
  const value = row.value !== null && row.value !== undefined ? parseFloat(row.value) : 0;
  const rowsIncluded = parseInt(row.rows_included || '0', 10);
  const totalRows = parseInt(row.total_rows || '0', 10);

  return {
    value,
    explanation: {
      description:
        agg === 'count'
          ? `Count of all rows${descriptions.length ? ' after filters' : ''}: ${value}.`
          : `${aggFn(agg)} of numeric values in "${col.original_name}". ${rowsIncluded} of ${totalRows} rows had a valid number; ${totalRows - rowsIncluded} were skipped (blank or non-numeric).`,
      sql: sql.replace(/\s+/g, ' ').trim(),
      filters_applied: descriptions,
      rows_included: rowsIncluded,
      rows_excluded: totalRows - rowsIncluded,
      total_rows: totalRows,
    },
  };
}

/**
 * Compute chart data: group by xAxis, aggregate yAxis.
 */
export async function computeChart(
  pool: Pool,
  datasetId: string,
  xAxis: string,
  yAxis: string,
  aggregation: string,
  columns: ColumnMeta[],
  filters?: ReportFilter
): Promise<ChartResult> {
  requireColumn(xAxis, columns);
  const yCol = requireColumn(yAxis, columns);
  const agg = requireAggregation(aggregation);
  const xKey = escapeKey(xAxis);
  const yKey = escapeKey(yAxis);

  const params: unknown[] = [datasetId];
  const { clause: filterClause, params: filterParams, descriptions } = buildFilterClause(
    filters, columns, 2
  );
  params.push(...filterParams);

  const numExpr = agg === 'count' ? '*' : safeNumericSql(yKey);
  const numFilter = agg === 'count' ? '' : `AND ${safeNumericSql(yKey)} IS NOT NULL`;

  const sql = `
    SELECT
      COALESCE(data->>'${xKey}', '(blank)') AS label,
      ${agg === 'count' ? 'COUNT(*)' : `${aggFn(agg)}(${numExpr})`} AS value,
      COUNT(*) AS row_count
    FROM dataset_rows
    WHERE dataset_id = $1
    ${filterClause}
    ${numFilter}
    GROUP BY data->>'${xKey}'
    ORDER BY data->>'${xKey}' ASC NULLS LAST
    LIMIT 100
  `;

  const totalRes = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM dataset_rows WHERE dataset_id = $1 ${filterClause}`,
    params
  );
  const total = parseInt(totalRes.rows[0]?.cnt || '0', 10);

  const result = await pool.query<{ label: string; value: string; row_count: string }>(
    sql, params
  );

  const labels = result.rows.map((r) => r.label);
  const values = result.rows.map((r) => parseFloat(r.value) || 0);
  const included = result.rows.reduce((s, r) => s + parseInt(r.row_count, 10), 0);

  return {
    labels,
    values,
    explanation: {
      description: `${aggFn(agg)} of "${yCol.original_name}" for each value of "${xAxis}". Showing ${labels.length} categories from ${included} rows.`,
      sql: sql.replace(/\s+/g, ' ').trim(),
      filters_applied: descriptions,
      rows_included: included,
      rows_excluded: total - included,
      total_rows: total,
    },
  };
}

/**
 * Compute a top-N table (rows sorted by a column).
 */
export async function computeTable(
  pool: Pool,
  datasetId: string,
  selectedColumns: string[],
  sortColumn: string,
  sortDirection: 'asc' | 'desc',
  limit: number,
  columns: ColumnMeta[],
  filters?: ReportFilter
): Promise<TableResult> {
  if (!selectedColumns.length) throw new Error('Table must have at least one column selected');
  selectedColumns.forEach((c) => requireColumn(c, columns));
  const sortCol = requireColumn(sortColumn, columns);
  const sortKey = escapeKey(sortColumn);

  const safeLimit = Math.min(Math.max(1, limit), 500);
  const safeDir = sortDirection === 'desc' ? 'DESC' : 'ASC';

  const params: unknown[] = [datasetId];
  const { clause: filterClause, params: filterParams, descriptions } = buildFilterClause(
    filters, columns, 2
  );
  params.push(...filterParams);

  // Build SELECT list from validated column names
  const selectCols = selectedColumns
    .map((c) => `data->>'${escapeKey(c)}' AS "${escapeKey(c)}"`)
    .join(', ');

  // Determine whether to cast numerically for sort
  const isNumericSort = sortCol.type === 'number';
  const orderExpr = isNumericSort
    ? safeNumericSql(sortKey)
    : `data->>'${sortKey}'`;

  const sql = `
    SELECT ${selectCols}
    FROM dataset_rows
    WHERE dataset_id = $1
    ${filterClause}
    ORDER BY ${orderExpr} ${safeDir} NULLS LAST
    LIMIT ${safeLimit}
  `;

  const totalRes = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM dataset_rows WHERE dataset_id = $1 ${filterClause}`,
    params
  );
  const total = parseInt(totalRes.rows[0].cnt, 10);

  const result = await pool.query<Record<string, string>>(sql, params);

  return {
    columns: selectedColumns,
    rows: result.rows,
    explanation: {
      description: `Top ${safeLimit} rows sorted by "${sortCol.original_name}" (${safeDir.toLowerCase()}), from ${total} total rows after filters.`,
      sql: sql.replace(/\s+/g, ' ').trim(),
      filters_applied: descriptions,
      rows_included: result.rows.length,
      rows_excluded: total - result.rows.length,
      total_rows: total,
    },
  };
}
