const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const db = require('../db/schema');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_TWIML_APP_SID,
  TWILIO_PHONE_NUMBER,
} = process.env;

// GET /voice/token — issues a Twilio Access Token for the browser Voice SDK
router.get('/token', (req, res) => {
  if (!TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_ACCOUNT_SID || !TWILIO_TWIML_APP_SID) {
    return res.status(500).json({ error: 'Twilio env vars not configured' });
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: TWILIO_TWIML_APP_SID,
    incomingAllow: true,
  });

  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, {
    identity: 'dyligent-agent',
    ttl: 3600,
  });
  token.addGrant(voiceGrant);

  res.json({ token: token.toJwt() });
});

// POST /voice/outbound — TwiML webhook: Twilio calls this when the browser initiates an outbound call
router.post('/outbound', (req, res) => {
  const { To, From, CallSid } = req.body;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (!To) {
    twiml.say('No destination number provided.');
    return res.type('text/xml').send(twiml.toString());
  }

  // Look up contact for linking
  const contact = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(To);

  // Log outbound call
  db.prepare(`
    INSERT OR IGNORE INTO calls (twilio_sid, direction, from_number, to_number, status, contact_id)
    VALUES (?, 'outbound', ?, ?, 'initiated', ?)
  `).run(CallSid, From || TWILIO_PHONE_NUMBER, To, contact ? contact.id : null);

  const dial = twiml.dial({
    callerId: TWILIO_PHONE_NUMBER,
    action: `${process.env.BASE_URL}/voice/status`,
    method: 'POST',
  });
  dial.number({
    statusCallback: `${process.env.BASE_URL}/api/calls/status`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: 'initiated ringing answered completed',
  }, To);

  res.type('text/xml').send(twiml.toString());
});

// POST /voice/inbound — TwiML webhook: Twilio calls this for incoming calls to your number
router.post('/inbound', (req, res) => {
  const { From, To, CallSid } = req.body;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  // Look up contact
  const contact = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(From);

  // Log inbound call
  db.prepare(`
    INSERT OR IGNORE INTO calls (twilio_sid, direction, from_number, to_number, status, contact_id)
    VALUES (?, 'inbound', ?, ?, 'ringing', ?)
  `).run(CallSid, From, To || TWILIO_PHONE_NUMBER, contact ? contact.id : null);

  // Forward to browser client
  const dial = twiml.dial({
    action: `${process.env.BASE_URL}/voice/status`,
    method: 'POST',
  });
  dial.client({
    statusCallback: `${process.env.BASE_URL}/api/calls/status`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: 'initiated ringing answered completed',
  }, 'dyligent-agent');

  res.type('text/xml').send(twiml.toString());
});

// POST /voice/status — TwiML action callback after a call leg completes
router.post('/status', (req, res) => {
  res.sendStatus(200);
});

module.exports = router;
