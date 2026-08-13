import { useState } from 'react';
import { patchCall } from '../lib/api';

export const DISPOSITIONS = [
  { value: 'interested',    label: 'Interested',     color: '#1a7a40' },
  { value: 'not-interested',label: 'Not Interested', color: '#cc2222' },
  { value: 'voicemail',     label: 'Left Voicemail', color: '#806820' },
  { value: 'call-back',     label: 'Call Back',      color: '#2a5cd6' },
  { value: 'no-answer',     label: 'No Answer',      color: '#888' },
  { value: 'wrong-number',  label: 'Wrong Number',   color: '#a040a0' },
];

function DispositionPicker({ call, onUpdate }) {
  const [open, setOpen] = useState(false);
  const current = DISPOSITIONS.find((d) => d.value === call.disposition);

  const pick = async (value) => {
    const next = call.disposition === value ? null : value;
    await patchCall(call.id, { disposition: next });
    onUpdate();
    setOpen(false);
  };

  return (
    <span className="disp-wrap">
      <button
        className="disp-current"
        style={current ? { color: current.color } : {}}
        onClick={() => setOpen((o) => !o)}
      >
        {current ? current.label : '+ tag'}
      </button>
      {open && (
        <span className="disp-menu">
          {DISPOSITIONS.map((d) => (
            <button
              key={d.value}
              className={`disp-opt ${call.disposition === d.value ? 'active' : ''}`}
              style={{ color: d.color }}
              onClick={() => pick(d.value)}
            >
              {call.disposition === d.value ? '✓ ' : ''}{d.label}
            </button>
          ))}
          {call.disposition && (
            <button className="disp-opt disp-clear" onClick={() => pick(null)}>
              Clear tag
            </button>
          )}
        </span>
      )}
    </span>
  );
}

function RecordingPlayer({ callId }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="recording-wrap">
      <button className="recording-btn" onClick={() => setOpen((o) => !o)}>
        {open ? '⏹ hide' : '▶ recording'}
      </button>
      {open && <audio className="recording-audio" controls src={`/api/calls/${callId}/recording`} />}
    </span>
  );
}

export default function CallHistory({ calls, onRefresh, onCallNumber }) {
  const [editingId, setEditingId] = useState(null);
  const [noteText, setNoteText] = useState('');

  const startEdit = (call) => { setEditingId(call.id); setNoteText(call.notes || ''); };
  const saveNote = async (id) => {
    await patchCall(id, { notes: noteText });
    setEditingId(null);
    onRefresh();
  };

  if (!calls?.length) return <div className="empty-state">No calls yet.</div>;

  return (
    <div className="call-history">
      {calls.map((call) => (
        <div key={call.id}>
          <div className={`call-row dir-${call.direction}`}>
            <span className="call-row-icon">{call.direction === 'inbound' ? '↙' : '↗'}</span>
            <div className="call-row-body">
              <div className="call-row-top">
                <span className="call-row-name">
                  {call.contact_name
                    ? <><strong>{call.contact_name}</strong>{call.contact_company ? ` · ${call.contact_company}` : ''}</>
                    : <span className="call-row-number">{call.direction === 'inbound' ? call.from_number : call.to_number}</span>
                  }
                </span>
                <span className={`call-status-pill status-${call.status}`}>{call.status}</span>
                <span className="call-row-meta">
                  {formatDate(call.started_at)}
                  {call.duration > 0 && ` · ${formatDuration(call.duration)}`}
                </span>
                <button className="call-back-btn" onClick={() => onCallNumber(call.direction === 'inbound' ? call.from_number : call.to_number)}>call back</button>
                <DispositionPicker call={call} onUpdate={onRefresh} />
                {call.recording_url && <RecordingPlayer callId={call.id} />}
                <span className="note-display" onClick={() => startEdit(call)}>
                  {call.notes ? <span className="note-text">{call.notes}</span> : <span className="note-placeholder">+ note</span>}
                </span>
              </div>
            </div>
          </div>
          {editingId === call.id && (
            <div className="note-edit">
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" rows={2} autoFocus />
              <div className="note-edit-actions">
                <button onClick={() => saveNote(call.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function formatDuration(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
