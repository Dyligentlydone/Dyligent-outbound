import { useState } from 'react';
import { patchCall } from '../lib/api';

export default function CallHistory({ calls, onRefresh, onCallNumber }) {
  const [editingId, setEditingId] = useState(null);
  const [noteText, setNoteText] = useState('');

  const startEdit = (call) => {
    setEditingId(call.id);
    setNoteText(call.notes || '');
  };

  const saveNote = async (id) => {
    await patchCall(id, { notes: noteText });
    setEditingId(null);
    onRefresh();
  };

  if (!calls?.length) {
    return <div className="empty-state">No calls yet.</div>;
  }

  return (
    <div className="call-history">
      {calls.map((call) => (
        <div key={call.id} className={`call-row dir-${call.direction}`}>
          <div className="call-row-icon" title={call.direction}>
            {call.direction === 'inbound' ? '📥' : '📤'}
          </div>
          <div className="call-row-body">
            <div className="call-row-top">
              <span className="call-row-name">
                {call.contact_name
                  ? <><strong>{call.contact_name}</strong>{call.contact_company ? ` · ${call.contact_company}` : ''}</>
                  : <span className="call-row-number">{call.direction === 'inbound' ? call.from_number : call.to_number}</span>
                }
              </span>
              <span className={`call-status-pill status-${call.status}`}>{call.status}</span>
            </div>
            <div className="call-row-meta">
              {formatDate(call.started_at)}
              {call.duration > 0 && <> · {formatDuration(call.duration)}</>}
              <button
                className="call-back-btn"
                title="Call this number"
                onClick={() => onCallNumber(call.direction === 'inbound' ? call.from_number : call.to_number)}
              >
                ↩ Call
              </button>
            </div>

            {/* Notes */}
            {editingId === call.id ? (
              <div className="note-edit">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add notes about this call…"
                  rows={3}
                  autoFocus
                />
                <div className="note-edit-actions">
                  <button onClick={() => saveNote(call.id)}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="note-display" onClick={() => startEdit(call)}>
                {call.notes
                  ? <span className="note-text">📝 {call.notes}</span>
                  : <span className="note-placeholder">+ Add note</span>
                }
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
