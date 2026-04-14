const TASK_CALLBACKS = {
  MENU: 'menu:tasks',
  ADD_TASK: 'task:add_task',
  ADD_ROUTINE: 'task:add_routine',
  BACK: 'menu:main',
  // Date picker
  PICK_DUE_TODAY: 'task:due_today',
  PICK_DUE_TOMORROW: 'task:due_tomorrow',
  PICK_DUE_NEXT_WEEK: 'task:due_next_week',
  PICK_DUE_CUSTOM: 'task:due_custom',
  // Time picker
  PICK_TIME_MORNING: 'task:time_morning',
  PICK_TIME_AFTERNOON: 'task:time_afternoon',
  PICK_TIME_EVENING: 'task:time_evening',
  PICK_TIME_NIGHT: 'task:time_night',
  // Filters
  FILTER_ALL: 'task:filter_all',
  FILTER_TODAY: 'task:filter_today',
  FILTER_TOMORROW: 'task:filter_tomorrow',
  FILTER_WEEK: 'task:filter_week',
  FILTER_ROUTINES: 'task:filter_routines',
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

function getDateString(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

function getNextWeekDateString() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

function parseDueDate(data, prefix) {
  const expected = `${prefix}:`;
  if (!String(data || '').startsWith(expected)) {
    return null;
  }
  return data.slice(expected.length);
}

function getDatePickerKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Today', callback_data: TASK_CALLBACKS.PICK_DUE_TODAY },
        { text: 'Tomorrow', callback_data: TASK_CALLBACKS.PICK_DUE_TOMORROW },
      ],
      [
        { text: 'Next Week', callback_data: TASK_CALLBACKS.PICK_DUE_NEXT_WEEK },
        { text: 'Custom Date', callback_data: TASK_CALLBACKS.PICK_DUE_CUSTOM },
      ],
    ],
  };
}

function getTimePickerKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🌅 Morning (6-12)', callback_data: TASK_CALLBACKS.PICK_TIME_MORNING },
        { text: '☀️ Afternoon (12-18)', callback_data: TASK_CALLBACKS.PICK_TIME_AFTERNOON },
      ],
      [
        { text: '🌆 Evening (18-21)', callback_data: TASK_CALLBACKS.PICK_TIME_EVENING },
        { text: '🌙 Night (21-6)', callback_data: TASK_CALLBACKS.PICK_TIME_NIGHT },
      ],
    ],
  };
}

function getTimeFromPeriod(period) {
  const times = {
    morning: '09:00',
    afternoon: '15:00',
    evening: '19:00',
    night: '23:00',
  };
  return times[period] || '09:00';
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
      due_date: getTodayDateString(),
    },
  });

  bot.sendMessage(chatId, `Enter ${taskType} title:`);
}

async function handleTaskCallbackQuery({ chatId, data, sessions, bot }) {
  const session = sessions.get(chatId);

  if (!session || session.module !== 'task') {
    return false;
  }

  // Date picker callbacks
  const dueDatePickData = parseDueDate(data, 'task:due');
  if (dueDatePickData) {
    let dueDate;
    if (dueDatePickData === 'today') {
      dueDate = getTodayDateString();
    } else if (dueDatePickData === 'tomorrow') {
      dueDate = getDateString(1);
    } else if (dueDatePickData === 'next_week') {
      dueDate = getNextWeekDateString();
    } else if (dueDatePickData === 'custom') {
      session.step = 'due_date';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, 'Enter due date in YYYY-MM-DD format (e.g., 2026-04-20):');
      return true;
    } else {
      return false;
    }

    session.payload.due_date = dueDate;
    session.step = 'due_time_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'What time should the reminder be?', {
      reply_markup: getTimePickerKeyboard(),
    });
    return true;
  }

  // Time picker callbacks
  if (data === TASK_CALLBACKS.PICK_TIME_MORNING) {
    session.payload.due_time = getTimeFromPeriod('morning');
  } else if (data === TASK_CALLBACKS.PICK_TIME_AFTERNOON) {
    session.payload.due_time = getTimeFromPeriod('afternoon');
  } else if (data === TASK_CALLBACKS.PICK_TIME_EVENING) {
    session.payload.due_time = getTimeFromPeriod('evening');
  } else if (data === TASK_CALLBACKS.PICK_TIME_NIGHT) {
    session.payload.due_time = getTimeFromPeriod('night');
  } else {
    return false;
  }

  session.step = 'description';
  sessions.set(chatId, session);
  await bot.sendMessage(chatId, 'Enter description (or type skip):');
  return true;
}

function formatTaskPreview(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'No pending items.';
  }

  return items
    .map((item, index) => {
      const time = item.due_time ? ` at ${item.due_time}` : '';
      return `${index + 1}. ${item.title} (${item.task_type || 'task'} | due ${item.due_date || 'n/a'}${time})`;
    })
    .join('\n');
}

function getFilterKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📋 All Tasks', callback_data: TASK_CALLBACKS.FILTER_ALL },
        { text: '📅 Today', callback_data: TASK_CALLBACKS.FILTER_TODAY },
      ],
      [
        { text: '🔜 Tomorrow', callback_data: TASK_CALLBACKS.FILTER_TOMORROW },
        { text: '📆 This Week', callback_data: TASK_CALLBACKS.FILTER_WEEK },
      ],
      [
        { text: '🔄 Routines Only', callback_data: TASK_CALLBACKS.FILTER_ROUTINES },
      ],
    ],
  };
}

async function sendTaskPreview({ chatId, bot, supabase, filter = 'all' }) {
  let query = supabase
    .from('financial_tasks')
    .select('title,task_type,due_date,due_time,completed')
    .eq('completed', false);

  const today = getTodayDateString();
  const tomorrow = getDateString(1);
  const endOfWeek = getDateString(7);

  if (filter === 'today') {
    query = query.eq('due_date', today);
  } else if (filter === 'tomorrow') {
    query = query.eq('due_date', tomorrow);
  } else if (filter === 'week') {
    query = query.gte('due_date', today).lte('due_date', endOfWeek);
  } else if (filter === 'routines') {
    query = query.eq('task_type', 'routine');
  }

  const { data } = await query.order('due_date', { ascending: true }).limit(5);

  const pending = data || [];
  const filterLabel = {
    all: 'Current pending tasks/routines',
    today: 'Tasks due today',
    tomorrow: 'Tasks due tomorrow',
    week: 'Tasks due this week',
    routines: 'Routines only',
  }[filter] || 'Current pending tasks/routines';

  await bot.sendMessage(chatId, `${filterLabel}:\n${formatTaskPreview(pending)}`, {
    reply_markup: getFilterKeyboard(),
  });
}

async function insertTaskEntry({ session, supabase }) {
  const payload = session.payload;

  return supabase.from('financial_tasks').insert({
    title: payload.title,
    description: payload.description || null,
    task_date: payload.task_date,
    task_time: null,
    due_date: payload.due_date,
    due_time: payload.due_time || '09:00',
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

    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'When is this task due?', {
      reply_markup: getDatePickerKeyboard(),
    });
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
    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'When is this routine due?', {
      reply_markup: getDatePickerKeyboard(),
    });
    return true;
  }

  if (session.step === 'routine_month_day') {
    const day = Number(text.trim());

    if (!Number.isInteger(day) || day < 1 || day > 31) {
      await bot.sendMessage(chatId, 'Month day must be a number from 1 to 31. Enter again:');
      return true;
    }

    session.payload.routine_month_day = day;
    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'When is this routine due?', {
      reply_markup: getDatePickerKeyboard(),
    });
    return true;
  }

  if (session.step === 'due_date_picker') {
    // This step is handled by callbacks, should not reach here
    return false;
  }

  if (session.step === 'due_date') {
    const dueDate = text.trim();

    if (!isValidDateString(dueDate)) {
      await bot.sendMessage(chatId, 'Invalid date. Enter due date in YYYY-MM-DD format:');
      return true;
    }

    session.payload.due_date = dueDate;
    session.step = 'due_time_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'What time should the reminder be?', {
      reply_markup: getTimePickerKeyboard(),
    });
    return true;
  }

  if (session.step === 'due_time_picker') {
    // This step is handled by callbacks, should not reach here
    return false;
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
  handleTaskCallbackQuery,
  sendTaskPreview,
};
