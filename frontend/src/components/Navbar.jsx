import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ onShareClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <nav style={styles.bar}>
      <div style={styles.inner}>
        {/* Left: Brand Logo */}
        <div style={styles.left}>
          <Link to="/" style={styles.logo}>
            <span style={{ fontSize: '1.35rem' }}>🌱</span>
            <span className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 800 }}>ByteVox</span>
          </Link>
        </div>

        {/* Center: Home, About, Dashboard Links */}
        <div style={styles.center}>
          <div style={styles.navLinks}>
            <Link
              to="/"
              style={{
                ...styles.navLink,
                ...(isActive('/') ? styles.navLinkActive : {}),
              }}
              id="nav-home-link"
            >
              Home
            </Link>
            <Link
              to="/about"
              style={{
                ...styles.navLink,
                ...(isActive('/about') ? styles.navLinkActive : {}),
              }}
              id="nav-about-link"
            >
              About
            </Link>
            <Link
              to="/dashboard"
              style={{
                ...styles.navLink,
                ...(isActive('/dashboard') ? styles.navLinkActive : {}),
              }}
              id="nav-dashboard-link"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Right side controls */}
        <div style={styles.right}>
          {onShareClick && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onShareClick}
              id="nav-share-btn"
              title="Share dashboard view"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>🔗</span> Share
            </button>
          )}

          {user ? (
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              {/* User Logo & Name trigger button */}
              <button
                style={{
                  ...styles.userTriggerBtn,
                  ...(userMenuOpen ? styles.userTriggerBtnActive : {}),
                }}
                onClick={() => setUserMenuOpen((prev) => !prev)}
                id="user-menu-trigger-btn"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                {/* User avatar circle */}
                <div style={styles.avatar}>
                  {getInitials(user.name)}
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {user.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginLeft: 2 }}>
                  {userMenuOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Dropdown Menu - appears ONLY when clicking user logo/name */}
              {userMenuOpen && (
                <div style={styles.dropdownMenu} id="user-dropdown-menu">
                  <div style={styles.dropdownHeader}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                      {user.name}
                    </div>
                    {user.email && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email}
                      </div>
                    )}
                  </div>

                  <div style={styles.dropdownDivider} />

                  <Link
                    to="/dashboard"
                    style={styles.dropdownItem}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span>📊</span> Dashboard
                  </Link>

                  <div style={styles.dropdownDivider} />

                  <button
                    style={styles.dropdownLogoutBtn}
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    id="nav-logout-btn"
                  >
                    <span>🚪</span> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link to="/login" className="btn btn-ghost btn-sm" id="nav-login-btn">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" id="nav-register-btn">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  bar: {
    background: 'rgba(10, 24, 18, 0.9)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 20px',
    height: 62,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    zIndex: 2,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
    letterSpacing: '-0.02em',
  },
  center: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(18, 39, 30, 0.65)',
    padding: '4px 6px',
    borderRadius: 999,
    border: '1px solid var(--color-border)',
  },
  navLink: {
    textDecoration: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '6px 16px',
    borderRadius: 999,
    transition: 'all var(--transition)',
  },
  navLinkActive: {
    color: '#ffffff',
    background: 'var(--color-surface-3)',
    border: '1px solid var(--color-border-light)',
    boxShadow: '0 0 14px rgba(16, 185, 129, 0.25)',
    fontWeight: 600,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
    zIndex: 2,
  },
  userTriggerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    padding: '4px 12px 4px 6px',
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'all var(--transition)',
  },
  userTriggerBtnActive: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: 200,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 0 18px rgba(16,185,129,0.15)',
    padding: '8px',
    zIndex: 200,
    animation: 'slideUp 150ms ease',
  },
  dropdownHeader: {
    padding: '10px 12px 8px',
  },
  dropdownDivider: {
    height: 1,
    background: 'var(--color-border)',
    margin: '6px 0',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    color: 'var(--color-text)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    borderRadius: 'var(--radius-md)',
    transition: 'background var(--transition)',
  },
  dropdownLogoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: '#fca5a5',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background var(--transition)',
  },
};
