import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Navbar />

      <div className="page-container" style={{ padding: '48px 20px 80px', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={aboutBadge}>🌱 About ByteVox</div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: 12 }}>
            Empowering Teams with <span className="gradient-text">Safe, Fast Data Sharing</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', marginTop: 12, lineHeight: 1.6 }}>
            ByteVox transforms heavy, sensitive CSV spreadsheets into lightweight, interactive,
            and instantly revocable reporting dashboards.
          </p>
        </div>

        {/* Core Pillars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 48 }}>
          <div className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-accent)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🔗</span> Granular Link Sharing & Instant Revocation
            </h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              Traditional dashboards either force your entire team to purchase expensive seat licenses or require emailing static, outdated PDF and Excel attachments.
              With ByteVox, report creators can generate a randomized 64-character cryptographic token.
              Recipients can access the live dashboard view immediately without registering.
              When access is no longer needed, the owner can click <strong>Revoke</strong> to invalidate the token in real-time.
            </p>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-accent)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🛡️</span> Zero Raw-Data Exposure
            </h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              When someone views a shared report, they never download or inspect the underlying raw rows or unaggregated columns.
              All statistical aggregations (sums, averages, counts, distributions) are computed securely on the server.
              Sensitive customer details and proprietary raw dataset entries remain completely private.
            </p>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-accent)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>⚡</span> Autonomous CSV Type Profiling
            </h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              ByteVox automatically analyzes your uploaded files, categorizes columns into numbers, dates, categories, or strings,
              and flags corrupted or unparseable rows so you always have full visibility into data quality before charting.
            </p>
          </div>
        </div>

        {/* Tech Stack Specs */}
        <div className="card" style={{ padding: 28, marginBottom: 40 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Technology Stack</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={techItem}>
              <span style={{ fontSize: '1.4rem' }}>⚛️</span>
              <div>
                <strong>Frontend</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>React 18 + Vite, Recharts, Custom Emerald Design System</p>
              </div>
            </div>
            <div style={techItem}>
              <span style={{ fontSize: '1.4rem' }}>🟢</span>
              <div>
                <strong>Backend</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>Node.js, Express, TypeScript, JWT Security</p>
              </div>
            </div>
            <div style={techItem}>
              <span style={{ fontSize: '1.4rem' }}>🐘</span>
              <div>
                <strong>Database</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>PostgreSQL with JSONB aggregation & pgcrypto tokens</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link to="/dashboard" className="btn btn-primary btn-lg" style={{ padding: '12px 32px' }}>
            Open My Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

const aboutBadge = {
  display: 'inline-block',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border-light)',
  padding: '6px 14px',
  borderRadius: 999,
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-accent)',
};

const techItem = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: '12px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
};
