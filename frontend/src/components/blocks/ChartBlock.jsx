import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BlockWrapper from './BlockWrapper.jsx';
import { reportsApi } from '../../api/reports.js';
import { shareApi } from '../../api/share.js';

const AGG_OPTS = ['sum', 'average', 'count', 'min', 'max'];
const COLORS = ['#10b981', '#34d399', '#059669', '#14b8a6', '#6ee7b7'];

export default function ChartBlock({ block, columns, reportId, shareToken, filters, readOnly, onSave, onRemove, onMoveUp, onMoveDown }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'

  const numericCols = columns.filter(c => c.type === 'number');
  const catCols = columns.filter(c => c.type !== 'number');

  const compute = async (b) => {
    if (!b.xAxis || !b.yAxis) { setLoading(false); setError('Select X and Y axes'); return; }
    setLoading(true); setError('');
    try {
      const res = reportId
        ? await reportsApi.computeBlock(reportId, b)
        : await shareApi.computeBlock(shareToken, b);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Chart computation failed');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    compute(block);
  }, [block.xAxis, block.yAxis, block.aggregation, block.chartType, JSON.stringify(filters)]);

  const handle = (field, val) => onSave({ ...block, [field]: val });

  const chartData = result
    ? result.labels.map((l, i) => ({ name: l, value: result.values[i] }))
    : [];

  const configPanel = !readOnly && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div className="form-group">
        <label className="form-label">Chart type</label>
        <select className="form-select" value={block.chartType} onChange={e => handle('chartType', e.target.value)}>
          <option value="bar">Bar chart</option>
          <option value="line">Line chart</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Aggregation</label>
        <select className="form-select" value={block.aggregation} onChange={e => handle('aggregation', e.target.value)}>
          {AGG_OPTS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">X Axis (group by)</label>
        <select className="form-select" value={block.xAxis} onChange={e => handle('xAxis', e.target.value)}>
          <option value="">Select column…</option>
          {catCols.map(c => <option key={c.name} value={c.name}>{c.original_name || c.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Y Axis (value)</label>
        <select className="form-select" value={block.yAxis} onChange={e => handle('yAxis', e.target.value)}>
          <option value="">Select column…</option>
          {numericCols.map(c => <option key={c.name} value={c.name}>{c.original_name || c.name}</option>)}
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
        <div>
          {/* Quick Toolbar for Chart View Options */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            {/* View Switcher: Bar Chart | Line Chart | Table View */}
            <div style={{ display: 'inline-flex', background: 'var(--color-surface-2)', padding: '2px 4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: viewMode === 'chart' && block.chartType === 'bar' ? 'var(--color-surface-3)' : 'transparent',
                  color: viewMode === 'chart' && block.chartType === 'bar' ? '#34d399' : 'var(--color-text-muted)',
                  border: viewMode === 'chart' && block.chartType === 'bar' ? '1px solid var(--color-border-light)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                }}
                onClick={() => {
                  setViewMode('chart');
                  if (block.chartType !== 'bar') handle('chartType', 'bar');
                }}
                title="Bar Chart view"
              >
                📊 Bar Chart
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: viewMode === 'chart' && block.chartType === 'line' ? 'var(--color-surface-3)' : 'transparent',
                  color: viewMode === 'chart' && block.chartType === 'line' ? '#34d399' : 'var(--color-text-muted)',
                  border: viewMode === 'chart' && block.chartType === 'line' ? '1px solid var(--color-border-light)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                }}
                onClick={() => {
                  setViewMode('chart');
                  if (block.chartType !== 'line') handle('chartType', 'line');
                }}
                title="Line Chart view"
              >
                📈 Line Chart
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: viewMode === 'table' ? 'var(--color-surface-3)' : 'transparent',
                  color: viewMode === 'table' ? '#34d399' : 'var(--color-text-muted)',
                  border: viewMode === 'table' ? '1px solid var(--color-border-light)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                }}
                onClick={() => setViewMode(v => v === 'table' ? 'chart' : 'table')}
                title="Tabulated results view"
              >
                📋 Data Table
              </button>
            </div>

            {/* Quick meta hint */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge badge-number">
                {block.aggregation} of {block.yAxis}
              </span>
              <span className="badge badge-category">
                by {block.xAxis}
              </span>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <span className="icon" style={{ fontSize: '1.5rem' }}>📊</span>
              <p>No data to display</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View of Chart Aggregates */
            <div style={{ overflow: 'auto', maxHeight: 280 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{block.xAxis} (Group)</th>
                    <th>{block.yAxis} ({block.aggregation.toUpperCase()})</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((d, i) => (
                    <tr key={i} onClick={toggleWork} style={{ cursor: 'pointer' }} title="Click row to see calculation details">
                      <td>{d.name}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                        {typeof d.value === 'number' ? d.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : d.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Graphical Chart View */
            <div onClick={toggleWork} style={{ cursor: 'pointer' }} title="Click chart to show how values were calculated">
              <ResponsiveContainer width="100%" height={280}>
                {block.chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 20, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ fill: '#34d399', stroke: '#059669', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#10b981' }}
                      name={block.yAxis}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 20, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name={block.yAxis} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </BlockWrapper>
  );
}

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border-light)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontSize: 13,
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
};
