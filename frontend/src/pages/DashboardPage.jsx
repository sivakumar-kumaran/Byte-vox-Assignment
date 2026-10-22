import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { datasetsApi } from '../api/datasets.js';
import { reportsApi } from '../api/reports.js';
import { shareApi } from '../api/share.js';
import Navbar from '../components/Navbar.jsx';
import ShareModal from '../components/ShareModal.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [reports, setReports] = useState([]);
  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState({ open: false, name: '', file: null, error: '', uploading: false });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [shareModalState, setShareModalState] = useState({ open: false, reportId: null });
  const [copiedToken, setCopiedToken] = useState(null);
  const [revokeFeedback, setRevokeFeedback] = useState('');
  const fileRef = useRef();

  const loadData = () => {
    Promise.all([datasetsApi.list(), reportsApi.list(), shareApi.listAll().catch(() => [])])
      .then(([ds, rpts, links]) => {
        setDatasets(ds);
        setReports(rpts);
        setShareLinks(links || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadState.file) return;
    setUploadState(s => ({ ...s, uploading: true, error: '' }));
    try {
      const fd = new FormData();
      fd.append('file', uploadState.file);
      if (uploadState.name.trim()) fd.append('name', uploadState.name.trim());
      const ds = await datasetsApi.upload(fd);
      setDatasets(d => [ds, ...d]);
      setUploadState({ open: false, name: '', file: null, error: '', uploading: false });
    } catch (err) {
      setUploadState(s => ({
        ...s, uploading: false,
        error: err.response?.data?.error || 'Upload failed',
      }));
    }
  };

  const handleCreateReport = async (datasetId) => {
    try {
      const rpt = await reportsApi.create({ dataset_id: datasetId });
      navigate(`/reports/${rpt.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create report');
    }
  };

  const handleDeleteDataset = async (id) => {
    try {
      await datasetsApi.delete(id);
      setDatasets(d => d.filter(x => x.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleDeleteReport = async (id) => {
    try {
      await reportsApi.delete(id);
      setReports(r => r.filter(x => x.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleRevokeLink = async (linkId) => {
    try {
      await shareApi.revoke(linkId);
      setShareLinks(prev => prev.map(l => l.id === linkId ? { ...l, revoked: true } : l));
      setRevokeFeedback('Permission revoked successfully!');
      setTimeout(() => setRevokeFeedback(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke link');
    }
  };

  const copyToClipboard = (token) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    });
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState(s => ({
      ...s, file,
      name: s.name || file.name.replace(/\.csv$/i, ''),
    }));
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const isExpired = (expiresAt) => expiresAt && new Date(expiresAt) < new Date();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Universal Navbar */}
      <Navbar onShareClick={() => setShareModalState({ open: true, reportId: null })} />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>📊</span> Dashboard
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
              Manage your datasets, interactive reports, and public share permissions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              id="share-dashboard-btn"
              className="btn btn-secondary"
              onClick={() => setShareModalState({ open: true, reportId: null })}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🔗 Share Dashboard
            </button>
            <button
              id="upload-csv-btn"
              className="btn btn-primary"
              onClick={() => setUploadState(s => ({ ...s, open: true }))}
            >
              ↑ Upload CSV
            </button>
          </div>
        </div>

        {revokeFeedback && (
          <div className="alert alert-success" style={{ marginBottom: 20 }}>
            {revokeFeedback}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          </div>
        ) : (
          <>
            {/* ── Datasets section ── */}
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ marginBottom: 16 }}>
                Datasets <span style={sectionCount}>{datasets.length}</span>
              </h2>

              {datasets.length === 0 ? (
                <div className="card">
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <span className="icon">📁</span>
                    <h3>No datasets yet</h3>
                    <p>Upload a CSV file to get started. It will be profiled automatically.</p>
                    <button className="btn btn-primary mt-3" onClick={() => setUploadState(s => ({ ...s, open: true }))}>
                      Upload your first CSV
                    </button>
                  </div>
                </div>
              ) : (
                <div style={grid}>
                  {datasets.map(ds => (
                    <div key={ds.id} className="card card-hover" style={dsCard}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ds.name}</h3>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: 2 }}>
                            {ds.original_filename}
                          </p>
                        </div>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setDeleteConfirm({ type: 'dataset', id: ds.id, name: ds.name })}
                          title="Delete dataset"
                        >🗑</button>
                      </div>

                      <div style={dsStats}>
                        <Stat label="Rows" value={ds.valid_row_count?.toLocaleString()} />
                        <Stat label="Cols" value={ds.column_meta?.length} />
                        <Stat label="Size" value={formatBytes(ds.file_size_bytes)} />
                      </div>

                      {ds.bad_rows?.length > 0 && (
                        <div style={badRowBadge}>
                          ⚠ {ds.bad_rows.length} row{ds.bad_rows.length > 1 ? 's' : ''} flagged
                        </div>
                      )}

                      <p style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: 8 }}>
                        {formatDate(ds.created_at)}
                      </p>

                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <Link to={`/datasets/${ds.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                          View profile
                        </Link>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => handleCreateReport(ds.id)}
                        >
                          + New report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Reports section ── */}
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2>
                  Reports & Dashboards <span style={sectionCount}>{reports.length}</span>
                </h2>
              </div>

              {reports.length === 0 ? (
                <div className="card">
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <span className="icon">📋</span>
                    <h3>No reports yet</h3>
                    <p>Create a report from any uploaded dataset above to build your dashboard.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reports.map(rpt => (
                    <div key={rpt.id} className="card card-hover" style={reportRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/reports/${rpt.id}`} style={reportLink}>{rpt.title}</Link>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: 2 }}>
                          Dataset: {rpt.dataset_name} · Updated {formatDate(rpt.updated_at)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShareModalState({ open: true, reportId: rpt.id })}
                          id={`share-report-btn-${rpt.id}`}
                          title="Share as a link & manage access"
                        >
                          🔗 Share
                        </button>
                        <Link to={`/reports/${rpt.id}`} className="btn btn-primary btn-sm">
                          Open →
                        </Link>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setDeleteConfirm({ type: 'report', id: rpt.id, name: rpt.title })}
                          title="Delete report"
                        >🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Active Shared Links & Permissions Section ── */}
            <section style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🛡️</span> Shared Links & Access Permissions <span style={sectionCount}>{shareLinks.length}</span>
                  </h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                    Anyone with an active link can view the dashboard without signing in. You can revoke access immediately below.
                  </p>
                </div>
                {shareLinks.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShareModalState({ open: true, reportId: null })}
                  >
                    + Create New Link
                  </button>
                )}
              </div>

              {shareLinks.length === 0 ? (
                <div className="card" style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-subtle)' }}>
                  <p style={{ fontSize: '0.9rem' }}>
                    No public share links created yet. Click <strong>Share</strong> on any report or <strong>Share Dashboard</strong> above to create one.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {shareLinks.map(lk => {
                    const expired = isExpired(lk.expires_at);
                    const status = lk.revoked ? 'revoked' : expired ? 'expired' : 'active';
                    const linkUrl = `${window.location.origin}/share/${lk.token}`;
                    return (
                      <div
                        key={lk.id}
                        className="card"
                        style={{
                          background: 'var(--color-surface)',
                          borderColor: status === 'active' ? 'var(--color-border)' : 'rgba(239,68,68,0.25)',
                          padding: '14px 18px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={statusBadgeStyle(status)}>{status}</span>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                                {lk.report_title || 'Dashboard View'}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                                Created: {formatDate(lk.created_at)}
                              </span>
                              {lk.expires_at && (
                                <span style={{ fontSize: '0.75rem', color: expired ? '#fca5a5' : 'var(--color-text-subtle)' }}>
                                  • {expired ? 'Expired on' : 'Expires'}: {formatDate(lk.expires_at)}
                                </span>
                              )}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {linkUrl}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {status === 'active' ? (
                              <>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => copyToClipboard(lk.token)}
                                  id={`dashboard-copy-${lk.id}`}
                                >
                                  {copiedToken === lk.token ? '✅ Copied' : '📋 Copy Link'}
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleRevokeLink(lk.id)}
                                  id={`dashboard-revoke-${lk.id}`}
                                  title="Immediately revoke permission to this link"
                                >
                                  🚫 Revoke Access
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', fontStyle: 'italic', alignSelf: 'center' }}>
                                {status === 'revoked' ? 'Access Revoked' : 'Expired'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── Share Modal ── */}
      {shareModalState.open && (
        <ShareModal
          reportId={shareModalState.reportId}
          reports={reports}
          onClose={() => {
            setShareModalState({ open: false, reportId: null });
            loadData();
          }}
        />
      )}

      {/* ── Upload modal ── */}
      {uploadState.open && (
        <div className="modal-overlay" onClick={() => setUploadState(s => ({ ...s, open: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Upload CSV Dataset</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setUploadState(s => ({ ...s, open: false }))}>✕</button>
            </div>

            {uploadState.error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>{uploadState.error}</div>
            )}

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Dataset name (optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. Sales Q3 Report"
                  value={uploadState.name}
                  onChange={e => setUploadState(s => ({ ...s, name: e.target.value }))}
                />
              </div>

              <div
                className="form-group"
                style={dropzone}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileRef.current.files = e.dataTransfer.files; onFileChange({ target: { files: [f] } }); }}}
              >
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={onFileChange} />
                {uploadState.file ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>📄</div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{uploadState.file.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                      {formatBytes(uploadState.file.size)}
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 6 }}>📂</div>
                    <p style={{ fontWeight: 600 }}>Drop CSV here or click to browse</p>
                    <p style={{ fontSize: '0.75rem', marginTop: 4 }}>Max 10 MB · CSV only</p>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ margin: 0, padding: 0, borderTop: 'none' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setUploadState(s => ({ ...s, open: false }))}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!uploadState.file || uploadState.uploading}>
                  {uploadState.uploading ? <><span className="spinner" style={{ width:14,height:14 }} /> Uploading…</> : 'Upload & Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">Delete {deleteConfirm.type}</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Are you sure you want to delete "<strong style={{ color: 'var(--color-text)' }}>{deleteConfirm.name}</strong>"?
              This cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() =>
                deleteConfirm.type === 'dataset'
                  ? handleDeleteDataset(deleteConfirm.id)
                  : handleDeleteReport(deleteConfirm.id)
              }>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function statusBadgeStyle(status) {
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

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 };
const dsCard = { display: 'flex', flexDirection: 'column', transition: 'all var(--transition)' };
const dsStats = { display: 'flex', gap: 20, padding: '10px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', marginTop: 8 };
const badRowBadge = { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: '0.75rem', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 };
const sectionCount = { background: 'var(--color-surface-3)', color: 'var(--color-accent)', border: '1px solid var(--color-border-light)', borderRadius: 999, padding: '2px 10px', fontSize: '0.8rem', fontWeight: 700, marginLeft: 8, display: 'inline-block' };
const reportRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px' };
const reportLink = { fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.95rem' };
const dropzone = { border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: '32px 20px', cursor: 'pointer', transition: 'border-color var(--transition)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-2)' };
