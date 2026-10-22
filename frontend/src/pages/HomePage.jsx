import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={hero.section}>
        <div className="page-container" style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 60 }}>
          <div style={hero.badge}>
            <span style={{ color: 'var(--color-accent)' }}>●</span> Next-Gen Green Data Intelligence
          </div>

          <h1 style={hero.title}>
            Transform Raw CSVs Into <br />
            <span className="gradient-text">Interactive, Shareable Dashboards</span>
          </h1>

          <p style={hero.subtitle}>
            Upload your dataset, visualize key metrics instantly with charts and aggregates,
            and securely share your dashboard via revocable access links with zero raw-data leakage.
          </p>

          <div style={hero.ctaGroup}>
            <Link
              to={user ? "/dashboard" : "/register"}
              className="btn btn-primary btn-lg"
              id="hero-primary-cta"
              style={{ fontSize: '1rem', padding: '14px 32px' }}
            >
              {user ? "Go to Dashboard →" : "Get Started Free →"}
            </Link>
            <Link
              to="/about"
              className="btn btn-secondary btn-lg"
              id="hero-secondary-cta"
              style={{ fontSize: '1rem', padding: '14px 28px' }}
            >
              Learn More
            </Link>
          </div>

          {/* Interactive Visual Dashboard Preview */}
          <div style={preview.container} className="card">
            <div style={preview.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  Live Dashboard Preview • ByteVox Studio
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge badge-date">Protected View</span>
                <span className="badge badge-number">Active Link</span>
              </div>
            </div>

            {/* Metrics Grid Mock */}
            <div style={preview.metricsGrid}>
              <div style={preview.metricCard}>
                <span style={preview.metricLabel}>Total Revenue</span>
                <span style={preview.metricValue}>$482,950</span>
                <span style={{ fontSize: '0.75rem', color: '#34d399' }}>↑ +14.8% vs last month</span>
              </div>
              <div style={preview.metricCard}>
                <span style={preview.metricLabel}>Active Customers</span>
                <span style={preview.metricValue}>12,480</span>
                <span style={{ fontSize: '0.75rem', color: '#34d399' }}>↑ +8.2% new accounts</span>
              </div>
              <div style={preview.metricCard}>
                <span style={preview.metricLabel}>Average Order Value</span>
                <span style={preview.metricValue}>$184.20</span>
                <span style={{ fontSize: '0.75rem', color: '#34d399' }}>↑ +3.5% consistency</span>
              </div>
              <div style={preview.metricCard}>
                <span style={preview.metricLabel}>Revocable Permissions</span>
                <span style={preview.metricValue}>100% Safe</span>
                <span style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>Zero Raw Leakage</span>
              </div>
            </div>

            {/* Chart Bars Representation */}
            <div style={preview.chartArea}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quarterly Performance Summary</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Auto-Aggregated</span>
              </div>
              <div style={preview.bars}>
                {[45, 68, 55, 82, 95, 76, 88, 100, 92, 85, 78, 96].map((h, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                    <div style={{
                      width: '100%',
                      maxWidth: 36,
                      height: `${h * 1.4}px`,
                      background: i % 2 === 0 ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' : 'linear-gradient(180deg, #34d399 0%, #10b981 100%)',
                      borderRadius: '4px 4px 0 0',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
                    }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>M{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ padding: '60px 0 80px', borderTop: '1px solid var(--color-border)' }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: 12 }}>Engineered for Speed, Beauty, and Control</h2>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: 600, margin: '0 auto' }}>
              Everything you need to turn raw spreadsheet data into executive-ready dashboards in minutes.
            </p>
          </div>

          <div style={featuresGrid}>
            <div className="card card-hover" style={featureCard}>
              <div style={featureIcon}>⚡</div>
              <h3 style={{ marginBottom: 8 }}>Instant CSV Ingestion</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Upload any standard CSV. ByteVox automatically detects types, flags malformed lines, and profiles missing values.
              </p>
            </div>

            <div className="card card-hover" style={featureCard}>
              <div style={featureIcon}>🔗</div>
              <h3 style={{ marginBottom: 8 }}>Tokenized Share Links</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Create read-only public links with customized expiration dates. Viewers interact with charts without signing in.
              </p>
            </div>

            <div className="card card-hover" style={featureCard}>
              <div style={featureIcon}>🚫</div>
              <h3 style={{ marginBottom: 8 }}>Instant Revocation</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Need to cut off access immediately? One click revokes any link. Subsequent visits return a secure access-denied state.
              </p>
            </div>

            <div className="card card-hover" style={featureCard}>
              <div style={featureIcon}>🛡️</div>
              <h3 style={{ marginBottom: 8 }}>Zero Raw-Data Leakage</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Viewers only see aggregated metric cards and computed chart groupings. Raw CSV rows and private columns are never exposed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '24px 0', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: '0.8rem' }}>
        <div className="page-container">
          <p>© {new Date().getFullYear()} ByteVox Analytics. Emerald Edition. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const hero = {
  section: {
    padding: '40px 0 60px',
    background: 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-light)',
    padding: '6px 16px',
    borderRadius: 999,
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: 24,
    color: 'var(--color-text-muted)',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3.4rem)',
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'var(--color-text-muted)',
    maxWidth: 700,
    margin: '0 auto 36px',
    lineHeight: 1.6,
  },
  ctaGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 50,
  },
};

const preview = {
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: 24,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-light)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(16,185,129,0.15)',
    borderRadius: 'var(--radius-xl)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottom: '1px solid var(--color-border)',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    textAlign: 'left',
  },
  metricLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--color-text-subtle)',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  metricValue: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  chartArea: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
  },
  bars: {
    display: 'flex',
    alignItems: 'flex-end',
    height: 160,
    gap: 10,
    paddingTop: 16,
  },
};

const featuresGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 20,
};

const featureCard = {
  padding: 24,
  borderRadius: 'var(--radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const featureIcon = {
  fontSize: '1.8rem',
  marginBottom: 8,
};
