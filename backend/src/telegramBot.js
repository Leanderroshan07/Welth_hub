require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const TelegramBot = require('node-telegram-bot-api');
const { supabase } = require('./supabaseClient');
const { MONEY_CALLBACKS, getMoneyMenuKeyboard, beginMoneyAction, handleMoneyCallbackQuery, handleMoneyMessage } = require('./moneyModule');
const { TASK_CALLBACKS, getTaskMenuKeyboard, beginTaskAction, handleTaskMessage, handleTaskCallbackQuery, sendTaskPreview } = require('./taskModule');
const { GOAL_CALLBACKS, getGoalMenuKeyboard, handleGoalCallbackQuery, handleGoalMessage } = require('./goalBotModule');

const token = process.env.TELEGRAM_BOT_TOKEN;
const accessKey = String(process.env.TELEGRAM_ACCESS_KEY || process.env.TELEGRAM_SECRET_KEY || '').trim();

function parseNumericIds(value) {
  return String(value || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

const authorizedUserIds = parseNumericIds(process.env.AUTHORIZED_TELEGRAM_USER_IDS);
const adminUserIds = parseNumericIds(process.env.TELEGRAM_ADMIN_USER_IDS);
const secretAuthorizedUserIds = new Set();
const deactivatedUserIds = new Set();
const knownUsers = new Map();

if (!token) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable.');
}

const sessions = new Map();
let bot;
let sessionCleanupInterval;

// Optimized session cleanup for small user base (1-2 users)
function cleanupAbandonedSessions() {
  const now = Date.now();
  const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes for small user base
  let removed = 0;

  for (const [chatId, session] of sessions.entries()) {
    if (now - (session.createdAt || now) > SESSION_TIMEOUT) {
      sessions.delete(chatId);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`🗑️  Cleaned up ${removed} abandoned sessions.`);
  }
}

function isAuthorizedUser(messageOrQuery) {
  const userId = messageOrQuery?.from?.id;

  if (!Number.isInteger(userId)) {
    return false;
  }

  if (deactivatedUserIds.has(userId)) {
    return false;
  }

  if (authorizedUserIds.length === 0) {
    return secretAuthorizedUserIds.has(userId);
  }

  return authorizedUserIds.includes(userId) || secretAuthorizedUserIds.has(userId);
}

function isDeactivatedUser(messageOrQuery) {
  const userId = messageOrQuery?.from?.id;
  return Number.isInteger(userId) && deactivatedUserIds.has(userId);
}

function isAdminUser(messageOrQuery) {
  const userId = messageOrQuery?.from?.id;

  if (!Number.isInteger(userId)) {
    return false;
  }

  if (adminUserIds.length > 0) {
    return adminUserIds.includes(userId);
  }

  return authorizedUserIds.includes(userId);
}

function getAccessMethod(userId) {
  if (authorizedUserIds.includes(userId)) {
    return 'id-list';
  }

  if (secretAuthorizedUserIds.has(userId)) {
    return 'secret-key';
  }

  return 'unknown';
}

function registerKnownUser(messageOrQuery, forcedAccessMethod) {
  const userId = messageOrQuery?.from?.id;

  if (!Number.isInteger(userId)) {
    return;
  }

  const username = messageOrQuery?.from?.username ? `@${messageOrQuery.from.username}` : 'no username';
  const firstName = messageOrQuery?.from?.first_name || '';
  const lastName = messageOrQuery?.from?.last_name || '';

  knownUsers.set(userId, {
    userId,
    username,
    name: `${firstName} ${lastName}`.trim() || 'Unknown',
    access: forcedAccessMethod || getAccessMethod(userId),
    status: deactivatedUserIds.has(userId) ? 'deactivated' : 'active',
    lastSeenAt: new Date().toISOString(),
  });
}

function buildKnownUsersText() {
  if (knownUsers.size === 0) {
    return 'No users have logged in yet.';
  }

  const lines = Array.from(knownUsers.values())
    .sort((left, right) => String(right.lastSeenAt).localeCompare(String(left.lastSeenAt)))
    .map((item, index) => {
      return `${index + 1}. ${item.userId} | ${item.username} | ${item.name} | ${item.access} | ${item.status}`;
    });

  return `Known users:\n${lines.join('\n')}`;
}

async function denyDeactivated(chatId) {
  await bot.sendMessage(chatId, 'Your access is deactivated. Contact the admin.');
}

async function promptForAccess(chatId) {
  if (accessKey) {
    await bot.sendMessage(chatId, 'You are not on the authorized list. Send the access key to continue.');
    return;
  }

  await bot.sendMessage(chatId, 'You are not authorized to use this bot.');
}

async function handleAccessAttempt({ chatId, userId, text }) {
  if (!accessKey) {
    await promptForAccess(chatId);
    return false;
  }

  if (String(text || '').trim() !== accessKey) {
    await promptForAccess(chatId);
    return false;
  }

  secretAuthorizedUserIds.add(userId);
  registerKnownUser({ from: { id: userId } }, 'secret-key');
  sessions.delete(chatId);
  await sendMainMenu(chatId, 'Access granted. Choose a module:');
  return true;
}

const MAIN_CALLBACKS = {
  MAIN_MENU: 'menu:main',
};

const ADMIN_CALLBACKS = {
  DEACTIVATE_USER: 'admin:deactivate_user',
  ACTIVATE_USER: 'admin:activate_user',
};

function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Money Manage', callback_data: MONEY_CALLBACKS.MENU }],
      [{ text: 'Task Manage', callback_data: TASK_CALLBACKS.MENU }],
      [{ text: 'Goal Tracking', callback_data: GOAL_CALLBACKS.MENU }],
    ],
  };
}

async function sendMainMenu(chatId, text = 'Welcome! Choose a module:') {
  await bot.sendMessage(chatId, text, {
    reply_markup: getMainMenuKeyboard(),
  });
}

function parsePick(data, prefix) {
  const expected = `${prefix}:`;
  if (!String(data || '').startsWith(expected)) {
    return null;
  }

  return data.slice(expected.length);
}

async function clearClickedCallbackMessage(query) {
  const chatId = query?.message?.chat?.id;
  const messageId = query?.message?.message_id;

  if (!chatId || !messageId) {
    return;
  }

  try {
    await bot.deleteMessage(chatId, messageId);
  } catch (error) {
    // Ignore cleanup failures (e.g. message already deleted).
  }
}

function attachHandlers() {
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;

    if (isDeactivatedUser(msg)) {
      await denyDeactivated(chatId);
      return;
    }

    if (!isAuthorizedUser(msg)) {
      await promptForAccess(chatId);
      return;
    }

    registerKnownUser(msg);
    sessions.delete(chatId);
    
    // Small optimization: cache the response for repeat starts
    await sendMainMenu(chatId, 'Welcome to Vaazhi Bot. Choose a module:');
  });

  bot.onText(/^\/cancel$/, async (msg) => {
    const chatId = msg.chat.id;

    if (isDeactivatedUser(msg)) {
      await denyDeactivated(chatId);
      return;
    }

    if (!isAuthorizedUser(msg)) {
      await promptForAccess(chatId);
      return;
    }

    registerKnownUser(msg);
    const hadSession = sessions.has(chatId);

    sessions.delete(chatId);

    if (hadSession) {
      await bot.sendMessage(chatId, 'Cancelled current action.');
    }

    await sendMainMenu(chatId, 'Choose a module:');
  });

  bot.onText(/^\/id$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const username = msg.from?.username ? `@${msg.from.username}` : 'no username';

    registerKnownUser(msg);

    await bot.sendMessage(
      chatId,
      `Your Telegram user ID is: ${userId}\nUsername: ${username}`,
    );
  });

  bot.onText(/^\/amiadmin$/, async (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = isAdminUser(msg);

    registerKnownUser(msg);

    if (isAdmin) {
      await bot.sendMessage(chatId, 'Yes, you are an admin.');
    } else {
      await bot.sendMessage(chatId, 'No, you are not an admin.');
    }
  });

  bot.onText(/^\/users$/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isAdminUser(msg)) {
      await bot.sendMessage(chatId, 'Only admins can view logged-in users.');
      return;
    }

    registerKnownUser(msg);
    await bot.sendMessage(chatId, buildKnownUsersText());
  });

  bot.onText(/^\/deactivate$/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isAdminUser(msg)) {
      await bot.sendMessage(chatId, 'Only admins can deactivate users.');
      return;
    }

    registerKnownUser(msg);

    if (knownUsers.size === 0) {
      await bot.sendMessage(chatId, 'No users have logged in yet. No users to deactivate.');
      return;
    }

    const activeUsers = Array.from(knownUsers.values()).filter(
      (user) => user.status === 'active',
    );

    if (activeUsers.length === 0) {
      await bot.sendMessage(chatId, 'All known users are already deactivated. No active users to deactivate.');
      return;
    }

    const keyboard = {
      inline_keyboard: activeUsers.map((user) => [
        {
          text: `${user.userId} - ${user.username}`,
          callback_data: `${ADMIN_CALLBACKS.DEACTIVATE_USER}:${user.userId}`,
        },
      ]),
    };

    await bot.sendMessage(chatId, 'Select user to deactivate:', {
      reply_markup: keyboard,
    });
  });

  bot.onText(/^\/activate$/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isAdminUser(msg)) {
      await bot.sendMessage(chatId, 'Only admins can activate users.');
      return;
    }

    registerKnownUser(msg);

    if (knownUsers.size === 0) {
      await bot.sendMessage(chatId, 'No users have logged in yet. No users to activate.');
      return;
    }

    const deactivatedUsers = Array.from(knownUsers.values()).filter(
      (user) => user.status === 'deactivated',
    );

    if (deactivatedUsers.length === 0) {
      await bot.sendMessage(chatId, 'All known users are already active. No deactivated users to activate.');
      return;
    }

    const keyboard = {
      inline_keyboard: deactivatedUsers.map((user) => [
        {
          text: `${user.userId} - ${user.username}`,
          callback_data: `${ADMIN_CALLBACKS.ACTIVATE_USER}:${user.userId}`,
        },
      ]),
    };

    await bot.sendMessage(chatId, 'Select user to activate:', {
      reply_markup: keyboard,
    });
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat?.id;
    const data = query.data;

    if (!chatId || !data) {
      return;
    }

    registerKnownUser(query);

    if (isDeactivatedUser(query)) {
      await bot.answerCallbackQuery(query.id, {
        text: 'Account deactivated',
        show_alert: true,
      });
      await denyDeactivated(chatId);
      return;
    }

    if (!isAuthorizedUser(query)) {
      await bot.answerCallbackQuery(query.id, {
        text: accessKey ? 'Send the access key in chat first' : 'Not authorized',
        show_alert: true,
      });

      if (accessKey) {
        await promptForAccess(chatId);
      }
      return;
    }


    await bot.answerCallbackQuery(query.id);
    // Run message cleanup in background (don't await)
    clearClickedCallbackMessage(query).catch(() => {});

    // Goal Tracking
    const userId = query.from?.id;
    const handledByGoal = await handleGoalCallbackQuery({ chatId, data, sessions, bot, userId });
    if (handledByGoal) return;

    if (data === MAIN_CALLBACKS.MAIN_MENU) {
      sessions.delete(chatId);
      await sendMainMenu(chatId, 'Choose a module:');
      return;
    }

    if (data === MONEY_CALLBACKS.MENU) {
      sessions.delete(chatId);
      const [accountsRes, subAccountsRes] = await Promise.all([
        supabase.from('accounts').select('name').order('created_at', { ascending: true }),
        supabase.from('sub_accounts').select('name').order('created_at', { ascending: true }),
      ]);

      const accounts = (accountsRes.data || []).map((item, index) => `${index + 1}. ${item.name}`).join('\n') || 'None';
      const subAccounts = (subAccountsRes.data || []).map((item, index) => `${index + 1}. ${item.name}`).join('\n') || 'None';

      await bot.sendMessage(chatId, 'Money Manage: choose an action', {
        reply_markup: getMoneyMenuKeyboard(),
      });
      await bot.sendMessage(chatId, `Available Accounts:\n${accounts}\n\nAvailable Sub-Accounts:\n${subAccounts}`);
      return;
    }

    if (data === TASK_CALLBACKS.MENU) {
      sessions.delete(chatId);
      await bot.sendMessage(chatId, 'Task Manage: choose an action', {
        reply_markup: getTaskMenuKeyboard(),
      });
      await sendTaskPreview({ chatId, bot, supabase, userId });
      return;
    }

    if (data === MONEY_CALLBACKS.BACK || data === TASK_CALLBACKS.BACK) {
      sessions.delete(chatId);
      await sendMainMenu(chatId, 'Choose a module:');
      return;
    }

    const deactivateUserId = parsePick(data, ADMIN_CALLBACKS.DEACTIVATE_USER);
    if (deactivateUserId) {
      if (!isAdminUser(query)) {
        await bot.answerCallbackQuery(query.id, {
          text: 'Only admins can deactivate',
          show_alert: true,
        });
        return;
      }

      const targetId = Number(deactivateUserId);
      deactivatedUserIds.add(targetId);
      secretAuthorizedUserIds.delete(targetId);

      const known = knownUsers.get(targetId);
      if (known) {
        knownUsers.set(targetId, {
          ...known,
          status: 'deactivated',
          lastSeenAt: new Date().toISOString(),
        });
      }

      await bot.answerCallbackQuery(query.id);
      // Run message cleanup in background
      clearClickedCallbackMessage(query).catch(() => {});
      await bot.sendMessage(chatId, `User ${targetId} deactivated.`);
      return;
    }

    const activateUserId = parsePick(data, ADMIN_CALLBACKS.ACTIVATE_USER);
    if (activateUserId) {
      if (!isAdminUser(query)) {
        await bot.answerCallbackQuery(query.id, {
          text: 'Only admins can activate',
          show_alert: true,
        });
        return;
      }

      const targetId = Number(activateUserId);
      deactivatedUserIds.delete(targetId);

      const known = knownUsers.get(targetId);
      if (known) {
        knownUsers.set(targetId, {
          ...known,
          status: 'active',
          lastSeenAt: new Date().toISOString(),
        });
      }

      await bot.answerCallbackQuery(query.id);
      // Run message cleanup in background
      clearClickedCallbackMessage(query).catch(() => {});
      await bot.sendMessage(chatId, `User ${targetId} activated.`);
      return;
    }

    const handledByMoney = await handleMoneyCallbackQuery({
      chatId,
      data,
      sessions,
      bot,
    });

    if (handledByMoney) {
      return;
    }

    const handledByTask = await handleTaskCallbackQuery({
      chatId,
      data,
      sessions,
      bot,
      userId,
      supabase,
    });

    if (handledByTask) {
      return;
    }

    if (data === MONEY_CALLBACKS.INCOME) {
      await beginMoneyAction({ chatId, action: 'income', sessions, bot, supabase });
      return;
    }

    if (data === MONEY_CALLBACKS.EXPENSE) {
      await beginMoneyAction({ chatId, action: 'expense', sessions, bot, supabase });
      return;
    }

    if (data === MONEY_CALLBACKS.TRANSFER) {
      await beginMoneyAction({ chatId, action: 'transfer', sessions, bot, supabase });
      return;
    }

    if (data === TASK_CALLBACKS.ADD_TASK) {
      await beginTaskAction({ chatId, action: 'add_task', sessions, bot, userId });
      return;
    }

    if (data === TASK_CALLBACKS.ADD_ROUTINE) {
      await beginTaskAction({ chatId, action: 'add_routine', sessions, bot, userId });
      return;
    }

    if (data === TASK_CALLBACKS.ADD_CHALLENGE) {
      await beginTaskAction({ chatId, action: 'add_challenge', sessions, bot, userId });
      return;
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat?.id;
    const userId = msg.from?.id;
    const text = typeof msg.text === 'string' ? msg.text.trim() : '';

    if (!chatId || !text) {
      return;
    }

    registerKnownUser(msg);

    if (isDeactivatedUser(msg)) {
      await denyDeactivated(chatId);
      return;
    }

    if (!isAuthorizedUser(msg)) {
      if (text.startsWith('/')) {
        if (text === '/start') {
          await promptForAccess(chatId);
        }
        return;
      }

      const accessGranted = await handleAccessAttempt({ chatId, userId, text });
      if (accessGranted) {
        return;
      }

      return;
    }

    if (text.startsWith('/')) {
      return;
    }


    // Goal Tracking
    const handledByGoal = await handleGoalMessage({ chatId, text, sessions, bot, userId });
    if (handledByGoal) return;

    const handledByMoney = await handleMoneyMessage({
      chatId,
      text,
      sessions,
      bot,
      supabase,
      sendMainMenu,
    });
    if (handledByMoney) return;

    const handledByTask = await handleTaskMessage({
      chatId,
      text,
      sessions,
      bot,
      supabase,
      sendMainMenu,
      userId,
    });
    if (handledByTask) return;

    await sendMainMenu(chatId, 'Send /start to begin or choose a module:');
  });

  process.on('SIGINT', () => {
    if (bot && bot.stopPolling) {
      try { bot.stopPolling(); } catch (e) {}
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (bot && bot.stopPolling) {
      try { bot.stopPolling(); } catch (e) {}
    }
    process.exit(0);
  });

  console.log('Vaazhi Telegram bot is running.');
}

// Webhook mode: manually process each handler (bot.on() listeners don't work with processUpdate)
async function processWebhookUpdate(update) {
  if (!bot) {
    console.error('Bot not initialized for webhook processing');
    return;
  }

  try {
    // Process message
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;

      if (isDeactivatedUser(msg)) {
        await denyDeactivated(chatId);
        return;
      }

      // Command: /start
      if (msg.text === '/start') {
        if (!isAuthorizedUser(msg)) {
          await promptForAccess(chatId);
          return;
        }
        registerKnownUser(msg);
        sessions.delete(chatId);
        await sendMainMenu(chatId, 'Welcome to Vaazhi Bot. Choose a module:');
        return;
      }

      // Command: /cancel
      if (msg.text === '/cancel') {
        if (!isAuthorizedUser(msg)) {
          await promptForAccess(chatId);
          return;
        }
        registerKnownUser(msg);
        const hadSession = sessions.has(chatId);
        sessions.delete(chatId);
        if (hadSession) {
          await bot.sendMessage(chatId, 'Cancelled current action.');
        }
        await sendMainMenu(chatId, 'Choose a module:');
        return;
      }

      // Command: /id
      if (msg.text === '/id') {
        const userId = msg.from?.id;
        const username = msg.from?.username ? `@${msg.from.username}` : 'no username';
        registerKnownUser(msg);
        await bot.sendMessage(chatId, `Your Telegram user ID is: ${userId}\nUsername: ${username}`);
        return;
      }

      // Command: /amiadmin
      if (msg.text === '/amiadmin') {
        const isAdmin = isAdminUser(msg);
        registerKnownUser(msg);
        if (isAdmin) {
          await bot.sendMessage(chatId, 'Yes, you are an admin.');
        } else {
          await bot.sendMessage(chatId, 'No, you are not an admin.');
        }
        return;
      }

      // Command: /users
      if (msg.text === '/users') {
        if (!isAdminUser(msg)) {
          await bot.sendMessage(chatId, 'Only admins can view logged-in users.');
          return;
        }
        registerKnownUser(msg);
        await bot.sendMessage(chatId, buildKnownUsersText());
        return;
      }

      // General message handling
      if (!isAuthorizedUser(msg)) {
        await handleAccessAttempt({ chatId, userId: msg.from?.id, text: msg.text });
        return;
      }

      registerKnownUser(msg);

      // Route to module handlers
      const moneyHandled = await handleMoneyMessage({ chatId, text: msg.text, sessions, bot, supabase, sendMainMenu });
      if (moneyHandled) {
        return;
      }

      const taskHandled = await handleTaskMessage({ chatId, text: msg.text, sessions, bot, supabase, sendMainMenu, userId: msg.from?.id });
      if (taskHandled) {
        return;
      }

      const goalHandled = await handleGoalMessage({ chatId, text: msg.text, sessions, bot, userId: msg.from?.id });
      if (goalHandled) {
        return;
      }

      // Default: show main menu
      await sendMainMenu(chatId, `Message received: "${msg.text}"\n\nChoose a module:`);
    }

    // Process callback query (button clicks)
    if (update.callback_query) {
      const query = update.callback_query;
      const chatId = query.message?.chat?.id;
      const data = query.data;

      if (!isAuthorizedUser(query)) {
        await bot.answerCallbackQuery(query.id, {
          text: 'You are not authorized',
          show_alert: true,
        });
        return;
      }

      registerKnownUser(query);

      // Main menu
      if (data === MAIN_CALLBACKS.MAIN_MENU) {
        sessions.delete(chatId);
        clearClickedCallbackMessage(query).catch(() => {});
        await sendMainMenu(chatId, 'Choose a module:');
        return;
      }

      // Money menu
      if (data === MONEY_CALLBACKS.MENU) {
        sessions.delete(chatId);
        const [accountsRes, subAccountsRes] = await Promise.all([
          supabase.from('accounts').select('name').order('created_at', { ascending: true }),
          supabase.from('sub_accounts').select('name').order('created_at', { ascending: true }),
        ]);

        const accounts = (accountsRes.data || []).map((item, index) => `${index + 1}. ${item.name}`).join('\n') || 'None';
        const subAccounts = (subAccountsRes.data || []).map((item, index) => `${index + 1}. ${item.name}`).join('\n') || 'None';

        await bot.sendMessage(chatId, 'Money Manage: choose an action', {
          reply_markup: getMoneyMenuKeyboard(),
        });
        await bot.sendMessage(chatId, `Available Accounts:\n${accounts}\n\nAvailable Sub-Accounts:\n${subAccounts}`);
        return;
      }

      // Task menu
      if (data === TASK_CALLBACKS.MENU) {
        sessions.delete(chatId);
        const userId = query.from?.id;
        await bot.sendMessage(chatId, 'Task Manage: choose an action', {
          reply_markup: getTaskMenuKeyboard(),
        });
        await sendTaskPreview({ chatId, bot, supabase, userId });
        return;
      }

      // Back buttons
      if (data === MONEY_CALLBACKS.BACK || data === TASK_CALLBACKS.BACK) {
        sessions.delete(chatId);
        clearClickedCallbackMessage(query).catch(() => {});
        await sendMainMenu(chatId, 'Choose a module:');
        return;
      }

      // Delegate to module handlers
      const moneyHandled = await handleMoneyCallbackQuery({ chatId, data, sessions, bot });
      if (moneyHandled) {
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      const taskHandled = await handleTaskCallbackQuery({ chatId, data, sessions, bot, userId, supabase });
      if (taskHandled) {
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      const goalHandled = await handleGoalCallbackQuery({ chatId, data, sessions, bot, supabase });
      if (goalHandled) {
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      // Money actions (Income, Expense, Transfer)
      if (data === MONEY_CALLBACKS.INCOME) {
        await beginMoneyAction({ chatId, action: 'income', sessions, bot, supabase });
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      if (data === MONEY_CALLBACKS.EXPENSE) {
        await beginMoneyAction({ chatId, action: 'expense', sessions, bot, supabase });
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      if (data === MONEY_CALLBACKS.TRANSFER) {
        await beginMoneyAction({ chatId, action: 'transfer', sessions, bot, supabase });
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      // Task actions (Add Task, Add Routine, Add Challenge)
      if (data === TASK_CALLBACKS.ADD_TASK) {
        try {
          await beginTaskAction({ chatId, action: 'add_task', sessions, bot, userId });
          console.log(`✅ Task add initiated for user ${userId} in chat ${chatId}`);
        } catch (err) {
          console.error(`❌ Error in ADD_TASK action:`, err);
          await bot.sendMessage(chatId, `⚠️ Error starting task: ${err?.message || 'Unknown error'}`);
        }
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      if (data === TASK_CALLBACKS.ADD_ROUTINE) {
        try {
          await beginTaskAction({ chatId, action: 'add_routine', sessions, bot, userId });
          console.log(`✅ Routine add initiated for user ${userId} in chat ${chatId}`);
        } catch (err) {
          console.error(`❌ Error in ADD_ROUTINE action:`, err);
          await bot.sendMessage(chatId, `⚠️ Error starting routine: ${err?.message || 'Unknown error'}`);
        }
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      if (data === TASK_CALLBACKS.ADD_CHALLENGE) {
        try {
          await beginTaskAction({ chatId, action: 'add_challenge', sessions, bot, userId });
          console.log(`✅ Challenge add initiated for user ${userId} in chat ${chatId}`);
        } catch (err) {
          console.error(`❌ Error in ADD_CHALLENGE action:`, err);
          await bot.sendMessage(chatId, `⚠️ Error starting challenge: ${err?.message || 'Unknown error'}`);
        }
        clearClickedCallbackMessage(query).catch(() => {});
        return;
      }

      // Acknowledge unknown callback
      await bot.answerCallbackQuery(query.id);
    }
  } catch (err) {
    console.error('Error processing webhook update:', err?.message || err);
  }
}

async function initBot(options = {}) {
  console.log('🤖 Initializing bot in polling mode (optimized for small user base)...');

  // Try to remove any existing webhook to avoid conflicts with polling
  try {
    if (token) {
      const deleteUrl = `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`;
      const resp = await fetch(deleteUrl, { method: 'GET' });
      const body = await resp.json().catch(() => null);
      if (body && body.ok) {
        console.log('✅ Removed existing Telegram webhook (if any)');
      } else {
        console.log('ℹ️ Telegram deleteWebhook response:', body);
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to delete existing webhook:', err?.message || err);
  }

  // Start polling mode
  bot = new TelegramBot(token, { polling: true });

  // Handle polling errors with clearer logs
  try {
    bot.on('polling_error', (err) => {
      try {
        const payload = err?.response?.body || err;
        console.error('error: [polling_error]', JSON.stringify(payload));
      } catch (e) {
        console.error('error: [polling_error]', err?.message || err);
      }
    });
  } catch (e) {
    // ignore if bot doesn't support event binding for some reason
  }

  // Start session cleanup interval (every 15 minutes for small user base)
  if (!sessionCleanupInterval) {
    sessionCleanupInterval = setInterval(cleanupAbandonedSessions, 15 * 60 * 1000);
  }

  // Attach all event listeners for polling mode
  attachHandlers();

  console.log('✅ Bot initialized in polling mode');
  
  return bot;
}

function getBot() {
  return bot;
}

// Main startup - polling mode (this is now the only mode)
if (require.main === module) {
  console.log('\n=== STARTING VAAZHI TELEGRAM BOT (POLLING MODE) ===\n');
  
  // Test Supabase connection before starting bot
  (async () => {
    try {
      console.log('🧪 Testing Supabase connection...');
      const { data, error } = await supabase.from('financial_tasks').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('❌ Supabase query error:', error.message);
        throw error;
      }
      console.log('✅ Supabase connection successful!\n');
      
      // Start bot
      await initBot();
      console.log('🎯 Bot is now listening for messages (polling)...\n');
      
    } catch (err) {
      console.error('❌ CRITICAL: Cannot connect to Supabase');
      console.error('   Error:', err?.message || err);
      process.exit(1);
    }
  })();
}

module.exports = { initBot, getBot, processWebhookUpdate };
