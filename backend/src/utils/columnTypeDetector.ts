import { ColumnMeta } from '../types';

/**
 * Detects the semantic type of a CSV column from a sample of its values.
 *
 * Decision rules (applied in order):
 *  1. ≥ 70 % of non-empty values parse as a finite number   → 'number'
 *  2. ≥ 70 % of non-empty values parse as a valid date      → 'date'
 *  3. Unique ratio < 10 % AND ≤ 50 distinct values          → 'category'
 *  4. Otherwise                                             → 'text'
 */

const DATE_PATTERNS = [
  // ISO 8601
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z?)?$/,
  // US: MM/DD/YYYY
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  // EU: DD.MM.YYYY
  /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,
  // Month name: Jan 01, 2024 / 01 Jan 2024 / January 2024
  /^[A-Za-z]+ \d{1,2},? \d{4}$/,
  /^\d{1,2} [A-Za-z]+ \d{4}$/,
  /^[A-Za-z]+ \d{4}$/,
  // YYYY/MM/DD
  /^\d{4}\/\d{2}\/\d{2}$/,
];

function looksLikeDate(value: string): boolean {
  const v = value.trim();
  if (DATE_PATTERNS.some((re) => re.test(v))) return true;
  // Guard: if it looks like an alphanumeric code or ID (e.g. CG-12520, AB_123), it's not a date
  if (/^[A-Za-z]+[-_]\d+$/.test(v) || !/\d.*\d/.test(v)) return false;
  // Fallback: try Date constructor
  const d = new Date(v);
  return !isNaN(d.getTime()) && v.length >= 6;
}

function looksLikeNumber(value: string): boolean {
  const v = value.trim().replace(/,/g, ''); // handle "1,234.56"
  return v !== '' && isFinite(Number(v));
}

export function detectColumnType(
  values: string[],
  colName?: string
): 'number' | 'date' | 'category' | 'text' {
  const nonEmpty = values.filter((v) => v.trim() !== '');
  if (nonEmpty.length === 0) return 'text';

  const numCount = nonEmpty.filter(looksLikeNumber).length;
  const dateCount = nonEmpty.filter(looksLikeDate).length;

  const numRatio = numCount / nonEmpty.length;
  const dateRatio = dateCount / nonEmpty.length;

  if (numRatio >= 0.7) return 'number';
  if (dateRatio >= 0.7) return 'date';

  const unique = new Set(nonEmpty.map((v) => v.trim().toLowerCase()));
  const uniqueRatio = unique.size / nonEmpty.length;

  const nameSuggestsCategory = colName && /^(region|status|category|type|department|dept|country|state|gender|role|tier|priority)$/i.test(colName.trim());
  const nameSuggestsText = colName && /^(description|desc|comment|commentary|notes?|summary|address|details)$/i.test(colName.trim());

  if (nameSuggestsText) return 'text';
  if (nameSuggestsCategory && unique.size <= 50) return 'category';

  if (unique.size <= 20 && (uniqueRatio <= 0.3 || unique.size <= 5)) {
    return 'category';
  }

  return 'text';
}

/**
 * Sanitise a raw CSV header into a safe column key.
 * Keeps letters, digits, spaces, hyphens, underscores; trims; collapses spaces.
 */
export function sanitiseColumnName(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9 _\-]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_')
    .slice(0, 64) // max 64 chars
    || `col_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Build full ColumnMeta for a named column given all raw values from the CSV.
 * Supports both buildColumnMeta(rawName, values) and buildColumnMeta(safeName, rawName, values).
 */
export function buildColumnMeta(
  nameOrRaw: string,
  rawOrValues: string | string[],
  maybeValues?: string[]
): ColumnMeta {
  let safeName: string;
  let rawName: string;
  let values: string[];

  if (Array.isArray(rawOrValues)) {
    rawName = nameOrRaw;
    safeName = sanitiseColumnName(rawName);
    values = rawOrValues;
  } else {
    safeName = nameOrRaw;
    rawName = rawOrValues;
    values = maybeValues ?? [];
  }

  const nonEmpty = values.filter((v) => v.trim() !== '');
  const missing_count = values.length - nonEmpty.length;

  const unique = new Set(nonEmpty.map((v) => v.trim()));
  const sample_values = [...unique].slice(0, 5);

  return {
    name: safeName,
    original_name: rawName,
    type: detectColumnType(values, rawName),
    missing_count,
    total_count: values.length,
    unique_count: unique.size,
    sample_values,
  };
}
