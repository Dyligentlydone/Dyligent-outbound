require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware — allow same-origin (production) and local dev client
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.CLIENT_ORIGIN,
  process.env.BASE_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (Twilio webhooks, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // permissive for now — tighten after confirming working
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio webhooks send urlencoded

// Routes
app.use('/voice', require('./routes/voice'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/calls', require('./routes/calls'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Serve built React client in production
const clientBuild = path.join(__dirname, '../client/dist');
const fs = require('fs');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Dyligent Outbound server running on http://localhost:${PORT}`);
});
