require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const express = require('express');
const { initBot, processWebhookUpdate } = require('./telegramBot');

const PORT = process.env.PORT || 3000;
const WEBHOOK_BASE = (process.env.WEBHOOK_URL || '').replace(/\/$/, '');
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || `/bot${process.env.TELEGRAM_BOT_TOKEN || ''}`;
const FULL_WEBHOOK_URL = WEBHOOK_BASE ? `${WEBHOOK_BASE}${WEBHOOK_PATH}` : null;
const SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || process.env.TELEGRAM_ACCESS_KEY || null;

async function start() {
  const app = express();
  app.use(express.json());

  const bot = await initBot({ polling: false });

  if (!bot) {
    console.error('Failed to initialize Telegram bot.');
    process.exit(1);
  }

  if (FULL_WEBHOOK_URL) {
    try {
      if (SECRET_TOKEN) {
        await bot.setWebHook(FULL_WEBHOOK_URL, { secret_token: SECRET_TOKEN });
        console.log('Set Telegram webhook to', FULL_WEBHOOK_URL, 'with secret token');
      } else {
        await bot.setWebHook(FULL_WEBHOOK_URL);
        console.log('Set Telegram webhook to', FULL_WEBHOOK_URL);
      }
    } catch (err) {
      console.error('Failed to set webhook:', err?.message || err);
    }
  } else {
    console.warn('WEBHOOK_URL not set — Telegram will not send updates automatically.');
  }

  app.post(WEBHOOK_PATH, async (req, res) => {
    if (SECRET_TOKEN) {
      const header = req.get('x-telegram-bot-api-secret-token') || '';
      if (!header || header !== SECRET_TOKEN) {
        res.sendStatus(401);
        return;
      }
    }

    try {
      // Use new webhook-aware handler
      await processWebhookUpdate(req.body);
    } catch (err) {
      console.error('Error processing webhook update:', err?.message || err);
    }

    res.sendStatus(200);
  });

  app.get('/', (req, res) => res.send('Vaazhi webhook server running'));

  app.listen(PORT, () => console.log(`Webhook server listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Fatal error starting webhook server:', err?.message || err);
  process.exit(1);
});
