import { useState } from 'react';
import { createContact, updateContact, deleteContact } from '../lib/api';

const EMPTY_FORM = { name: '', company: '', phone: '', email: '', notes: '' };

export default function Contacts({ contacts, onRefresh, onCallNumber }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c.id);
    setForm({ name: c.name, company: c.company || '', phone: c.phone, email: c.email || '', notes: c.notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      if (editing) {
        await updateContact(editing, form);
      } else {
        await createContact(form);
      }
      setShowForm(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    await deleteContact(id);
    onRefresh();
  };

  return (
    <div className="contacts-panel">
      <div className="contacts-toolbar">
        <input
          className="search-input"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="add-contact-btn" onClick={openCreate}>+ New Contact</button>
      </div>

      {showForm && (
        <div className="contact-form-card">
          <h3>{editing ? 'Edit Contact' : 'New Contact'}</h3>
          <div className="form-grid">
            <label>Name *
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </label>
            <label>Company
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" />
            </label>
            <label>Phone *
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" type="tel" />
            </label>
            <label>Email
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" />
            </label>
          </div>
          <label className="form-notes">Notes
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any notes about this contact…" />
          </label>
          <div className="form-actions">
            <button onClick={handleSave} disabled={saving || !form.name || !form.phone}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="contacts-list">
        {filtered.length === 0 && <div className="empty-state">No contacts found.</div>}
        {filtered.map((c) => (
          <div key={c.id} className="contact-row">
            <div className="contact-avatar">{initials(c.name)}</div>
            <div className="contact-info">
              <div className="contact-name">{c.name}</div>
              {c.company && <div className="contact-company">{c.company}</div>}
              <div className="contact-phone">{c.phone}</div>
            </div>
            <div className="contact-actions">
              <button className="call-contact-btn" onClick={() => onCallNumber(c.phone)} title="Call">📞</button>
              <button className="edit-btn" onClick={() => openEdit(c)} title="Edit">✏️</button>
              <button className="delete-btn" onClick={() => handleDelete(c.id)} title="Delete">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
