import { useState } from 'react';

/**
 * BlockWrapper — the outer shell for every block.
 * Shows title, edit/move/remove controls, and the
 * "How was this calculated?" panel.
 */
export default function BlockWrapper({
  block, children, explanation, loading, error,
  onSave, onRemove, onMoveUp, onMoveDown,
  readOnly, configPanel,
}) {
  const [showWork, setShowWork] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const typeIcon = { metric:'🔢', chart:'📈', table:'📋', text:'📝' }[block.type] || '🧱';

  return (
    <div className="card" style={styles.wrapper} aria-label={block.title || block.type}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.typeIcon}>{typeIcon}</span>
          {!readOnly && showConfig ? (
            <input
              defaultValue={block.title}
              onBlur={e => onSave({ title: e.target.value })}
              style={styles.titleInput}
              placeholder="Block title…"
              aria-label="Block title"
            />
          ) : (
            <h3 style={styles.title}>{block.title || <em style={{ opacity:0.4 }}>Untitled</em>}</h3>
          )}
        </div>

        <div style={styles.actions}>
          {/* Show-your-work — available on metric/chart/table blocks */}
          {block.type !== 'text' && explanation && !loading && !error && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowWork(s => !s)}
              title="How was this calculated?"
              style={{ color: showWork ? 'var(--color-accent)' : undefined }}
              aria-expanded={showWork}
              aria-controls={`work-${block.id}`}
            >
              {showWork ? '🔍 Hide work' : '🔍 Show work'}
            </button>
          )}

          {!readOnly && (
            <>
              {configPanel && (
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowConfig(s => !s)}
                  title="Configure block"
                  style={{ color: showConfig ? 'var(--color-accent)' : undefined }}
                >⚙</button>
              )}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={onMoveUp} disabled={!onMoveUp} title="Move up" aria-label="Move block up">↑</button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={onMoveDown} disabled={!onMoveDown} title="Move down" aria-label="Move block down">↓</button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} title="Remove block" style={{ color:'var(--color-error)' }} aria-label="Remove block">✕</button>
            </>
          )}
        </div>
      </div>

      {/* ── Config panel ── */}
      {!readOnly && showConfig && configPanel && (
        <div style={styles.configPanel}>
          {configPanel}
        </div>
      )}

      {/* ── Loading / error states ── */}
      {loading && (
        <div style={styles.stateCenter}>
          <div className="spinner" />
          <span style={{ marginLeft:8, color:'var(--color-text-subtle)', fontSize:'0.85rem' }}>Computing…</span>
        </div>
      )}
      {error && !loading && (
        <div className="alert alert-error" style={{ margin:'8px 0' }}>{error}</div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && (
        <div style={styles.content}>
          {typeof children === 'function'
            ? children({ showWork, setShowWork, toggleWork: () => setShowWork(s => !s) })
            : children}
        </div>
      )}

      {/* ── Show-your-work panel ── */}
      {showWork && explanation && (
        <div id={`work-${block.id}`} style={styles.workPanel} role="region" aria-label="Calculation explanation">
          <h4 style={styles.workTitle}>🔍 How was this calculated?</h4>

          <p style={styles.workDesc}>{explanation.description}</p>

          <div style={styles.workStats}>
            <WorkStat label="Rows included" value={explanation.rows_included?.toLocaleString()} color="var(--color-success)" />
            <WorkStat label="Rows excluded" value={explanation.rows_excluded?.toLocaleString()} color="var(--color-warning)" />
            <WorkStat label="Total rows" value={explanation.total_rows?.toLocaleString()} color="var(--color-text-muted)" />
          </div>

          {explanation.filters_applied?.length > 0 && (
            <div style={styles.workFilters}>
              <span style={{ fontWeight:600, fontSize:'0.78rem' }}>Filters applied:</span>
              {explanation.filters_applied.map((f, i) => (
                <span key={i} style={styles.filterTag}>{f}</span>
              ))}
            </div>
          )}

          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:'0.72rem', color:'var(--color-text-subtle)', marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Exact query executed
            </div>
            <pre className="code-block">{explanation.sql}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkStat({ label, value, color }) {
  return (
    <div style={{ textAlign:'center', padding:'6px 12px', background:'var(--color-surface-2)', borderRadius:'var(--radius-sm)' }}>
      <div style={{ fontWeight:700, fontSize:'1rem', color }}>{value ?? '—'}</div>
      <div style={{ fontSize:'0.68rem', color:'var(--color-text-subtle)', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:2 }}>{label}</div>
    </div>
  );
}

const styles = {
  wrapper: { transition:'all 150ms ease', overflow:'hidden' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:12, flexWrap:'wrap' },
  titleRow: { display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1 },
  typeIcon: { fontSize:'1rem', flexShrink:0 },
  title: { fontSize:'0.95rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  titleInput: { background:'var(--color-surface-2)', border:'1px solid var(--color-accent)', borderRadius:'var(--radius-sm)', color:'var(--color-text)', padding:'3px 8px', fontWeight:600, fontSize:'0.9rem', flex:1, minWidth:0 },
  actions: { display:'flex', alignItems:'center', gap:2, flexShrink:0 },
  configPanel: { background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', padding:16, marginBottom:14, display:'flex', flexDirection:'column', gap:12 },
  stateCenter: { display:'flex', alignItems:'center', padding:'20px 0' },
  content: {},
  workPanel: { marginTop:16, padding:16, background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'var(--radius-md)' },
  workTitle: { fontSize:'0.9rem', fontWeight:700, color:'#818cf8', marginBottom:10 },
  workDesc: { fontSize:'0.875rem', color:'var(--color-text-muted)', marginBottom:12, lineHeight:1.6 },
  workStats: { display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' },
  workFilters: { display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:10, fontSize:'0.78rem', color:'var(--color-text-muted)' },
  filterTag: { background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:999, padding:'2px 8px', color:'#a5b4fc' },
};
