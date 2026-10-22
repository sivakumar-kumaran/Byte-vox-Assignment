import { useState } from 'react';

export default function FilterBar({ columns, filters, onChange }) {
  const [open, setOpen] = useState(false);
  const dateCols = columns.filter(c => c.type === 'date');
  const catCols = columns.filter(c => c.type === 'category');

  const activeFilters = [];
  if (filters?.dateColumn && (filters.dateFrom || filters.dateTo)) {
    activeFilters.push(`${filters.dateColumn}: ${filters.dateFrom || '—'} → ${filters.dateTo || '—'}`);
  }
  if (filters?.categoryColumn && filters.categoryValues?.length) {
    activeFilters.push(`${filters.categoryColumn}: ${filters.categoryValues.join(', ')}`);
  }

  const set = (field, val) => onChange({ ...filters, [field]: val });

  const clear = () => onChange({});

  return (
    <div style={styles.wrapper}>
      <div style={styles.bar}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setOpen(o => !o)}
          id="filter-toggle-btn"
          aria-expanded={open}
          aria-controls="filter-panel"
        >
          🔽 Filters {activeFilters.length > 0 && (
            <span style={{ background:'var(--color-accent)', color:'#fff', borderRadius:999, padding:'0 6px', fontSize:'0.7rem' }}>
              {activeFilters.length}
            </span>
          )}
        </button>

        {activeFilters.length > 0 && (
          <>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {activeFilters.map((f, i) => (
                <span key={i} style={styles.filterTag}>{f}</span>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={clear} style={{ color:'var(--color-error)' }}>
              Clear all
            </button>
          </>
        )}
      </div>

      {open && (
        <div id="filter-panel" style={styles.panel}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12 }}>
            {dateCols.length > 0 && (
              <>
                <div className="form-group">
                  <label className="form-label">Date column</label>
                  <select className="form-select" value={filters?.dateColumn || ''} onChange={e => set('dateColumn', e.target.value || undefined)}>
                    <option value="">— None —</option>
                    {dateCols.map(c => <option key={c.name} value={c.name}>{c.original_name || c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">From date</label>
                  <input type="date" className="form-input" value={filters?.dateFrom || ''} onChange={e => set('dateFrom', e.target.value || undefined)} />
                </div>
                <div className="form-group">
                  <label className="form-label">To date</label>
                  <input type="date" className="form-input" value={filters?.dateTo || ''} onChange={e => set('dateTo', e.target.value || undefined)} />
                </div>
              </>
            )}
            {catCols.length > 0 && (
              <>
                <div className="form-group">
                  <label className="form-label">Category column</label>
                  <select className="form-select" value={filters?.categoryColumn || ''} onChange={e => set('categoryColumn', e.target.value || undefined)}>
                    <option value="">— None —</option>
                    {catCols.map(c => <option key={c.name} value={c.name}>{c.original_name || c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category values (comma-separated)</label>
                  <input
                    className="form-input"
                    placeholder="North, South, East"
                    value={filters?.categoryValues?.join(', ') || ''}
                    onChange={e => set('categoryValues', e.target.value ? e.target.value.split(',').map(v => v.trim()).filter(Boolean) : undefined)}
                  />
                </div>
              </>
            )}
            {dateCols.length === 0 && catCols.length === 0 && (
              <p style={{ color:'var(--color-text-subtle)', fontSize:'0.875rem' }}>
                No filterable columns detected in this dataset.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { marginBottom:8 },
  bar: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' },
  panel: { background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', padding:16, marginTop:10 },
  filterTag: { background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:999, padding:'3px 10px', fontSize:'0.75rem', color:'#a5b4fc' },
};
