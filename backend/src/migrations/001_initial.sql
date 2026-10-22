-- ByteVox Report Builder — Initial Schema
-- Run via: npm run db:setup

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Datasets ─────────────────────────────────────────────────────────────────
-- Stores metadata about every uploaded CSV.
-- Raw row data lives in dataset_rows (JSONB).
CREATE TABLE IF NOT EXISTS datasets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  row_count         INTEGER NOT NULL DEFAULT 0,
  valid_row_count   INTEGER NOT NULL DEFAULT 0,
  -- [{name, original_name, type, missing_count, total_count, unique_count, sample_values}]
  column_meta       JSONB NOT NULL DEFAULT '[]',
  -- [{row_number, raw_data, reason}]
  bad_rows          JSONB NOT NULL DEFAULT '[]',
  file_size_bytes   BIGINT,
  encoding          VARCHAR(50) DEFAULT 'utf-8',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);

-- ─── Dataset Rows ─────────────────────────────────────────────────────────────
-- Each valid CSV row stored as JSONB for SQL aggregation queries.
CREATE TABLE IF NOT EXISTS dataset_rows (
  id          BIGSERIAL PRIMARY KEY,
  dataset_id  UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  row_index   INTEGER NOT NULL,
  data        JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset_id ON dataset_rows(dataset_id);

-- ─── Reports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dataset_id  UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL DEFAULT 'Untitled Report',
  -- Ordered array of block objects (MetricBlock | ChartBlock | TableBlock | TextBlock)
  blocks      JSONB NOT NULL DEFAULT '[]',
  -- {dateColumn?, dateFrom?, dateTo?, categoryColumn?, categoryValues?}
  filters     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_dataset_id ON reports(dataset_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── Share Links ──────────────────────────────────────────────────────────────
-- Read-only, optionally expiring, revocable share tokens.
CREATE TABLE IF NOT EXISTS share_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(64) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ,           -- NULL = never expires
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_report_id ON share_links(report_id);
