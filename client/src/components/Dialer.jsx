import { useState } from 'react';

const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
  ['*', ''], ['0', '+'], ['#', ''],
];

export default function Dialer({ onCall, onDigit, activeCall, callStatus, onHangUp, onMute, deviceState }) {
  const [number, setNumber] = useState('');
  const [muted, setMuted] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);

  const handleKey = (key) => {
    if (activeCall) {
      onDigit(key);
    } else {
      setNumber((prev) => prev + key);
    }
  };

  const handleCall = () => {
    if (!number.trim()) return;
    onCall(number.trim());
  };

  const handleHangUp = () => {
    onHangUp();
    setMuted(false);
    setShowKeypad(false);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    onMute(next);
  };

  const isConnected = callStatus === 'in-progress';
  const isCalling = callStatus === 'initiated' || callStatus === 'ringing';

  return (
    <div className="dialer">
      <div className="dialer-display">
        {activeCall ? (
          <div className="call-active-info">
            <div className="call-status-badge">{statusLabel(callStatus)}</div>
            <div className="call-number">{number || 'Unknown'}</div>
          </div>
        ) : (
          <input
            className="dialer-input"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter number…"
            type="tel"
          />
        )}
      </div>

      {/* Active call controls */}
      {activeCall ? (
        <div className="call-controls">
          <button
            className={`ctrl-btn ${muted ? 'active' : ''}`}
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🎙️'}
            <span>{muted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            className={`ctrl-btn ${showKeypad ? 'active' : ''}`}
            onClick={() => setShowKeypad((p) => !p)}
            title="Keypad"
          >
            ⌨️<span>Keypad</span>
          </button>
          <button className="ctrl-btn hang-up" onClick={handleHangUp} title="End call">
            📵<span>End</span>
          </button>
        </div>
      ) : (
        <div className="dialer-actions">
          <button
            className="call-btn"
            onClick={handleCall}
            disabled={!number.trim() || deviceState !== 'registered'}
            title={deviceState !== 'registered' ? 'Device not ready' : 'Call'}
          >
            📞 Call
          </button>
          {number && (
            <button className="clear-btn" onClick={() => setNumber('')}>✕</button>
          )}
        </div>
      )}

      {/* Keypad */}
      {(!activeCall || showKeypad) && (
        <div className="keypad">
          {KEYS.map(([main, sub]) => (
            <button key={main} className="key-btn" onClick={() => handleKey(main)}>
              <span className="key-main">{main}</span>
              {sub && <span className="key-sub">{sub}</span>}
            </button>
          ))}
        </div>
      )}

      <div className={`device-badge device-${deviceState}`}>
        {deviceStateDot(deviceState)} {deviceStateLabel(deviceState)}
      </div>
    </div>
  );
}

function statusLabel(s) {
  return { initiated: 'Calling…', ringing: 'Ringing…', 'in-progress': 'Connected', completed: 'Ended', failed: 'Failed', cancelled: 'Cancelled' }[s] || s;
}
function deviceStateDot(s) {
  return { registered: '●', registering: '◌', unregistered: '○', error: '!' }[s] || '○';
}
function deviceStateLabel(s) {
  return { registered: 'Ready', registering: 'Connecting…', unregistered: 'Offline', error: 'Error' }[s] || s;
}
