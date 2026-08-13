import axios from 'axios';

// In production the client is served by Express at the same origin, so use relative URLs.
// In dev, proxy to the local Express server.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001'),
});

// --- Contacts ---
export const getContacts = (search) =>
  api.get('/api/contacts', { params: search ? { search } : {} }).then((r) => r.data);

export const createContact = (data) =>
  api.post('/api/contacts', data).then((r) => r.data);

export const updateContact = (id, data) =>
  api.put(`/api/contacts/${id}`, data).then((r) => r.data);

export const deleteContact = (id) =>
  api.delete(`/api/contacts/${id}`).then((r) => r.data);

// --- Calls ---
export const getCalls = (params) =>
  api.get('/api/calls', { params }).then((r) => r.data);

export const patchCall = (id, data) =>
  api.patch(`/api/calls/${id}`, data).then((r) => r.data);

// --- Token ---
export const getToken = () =>
  api.get('/voice/token').then((r) => r.data.token);
