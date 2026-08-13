export default function IncomingCall({ call, onAccept, onReject, contacts }) {
  if (!call) return null;

  const from = call.parameters?.From || 'Unknown';
  const contact = contacts?.find(
    (c) => c.phone === from || c.phone.replace(/\D/g, '') === from.replace(/\D/g, '')
  );

  return (
    <div className="incoming-overlay">
      <div className="incoming-card">
        <div className="incoming-icon">📲</div>
        <div className="incoming-label">Incoming Call</div>
        <div className="incoming-name">{contact ? contact.name : from}</div>
        {contact?.company && <div className="incoming-company">{contact.company}</div>}
        <div className="incoming-number">{from}</div>
        <div className="incoming-actions">
          <button className="reject-btn" onClick={onReject}>📵 Decline</button>
          <button className="accept-btn" onClick={onAccept}>📞 Answer</button>
        </div>
      </div>
    </div>
  );
}
