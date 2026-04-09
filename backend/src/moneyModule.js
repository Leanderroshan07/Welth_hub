const MONEY_CALLBACKS = {
  MENU: 'menu:money',
  INCOME: 'money:income',
  EXPENSE: 'money:expense',
  TRANSFER: 'money:transfer',
  BACK: 'menu:main',
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
  };

  sessions.set(chatId, baseSession);

  bot.sendMessage(chatId, 'Enter amount (example: 2500.50):');
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
    category: session.payload.category || null,
    note: session.payload.note || null,
    occurred_at: new Date().toISOString(),
  });
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

    if (session.action === 'transfer') {
      session.step = 'from_account';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, 'Enter FROM account name:');
      return true;
    }

    session.step = 'account';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter account name:');
    return true;
  }

  if (session.step === 'account') {
    const accountName = text.trim();

    if (!accountName) {
      await bot.sendMessage(chatId, 'Account name cannot be empty. Enter account name:');
      return true;
    }

    session.payload.account_name = accountName;
    session.step = 'category';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter category (or type skip):');
    return true;
  }

  if (session.step === 'category') {
    const value = text.trim();
    session.payload.category = value.toLowerCase() === 'skip' ? null : value;
    session.step = 'note';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter note (or type skip):');
    return true;
  }

  if (session.step === 'from_account') {
    const fromAccount = text.trim();

    if (!fromAccount) {
      await bot.sendMessage(chatId, 'From account cannot be empty. Enter FROM account:');
      return true;
    }

    session.payload.from_account = fromAccount;
    session.step = 'to_account';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter TO account name:');
    return true;
  }

  if (session.step === 'to_account') {
    const toAccount = text.trim();

    if (!toAccount) {
      await bot.sendMessage(chatId, 'To account cannot be empty. Enter TO account:');
      return true;
    }

    if (toAccount.toLowerCase() === session.payload.from_account.toLowerCase()) {
      await bot.sendMessage(chatId, 'From and To accounts must be different. Enter TO account again:');
      return true;
    }

    session.payload.to_account = toAccount;
    session.step = 'note';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter note (or type skip):');
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
  handleMoneyMessage,
};
