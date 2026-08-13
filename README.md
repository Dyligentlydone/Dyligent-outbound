# Dyligent Outbound

Browser-based calling app for outbound cold calling and inbound call handling, powered by **Twilio Voice**.

## Features

- 📞 Make outbound calls from your browser with a dial pad
- 📲 Receive inbound calls with answer / reject UI
- 🔇 Mute, in-call keypad (DTMF)
- 📋 Contact list with click-to-call
- 📜 Full call history with notes
- 💾 SQLite database — no external DB needed

---

## Quick Start

### 1. Clone & install
```bash
cd dyligent-outbound
npm install
cd client && npm install && cd ..
```

### 2. Configure Twilio

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

You'll need from the [Twilio Console](https://console.twilio.com):

| Variable | Where to find it |
|---|---|
| `TWILIO_ACCOUNT_SID` | Console dashboard |
| `TWILIO_AUTH_TOKEN` | Console dashboard |
| `TWILIO_API_KEY` | Console > Account > API Keys & Tokens |
| `TWILIO_API_SECRET` | Shown once when creating the API Key |
| `TWILIO_PHONE_NUMBER` | Console > Phone Numbers |
| `TWILIO_TWIML_APP_SID` | Console > Voice > TwiML Apps |

### 3. Create a TwiML App

1. Go to **Console > Voice > TwiML Apps → Create**
2. Set **Voice Request URL** to: `https://YOUR_DOMAIN/voice/inbound`
3. Copy the **SID** into `TWILIO_TWIML_APP_SID`

> For local dev, use [ngrok](https://ngrok.com): `ngrok http 3001`  
> Then set `BASE_URL=https://xxxx.ngrok-free.app`

### 4. Point your Twilio number at your server

In **Console > Phone Numbers → your number**:
- Voice → "A Call Comes In" → **Webhook** → `https://YOUR_DOMAIN/voice/inbound`

### 5. Run in development
```bash
npm run dev
```
- Server: http://localhost:3001  
- Client: http://localhost:5173

### 6. Production build
```bash
npm run build   # builds React into client/dist
npm start       # Express serves both API + static client
```

---

## Project Structure

```
dyligent-outbound/
├── server/
│   ├── index.js            # Express entry point
│   ├── routes/
│   │   ├── voice.js        # Twilio token + TwiML webhooks
│   │   ├── calls.js        # Call history API
│   │   └── contacts.js     # Contacts CRUD API
│   └── db/
│       └── schema.js       # SQLite setup
├── client/                 # React + Vite frontend
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── Dialer.jsx
│       │   ├── IncomingCall.jsx
│       │   ├── CallHistory.jsx
│       │   └── Contacts.jsx
│       └── hooks/
│           └── useTwilioDevice.js
├── data/                   # SQLite DB (auto-created)
├── .env.example
└── package.json
```
