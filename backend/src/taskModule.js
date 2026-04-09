const TASK_CALLBACKS = {
  MENU: 'menu:tasks',
  ADD_TASK: 'task:add_task',
  ADD_ROUTINE: 'task:add_routine',
  BACK: 'menu:main',
};

function getTaskMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Add Task', callback_data: TASK_CALLBACKS.ADD_TASK },
        { text: 'Add Routine', callback_data: TASK_CALLBACKS.ADD_ROUTINE },
      ],
      [{ text: 'Back', callback_data: TASK_CALLBACKS.BACK }],
    ],
  };
}

function getTodayDateString() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const [y, m, d] = value.split('-').map(Number);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
}

function beginTaskAction({ chatId, action, sessions, bot }) {
  const taskType = action === 'add_routine' ? 'routine' : 'task';

  sessions.set(chatId, {
    module: 'task',
    action,
    step: 'title',
    payload: {
      task_type: taskType,
      task_date: getTodayDateString(),
    },
  });

  bot.sendMessage(chatId, `Enter ${taskType} title:`);
}

async function insertTaskEntry({ session, supabase }) {
  const payload = session.payload;

  return supabase.from('financial_tasks').insert({
    title: payload.title,
    description: payload.description || null,
    task_date: payload.task_date,
    task_time: null,
    due_date: payload.due_date,
    due_time: null,
    task_type: payload.task_type,
    routine_frequency: payload.task_type === 'routine' ? payload.routine_frequency : null,
    routine_days:
      payload.task_type === 'routine' && ['daily', 'weekly'].includes(payload.routine_frequency)
        ? payload.routine_days
        : [],
    routine_month_day:
      payload.task_type === 'routine' && payload.routine_frequency === 'monthly' ? payload.routine_month_day : null,
    completed: false,
  });
}

async function handleTaskMessage({ chatId, text, sessions, bot, supabase, sendMainMenu }) {
  const session = sessions.get(chatId);

  if (!session || session.module !== 'task') {
    return false;
  }

  if (session.step === 'title') {
    const title = text.trim();

    if (!title) {
      await bot.sendMessage(chatId, 'Title cannot be empty. Enter title:');
      return true;
    }

    session.payload.title = title;

    if (session.payload.task_type === 'routine') {
      session.step = 'routine_frequency';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, 'Enter routine frequency: daily, weekly, or monthly');
      return true;
    }

    session.step = 'due_date';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter due date in YYYY-MM-DD format:');
    return true;
  }

  if (session.step === 'routine_frequency') {
    const frequency = text.trim().toLowerCase();

    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      await bot.sendMessage(chatId, 'Frequency must be daily, weekly, or monthly. Enter again:');
      return true;
    }

    session.payload.routine_frequency = frequency;

    if (frequency === 'monthly') {
      session.step = 'routine_month_day';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, 'Enter month day number (1-31):');
      return true;
    }

    session.step = 'routine_days';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter routine days (comma-separated): sun,mon,tue,wed,thu,fri,sat');
    return true;
  }

  if (session.step === 'routine_days') {
    const allowed = new Set(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
    const days = text
      .split(',')
      .map((day) => day.trim().toLowerCase())
      .filter(Boolean);

    if (days.length === 0 || days.some((day) => !allowed.has(day))) {
      await bot.sendMessage(chatId, 'Invalid days. Use comma-separated values from sun,mon,tue,wed,thu,fri,sat');
      return true;
    }

    session.payload.routine_days = Array.from(new Set(days));
    session.step = 'due_date';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter due date in YYYY-MM-DD format:');
    return true;
  }

  if (session.step === 'routine_month_day') {
    const day = Number(text.trim());

    if (!Number.isInteger(day) || day < 1 || day > 31) {
      await bot.sendMessage(chatId, 'Month day must be a number from 1 to 31. Enter again:');
      return true;
    }

    session.payload.routine_month_day = day;
    session.step = 'due_date';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter due date in YYYY-MM-DD format:');
    return true;
  }

  if (session.step === 'due_date') {
    const dueDate = text.trim();

    if (!isValidDateString(dueDate)) {
      await bot.sendMessage(chatId, 'Invalid date. Enter due date in YYYY-MM-DD format:');
      return true;
    }

    session.payload.due_date = dueDate;
    session.step = 'description';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter description (or type skip):');
    return true;
  }

  if (session.step === 'description') {
    const description = text.trim();
    session.payload.description = description.toLowerCase() === 'skip' ? null : description;

    const { error } = await insertTaskEntry({ session, supabase });

    if (error) {
      await bot.sendMessage(chatId, `Could not save task: ${error.message}`);
      sessions.delete(chatId);
      await sendMainMenu(chatId, 'Operation failed. Choose an option:');
      return true;
    }

    const label = session.payload.task_type === 'routine' ? 'Routine' : 'Task';
    sessions.delete(chatId);
    await bot.sendMessage(chatId, `${label} created successfully.`);
    await sendMainMenu(chatId, 'Choose your next action:');
    return true;
  }

  return false;
}

module.exports = {
  TASK_CALLBACKS,
  getTaskMenuKeyboard,
  beginTaskAction,
  handleTaskMessage,
};
