require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const express = require('express');
const { initBot, processWebhookUpdate } = require('./telegramBot');
const { supabase } = require('./supabaseClient');

const PORT = process.env.PORT || 3000;
const WEBHOOK_BASE = (process.env.WEBHOOK_URL || '').replace(/\/$/, '');
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || `/bot${process.env.TELEGRAM_BOT_TOKEN || ''}`;
const FULL_WEBHOOK_URL = WEBHOOK_BASE ? `${WEBHOOK_BASE}${WEBHOOK_PATH}` : null;
const SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || process.env.TELEGRAM_ACCESS_KEY || null;

async function start() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Increase request timeout
  app.use((req, res, next) => {
    req.setTimeout(30000); // 30 seconds
    res.setTimeout(30000);
    next();
  });

  console.log('\n=== STARTING VAAZHI BACKEND ===\n');

  // Test Supabase connection
  console.log('🧪 Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('financial_tasks').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      throw error;
    }
    console.log('✅ Supabase connection successful!\n');
  } catch (err) {
    console.error('❌ CRITICAL: Cannot connect to Supabase');
    console.error('   Error:', err?.message || err);
    console.error('   Check your environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY\n');
    process.exit(1);
  }

  const bot = await initBot({ polling: false });

  if (!bot) {
    console.error('❌ Failed to initialize Telegram bot.');
    process.exit(1);
  }

  if (FULL_WEBHOOK_URL) {
    try {
      if (SECRET_TOKEN) {
        await bot.setWebHook(FULL_WEBHOOK_URL, { secret_token: SECRET_TOKEN });
        console.log('✅ Telegram webhook set to', FULL_WEBHOOK_URL, 'with secret token');
      } else {
        await bot.setWebHook(FULL_WEBHOOK_URL);
        console.log('✅ Telegram webhook set to', FULL_WEBHOOK_URL);
      }
    } catch (err) {
      console.error('❌ Failed to set webhook:', err?.message || err);
      console.error('   This may prevent the bot from receiving messages');
    }
  } else {
    console.warn('⚠️  WEBHOOK_URL not set — Bot will not receive updates from Telegram');
  }

  app.post(WEBHOOK_PATH, async (req, res) => {
    const requestId = Date.now();
    console.log(`[${requestId}] 📨 Webhook received`);

    if (SECRET_TOKEN) {
      const header = req.get('x-telegram-bot-api-secret-token') || '';
      if (!header || header !== SECRET_TOKEN) {
        console.log(`[${requestId}] ❌ Invalid secret token`);
        res.sendStatus(401);
        return;
      }
    }

    try {
      console.log(`[${requestId}] ⏳ Processing update...`);
      // Process webhook with timeout
      const processPromise = processWebhookUpdate(req.body);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Webhook processing timeout')), 25000)
      );
      
      await Promise.race([processPromise, timeoutPromise]);
      console.log(`[${requestId}] ✅ Update processed successfully`);
    } catch (err) {
      console.error(`[${requestId}] ❌ Error processing webhook:`, err?.message || err);
      if (err?.message?.includes('timeout')) {
        console.error(`[${requestId}] ⏱️ Request timed out - may still process on Telegram's side`);
      }
    }

    // Always return 200 to acknowledge receipt
    res.sendStatus(200);
  });

  app.get('/', (req, res) => res.send('Vaazhi webhook server running'));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const { error } = await supabase.from('financial_tasks').select('count', { count: 'exact', head: true });
      if (error) {
        res.status(500).json({ status: 'error', supabase: 'disconnected', error: error.message });
        return;
      }
      res.json({ status: 'ok', supabase: 'connected' });
    } catch (err) {
      res.status(500).json({ status: 'error', supabase: 'disconnected', error: err.message });
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`\n✅ Webhook server listening on port ${PORT}`);
    console.log(`📍 Webhook URL: ${FULL_WEBHOOK_URL || 'Not configured'}`);
    console.log(`💾 Health check: http://localhost:${PORT}/health\n`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

start().catch((err) => {
  console.error('Fatal error starting webhook server:', err?.message || err);
  process.exit(1);
});
