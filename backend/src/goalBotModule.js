// Goal Tracking module for Telegram Bot
const { createGoal, getGoals, updateGoal, deleteGoal } = require('./goalModule');

const GOAL_CALLBACKS = {
  MENU: 'goal:menu',
  ADD: 'goal:add',
  VIEW: 'goal:view',
  PROGRESS: 'goal:progress',
  DELETE: 'goal:delete',
  BACK: 'goal:back',
};

function getGoalMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Add Goal', callback_data: GOAL_CALLBACKS.ADD }],
      [{ text: 'View Goals', callback_data: GOAL_CALLBACKS.VIEW }],
      [{ text: 'Back', callback_data: GOAL_CALLBACKS.BACK }],
    ],
  };
}

async function handleGoalCallbackQuery({ chatId, data, sessions, bot, userId }) {
  if (data === GOAL_CALLBACKS.MENU) {
    await bot.sendMessage(chatId, 'Goal Tracking: choose an action', {
      reply_markup: getGoalMenuKeyboard(),
    });
    return true;
  }
  if (data === GOAL_CALLBACKS.ADD) {
    sessions.set(chatId, { type: 'goal_add', step: 0, goal: {} });
    await bot.sendMessage(chatId, 'Enter goal title:');
    return true;
  }
  if (data === GOAL_CALLBACKS.VIEW) {
    const goals = await getGoals(userId);
    if (!goals.length) {
      await bot.sendMessage(chatId, 'No goals found.');
      return true;
    }
    let msg = 'Your Goals:\n';
    goals.forEach((g, i) => {
      const percent = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
      msg += `\n${i + 1}. ${g.title} | ₹${g.current_amount} / ₹${g.target_amount} | ${percent}% | Target: ${g.target_date}`;
    });
    await bot.sendMessage(chatId, msg);
    return true;
  }
  if (data === GOAL_CALLBACKS.BACK) {
    return false;
  }
  return false;
}

async function handleGoalMessage({ chatId, text, sessions, bot, userId }) {
  const session = sessions.get(chatId);
  if (!session || session.type !== 'goal_add') return false;
  if (session.step === 0) {
    session.goal.title = text;
    session.step = 1;
    await bot.sendMessage(chatId, 'Enter target amount (₹):');
    return true;
  }
  if (session.step === 1) {
    const amt = parseFloat(text.replace(/[^\d.]/g, ''));
    if (isNaN(amt) || amt <= 0) {
      await bot.sendMessage(chatId, 'Invalid amount. Enter a valid number:');
      return true;
    }
    session.goal.target_amount = amt;
    session.step = 2;
    await bot.sendMessage(chatId, 'Enter target date (YYYY-MM-DD):');
    return true;
  }
  if (session.step === 2) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      await bot.sendMessage(chatId, 'Invalid date format. Use YYYY-MM-DD:');
      return true;
    }
    session.goal.target_date = text;
    session.step = 3;
    await bot.sendMessage(chatId, 'Enter description (optional):');
    return true;
  }
  if (session.step === 3) {
    session.goal.description = text;
    session.goal.user_id = userId;
    session.goal.current_amount = 0;
    try {
      await createGoal(session.goal);
      await bot.sendMessage(chatId, 'Goal added!');
    } catch (e) {
      await bot.sendMessage(chatId, 'Failed to add goal.');
    }
    sessions.delete(chatId);
    return true;
  }
  return false;
}

module.exports = {
  GOAL_CALLBACKS,
  getGoalMenuKeyboard,
  handleGoalCallbackQuery,
  handleGoalMessage,
};
