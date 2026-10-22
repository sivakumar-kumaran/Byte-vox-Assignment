// Shared TypeScript types for the entire backend

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
}

export interface ColumnMeta {
  name: string;          // sanitised header name
  original_name: string; // raw header from CSV
  type: 'number' | 'date' | 'category' | 'text';
  missing_count: number;
  total_count: number;
  unique_count: number;
  sample_values: string[];
}

export interface BadRow {
  row_number: number;
  raw_data: Record<string, string>;
  reason: string;
}

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  original_filename: string;
  row_count: number;
  valid_row_count: number;
  column_meta: ColumnMeta[];
  bad_rows: BadRow[];
  file_size_bytes: number;
  encoding: string;
  created_at: Date;
}

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max';
export type ChartType = 'bar' | 'line';
export type SortDir = 'asc' | 'desc';

export interface MetricBlock {
  id: string;
  type: 'metric';
  title: string;
  column: string;
  aggregation: AggregationType;
  groupBy?: string;
}

export interface ChartBlock {
  id: string;
  type: 'chart';
  title: string;
  chartType: ChartType;
  xAxis: string;         // category/date column
  yAxis: string;         // numeric column
  aggregation: AggregationType;
}

export interface TableBlock {
  id: string;
  type: 'table';
  title: string;
  sortColumn: string;
  sortDirection: SortDir;
  limit: number;
  columns: string[];
}

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
}

export type Block = MetricBlock | ChartBlock | TableBlock | TextBlock;

export interface ReportFilter {
  dateColumn?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryColumn?: string;
  categoryValues?: string[];
}

export interface Report {
  id: string;
  user_id: string;
  dataset_id: string;
  title: string;
  blocks: Block[];
  filters: ReportFilter;
  created_at: Date;
  updated_at: Date;
}

export interface ShareLink {
  id: string;
  report_id: string;
  owner_id: string;
  token: string;
  expires_at: Date | null;
  revoked: boolean;
  created_at: Date;
}

export interface AggregationExplanation {
  description: string;      // plain-English
  sql: string;              // exact SQL executed (safe to show)
  filters_applied: string[];
  rows_included: number;
  rows_excluded: number;
  total_rows: number;
}

export interface MetricResult {
  value: number;
  groups?: Array<{ category: string; value: number; row_count: number }>;
  explanation: AggregationExplanation;
}

export interface ChartResult {
  labels: string[];
  values: number[];
  explanation: AggregationExplanation;
}

export interface TableResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  explanation: AggregationExplanation;
}
