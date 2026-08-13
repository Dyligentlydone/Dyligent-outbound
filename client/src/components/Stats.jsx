import { useState, useEffect } from 'react';
import { getStats } from '../lib/api';
import { DISPOSITIONS } from './CallHistory';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'custom', label: 'Custom' },
];

function fmt(secs) {
  if (!secs) return '0s';
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Stats() {
  const [period, setPeriod] = useState('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = { period };
      if (period === 'custom') { params.from = from; params.to = to; }
      const res = await getStats(params);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom' || (from && to)) load();
  }, [period, from, to]);

  const t = data?.totals;
  const connectRate = t?.total > 0 ? Math.round((t.connected / t.total) * 100) : 0;

  return (
    <div className="stats-panel">
      {/* Period selector */}
      <div className="stats-period-row">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`disp-filter-btn ${period === p.value ? 'active' : ''}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <span className="custom-range">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </span>
        )}
      </div>

      {loading && <div className="empty-state">Loading…</div>}

      {!loading && t && (
        <>
          {/* Key metrics */}
          <div className="stat-cards">
            <StatCard label="Total Calls"      value={t.total} />
            <StatCard label="Outbound"         value={t.outbound} />
            <StatCard label="Inbound"          value={t.inbound} />
            <StatCard label="Connected"        value={t.connected}  sub={`${connectRate}% connect rate`} />
            <StatCard label="Missed / Failed"  value={t.missed} />
            <StatCard label="Talk Time"        value={fmt(t.total_duration)} />
            <StatCard label="Avg Duration"     value={fmt(Math.round(t.avg_duration))} />
            <StatCard label="Unique Numbers"   value={t.unique_numbers} />
          </div>

          {/* By disposition */}
          {data.byDisposition?.length > 0 && (
            <div className="stats-section">
              <div className="stats-section-title">By Disposition</div>
              {data.byDisposition.map((row) => {
                const disp = DISPOSITIONS.find((d) => d.value === row.disposition);
                const pct = t.total > 0 ? Math.round((row.count / t.total) * 100) : 0;
                return (
                  <div key={row.disposition} className="stats-bar-row">
                    <span className="stats-bar-label" style={{ color: disp?.color || '#888' }}>
                      {disp?.label || row.disposition}
                    </span>
                    <div className="stats-bar-track">
                      <div className="stats-bar-fill" style={{ width: `${pct}%`, background: disp?.color || '#aaa' }} />
                    </div>
                    <span className="stats-bar-count">{row.count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Calls by hour */}
          {data.byHour?.length > 0 && (
            <div className="stats-section">
              <div className="stats-section-title">Calls by Hour</div>
              <div className="stats-hour-grid">
                {Array.from({ length: 24 }, (_, h) => {
                  const row = data.byHour.find((r) => r.hour === h);
                  const count = row?.count || 0;
                  const max = Math.max(...data.byHour.map((r) => r.count), 1);
                  return (
                    <div key={h} className="stats-hour-col">
                      <div className="stats-hour-bar" style={{ height: `${Math.round((count / max) * 40)}px` }} />
                      <div className="stats-hour-label">{count > 0 ? h : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily breakdown (week/custom only) */}
          {period !== 'today' && data.byDay?.length > 0 && (
            <div className="stats-section">
              <div className="stats-section-title">Daily Breakdown</div>
              {data.byDay.map((row) => {
                const pct = t.total > 0 ? Math.round((row.count / t.total) * 100) : 0;
                return (
                  <div key={row.day} className="stats-bar-row">
                    <span className="stats-bar-label" style={{ color: '#3a4870' }}>
                      {new Date(row.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="stats-bar-track">
                      <div className="stats-bar-fill" style={{ width: `${pct}%`, background: '#2a5cd6' }} />
                    </div>
                    <span className="stats-bar-count">{row.count} ({row.connected} connected)</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
