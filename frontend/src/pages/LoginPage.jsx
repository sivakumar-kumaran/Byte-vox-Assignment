import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar />
      <div style={styles.page}>
        {/* Background blobs */}
        <div style={styles.blob1} />
        <div style={styles.blob2} />

        <div style={styles.card}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🌱</span>
            <span style={styles.logoText} className="gradient-text">ByteVox</span>
          </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your report builder</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={submit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handle}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={handle}
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 8, justifyContent: 'center' }}
          >
            {loading ? <><span className="spinner" style={{ width:16,height:16 }} />Signing in…</> : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 500, height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
    top: -100, left: -100, pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', width: 400, height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(5,150,105,0.14) 0%, transparent 70%)',
    bottom: -100, right: -100, pointerEvents: 'none',
  },
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    zIndex: 1,
    boxShadow: 'var(--shadow-lg)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoIcon: { fontSize: '1.8rem' },
  logoText: { fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' },
  title: { fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 },
  subtitle: { color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  footer: { marginTop: 24, textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' },
  link: { color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 },
};
