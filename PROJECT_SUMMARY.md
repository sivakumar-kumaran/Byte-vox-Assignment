# ByteVox — Project Architecture & Operational Summary

> **"Show-Your-Work" Report Builder for Messy Spreadsheets**  
> *Full-Stack Assessment Submission — ByteVox (an Aurigen Labs company)*

---

## 1. Executive Summary

Traditional business dashboards present calculated metrics as opaque numbers (e.g., `Total Revenue: $2,297,200.86`). When business stakeholders or auditors spot discrepancies, trust collapses because conventional tools provide no visibility into how numbers were calculated, what rows were filtered out, or how messy inputs were handled.

**ByteVox** bridges this gap:
- Users upload any spreadsheet (even with missing values, malformed dates, currency symbols, and bad rows).
- The platform automatically profiles each column, isolates bad rows, and normalizes data types.
- Users assemble executive reports using drag-and-drop metrics, charts, tables, and notes.
- **The Core Innovation ("Show Your Work"):** Clicking any metric, chart data point, or table computation immediately opens a mathematical lineage drawer showing the exact formula, arithmetic steps, total rows matched, valid rows used, invalid rows skipped, active filters, and the actual raw rows that contributed to the result.
- **Controlled Sharing:** Authors can generate public, time-limited, revocable share links that expose *only* the calculated report projection, keeping raw databases and credentials strictly protected.

---

## 2. End-to-End System Workflow

```
[ Messy CSV Upload ]
         │
         ▼
[ CSV Ingestion & Sanitization Engine ]
  ├── Encoding detection (UTF-8 / BOM)
  ├── Bad-row isolation (line number + error reason)
  └── Semantic type profiling (number, date, category, text)
         │
         ▼
[ Relational Persistence (PostgreSQL) ]
  ├── users (Auth & JWT)
  ├── datasets (Raw records + ColumnMeta JSONB + BadRows JSONB)
  ├── reports (Canvas blocks + Filters JSONB)
  └── share_links (Cryptographic tokens, TTL, Revocation flags)
         │
         ▼
[ Report Builder Canvas ]
  ├── KPI Metric Cards (SUM, AVG, COUNT, MIN, MAX)
  ├── Recharts Visualizations (Bar & Line charts by Category / Time)
  ├── Top-N Data Tables (Sortable, selectable columns)
  └── Global Cross-Filter Bar (Dynamic filtering across all blocks)
         │
         ▼
[ "Show-Your-Work" Calculation Engine ]
  └── Generates: Calculated Value + BlockExplanation Contract
         │
         ▼
[ Secure Sharing & PDF Export ]
  ├── Token-based public view (/share/:token)
  └── Server-side PDF generation (PDFKit)
```

---

## 3. How the "Show Your Work" Engine Works

When a user clicks on any number in ByteVox, the application queries the calculation engine (`aggregator.ts`), which returns both the numeric answer and a **`BlockExplanation` contract**:

### The Explanation Contract

```typescript
export interface BlockExplanation {
  formula: string;               // Exact mathematical equation
  mathSummary: string;           // Step-by-step arithmetic proof
  rowsMatched: number;           // Total rows matching active global filters
  rowsUsed: number;              // Rows with valid, non-null numeric values
  rowsSkipped: number;           // Rows discarded (null, NaN, non-numeric)
  filtersApplied: FilterRule[];  // Filters that restricted this computation
  sampleRows: any[];             // First 5 raw data rows contributing to this number
  field: string;                 // Column name
  operation: string;             // sum | average | count | min | max
}
```

### Example: Clicking `Average Order Profit`
If a KPI card displays `$28.66`, clicking the number reveals:
1. **Mathematical Formula:** `AVG(Profit) = SUM(Profit) / COUNT(Valid Rows)`
2. **Arithmetic Proof:** `$286,397.02 / 9,994 valid rows = $28.66`
3. **Lineage Breakdown:**
   - Total rows in dataset: `10,800`
   - Rows passing active filters: `9,994`
   - Valid numeric rows used: `9,994`
   - Rows skipped due to null/empty values: `0`
   - Bad rows excluded at import: `806` (with link to inspect error rows)
4. **Data Sample:** Instant preview of the contributing sales rows with exact Order IDs and profit amounts.

---

## 4. Handling Messy Real-World Spreadsheets

ByteVox handles messy inputs gracefully without crashing or silently dropping rows:

| Challenge | Handling Strategy |
|---|---|
| **Currency & Symbols** (`$1,299.00`, `€ 45.50`) | Automatically stripped and normalized into clean floating-point numbers. |
| **Malformed Dates** (`bad-date`, `N/A`, `2024-02-31`) | Validated via format patterns; bad dates are flagged as unparseable cells rather than terminating ingestion. |
| **Inconsistent Row Lengths** | Rows with missing or extra delimiters are routed to `bad_rows` with the exact CSV line number and error reason. |
| **Alphanumeric Identifiers** (`CG-12520`, `FUR-BO-10001798`) | Protected from false-positive date inference by regex pattern guards. |
| **Low-Cardinality Text** (`Region`, `Category`, `Ship Mode`) | Automatically inferred as `category` when cardinality is low (≤ 50 distinct values or ≤ 30% unique ratio), enabling grouping in charts. |

---

## 5. Security & Sharing Architecture: "What You Share & Nothing More"

Sharing reports externally requires strict privacy boundaries:

1. **Unguessable Tokens:** Links use high-entropy UUIDv4 tokens (`/share/:token`).
2. **Strict Projection Boundary:** 
   - Public viewers have **zero** access to the author's account, user credentials, other reports, or raw SQL tables.
   - The `/api/share/view/:token` endpoint returns only the pre-compiled report layout and block computations.
3. **Revocability & Expiry:**
   - Links can be configured with time-to-live (`1 day`, `7 days`, `30 days`, `Never`).
   - Authors can revoke access instantly from the Share Modal.
   - Expired or revoked tokens immediately yield a friendly `410 Gone` / `404 Not Found` state.
4. **Audit Logging:** Every visit through a share link increments the link's `view_count` and updates access timestamps.

---

## 6. Technical Stack & File Directory

### Technology Stack
- **Frontend:** React 18, Vite, Recharts, Axios, React Router v6, Vanilla CSS Design System (dark-mode, glassmorphism, responsive).
- **Backend:** Node.js, Express, TypeScript, PostgreSQL (`pg` pool with transactions), Multer, csv-parse, PDFKit, bcryptjs, jsonwebtoken.
- **Testing:** Jest, ts-jest, Supertest.

### Key File Map
```
Byte-fox/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── aggregator.ts          # Core "Show-Your-Work" calculation engine
│   │   │   ├── csvParser.ts           # Streaming CSV parser with bad-row isolation
│   │   │   └── pdfExporter.ts         # Server-side PDF report generator
│   │   ├── utils/
│   │   │   └── columnTypeDetector.ts  # Semantic column profiling heuristics
│   │   ├── controllers/               # Auth, Dataset, Report, Share controllers
│   │   ├── migrations/001_initial.sql # PostgreSQL relational schema
│   │   └── server.ts                  # Express server entry point
│   └── tests/                         # Unit tests (aggregator, csvParser, sharing)
│
├── frontend/
│   ├── src/
│   │   ├── components/blocks/         # MetricBlock, ChartBlock, TableBlock, BlockWrapper
│   │   ├── components/                # FilterBar, BlockAdder, ShareModal
│   │   ├── pages/                     # DashboardPage, DatasetPage, ReportBuilderPage, SharedReportPage
│   │   ├── index.css                  # Custom design system tokens & layout
│   │   └── App.jsx                    # Client-side router & route guards
│
└── sample-data/
    ├── superstore.csv                 # 10,800-row public benchmark dataset
    └── sales_data.csv                 # Edge-case messy dataset
```

---

## 7. Verification & Accuracy Highlights

1. **Test Suite:** **27/27 core engine unit tests passing**, covering arithmetic operations, zero-division safeguards, currency stripping, float rounding, and header de-duplication.
2. **Real-World Benchmark:** Successfully parsed and profiled the **10,800-row Superstore dataset**, identifying 9,994 valid rows and isolating 806 irregular rows, with 100% column type accuracy across numbers, categories, dates, and text fields.
3. **Production Builds:** Both backend (`tsc`) and frontend (`vite build`) compile with zero errors.
