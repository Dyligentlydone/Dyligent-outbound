import { useState, useEffect } from 'react';
import { getCalls, patchCall } from '../lib/api';
import { DISPOSITIONS } from './CallHistory';

const FILTERS = [
  { value: 'all',           label: 'All Tagged' },
  ...DISPOSITIONS,
  { value: 'untagged',      label: 'Untagged',  color: '#aaa' },
];

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function formatDuration(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function Dispositions({ onCallNumber }) {
  const [filter, setFilter] = useState('all');
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async (f) => {
    setLoading(true);
    try {
      const params = f === 'all' ? {} : { disposition: f };
      // for 'all tagged', exclude untagged
      const data = await getCalls(params);
      const filtered = f === 'all'
        ? data.filter((c) => c.disposition)
        : data;
      setCalls(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const retag = async (call, value) => {
    const next = call.disposition === value ? null : value;
    await patchCall(call.id, { disposition: next });
    load(filter);
  };

  return (
    <div className="dispositions-panel">
      {/* Filter pills */}
      <div className="disp-filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`disp-filter-btn ${filter === f.value ? 'active' : ''}`}
            style={filter === f.value && f.color ? { borderColor: f.color, color: f.color } : {}}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="empty-state">Loading…</div>}
      {!loading && calls.length === 0 && <div className="empty-state">No calls with this tag yet.</div>}

      {!loading && calls.length > 0 && (
        <div className="call-history">
          {calls.map((call) => {
            const disp = DISPOSITIONS.find((d) => d.value === call.disposition);
            return (
              <div key={call.id} className={`call-row dir-${call.direction}`}>
                <span className="call-row-icon">{call.direction === 'inbound' ? '↙' : '↗'}</span>
                <div className="call-row-body">
                  <div className="call-row-top">
                    <span className="call-row-name">
                      {call.contact_name
                        ? <><strong>{call.contact_name}</strong>{call.contact_company ? ` · ${call.contact_company}` : ''}</>
                        : <span className="call-row-number">{call.direction === 'inbound' ? call.from_number : call.to_number}</span>
                      }
                    </span>
                    {disp && <span className="disp-badge" style={{ color: disp.color }}>{disp.label}</span>}
                    <span className="call-row-meta">
                      {formatDate(call.started_at)}
                      {call.duration > 0 && ` · ${formatDuration(call.duration)}`}
                    </span>
                    <button className="call-back-btn" onClick={() => onCallNumber(call.direction === 'inbound' ? call.from_number : call.to_number)}>call back</button>
                    {/* Re-tag inline */}
                    <span className="disp-retag-row">
                      {DISPOSITIONS.map((d) => (
                        <button
                          key={d.value}
                          className={`disp-retag-btn ${call.disposition === d.value ? 'active' : ''}`}
                          style={{ color: d.color }}
                          onClick={() => retag(call, d.value)}
                          title={d.label}
                        >
                          {d.label[0]}
                        </button>
                      ))}
                    </span>
                    {call.notes && <span className="note-text">{call.notes}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
