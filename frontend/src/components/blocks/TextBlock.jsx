import { useState } from 'react';
import BlockWrapper from './BlockWrapper.jsx';

export default function TextBlock({ block, readOnly, onSave, onRemove, onMoveUp, onMoveDown }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(block.content || '');

  const saveText = () => {
    setEditing(false);
    onSave({ ...block, content: draft });
  };

  return (
    <BlockWrapper
      block={block}
      loading={false}
      error=""
      explanation={null}
      onSave={onSave}
      onRemove={onRemove}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      readOnly={readOnly}
      configPanel={null}
    >
      {!readOnly && editing ? (
        <div>
          <textarea
            className="form-textarea"
            rows={4}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
            style={{ width:'100%', resize:'vertical' }}
            aria-label="Note content"
          />
          <div style={{ display:'flex', gap:8, marginTop:8, justifyContent:'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setDraft(block.content); setEditing(false); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={saveText}>Save note</button>
          </div>
        </div>
      ) : (
        <p
          style={{ color:'var(--color-text-muted)', fontSize:'0.9rem', lineHeight:1.7, whiteSpace:'pre-wrap', cursor: readOnly ? 'default' : 'text', minHeight:40 }}
          onClick={() => !readOnly && setEditing(true)}
          title={readOnly ? '' : 'Click to edit'}
        >
          {block.content || <em style={{ opacity:0.5 }}>Click to add a note…</em>}
        </p>
      )}
    </BlockWrapper>
  );
}
