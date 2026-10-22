import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsApi } from '../api/reports.js';
import { shareApi } from '../api/share.js';
import MetricBlock from '../components/blocks/MetricBlock.jsx';
import ChartBlock from '../components/blocks/ChartBlock.jsx';
import TableBlock from '../components/blocks/TableBlock.jsx';
import TextBlock from '../components/blocks/TextBlock.jsx';
import FilterBar from '../components/FilterBar.jsx';
import BlockAdder from '../components/BlockAdder.jsx';
import ShareModal from '../components/ShareModal.jsx';

function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function ReportBuilderPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal, setTitleVal] = useState('');

  useEffect(() => {
    reportsApi.get(id)
      .then(r => {
        setReport(r);
        setColumns(r.column_meta || []);
        setTitleVal(r.title);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [id]);

  const save = useCallback(async (updates) => {
    setSaving(true);
    try {
      const updated = await reportsApi.update(id, updates);
      setReport(updated);
      setColumns(updated.column_meta || columns);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }, [id, columns]);

  const addBlock = (type) => {
    const defaultBlocks = {
      metric: { id: uuid(), type: 'metric', title: 'New Metric', column: columns.find(c=>c.type==='number')?.name || '', aggregation: 'sum' },
      chart:  { id: uuid(), type: 'chart', title: 'New Chart', chartType: 'bar', xAxis: columns.find(c=>c.type==='category'||c.type==='date')?.name || '', yAxis: columns.find(c=>c.type==='number')?.name || '', aggregation: 'sum' },
      table:  { id: uuid(), type: 'table', title: 'Top Rows', sortColumn: columns.find(c=>c.type==='number')?.name || '', sortDirection: 'desc', limit: 10, columns: columns.slice(0,4).map(c=>c.name) },
      text:   { id: uuid(), type: 'text', title: '', content: 'Add your notes here…' },
    };
    const newBlocks = [...(report?.blocks || []), defaultBlocks[type]];
    setReport(r => ({ ...r, blocks: newBlocks }));
    save({ blocks: newBlocks });
  };

  const updateBlock = (blockId, updates) => {
    const newBlocks = (report?.blocks || []).map(b => b.id === blockId ? { ...b, ...updates } : b);
    setReport(r => ({ ...r, blocks: newBlocks }));
  };

  const saveBlock = (blockId, updates) => {
    const newBlocks = (report?.blocks || []).map(b => b.id === blockId ? { ...b, ...updates } : b);
    setReport(r => ({ ...r, blocks: newBlocks }));
    save({ blocks: newBlocks });
  };

  const removeBlock = (blockId) => {
    const newBlocks = (report?.blocks || []).filter(b => b.id !== blockId);
    setReport(r => ({ ...r, blocks: newBlocks }));
    save({ blocks: newBlocks });
  };

  const moveBlock = (blockId, dir) => {
    const blocks = [...(report?.blocks || [])];
    const idx = blocks.findIndex(b => b.id === blockId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
    setReport(r => ({ ...r, blocks }));
    save({ blocks });
  };

  const updateFilters = (filters) => {
    setReport(r => ({ ...r, filters }));
    save({ filters });
  };

  const saveTitle = async () => {
    setTitleEdit(false);
    if (titleVal.trim() && titleVal !== report?.title) {
      setReport(r => ({ ...r, title: titleVal }));
      await save({ title: titleVal });
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await reportsApi.exportPDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.title || 'report'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return (
    <Shell title="">
      <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
        <div className="spinner" style={{ width:40,height:40,borderWidth:3 }} />
      </div>
    </Shell>
  );

  if (error) return (
    <Shell title="Error">
      <div className="alert alert-error">{error}</div>
    </Shell>
  );

  const blocks = report?.blocks || [];

  return (
    <Shell
      title={report?.title}
      titleEdit={titleEdit}
      titleVal={titleVal}
      setTitleEdit={setTitleEdit}
      setTitleVal={setTitleVal}
      saveTitle={saveTitle}
      saving={saving}
      onShare={() => setShareOpen(true)}
      onExport={handleExportPDF}
    >
      {/* Filter bar */}
      <FilterBar columns={columns} filters={report?.filters || {}} onChange={updateFilters} />

      {/* Blocks */}
      <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:16 }}>
        {blocks.length === 0 && (
          <div className="card">
            <div className="empty-state" style={{ padding:'40px 20px' }}>
              <span className="icon">🧱</span>
              <h3>No blocks yet</h3>
              <p>Add a metric, chart, table, or text note to build your report.</p>
            </div>
          </div>
        )}

        {blocks.map((block, idx) => {
          const props = {
            key: block.id,
            block,
            columns,
            reportId: id,
            filters: report?.filters,
            onUpdate: (updates) => updateBlock(block.id, updates),
            onSave: (updates) => saveBlock(block.id, updates),
            onRemove: () => removeBlock(block.id),
            onMoveUp: idx > 0 ? () => moveBlock(block.id, -1) : null,
            onMoveDown: idx < blocks.length - 1 ? () => moveBlock(block.id, 1) : null,
          };

          if (block.type === 'metric') return <MetricBlock {...props} />;
          if (block.type === 'chart')  return <ChartBlock {...props} />;
          if (block.type === 'table')  return <TableBlock {...props} />;
          if (block.type === 'text')   return <TextBlock {...props} />;
          return null;
        })}
      </div>

      {/* Add block */}
      <BlockAdder onAdd={addBlock} />

      {/* Share modal */}
      {shareOpen && (
        <ShareModal reportId={id} onClose={() => setShareOpen(false)} />
      )}
    </Shell>
  );
}

function Shell({ children, title, titleEdit, titleVal, setTitleEdit, setTitleVal, saveTitle, saving, onShare, onExport }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--color-bg)' }}>
      <nav style={{ background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 20px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <Link to="/dashboard" style={{ color:'var(--color-text-muted)', textDecoration:'none', fontSize:'0.875rem', whiteSpace:'nowrap' }}>
              ← Dashboard
            </Link>
            {setTitleEdit && (
              titleEdit ? (
                <input
                  value={titleVal}
                  onChange={e => setTitleVal(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => e.key === 'Enter' && saveTitle()}
                  style={{ background:'var(--color-surface-2)', border:'1px solid var(--color-accent)', borderRadius:'var(--radius-sm)', color:'var(--color-text)', padding:'4px 10px', fontWeight:700, fontSize:'1rem', maxWidth:300 }}
                  autoFocus
                />
              ) : (
                <h1
                  style={{ fontSize:'1rem', fontWeight:700, cursor:'pointer', maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                  onClick={() => setTitleEdit(true)}
                  title="Click to rename"
                >
                  {title || 'Untitled Report'}
                </h1>
              )
            )}
            {saving && <span style={{ fontSize:'0.72rem', color:'var(--color-text-subtle)', flexShrink:0 }}>Saving…</span>}
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {onExport && <button className="btn btn-secondary btn-sm hide-mobile" onClick={onExport}>↓ PDF</button>}
            {onShare && <button className="btn btn-primary btn-sm" onClick={onShare}>🔗 Share</button>}
          </div>
        </div>
      </nav>
      <div className="page-container" style={{ paddingTop:24, paddingBottom:80 }}>
        {children}
      </div>
    </div>
  );
}
