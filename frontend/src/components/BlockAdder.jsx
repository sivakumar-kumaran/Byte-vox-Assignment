export default function BlockAdder({ onAdd }) {
  const types = [
    { type: 'metric', icon: '🔢', label: 'Metric', desc: 'Sum, average, count, min, max' },
    { type: 'chart',  icon: '📈', label: 'Chart',  desc: 'Bar or line chart' },
    { type: 'table',  icon: '📋', label: 'Table',  desc: 'Top rows sorted by a column' },
    { type: 'text',   icon: '📝', label: 'Note',   desc: 'Text annotation' },
  ];

  return (
    <div style={styles.wrapper}>
      <div style={styles.label}>Add a block</div>
      <div style={styles.grid}>
        {types.map(({ type, icon, label, desc }) => (
          <button
            key={type}
            className="btn btn-secondary"
            style={styles.btn}
            onClick={() => onAdd(type)}
            id={`add-${type}-block`}
            aria-label={`Add ${label} block`}
          >
            <span style={{ fontSize:'1.2rem' }}>{icon}</span>
            <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{label}</span>
            <span style={{ fontSize:'0.72rem', color:'var(--color-text-subtle)' }}>{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { marginTop:24, padding:'20px 0', borderTop:'1px dashed var(--color-border)' },
  label: { fontSize:'0.72rem', color:'var(--color-text-subtle)', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600, marginBottom:12 },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10 },
  btn: { flexDirection:'column', alignItems:'center', gap:4, padding:'14px 12px', height:'auto', textAlign:'center', transition:'all 150ms' },
};
