import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { datasetsApi } from '../api/datasets.js';

const TYPE_BADGES = {
  number:   { label: 'Number',   cls: 'badge-number' },
  date:     { label: 'Date',     cls: 'badge-date' },
  category: { label: 'Category', cls: 'badge-category' },
  text:     { label: 'Text',     cls: 'badge-text' },
};

export default function DatasetPage() {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBadRows, setShowBadRows] = useState(false);

  useEffect(() => {
    datasetsApi.get(id)
      .then(setDataset)
      .catch(err => setError(err.response?.data?.error || 'Failed to load dataset'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <PageShell>
      <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
        <div className="spinner" style={{ width:36,height:36,borderWidth:3 }} />
      </div>
    </PageShell>
  );

  if (error) return (
    <PageShell>
      <div className="alert alert-error">{error}</div>
    </PageShell>
  );

  const ds = dataset;
  const badPct = ds.row_count > 0 ? ((ds.bad_rows?.length || 0) / ds.row_count * 100).toFixed(1) : 0;

  return (
    <PageShell>
      <div className="page-header">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <Link to="/dashboard" style={{ color:'var(--color-text-muted)', textDecoration:'none', fontSize:'0.85rem' }}>
              ← Dashboard
            </Link>
          </div>
          <h1 style={{ marginBottom:6 }}>{ds.name}</h1>
          <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem' }}>
            {ds.original_filename} · Uploaded {new Date(ds.created_at).toLocaleDateString()} · {ds.encoding}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12, marginBottom:28 }}>
        {[
          { label:'Total rows', value: ds.row_count?.toLocaleString(), icon:'📋' },
          { label:'Valid rows', value: ds.valid_row_count?.toLocaleString(), icon:'✅' },
          { label:'Bad rows', value: ds.bad_rows?.length || 0, icon:'⚠️', warn: ds.bad_rows?.length > 0 },
          { label:'Columns', value: ds.column_meta?.length, icon:'📊' },
          { label:'File size', value: formatBytes(ds.file_size_bytes), icon:'💾' },
        ].map(s => (
          <div key={s.label} className="card" style={s.warn ? { borderColor:'rgba(245,158,11,0.4)' } : {}}>
            <div style={{ fontSize:'1.4rem', marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:'1.4rem', fontWeight:800, lineHeight:1 }}>{s.value ?? '—'}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', marginTop:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Column profile */}
      <div className="card" style={{ marginBottom:20, overflow:'auto' }}>
        <h2 style={{ marginBottom:16 }}>Column Profile</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Missing</th>
              <th>Unique</th>
              <th>Sample values</th>
            </tr>
          </thead>
          <tbody>
            {ds.column_meta?.map(col => {
              const badge = TYPE_BADGES[col.type] || { label: col.type, cls: 'badge-text' };
              const missingPct = col.total_count > 0 ? ((col.missing_count / col.total_count) * 100).toFixed(0) : 0;
              return (
                <tr key={col.name}>
                  <td>
                    <div style={{ fontWeight:600 }}>{col.name}</div>
                    {col.original_name !== col.name && (
                      <div style={{ fontSize:'0.7rem', color:'var(--color-text-subtle)' }}>
                        orig: {col.original_name}
                      </div>
                    )}
                  </td>
                  <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:6, background:'var(--color-surface-3)', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                        <div style={{
                          height:'100%',
                          width:`${missingPct}%`,
                          background: missingPct > 20 ? 'var(--color-error)' : missingPct > 5 ? 'var(--color-warning)' : 'var(--color-success)',
                          borderRadius:3,
                        }} />
                      </div>
                      <span style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>
                        {col.missing_count} ({missingPct}%)
                      </span>
                    </div>
                  </td>
                  <td style={{ color:'var(--color-text-muted)', fontSize:'0.85rem' }}>{col.unique_count?.toLocaleString()}</td>
                  <td>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {col.sample_values?.slice(0,3).map((v, i) => (
                        <span key={i} style={{ fontSize:'0.72rem', background:'var(--color-surface-3)', borderRadius:4, padding:'2px 6px', color:'var(--color-text-muted)', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {v || <em style={{ opacity:0.5 }}>blank</em>}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bad rows */}
      {ds.bad_rows?.length > 0 && (
        <div className="card" style={{ borderColor:'rgba(245,158,11,0.3)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: showBadRows ? 16 : 0 }}>
            <h2 style={{ color:'var(--color-warning)' }}>
              ⚠ {ds.bad_rows.length} Flagged Row{ds.bad_rows.length > 1 ? 's' : ''} ({badPct}%)
            </h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowBadRows(s => !s)}
            >
              {showBadRows ? 'Hide' : 'Show'} details
            </button>
          </div>
          <p style={{ fontSize:'0.875rem', color:'var(--color-text-muted)', marginBottom: showBadRows ? 16 : 0 }}>
            These rows were not included in report computations. They are shown here — nothing is silently dropped.
          </p>
          {showBadRows && (
            <div style={{ overflow:'auto', maxHeight:320 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row #</th>
                    <th>Reason</th>
                    <th>Raw data</th>
                  </tr>
                </thead>
                <tbody>
                  {ds.bad_rows.map(row => (
                    <tr key={row.row_number}>
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:'0.8rem' }}>{row.row_number}</td>
                      <td style={{ color:'var(--color-warning)', fontSize:'0.82rem' }}>{row.reason}</td>
                      <td>
                        <code style={{ fontSize:'0.72rem', color:'var(--color-text-muted)' }}>
                          {JSON.stringify(row.raw_data).slice(0, 120)}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--color-bg)' }}>
      <nav style={{ background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 20px', height:56, display:'flex', alignItems:'center' }}>
          <Link to="/dashboard" style={{ display:'flex', alignItems:'center', gap:8, fontSize:'1.1rem', fontWeight:800, textDecoration:'none', color:'var(--color-text)' }}>
            <span>📊</span> <span className="gradient-text">ByteVox</span>
          </Link>
        </div>
      </nav>
      <div className="page-container" style={{ paddingTop:0, paddingBottom:60 }}>
        {children}
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
