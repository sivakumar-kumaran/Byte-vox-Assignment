import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { shareApi } from '../api/share.js';
import MetricBlock from '../components/blocks/MetricBlock.jsx';
import ChartBlock from '../components/blocks/ChartBlock.jsx';
import TableBlock from '../components/blocks/TableBlock.jsx';
import TextBlock from '../components/blocks/TextBlock.jsx';

export default function SharedReportPage() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errStatus, setErrStatus] = useState(null);

  useEffect(() => {
    shareApi.view(token)
      .then(setReport)
      .catch(err => {
        setErrStatus(err.response?.status);
        setError(err.response?.data?.error || 'This report could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const statusIcon = {
    404: '🔍',
    410: errStatus === 410 ? '🚫' : '⏰',
  }[errStatus] || '❌';

  const statusMsg = {
    404: 'This share link does not exist.',
    410: error,
  }[errStatus] || error;

  if (loading) return (
    <ViewShell>
      <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
        <div className="spinner" style={{ width:40,height:40,borderWidth:3 }} />
      </div>
    </ViewShell>
  );

  if (error) return (
    <ViewShell>
      <div className="empty-state" style={{ minHeight:'60vh' }}>
        <span className="icon">{statusIcon}</span>
        <h3>{statusMsg}</h3>
        <p style={{ maxWidth:360 }}>
          {errStatus === 410
            ? 'The owner may have revoked this link or it has expired. Ask them to share a new link.'
            : 'Double-check the URL and try again.'}
        </p>
      </div>
    </ViewShell>
  );

  const blocks = report?.blocks || [];
  const columns = report?.column_meta || [];
  const filters = report?.filters || {};

  return (
    <ViewShell>
      {/* Report header */}
      <div style={{ padding:'32px 0 24px', borderBottom:'1px solid var(--color-border)', marginBottom:24 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:999, padding:'3px 12px', marginBottom:12 }}>
          <span style={{ fontSize:'0.7rem', color:'#34d399', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>📤 Shared report view</span>
        </div>
        <h1 style={{ marginBottom:8 }}>{report?.title}</h1>
        {filters && Object.keys(filters).length > 0 && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
            {filters.dateColumn && (filters.dateFrom || filters.dateTo) && (
              <FilterTag label={`${filters.dateColumn}: ${filters.dateFrom || '—'} → ${filters.dateTo || '—'}`} />
            )}
            {filters.categoryColumn && filters.categoryValues?.length > 0 && (
              <FilterTag label={`${filters.categoryColumn}: ${filters.categoryValues.join(', ')}`} />
            )}
          </div>
        )}
      </div>

      {/* Blocks — read-only, no edit controls */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {blocks.length === 0 && (
          <div className="card">
            <div className="empty-state" style={{ padding:'40px 20px' }}>
              <span className="icon">📋</span>
              <h3>This report has no blocks yet</h3>
            </div>
          </div>
        )}

        {blocks.map(block => {
          const sharedProps = {
            key: block.id,
            block,
            columns,
            reportId: null,
            shareToken: token,
            filters,
            readOnly: true,
            onUpdate: () => {},
            onSave: () => {},
            onRemove: null,
            onMoveUp: null,
            onMoveDown: null,
          };

          if (block.type === 'metric') return <MetricBlock {...sharedProps} />;
          if (block.type === 'chart')  return <ChartBlock {...sharedProps} />;
          if (block.type === 'table')  return <TableBlock {...sharedProps} />;
          if (block.type === 'text')   return <TextBlock {...sharedProps} />;
          return null;
        })}
      </div>

      <div style={{ marginTop:48, padding:'16px', background:'var(--color-surface)', borderRadius:'var(--radius-md)', border:'1px solid var(--color-border)', textAlign:'center' }}>
        <p style={{ fontSize:'0.8rem', color:'var(--color-text-subtle)' }}>
          Powered by <strong style={{ color:'var(--color-text-muted)' }}>ByteVox</strong> · Read-only shared view
        </p>
      </div>
    </ViewShell>
  );
}

function FilterTag({ label }) {
  return (
    <span style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399', borderRadius:999, padding:'3px 10px', fontSize:'0.75rem', fontWeight:500 }}>
      {label}
    </span>
  );
}

function ViewShell({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--color-bg)' }}>
      <nav style={{ background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 20px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:8, fontSize:'1.1rem', fontWeight:800, color:'var(--color-text)', textDecoration:'none' }}>
            <span>🌱</span> <span className="gradient-text">ByteVox</span>
          </a>
          <span className="badge badge-number" style={{ background:'rgba(16,185,129,0.18)', color:'#34d399' }}>
            Live Shared View
          </span>
        </div>
      </nav>
      <div className="page-container" style={{ paddingTop:0, paddingBottom:60 }}>
        {children}
      </div>
    </div>
  );
}
