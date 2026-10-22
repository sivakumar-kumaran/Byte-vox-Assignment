import { useState, useEffect } from 'react';
import { shareApi } from '../api/share.js';

const EXPIRY_OPTIONS = [
  { label: 'Never expires', value: '' },
  { label: '1 day', value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export default function ShareModal({ reportId: initialReportId, reports = [], onClose }) {
  const [selectedReportId, setSelectedReportId] = useState(
    initialReportId || (reports.length > 0 ? reports[0].id : '')
  );
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(null);

  const fetchLinks = () => {
    setLoading(true);
    const req = selectedReportId ? shareApi.list(selectedReportId) : shareApi.listAll();
    req
      .then(setLinks)
      .catch(err => setError(err.response?.data?.error || 'Failed to load links'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLinks();
  }, [selectedReportId]);

  const create = async () => {
    if (!selectedReportId) {
      setError('Please select a report or create one first before generating a share link.');
      return;
    }
    setCreating(true);
    setError('');
    setSuccessMsg('');
    try {
      const link = await shareApi.create(selectedReportId, expiry || undefined);
      setLinks(l => [link, ...l]);
      setSuccessMsg('Share link generated! You can copy and share it now.');
      copy(link.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (linkId) => {
    setError('');
    setSuccessMsg('');
    try {
      await shareApi.revoke(linkId);
      setLinks(l => l.map(lk => lk.id === linkId ? { ...lk, revoked: true } : lk));
      setSuccessMsg('Permission revoked! This link can no longer view the dashboard.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke link');
    }
  };

  const copy = (token) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2500);
    });
  };

  const linkUrl = (token) => `${window.location.origin}/share/${token}`;
  const isExpired = (expiresAt) => expiresAt && new Date(expiresAt) < new Date();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔗</span> Share Dashboard View
          </span>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Generate a public, read-only link to access the dashboard view without signing in.
          Raw CSV data is never leaked. You can revoke access at any moment.
        </p>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
        {successMsg && <div className="alert alert-success" style={{ marginBottom: 14 }}>{successMsg}</div>}

        {/* Report selection if opened in multi-report mode */}
        {!initialReportId && reports.length > 0 && (
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Select Report / View to Share</label>
            <select
              className="form-select"
              value={selectedReportId}
              onChange={e => setSelectedReportId(e.target.value)}
              id="select-report-share-dropdown"
            >
              {reports.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.dataset_name || 'Dataset'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Create link bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
            <label className="form-label">Link Expiration</label>
            <select
              className="form-select"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              id="share-expiry-select"
            >
              {EXPIRY_OPTIONS.map(o => (
                <option key={o.label} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={create}
            disabled={creating || (!selectedReportId && reports.length === 0)}
            id="create-share-link-btn"
            style={{ height: 42 }}
          >
            {creating ? (
              <><span className="spinner" style={{ width: 14, height: 14 }} /> Generating…</>
            ) : (
              '✨ Generate Link'
            )}
          </button>
        </div>

        <div className="divider" style={{ margin: '16px 0' }} />

        {/* Existing links header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active & Past Access Links ({links.length})
          </h4>
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchLinks}
            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-subtle)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 6 }}>🛡️</span>
            No share links created yet. Click above to create one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
            {links.map(lk => {
              const expired = isExpired(lk.expires_at);
              const status = lk.revoked ? 'revoked' : expired ? 'expired' : 'active';
              return (
                <div
                  key={lk.id}
                  style={{
                    background: 'var(--color-surface-2)',
                    border: `1px solid ${status === 'active' ? 'var(--color-border-light)' : 'rgba(239,68,68,0.25)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    transition: 'all var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={statusBadge(status)}>{status}</span>
                        {lk.report_title && (
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text)' }}>
                            {lk.report_title}
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)' }}>
                          Created: {new Date(lk.created_at).toLocaleDateString()}
                        </span>
                        {lk.expires_at && (
                          <span style={{ fontSize: '0.72rem', color: expired ? '#fca5a5' : 'var(--color-text-subtle)' }}>
                            • {expired ? 'Expired on' : 'Expires'}: {new Date(lk.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: status === 'active' ? 'var(--color-text-muted)' : 'var(--color-text-subtle)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {linkUrl(lk.token)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {status === 'active' ? (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => copy(lk.token)}
                            id={`copy-link-${lk.id}`}
                            title="Copy link to clipboard"
                          >
                            {copied === lk.token ? '✅ Copied!' : '📋 Copy'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => revoke(lk.id)}
                            id={`revoke-link-${lk.id}`}
                            title="Immediately revoke permission"
                          >
                            🚫 Revoke
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
                          {status === 'revoked' ? 'Permission Revoked' : 'Expired'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function statusBadge(status) {
  const colors = {
    active:  { bg: 'rgba(16,185,129,0.18)', color: '#34d399', border: 'rgba(16,185,129,0.4)' },
    revoked: { bg: 'rgba(239,68,68,0.18)',  color: '#fca5a5', border: 'rgba(239,68,68,0.4)' },
    expired: { bg: 'rgba(100,116,139,0.18)', color: '#94a3b8', border: 'rgba(100,116,139,0.4)' },
  }[status];
  return {
    background: colors.bg,
    color: colors.color,
    border: `1px solid ${colors.border}`,
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
}
