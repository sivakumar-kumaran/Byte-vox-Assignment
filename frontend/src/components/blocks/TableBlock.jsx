import { useState, useEffect } from 'react';
import BlockWrapper from './BlockWrapper.jsx';
import { reportsApi } from '../../api/reports.js';
import { shareApi } from '../../api/share.js';

export default function TableBlock({ block, columns, reportId, shareToken, filters, readOnly, onSave, onRemove, onMoveUp, onMoveDown }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const compute = async (b) => {
    if (!b.sortColumn || !b.columns?.length) { setLoading(false); setError('Select columns and sort column'); return; }
    setLoading(true); setError('');
    try {
      const res = reportId
        ? await reportsApi.computeBlock(reportId, b)
        : await shareApi.computeBlock(shareToken, b);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Table computation failed');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    compute(block);
  }, [block.sortColumn, block.sortDirection, block.limit, JSON.stringify(block.columns), JSON.stringify(filters)]);

  const toggleColumn = (colName) => {
    const selected = block.columns || [];
    const updated = selected.includes(colName)
      ? selected.filter(c => c !== colName)
      : [...selected, colName];
    onSave({ ...block, columns: updated });
  };

  const configPanel = !readOnly && (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        <div className="form-group">
          <label className="form-label">Sort by</label>
          <select className="form-select" value={block.sortColumn} onChange={e => onSave({ ...block, sortColumn: e.target.value })}>
            <option value="">Select column…</option>
            {columns.map(c => <option key={c.name} value={c.name}>{c.original_name || c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Direction</label>
          <select className="form-select" value={block.sortDirection} onChange={e => onSave({ ...block, sortDirection: e.target.value })}>
            <option value="desc">Descending (↓)</option>
            <option value="asc">Ascending (↑)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Limit</label>
          <select className="form-select" value={block.limit} onChange={e => onSave({ ...block, limit: Number(e.target.value) })}>
            {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n} rows</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Visible columns</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {columns.map(c => {
            const isSelected = (block.columns || []).includes(c.name);
            return (
              <label
                key={c.name}
                style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:4,
                  cursor:'pointer',
                  fontSize:'0.8rem',
                  padding:'4px 10px',
                  background: isSelected ? 'rgba(16,185,129,0.18)' : 'var(--color-surface-3)',
                  border: `1px solid ${isSelected ? 'rgba(16,185,129,0.45)' : 'var(--color-border)'}`,
                  borderRadius:'var(--radius-sm)',
                  color: isSelected ? '#34d399' : 'var(--color-text-muted)',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all var(--transition)',
                }}
              >
                <input type="checkbox" checked={isSelected} onChange={() => toggleColumn(c.name)} style={{ display:'none' }} />
                {isSelected ? '✓ ' : ''}{c.original_name || c.name}
              </label>
            );
          })}
        </div>
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
        !result?.rows?.length ? (
          <div className="empty-state" style={{ padding:'24px 0' }}>
            <span className="icon" style={{ fontSize:'1.5rem' }}>📋</span>
            <p>No rows to display</p>
          </div>
        ) : (
          <div style={{ overflow:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {result.columns.map(col => (
                    <th key={col}>{columns.find(c=>c.name===col)?.original_name || col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr
                    key={i}
                    onClick={toggleWork}
                    style={{ cursor: 'pointer' }}
                    title="Click row to see calculation work & query"
                  >
                    {result.columns.map(col => (
                      <td key={col}>{row[col] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px' }}>
              <button
                type="button"
                onClick={toggleWork}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showWork ? '▲ Hide query details' : '▼ Click any row to show query details'}
              </button>
              <p style={{ fontSize:'0.75rem', color:'var(--color-text-subtle)' }}>
                Showing {result.rows.length} of {result.explanation?.total_rows?.toLocaleString()} rows (sorted by {block.sortColumn})
              </p>
            </div>
          </div>
        )
      )}
    </BlockWrapper>
  );
}
