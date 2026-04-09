require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { supabase } = require('./supabaseClient');
const { MONEY_CALLBACKS, getMoneyMenuKeyboard, beginMoneyAction, handleMoneyCallbackQuery, handleMoneyMessage } = require('./moneyModule');
const { TASK_CALLBACKS, getTaskMenuKeyboard, beginTaskAction, handleTaskMessage, sendTaskPreview } = require('./taskModule');

const token = process.env.TELEGRAM_BOT_TOKEN;
const authorizedUserIds = String(process.env.AUTHORIZED_TELEGRAM_USER_IDS || '')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0);

if (!token) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable.');
}

function isAuthorizedUser(messageOrQuery) {
  const userId = messageOrQuery?.from?.id;

  if (!Number.isInteger(userId)) {
    return false;
  }

  if (authorizedUserIds.length === 0) {
    return false;
  }

  return authorizedUserIds.includes(userId);
}

async function denyAccess(chatId) {
  await bot.sendMessage(chatId, 'You are not authorized to use this bot.');
}

const bot = new TelegramBot(token, { polling: true });
const sessions = new Map();

const MAIN_CALLBACKS = {
  MAIN_MENU: 'menu:main',
};

function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Money Manage', callback_data: MONEY_CALLBACKS.MENU }],
      [{ text: 'Task Manage', callback_data: TASK_CALLBACKS.MENU }],
    ],
  };
}

async function sendMainMenu(chatId, text = 'Welcome! Choose a module:') {
  await bot.sendMessage(chatId, text, {
    reply_markup: getMainMenuKeyboard(),
  });
}

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorizedUser(msg)) {
    await denyAccess(chatId);
    return;
  }

  sessions.delete(chatId);
  await sendMainMenu(chatId, 'Welcome to Vaazhi Bot. Choose a module:');
});

bot.onText(/^\/cancel$/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorizedUser(msg)) {
    await denyAccess(chatId);
    return;
  }

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

  await bot.sendMessage(
    chatId,
    `Your Telegram user ID is: ${userId}\nUsername: ${username}`,
  );
});

bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat?.id;
  const data = query.data;

  if (!chatId || !data) {
    return;
  }

  if (!isAuthorizedUser(query)) {
    await bot.answerCallbackQuery(query.id, {
      text: 'Not authorized',
      show_alert: true,
    });
    return;
  }

  await bot.answerCallbackQuery(query.id);

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
    await sendTaskPreview({ chatId, bot, supabase });
    return;
  }

  if (data === MONEY_CALLBACKS.BACK || data === TASK_CALLBACKS.BACK) {
    sessions.delete(chatId);
    await sendMainMenu(chatId, 'Choose a module:');
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

  if (data === MONEY_CALLBACKS.INCOME) {
    await beginMoneyAction({ chatId, action: 'income', sessions, bot });
    return;
  }

  if (data === MONEY_CALLBACKS.EXPENSE) {
    await beginMoneyAction({ chatId, action: 'expense', sessions, bot });
    return;
  }

  if (data === MONEY_CALLBACKS.TRANSFER) {
    await beginMoneyAction({ chatId, action: 'transfer', sessions, bot });
    return;
  }

  if (data === TASK_CALLBACKS.ADD_TASK) {
    await beginTaskAction({ chatId, action: 'add_task', sessions, bot });
    return;
  }

  if (data === TASK_CALLBACKS.ADD_ROUTINE) {
    await beginTaskAction({ chatId, action: 'add_routine', sessions, bot });
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat?.id;
  const text = typeof msg.text === 'string' ? msg.text.trim() : '';

  if (!chatId || !text) {
    return;
  }

  if (!isAuthorizedUser(msg)) {
    if (!text.startsWith('/')) {
      await denyAccess(chatId);
    }
    return;
  }

  if (text.startsWith('/')) {
    return;
  }

  const handledByMoney = await handleMoneyMessage({
    chatId,
    text,
    sessions,
    bot,
    supabase,
    sendMainMenu,
  });

  if (handledByMoney) {
    return;
  }

  const handledByTask = await handleTaskMessage({
    chatId,
    text,
    sessions,
    bot,
    supabase,
    sendMainMenu,
  });

  if (handledByTask) {
    return;
  }

  await sendMainMenu(chatId, 'Send /start to begin or choose a module:');
});

process.on('SIGINT', () => {
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.stopPolling();
  process.exit(0);
});

console.log('Vaazhi Telegram bot is running.');
