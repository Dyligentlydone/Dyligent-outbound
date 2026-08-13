import { useState, useEffect, useCallback } from 'react';
import Dialer from './components/Dialer';
import IncomingCall from './components/IncomingCall';
import CallHistory from './components/CallHistory';
import Contacts from './components/Contacts';
import Dispositions from './components/Dispositions';
import Stats from './components/Stats';
import { useTwilioDevice } from './hooks/useTwilioDevice';
import { getContacts, getCalls } from './lib/api';
import './App.css';

const TABS = ['Dialer', 'Contacts', 'History'];

export default function App() {
  const [tab, setTab] = useState('Dialer');
  const [contacts, setContacts] = useState([]);
  const [calls, setCalls] = useState([]);
  const [dialTarget, setDialTarget] = useState('');

  const {
    deviceState,
    activeCall,
    incomingCall,
    callStatus,
    error,
    makeCall,
    hangUp,
    muteCall,
    sendDigit,
    acceptIncoming,
    rejectIncoming,
    reconnect,
  } = useTwilioDevice();

  const loadContacts = useCallback(() => getContacts().then(setContacts), []);
  const loadCalls = useCallback(() => getCalls().then(setCalls), []);

  useEffect(() => {
    loadContacts();
    loadCalls();
  }, [loadContacts, loadCalls]);

  // Refresh calls when a call ends
  useEffect(() => {
    if (callStatus === 'completed' || callStatus === 'failed') {
      setTimeout(loadCalls, 1500);
    }
  }, [callStatus, loadCalls]);

  const handleCall = async (number) => {
    setDialTarget(number);
    try {
      await makeCall(number);
      setTab('Dialer');
    } catch (e) {
      alert(`Failed to start call: ${e.message}`);
    }
  };

  const handleCallFromContacts = (phone) => {
    setDialTarget(phone);
    setTab('Dialer');
    setTimeout(() => handleCall(phone), 100);
  };

  const handleCallFromHistory = (phone) => {
    setDialTarget(phone);
    setTab('Dialer');
    setTimeout(() => handleCall(phone), 100);
  };

  return (
    <div className="app">
      <div className="app-body">
        {/* Left: Dialer on the paper */}
        <aside className="dialer-sidebar">
          <Dialer
            onCall={handleCall}
            onDigit={sendDigit}
            onHangUp={hangUp}
            onMute={muteCall}
            activeCall={activeCall}
            callStatus={callStatus}
            deviceState={deviceState}
            initialNumber={dialTarget}
          />
        </aside>

        {/* Right: nav + content on the paper */}
        <main className="main-panel">
          <nav className="paper-nav">
            {['Contacts', 'History', 'Dispositions', 'Stats'].map((t) => (
              <button
                key={t}
                className={`paper-nav-btn ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'Contacts' ? `Contacts (${contacts.length})` : t}
              </button>
            ))}
            {error && (
              <span className="paper-error">⚠️ {error} <button onClick={reconnect}>Reconnect</button></span>
            )}
          </nav>
          <div className="tab-content">
            {tab === 'Contacts' && (
              <Contacts contacts={contacts} onRefresh={loadContacts} onCallNumber={handleCallFromContacts} />
            )}
            {tab === 'History' && (
              <CallHistory calls={calls} onRefresh={loadCalls} onCallNumber={handleCallFromHistory} />
            )}
            {tab === 'Dispositions' && (
              <Dispositions onCallNumber={handleCallFromHistory} />
            )}
            {tab === 'Stats' && <Stats />}
          </div>
        </main>
      </div>

      {/* Incoming call overlay */}
      <IncomingCall
        call={incomingCall}
        contacts={contacts}
        onAccept={acceptIncoming}
        onReject={rejectIncoming}
      />
    </div>
  );
}
