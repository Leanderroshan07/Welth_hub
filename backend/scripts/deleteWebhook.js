#!/usr/bin/env node
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in backend/.env or environment.');
  process.exit(1);
}

(async () => {
  try {
    const url = `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`;
    // Use global fetch (Node 18+) if available
    let res;
    if (typeof fetch === 'function') {
      res = await fetch(url, { method: 'GET' });
      const json = await res.json().catch(() => null);
      if (json && json.ok) {
        console.log('✅ Telegram webhook deleted (or none existed).');
        process.exit(0);
      }
      console.error('❌ Telegram deleteWebhook response:', json);
      process.exit(1);
    } else {
      // Fallback to https.request
      const https = require('https');
      https.get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json && json.ok) {
              console.log('✅ Telegram webhook deleted (or none existed).');
              process.exit(0);
            }
            console.error('❌ Telegram deleteWebhook response:', json);
            process.exit(1);
          } catch (e) {
            console.error('❌ Unexpected response deleting webhook:', data);
            process.exit(1);
          }
        });
      }).on('error', (err) => {
        console.error('❌ Error deleting webhook:', err.message || err);
        process.exit(1);
      });
    }
  } catch (err) {
    console.error('❌ Error deleting webhook:', err.message || err);
    process.exit(1);
  }
})();
