import { useState, useEffect } from 'react';
import BlockWrapper from './BlockWrapper.jsx';
import { reportsApi } from '../../api/reports.js';
import { shareApi } from '../../api/share.js';

const AGG_OPTS = ['sum', 'average', 'count', 'min', 'max'];

function formatValue(val, agg) {
  if (val === undefined || val === null || !isFinite(val)) return '—';
  if (agg === 'count') return Math.round(val).toLocaleString();
  if (Number.isInteger(val)) return val.toLocaleString();
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MetricBlock({ block, columns, reportId, shareToken, filters, readOnly, onSave, onRemove, onMoveUp, onMoveDown }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const numericCols = columns.filter(c => c.type === 'number');
  const catCols = columns.filter(c => c.type === 'category' || c.type === 'date');

  const compute = async (b) => {
    if (!b.column) { setLoading(false); setError('Select a column'); return; }
    setLoading(true); setError('');
    try {
      const res = reportId
        ? await reportsApi.computeBlock(reportId, b)
        : await shareApi.computeBlock(shareToken, b);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Computation failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { compute(block); }, [block.column, block.aggregation, block.groupBy, JSON.stringify(filters)]);

  const handle = (field, val) => {
    const updated = { ...block, [field]: val };
    onSave(updated);
  };

  const configPanel = !readOnly && (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      <div className="form-group">
        <label className="form-label">Column</label>
        <select className="form-select" value={block.column} onChange={e => handle('column', e.target.value)}>
          <option value="">Select column…</option>
          {numericCols.map(c => <option key={c.name} value={c.name}>{c.original_name || c.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Aggregation</label>
        <select className="form-select" value={block.aggregation} onChange={e => handle('aggregation', e.target.value)}>
          {AGG_OPTS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ gridColumn:'1 / -1' }}>
        <label className="form-label">Group by (optional)</label>
        <select className="form-select" value={block.groupBy || ''} onChange={e => handle('groupBy', e.target.value || undefined)}>
          <option value="">— No grouping —</option>
          {catCols.map(c => <option key={c.name} value={c.name}>{c.original_name || c.name}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <BlockWrapper
      block={block}
      loading={loading}
      error={error}
      explanation={result?.explanation}
      onSave={onSave}
      onRemove={onRemove}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      readOnly={readOnly}
      configPanel={configPanel}
    >
      {({ showWork, toggleWork }) => (
        !result?.groups ? (
          /* ── Scalar metric ── */
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <div
              style={{ ...styles.bigNum, cursor: 'pointer' }}
              onClick={toggleWork}
              title="Click number to see how it was calculated"
              id={`metric-value-${block.id}`}
            >
              {formatValue(result?.value, block.aggregation)}
            </div>
            <div style={styles.metaRow}>
              <span className={`badge badge-${numericCols.find(c=>c.name===block.column)?.type || 'number'}`}>
                {block.aggregation} · {columns.find(c=>c.name===block.column)?.original_name || block.column}
              </span>
              <button
                type="button"
                onClick={toggleWork}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {showWork ? '▲ Hide work' : '▼ Click number to show work'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Grouped metric ── */
          <div style={{ overflow:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{block.groupBy}</th>
                  <th>{block.aggregation.toUpperCase()}</th>
                  <th>Rows</th>
                </tr>
              </thead>
              <tbody>
                {result.groups.map((g, i) => (
                  <tr key={i} onClick={toggleWork} style={{ cursor: 'pointer' }} title="Click row to see calculation work">
                    <td>{g.category}</td>
                    <td style={{ fontWeight:600, color: 'var(--color-accent)' }}>{formatValue(g.value, block.aggregation)}</td>
                    <td style={{ color:'var(--color-text-muted)' }}>{g.row_count?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </BlockWrapper>
  );
}

const styles = {
  bigNum: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1,
    background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  metaRow: { display:'flex', gap:6, marginTop:8, flexWrap:'wrap' },
};
