const MONEY_CALLBACKS = {
  MENU: 'menu:money',
  INCOME: 'money:income',
  EXPENSE: 'money:expense',
  TRANSFER: 'money:transfer',
  BACK: 'menu:main',
  PICK_ACCOUNT: 'money:pick_account',
  PICK_FROM_ACCOUNT: 'money:pick_from_account',
  PICK_TO_ACCOUNT: 'money:pick_to_account',
  PICK_SUB_ACCOUNT: 'money:pick_sub_account',
  SKIP_SUB_ACCOUNT: 'money:skip_sub_account',
  PICK_CATEGORY: 'money:pick_category',
  PICK_SUB_CATEGORY: 'money:pick_sub_category',
  SKIP_SUB_CATEGORY: 'money:skip_sub_category',
};

function getMoneyMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Add Income', callback_data: MONEY_CALLBACKS.INCOME },
        { text: 'Add Expense', callback_data: MONEY_CALLBACKS.EXPENSE },
      ],
      [{ text: 'Add Transfer', callback_data: MONEY_CALLBACKS.TRANSFER }],
      [{ text: 'Back', callback_data: MONEY_CALLBACKS.BACK }],
    ],
  };
}

function beginMoneyAction({ chatId, action, sessions, bot }) {
  const baseSession = {
    module: 'money',
    action,
    step: 'amount',
    payload: {},
    refs: {
      accounts: [],
      subAccounts: [],
    },
  };

  sessions.set(chatId, baseSession);

  bot.sendMessage(chatId, 'Enter amount (example: 2500.50):');
}

function encodePick(prefix, value) {
  return `${prefix}:${value}`;
}

function parsePick(data, prefix) {
  const expected = `${prefix}:`;
  if (!String(data || '').startsWith(expected)) {
    return null;
  }

  return data.slice(expected.length);
}

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'None';
  }

  return items.map((item, index) => `${index + 1}. ${item.name}`).join('\n');
}

function chunkButtons(items, makeLabel, makeValue, callbackPrefix, columns = 2) {
  const rows = [];

  for (let index = 0; index < items.length; index += columns) {
    const rowItems = items.slice(index, index + columns);
    rows.push(
      rowItems.map((item) => ({
        text: makeLabel(item),
        callback_data: encodePick(callbackPrefix, makeValue(item)),
      })),
    );
  }

  return rows;
}

async function sendAccountPicker({ chatId, bot, accounts, prefix, prompt }) {
  await bot.sendMessage(chatId, prompt, {
    reply_markup: {
      inline_keyboard: chunkButtons(accounts, (item) => item.name, (item) => item.id, prefix, 2),
    },
  });
}

async function sendSubAccountPicker({ chatId, bot, subAccounts }) {
  const rows = chunkButtons(subAccounts, (item) => item.name, (item) => item.id, MONEY_CALLBACKS.PICK_SUB_ACCOUNT, 2);
  rows.push([{ text: 'Skip', callback_data: MONEY_CALLBACKS.SKIP_SUB_ACCOUNT }]);

  await bot.sendMessage(chatId, 'Choose sub-account:', {
    reply_markup: {
      inline_keyboard: rows,
    },
  });
}

async function sendCategoryPicker({ chatId, bot, categories }) {
  await bot.sendMessage(chatId, 'Choose category:', {
    reply_markup: {
      inline_keyboard: chunkButtons(categories, (item) => item.name, (item) => item.id, MONEY_CALLBACKS.PICK_CATEGORY, 2),
    },
  });
}

async function sendSubCategoryPicker({ chatId, bot, subCategories }) {
  const rows = chunkButtons(subCategories, (item) => item.name, (item) => item.id, MONEY_CALLBACKS.PICK_SUB_CATEGORY, 2);
  rows.push([{ text: 'Skip', callback_data: MONEY_CALLBACKS.SKIP_SUB_CATEGORY }]);

  await bot.sendMessage(chatId, 'Choose sub-category:', {
    reply_markup: {
      inline_keyboard: rows,
    },
  });
}

function findByName(items, value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return items.find((item) => String(item.name || '').trim().toLowerCase() === normalized) || null;
}

async function loadMoneyRefs(supabase) {
  const [accountsRes, subAccountsRes, categoriesRes, subCategoriesRes] = await Promise.all([
    supabase.from('accounts').select('id,name').order('created_at', { ascending: true }),
    supabase.from('sub_accounts').select('id,name').order('created_at', { ascending: true }),
    supabase.from('categories').select('id,name').order('created_at', { ascending: true }),
    supabase.from('sub_categories').select('id,name,category_id').order('created_at', { ascending: true }),
  ]);

  const subCategoryData = subCategoriesRes?.error ? [] : subCategoriesRes.data || [];

  return {
    accounts: accountsRes.data || [],
    subAccounts: subAccountsRes.data || [],
    categories: categoriesRes.data || [],
    subCategories: subCategoryData,
  };
}

function parseAmount(text) {
  const amount = Number(text.trim());

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

async function insertMoneyEntry({ session, supabase }) {
  const amount = session.payload.amount;

  if (session.action === 'transfer') {
    return supabase.from('ledger_entries').insert({
      entry_type: 'transfer',
      amount,
      from_account: session.payload.from_account,
      to_account: session.payload.to_account,
      note: session.payload.note || null,
      category: null,
      account_name: null,
      occurred_at: new Date().toISOString(),
    });
  }

  return supabase.from('ledger_entries').insert({
    entry_type: session.action,
    amount,
    account_name: session.payload.account_name,
    sub_account_id: session.payload.sub_account_id || null,
    sub_category_id: session.payload.sub_category_id || null,
    category: session.payload.category || null,
    note: session.payload.note || null,
    occurred_at: new Date().toISOString(),
  });
}

async function handleMoneyCallbackQuery({ chatId, data, sessions, bot }) {
  const session = sessions.get(chatId);

  if (!session || session.module !== 'money') {
    return false;
  }

  const accountId = parsePick(data, MONEY_CALLBACKS.PICK_ACCOUNT);
  if (accountId && session.step === 'account') {
    const account = session.refs.accounts.find((item) => item.id === accountId);
    if (!account) {
      await bot.sendMessage(chatId, 'Invalid account selection. Try again.');
      return true;
    }

    session.payload.account_name = account.name;
    session.step = 'sub_account';
    sessions.set(chatId, session);

    if (!session.refs.subAccounts.length) {
      session.payload.sub_account_id = null;
      session.step = 'category';
      sessions.set(chatId, session);
      await sendCategoryPicker({ chatId, bot, categories: session.refs.categories });
      return true;
    }

    await sendSubAccountPicker({ chatId, bot, subAccounts: session.refs.subAccounts });
    return true;
  }

  const fromAccountId = parsePick(data, MONEY_CALLBACKS.PICK_FROM_ACCOUNT);
  if (fromAccountId && session.step === 'from_account') {
    const account = session.refs.accounts.find((item) => item.id === fromAccountId);
    if (!account) {
      await bot.sendMessage(chatId, 'Invalid from account selection. Try again.');
      return true;
    }

    session.payload.from_account = account.name;
    session.step = 'to_account';
    sessions.set(chatId, session);
    await sendAccountPicker({
      chatId,
      bot,
      accounts: session.refs.accounts,
      prefix: MONEY_CALLBACKS.PICK_TO_ACCOUNT,
      prompt: 'Choose TO account:',
    });
    return true;
  }

  const toAccountId = parsePick(data, MONEY_CALLBACKS.PICK_TO_ACCOUNT);
  if (toAccountId && session.step === 'to_account') {
    const account = session.refs.accounts.find((item) => item.id === toAccountId);
    if (!account) {
      await bot.sendMessage(chatId, 'Invalid to account selection. Try again.');
      return true;
    }

    if (String(account.name).toLowerCase() === String(session.payload.from_account || '').toLowerCase()) {
      await bot.sendMessage(chatId, 'From and To accounts must be different. Choose TO account again.');
      return true;
    }

    session.payload.to_account = account.name;
    session.step = 'note';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter note (or type skip):');
    return true;
  }

  const subAccountId = parsePick(data, MONEY_CALLBACKS.PICK_SUB_ACCOUNT);
  if (subAccountId && session.step === 'sub_account') {
    const subAccount = session.refs.subAccounts.find((item) => item.id === subAccountId);
    if (!subAccount) {
      await bot.sendMessage(chatId, 'Invalid sub-account selection. Try again.');
      return true;
    }

    session.payload.sub_account_id = subAccount.id;
    session.step = 'category';
    sessions.set(chatId, session);
    await sendCategoryPicker({ chatId, bot, categories: session.refs.categories });
    return true;
  }

  if (data === MONEY_CALLBACKS.SKIP_SUB_ACCOUNT && session.step === 'sub_account') {
    session.payload.sub_account_id = null;
    session.step = 'category';
    sessions.set(chatId, session);
    await sendCategoryPicker({ chatId, bot, categories: session.refs.categories });
    return true;
  }

  const categoryId = parsePick(data, MONEY_CALLBACKS.PICK_CATEGORY);
  if (categoryId && session.step === 'category') {
    const category = session.refs.categories.find((item) => item.id === categoryId);
    if (!category) {
      await bot.sendMessage(chatId, 'Invalid category selection. Try again.');
      return true;
    }

    session.payload.category = category.name;
    session.payload.category_id = category.id;

    const subCategories = session.refs.subCategories.filter((item) => item.category_id === category.id);

    if (!subCategories.length) {
      session.payload.sub_category_id = null;
      session.step = 'note';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, 'No sub-categories found for this category. Enter note (or type skip):');
      return true;
    }

    session.step = 'sub_category';
    sessions.set(chatId, session);
    await sendSubCategoryPicker({ chatId, bot, subCategories });
    return true;
  }

  const subCategoryId = parsePick(data, MONEY_CALLBACKS.PICK_SUB_CATEGORY);
  if (subCategoryId && session.step === 'sub_category') {
    const subCategory = session.refs.subCategories.find((item) => item.id === subCategoryId);
    if (!subCategory) {
      await bot.sendMessage(chatId, 'Invalid sub-category selection. Try again.');
      return true;
    }

    session.payload.sub_category_id = subCategory.id;
    session.step = 'note';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter note (or type skip):');
    return true;
  }

  if (data === MONEY_CALLBACKS.SKIP_SUB_CATEGORY && session.step === 'sub_category') {
    session.payload.sub_category_id = null;
    session.step = 'note';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter note (or type skip):');
    return true;
  }

  return false;
}

async function handleMoneyMessage({ chatId, text, sessions, bot, supabase, sendMainMenu }) {
  const session = sessions.get(chatId);

  if (!session || session.module !== 'money') {
    return false;
  }

  if (session.step === 'amount') {
    const amount = parseAmount(text);

    if (!amount) {
      await bot.sendMessage(chatId, 'Amount must be a number greater than 0. Try again:');
      return true;
    }

    session.payload.amount = amount;
    session.refs = await loadMoneyRefs(supabase);

    if (!session.refs.accounts.length) {
      await bot.sendMessage(chatId, 'No accounts found. Add accounts first in the app Cash Flow page.');
      sessions.delete(chatId);
      await sendMainMenu(chatId, 'Choose a module:');
      return true;
    }

    if (session.action === 'transfer') {
      session.step = 'from_account';
      sessions.set(chatId, session);
      await sendAccountPicker({
        chatId,
        bot,
        accounts: session.refs.accounts,
        prefix: MONEY_CALLBACKS.PICK_FROM_ACCOUNT,
        prompt: 'Choose FROM account:',
      });
      return true;
    }

    if (!session.refs.categories.length) {
      await bot.sendMessage(chatId, 'No categories found. Add categories first in the app Cash Flow page.');
      sessions.delete(chatId);
      await sendMainMenu(chatId, 'Choose a module:');
      return true;
    }

    session.step = 'account';
    sessions.set(chatId, session);
    await sendAccountPicker({
      chatId,
      bot,
      accounts: session.refs.accounts,
      prefix: MONEY_CALLBACKS.PICK_ACCOUNT,
      prompt: 'Choose account:',
    });
    return true;
  }

  if (session.step === 'account') {
    await bot.sendMessage(chatId, 'Use the buttons above to choose account.');
    return true;
  }

  if (session.step === 'sub_account') {
    await bot.sendMessage(chatId, 'Use the buttons above to choose sub-account (or Skip).');
    return true;
  }

  if (session.step === 'category') {
    await bot.sendMessage(chatId, 'Use the buttons above to choose category.');
    return true;
  }

  if (session.step === 'sub_category') {
    await bot.sendMessage(chatId, 'Use the buttons above to choose sub-category (or Skip).');
    return true;
  }

  if (session.step === 'from_account') {
    await bot.sendMessage(chatId, 'Use the buttons above to choose FROM account.');
    return true;
  }

  if (session.step === 'to_account') {
    await bot.sendMessage(chatId, 'Use the buttons above to choose TO account.');
    return true;
  }

  if (session.step === 'note') {
    const note = text.trim();
    session.payload.note = note.toLowerCase() === 'skip' ? null : note;

    const { error } = await insertMoneyEntry({ session, supabase });

    if (error) {
      await bot.sendMessage(chatId, `Could not save money entry: ${error.message}`);
      sessions.delete(chatId);
      await sendMainMenu(chatId, 'Operation failed. Choose an option:');
      return true;
    }

    const successLabel = session.action === 'transfer' ? 'Transfer' : session.action === 'income' ? 'Income' : 'Expense';
    sessions.delete(chatId);

    await bot.sendMessage(chatId, `${successLabel} saved successfully.`);
    await sendMainMenu(chatId, 'Choose your next action:');
    return true;
  }

  return false;
}

module.exports = {
  MONEY_CALLBACKS,
  getMoneyMenuKeyboard,
  beginMoneyAction,
  handleMoneyCallbackQuery,
  handleMoneyMessage,
};
