# ByteVox — "Show-Your-Work" Report Builder

> **A full-stack web application where anyone can upload a messy spreadsheet, build an interactive executive report, and share it with a secure link — where every single number shows its work.**

---

## 📑 Table of Contents
1. [Overview & The Twist](#-overview--the-twist)
2. [Key Architecture & Tech Stack](#-key-architecture--tech-stack)
3. [The "Show Your Work" Engine](#-the-show-your-work-engine)
4. [Messy Data Cleaning & Robust Parsing](#-messy-data-cleaning--robust-parsing)
5. [Report Blocks & Interactive Visualizations](#-report-blocks--interactive-visualizations)
6. [Secure Sharing System (What You Share & Nothing More)](#-secure-sharing-system)
7. [Database Schema](#-database-schema)
8. [Setup & Running Locally](#-setup--running-locally)
9. [Running Tests](#-running-tests)
10. [Sample Dataset & Testing Scenarios](#-sample-dataset--testing-scenarios)
11. [Live Walkthrough Readiness](#-live-walkthrough-readiness)

---

## 💡 Overview & The Twist

Most business dashboards present finished numbers: *"Total Revenue: $48,290.50"*. When stakeholders see discrepancies, trust breaks down because traditional dashboards are black boxes.

**ByteVox solves this by making every metric radically transparent:**
- **Click any number or chart data point:** An interactive drawer opens explaining the complete mathematical proof and data lineage.
- **Formula & Math Breakdown:** The exact mathematical formula, substituted values, row count, and edge cases.
- **Data Lineage:** Exact count of total rows, valid rows used, invalid rows skipped, and active filters applied.
- **Direct Row Traceability:** View the actual raw rows that contributed to the calculation.

---

## 🏗 Key Architecture & Tech Stack

ByteVox is architected as a clean decoupled full-stack application:

```
Byte-fox/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/          # Database connection (pg Pool) & env
│   │   ├── controllers/     # Auth, Datasets, Reports, Share
│   │   ├── middleware/      # JWT auth, Multer file upload, Error handler
│   │   ├── migrations/      # 001_initial.sql + runner
│   │   ├── routes/          # REST endpoints
│   │   ├── services/
│   │   │   ├── aggregator.ts   # Core "Show-Your-Work" Calculation Engine
│   │   │   ├── csvParser.ts    # Messy CSV parser & type inference
│   │   │   └── pdfExporter.ts  # PDFKit report generator
│   │   ├── utils/
│   │   │   └── columnTypeDetector.ts  # Automatic type profiling
│   │   └── server.ts        # Express app entry
│   └── tests/               # Jest unit & integration test suites
│
├── frontend/                 # React 18 + Vite SPA
│   ├── src/
│   │   ├── api/             # Axios client with JWT interceptors
│   │   ├── components/      # UI components & block widgets
│   │   │   ├── blocks/      # MetricBlock, ChartBlock, TableBlock, TextBlock, BlockWrapper
│   │   │   ├── BlockAdder.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   └── ShareModal.jsx
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # Dashboard, Dataset Profile, Report Builder, Shared View, Auth
│   │   ├── index.css        # Custom responsive dark-theme design system
│   │   └── App.jsx          # Route configurations
│   └── package.json
└── sample-data/             # Real-world messy sales CSV dataset
```

### Backend
- **Node.js + Express + TypeScript**: Type-safe business logic, aggregation engines, and API endpoints.
- **PostgreSQL (`pg`)**: Relational database with JSONB support for dynamic block configurations and metadata.
- **csv-parse**: High-performance streaming parser supporting messy quotation, delimiters, and trailing whitespaces.
- **PDFKit**: Server-side programmatic PDF generation with clean tabular and metric layouts.
- **bcryptjs & jsonwebtoken**: Secure salted password hashing and stateless token-based authorization.

### Frontend
- **React 18 + Vite**: Lightning-fast hot reloading and production bundling.
- **Recharts**: Responsive SVG charts (Bar & Line charts) integrated directly with data points.
- **Vanilla CSS Design System**: Custom glassmorphism, dark palette, subtle gradients, and micro-interactions.
- **Axios & React Router v6**: Client-side routing with route guards (Guest vs. Protected vs. Public Share).

---

## 🔍 The "Show Your Work" Engine

Every metric, chart bucket, and table cell calculation is processed through `aggregator.ts`. When a block calculation is requested, the engine returns both the **computed result** and an **`explanation` object**:

```typescript
export interface BlockExplanation {
  formula: string;               // e.g. "SUM(Revenue) = 2598.00 + 1499.95 + ..."
  mathSummary: string;           // Step-by-step arithmetic text
  rowsMatched: number;           // Total rows matching filter criteria
  rowsUsed: number;              // Rows with valid numeric values
  rowsSkipped: number;           // Rows discarded (null, NaN, bad format)
  filtersApplied: FilterRule[];  // Filters that restricted this computation
  sampleRows: any[];             // First 5 contributing rows for instant inspection
  field: string;                 // Column name
  operation: string;             // sum | average | count | min | max
}
```

### Supported Operations
1. **SUM**: Strips currency (`$`, `€`, `£`, `,`), validates numeric values, handles floats with proper rounding, skips empty/null cells with explicit warning counter.
2. **AVERAGE**: Shows `Sum / Count` with both terms explicitly displayed in the breakdown.
3. **COUNT**: Distinguishes between total matching rows vs. non-null rows.
4. **MIN & MAX**: Identifies the extreme value and highlights the specific row it originated from.
5. **GROUPED AGGREGATIONS (Charts & Tables)**: Calculates aggregations partitioned by categorical or date buckets, tracking skipped items per bucket.

---

## 🧹 Messy Data Cleaning & Robust Parsing

Real-world spreadsheets are messy. The ByteVox CSV engine (`csvParser.ts` and `columnTypeDetector.ts`) handles:

| Messy Input Case | How ByteVox Handles It |
|---|---|
| **Currency & Formatting** (`$1,299.00`, `€ 45.50`) | Automatically strips currency symbols and commas during numeric parsing. |
| **Malformed Dates** (`bad-date`, `N/A`, `2024-02-31`) | Validates date parsing; classifies invalid dates as bad cells rather than crashing. |
| **Blanks & Empty Strings** (`,,`, `""`) | Differentiates between intentional blank and missing data; excluded from averages with explanation. |
| **Trailing Whitespaces** (`" Laptop Pro  "`) | Auto-trimmed on import. |
| **Inconsistent Data Types** | Profiles the first 1,000 rows to determine whether column is predominantly `number`, `date`, or `category`. |
| **Bad Rows Inspector** | Preserves all bad rows with their original row number and error reason, displayed in the **Dataset Profile View**. |

---

## 📊 Report Blocks & Interactive Visualizations

Reports are built from flexible, draggable/reorderable modular blocks:

1. **Metric Block**: Headline KPI card with customizable title, aggregate function (sum, average, count, min, max), column selector, and instant "Show Work" badge.
2. **Chart Block**:
   - **Bar Chart**: Group by categorical attributes (e.g. Region, Sales Rep, Category).
   - **Line Chart**: Group by time periods/dates.
3. **Top-N Data Table**: Sort by any numeric or text column, limit to top 5/10/25/50 rows, with column visibility toggles.
4. **Text / Notes Block**: Markdown/Rich notes for executive commentary and contextual observations.
5. **Global Filter Bar**: Date range and categorical filters that dynamically filter every block on the canvas simultaneously.

---

## 🔒 Secure Sharing System

Sharing a report comes with strict privacy guarantees:

1. **Cryptographically Unguessable Tokens**: Generated via UUIDv4 tokens (`/share/:token`).
2. **Strict Data Boundary**:
   - Shared link viewers **cannot** view the creator's user account, other reports, or raw database contents.
   - Only the specific report definition and calculated block results for that report are exposed.
3. **Revocable Links**: The report author can revoke any shared link with a single click at any time.
4. **Optional Expiration**: Links can be configured with TTL (e.g. 1 day, 7 days, 30 days, or never).
5. **View Counters**: Every view through a shared link is logged and tracked.

---

## 🗄 Database Schema

The system uses PostgreSQL with clean foreign keys and indexes:

```sql
-- Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded Datasets & Profile Metadata
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  column_meta JSONB NOT NULL,
  bad_rows JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Configurations & Blocks
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared Access Links
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Setup & Running Locally

### Prerequisites
- **Node.js** >= 18.x
- **PostgreSQL** database (Local instance or cloud like Supabase/Neon/Render)

### 1. Configure Backend Environment
Create `backend/.env` (from `backend/.env.example`):
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your PostgreSQL database URL and JWT secret:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/bytevox
JWT_SECRET=super-secret-bytevox-token-key-change-this-in-prod
CORS_ORIGIN=http://localhost:5173
```

### 2. Install Dependencies
From the repository root:
```bash
npm run install:all
```
*(Or install individually: `cd backend && npm install`, `cd ../frontend && npm install`)*

### 3. Run Database Migrations
```bash
npm run db:setup
```
*(Executes `001_initial.sql` creating tables, indexes, and constraints)*

### 4. Start Development Servers
Start both backend and frontend:
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:backend

# Terminal 2: Frontend Vite App (port 5173)
npm run dev:frontend
```

Now open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Tests

The backend includes comprehensive Jest unit and integration tests:
```bash
npm test
```

### Covered Test Suites:
- `aggregator.test.ts`: Sum, average, count, min, max, missing row skipping, division by zero protection, float rounding, and explanation correctness.
- `csvParser.test.ts`: Messy quotation, invalid date recovery, currency symbol stripping, bad row detection with error lines.
- `sharing.test.ts`: Token generation, link expiration checks, revocation verification, public viewer permissions.

---

## 📂 Sample Dataset & Testing Scenarios

A ready-to-test messy dataset is included in `sample-data/sales_data.csv`.

It contains:
- Valid rows across Electronics, Furniture, and Office categories.
- Rows with missing customer ratings.
- Blank dates and malformed date strings (`bad-date`, `N/A`).
- Formatted currencies with decimals.
- Canceled vs. Completed order statuses.

Upload this file in the ByteVox UI to immediately see how the parser flags bad rows and how metrics show skipped cells in real-time.

---

## 🎯 Live Walkthrough Readiness

During a live walkthrough, you may ask us to add or adjust functionality live. Here is how easily ByteVox accommodates common extensions:

1. **Adding a New Metric (e.g. Median, Standard Deviation, Mode):**
   - Add calculation method in `backend/src/services/aggregator.ts`.
   - Update `AGG_OPTS` in `frontend/src/components/blocks/MetricBlock.jsx`.
2. **Adding Custom Calculations (e.g., Margin % = Profit / Revenue):**
   - Formula parser can evaluate expressions between two numeric columns.
3. **Exporting as PDF:**
   - Pre-built with PDFKit at `/api/reports/:id/pdf`.
4. **Adjusting Date Aggregation (Daily, Weekly, Monthly, Yearly):**
   - In `backend/src/services/aggregator.ts`, group keys use `date-fns` formatting (`yyyy-MM`, `yyyy-'W'ww`).
