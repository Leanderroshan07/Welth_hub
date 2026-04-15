const TASK_CALLBACKS = {
  MENU: 'menu:tasks',
  ADD_TASK: 'task:add_task',
  ADD_ROUTINE: 'task:add_routine',
  ADD_CHALLENGE: 'task:add_challenge',
  VIEW_TASKS: 'task:view_tasks',
  VIEW_CHALLENGES: 'task:view_challenges',
  VIEW_ROUTINES: 'task:view_routines',
  BACK: 'menu:main',
  // Routine frequency
  ROUTINE_FREQ_DAILY: 'routine:freq_daily',
  ROUTINE_FREQ_WEEKLY: 'routine:freq_weekly',
  ROUTINE_FREQ_MONTHLY: 'routine:freq_monthly',
  // Routine day selector
  ROUTINE_DAY_SUN: 'routine:day_sun',
  ROUTINE_DAY_MON: 'routine:day_mon',
  ROUTINE_DAY_TUE: 'routine:day_tue',
  ROUTINE_DAY_WED: 'routine:day_wed',
  ROUTINE_DAY_THU: 'routine:day_thu',
  ROUTINE_DAY_FRI: 'routine:day_fri',
  ROUTINE_DAY_SAT: 'routine:day_sat',
  ROUTINE_DAYS_DONE: 'routine:days_done',
  // Monthly day selector
  ROUTINE_MONTH_START: 'routine:month_',
  // Date picker
  PICK_DUE_TODAY: 'task:due_today',
  PICK_DUE_TOMORROW: 'task:due_tomorrow',
  PICK_DUE_NEXT_WEEK: 'task:due_next_week',
  PICK_DUE_CUSTOM: 'task:due_custom',
  SKIP_DUE_DATE: 'task:skip_due_date',
  // Time picker
  PICK_TIME_MORNING: 'task:time_morning',
  PICK_TIME_AFTERNOON: 'task:time_afternoon',
  PICK_TIME_EVENING: 'task:time_evening',
  PICK_TIME_NIGHT: 'task:time_night',
  SKIP_TIME: 'task:skip_time',
  // Challenge duration
  CHALLENGE_DURATION_7: 'challenge:duration_7',
  CHALLENGE_DURATION_14: 'challenge:duration_14',
  CHALLENGE_DURATION_30: 'challenge:duration_30',
  CHALLENGE_DURATION_CUSTOM: 'challenge:duration_custom',
  // Filters
  FILTER_ALL: 'task:filter_all',
  FILTER_TODAY: 'task:filter_today',
  FILTER_TOMORROW: 'task:filter_tomorrow',
  FILTER_WEEK: 'task:filter_week',
  FILTER_ROUTINES: 'task:filter_routines',
  FILTER_CHALLENGES: 'task:filter_challenges',
};

function getTaskMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ Add Task', callback_data: TASK_CALLBACKS.ADD_TASK },
        { text: '🔄 Add Routine', callback_data: TASK_CALLBACKS.ADD_ROUTINE },
      ],
      [
        { text: '🏆 Add Challenge', callback_data: TASK_CALLBACKS.ADD_CHALLENGE },
      ],
      [
        { text: '📋 View Tasks', callback_data: TASK_CALLBACKS.VIEW_TASKS },
        { text: '📅 View Routines', callback_data: TASK_CALLBACKS.VIEW_ROUTINES },
      ],
      [
        { text: '🎯 View Challenges', callback_data: TASK_CALLBACKS.VIEW_CHALLENGES },
      ],
      [{ text: '⬅️ Back', callback_data: TASK_CALLBACKS.BACK }],
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
      [{ text: '⏭️ Skip', callback_data: TASK_CALLBACKS.SKIP_DUE_DATE }],
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
      [{ text: '⏭️ Skip', callback_data: TASK_CALLBACKS.SKIP_TIME }],
    ],
  };
}

function getDayPickerKeyboard(selectedDays = []) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCallbacks = [
    TASK_CALLBACKS.ROUTINE_DAY_SUN,
    TASK_CALLBACKS.ROUTINE_DAY_MON,
    TASK_CALLBACKS.ROUTINE_DAY_TUE,
    TASK_CALLBACKS.ROUTINE_DAY_WED,
    TASK_CALLBACKS.ROUTINE_DAY_THU,
    TASK_CALLBACKS.ROUTINE_DAY_FRI,
    TASK_CALLBACKS.ROUTINE_DAY_SAT,
  ];

  const dayButtons = days.map((day, idx) => ({
    text: selectedDays.includes(dayCallbacks[idx]) ? `✓ ${day}` : day,
    callback_data: dayCallbacks[idx],
  }));

  return {
    inline_keyboard: [
      [dayButtons[0], dayButtons[1], dayButtons[2]],
      [dayButtons[3], dayButtons[4], dayButtons[5]],
      [dayButtons[6]],
      [{ text: '✅ Done', callback_data: TASK_CALLBACKS.ROUTINE_DAYS_DONE }],
    ],
  };
}

function getMonthCalendarKeyboard() {
  const buttons = [];
  for (let i = 1; i <= 31; i++) {
    if ((i - 1) % 4 === 0) {
      buttons.push([]);
    }
    buttons[Math.floor((i - 1) / 4)].push({
      text: String(i),
      callback_data: `${TASK_CALLBACKS.ROUTINE_MONTH_START}${i}`,
    });
  }
  buttons.push([{ text: '⬅️ Back', callback_data: 'task:routine_freq_back' }]);
  return { inline_keyboard: buttons };
}

function getFrequencyPickerKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📅 Daily', callback_data: TASK_CALLBACKS.ROUTINE_FREQ_DAILY },
        { text: '📆 Weekly', callback_data: TASK_CALLBACKS.ROUTINE_FREQ_WEEKLY },
      ],
      [{ text: '📋 Monthly', callback_data: TASK_CALLBACKS.ROUTINE_FREQ_MONTHLY }],
    ],
  };
}

function getChallengeDurationKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '7 Days', callback_data: TASK_CALLBACKS.CHALLENGE_DURATION_7 },
        { text: '14 Days', callback_data: TASK_CALLBACKS.CHALLENGE_DURATION_14 },
      ],
      [
        { text: '30 Days', callback_data: TASK_CALLBACKS.CHALLENGE_DURATION_30 },
      ],
      [
        { text: 'Custom Days', callback_data: TASK_CALLBACKS.CHALLENGE_DURATION_CUSTOM },
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

async function beginTaskAction({ chatId, action, sessions, bot, userId }) {
  try {
    let taskType = 'task';
    if (action === 'add_routine') taskType = 'routine';
    if (action === 'add_challenge') taskType = 'challenge';

    const session = {
      module: 'task',
      action,
      step: 'title',
      userId,
      createdAt: Date.now(),
      payload: {
        task_type: taskType,
        task_date: getTodayDateString(),
        due_date: null,
        due_time: null,
        routine_frequency: null,
        routine_days: [],
        routine_month_day: null,
        challenge_duration_days: null,
        challenge_end_date: null,
        description: null,
        user_id: userId,
      },
    };

    sessions.set(chatId, session);
    console.log(`📝 Session created for ${taskType}:`, { chatId, userId, action });

    const emoji = taskType === 'routine' ? '🔄' : taskType === 'challenge' ? '🏆' : '✅';
    const prompt = `${emoji} Enter ${taskType} ${taskType === 'challenge' ? 'name' : 'title'}:`;
    
    console.log(`📤 Sending prompt to ${chatId}:`, prompt);
    await bot.sendMessage(chatId, prompt);
    console.log(`✅ Prompt sent successfully to ${chatId}`);
  } catch (err) {
    console.error('❌ Error in beginTaskAction:', err);
    throw err;
  }
}

async function handleTaskCallbackQuery({ chatId, data, sessions, bot, userId, supabase }) {
  const session = sessions.get(chatId);

  // Handle filter callbacks (these don't need a session)
  if (data === TASK_CALLBACKS.FILTER_ALL || data === TASK_CALLBACKS.FILTER_TODAY || 
      data === TASK_CALLBACKS.FILTER_TOMORROW || data === TASK_CALLBACKS.FILTER_WEEK || 
      data === TASK_CALLBACKS.FILTER_ROUTINES || data === TASK_CALLBACKS.FILTER_CHALLENGES) {
    
    const filterMap = {
      [TASK_CALLBACKS.FILTER_ALL]: 'all',
      [TASK_CALLBACKS.FILTER_TODAY]: 'today',
      [TASK_CALLBACKS.FILTER_TOMORROW]: 'tomorrow',
      [TASK_CALLBACKS.FILTER_WEEK]: 'week',
      [TASK_CALLBACKS.FILTER_ROUTINES]: 'routines',
      [TASK_CALLBACKS.FILTER_CHALLENGES]: 'challenges',
    };
    
    const filter = filterMap[data];
    if (filter) {
      await sendTaskPreview({ chatId, bot, supabase, filter, userId });
      return true;
    }
  }

  if (!session || session.module !== 'task') {
    return false;
  }

  // Challenge duration callbacks
  if (data === TASK_CALLBACKS.CHALLENGE_DURATION_7) {
    session.payload.challenge_duration_days = 7;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const offset = endDate.getTimezoneOffset() * 60000;
    session.payload.challenge_end_date = new Date(endDate.getTime() - offset).toISOString().split('T')[0];
    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, '✅ Challenge duration: 7 days\n\nWhen should this challenge start?', {
      reply_markup: getDatePickerKeyboard(),
    });
    return true;
  } else if (data === TASK_CALLBACKS.CHALLENGE_DURATION_14) {
    session.payload.challenge_duration_days = 14;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    const offset = endDate.getTimezoneOffset() * 60000;
    session.payload.challenge_end_date = new Date(endDate.getTime() - offset).toISOString().split('T')[0];
    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, '✅ Challenge duration: 14 days\n\nWhen should this challenge start?', {
      reply_markup: getDatePickerKeyboard(),
    });
    return true;
  } else if (data === TASK_CALLBACKS.CHALLENGE_DURATION_30) {
    session.payload.challenge_duration_days = 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const offset = endDate.getTimezoneOffset() * 60000;
    session.payload.challenge_end_date = new Date(endDate.getTime() - offset).toISOString().split('T')[0];
    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, '✅ Challenge duration: 30 days\n\nWhen should this challenge start?', {
      reply_markup: getDatePickerKeyboard(),
    });
    return true;
  } else if (data === TASK_CALLBACKS.CHALLENGE_DURATION_CUSTOM) {
    session.step = 'challenge_custom_duration';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, 'Enter the number of days for this challenge (1-365):');
    return true;
  }

  // Routine frequency callbacks
  if (data === TASK_CALLBACKS.ROUTINE_FREQ_DAILY) {
    session.payload.routine_frequency = 'daily';
    session.step = 'routine_days';
    sessions.set(chatId, session);
    await bot.sendMessage(
      chatId,
      '📅 Select days routine repeats (click to toggle):\n\nWhen done, click ✅ Done',
      { reply_markup: getDayPickerKeyboard() }
    );
    return true;
  } else if (data === TASK_CALLBACKS.ROUTINE_FREQ_WEEKLY) {
    session.payload.routine_frequency = 'weekly';
    session.step = 'routine_days';
    sessions.set(chatId, session);
    await bot.sendMessage(
      chatId,
      '📅 Select days routine repeats (click to toggle):\n\nWhen done, click ✅ Done',
      { reply_markup: getDayPickerKeyboard() }
    );
    return true;
  } else if (data === TASK_CALLBACKS.ROUTINE_FREQ_MONTHLY) {
    session.payload.routine_frequency = 'monthly';
    session.step = 'routine_month_day';
    sessions.set(chatId, session);
    await bot.sendMessage(
      chatId,
      '📅 Select which day of month (1-31):\n\nClick a number button:',
      { reply_markup: getMonthCalendarKeyboard() }
    );
    return true;
  }

  // Routine day picker callbacks
  const dayPickData = data.match(/^routine:day_(sun|mon|tue|wed|thu|fri|sat)$/);
  if (dayPickData) {
    const dayName = dayPickData[1];
    if (!session.payload.routine_days) {
      session.payload.routine_days = [];
    }
    const dayIndex = session.payload.routine_days.indexOf(dayName);
    if (dayIndex > -1) {
      session.payload.routine_days.splice(dayIndex, 1);
    } else {
      session.payload.routine_days.push(dayName);
    }
    sessions.set(chatId, session);
    const selectedDayCallbacks = session.payload.routine_days.map(day => `routine:day_${day}`);
    const daysText = session.payload.routine_days.length > 0 ? session.payload.routine_days.join(', ') : 'None selected';
    await bot.sendMessage(
      chatId,
      `✅ Days: ${daysText}\n\nClick more or tap ✅ Done to continue:`,
      { reply_markup: getDayPickerKeyboard(selectedDayCallbacks) }
    );
    return true;
  }

  // Routine days done callback
  if (data === TASK_CALLBACKS.ROUTINE_DAYS_DONE) {
    if (!session.payload.routine_days || session.payload.routine_days.length === 0) {
      await bot.sendMessage(chatId, '⚠️ Please select at least one day.');
      return true;
    }
    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(
      chatId,
      `✅ Routine set for: ${session.payload.routine_days.join(', ')}\n\nWhen does this routine start?`,
      { reply_markup: getDatePickerKeyboard() }
    );
    return true;
  }

  // Routine month day callbacks
  const monthDayData = data.match(/^routine:month_(\d+)$/);
  if (monthDayData) {
    const dayNum = Number(monthDayData[1]);
    session.payload.routine_month_day = dayNum;
    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(
      chatId,
      `📅 Month day set to: ${dayNum}\n\nNow select when this routine starts:`,
      { reply_markup: getDatePickerKeyboard() }
    );
    return true;
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
    const dateLabel = dueDatePickData === 'today' ? 'Today' : dueDatePickData === 'tomorrow' ? 'Tomorrow' : 'Next Week';
    await bot.sendMessage(
      chatId,
      `📅 Start date: ${dateLabel}\n\nWhen should reminders be sent?`,
      { reply_markup: getTimePickerKeyboard() }
    );
    return true;
  }

  // Skip due date callback
  if (data === TASK_CALLBACKS.SKIP_DUE_DATE) {
    session.payload.due_date = null;
    session.step = 'due_time_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(
      chatId,
      '⏭️ No due date set.\n\nWhen should reminders be sent?',
      { reply_markup: getTimePickerKeyboard() }
    );
    return true;
  }

  // Time picker callbacks
  let timeSet = false;
  if (data === TASK_CALLBACKS.PICK_TIME_MORNING) {
    session.payload.due_time = getTimeFromPeriod('morning');
    timeSet = true;
  } else if (data === TASK_CALLBACKS.PICK_TIME_AFTERNOON) {
    session.payload.due_time = getTimeFromPeriod('afternoon');
    timeSet = true;
  } else if (data === TASK_CALLBACKS.PICK_TIME_EVENING) {
    session.payload.due_time = getTimeFromPeriod('evening');
    timeSet = true;
  } else if (data === TASK_CALLBACKS.PICK_TIME_NIGHT) {
    session.payload.due_time = getTimeFromPeriod('night');
    timeSet = true;
  } else if (data === TASK_CALLBACKS.SKIP_TIME) {
    session.payload.due_time = null;
    timeSet = true;
  } else {
    return false;
  }

  if (!timeSet) {
    return false;
  }

  session.step = 'description';
  sessions.set(chatId, session);
  const taskType = session.payload.task_type === 'routine' ? 'Routine' : 'Task';
  await bot.sendMessage(
    chatId,
    `✅ Almost done! Add optional description (or type "skip"):\n\n${taskType} name: ${session.payload.title}`
  );
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
        { text: '🏆 Challenges', callback_data: TASK_CALLBACKS.FILTER_CHALLENGES },
      ],
    ],
  };
}

async function sendTaskPreview({ chatId, bot, supabase, filter = 'all', userId }) {
  try {
    let query = supabase
      .from('financial_tasks')
      .select('id,title,task_type,due_date,due_time,challenge_duration_days,challenge_end_date,completed')
      .eq('completed', false);

    // Always filter by user_id if provided (important for performance!)
    if (userId) {
      // Use telegram_user_id (bigint) to avoid UUID-type mismatches
      query = query.eq('telegram_user_id', userId);
    }

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
    } else if (filter === 'challenges') {
      query = query.eq('task_type', 'challenge');
    }

    const { data, error } = await query.order('due_date', { ascending: true }).limit(10);

    if (error) {
      console.error('Error fetching tasks:', error);
      await bot.sendMessage(chatId, '⚠️ Could not load tasks. Please try again.');
      return;
    }

    const pending = data || [];
    const filterLabel = {
      all: '📋 All pending items',
      today: '📅 Due today',
      tomorrow: '🔜 Due tomorrow',
      week: '📆 Due this week',
      routines: '🔄 Routines',
      challenges: '🏆 Challenges',
    }[filter] || 'Current pending items';

    const formattedItems = pending
      .map((item, idx) => {
        const time = item.due_time ? ` at ${item.due_time}` : '';
        let emoji = '✅';
        if (item.task_type === 'routine') emoji = '🔄';
        if (item.task_type === 'challenge') emoji = '🏆';
        
        let itemStr = `${idx + 1}. ${emoji} ${item.title}`;
        if (item.task_type === 'challenge') {
          itemStr += ` (${item.challenge_duration_days}d, ends ${item.challenge_end_date})`;
        } else {
          itemStr += ` (due ${item.due_date || 'n/a'}${time})`;
        }
        return itemStr;
      })
      .join('\n');

    await bot.sendMessage(chatId, `${filterLabel}:\n\n${pending.length > 0 ? formattedItems : 'No items'}`, {
      reply_markup: getFilterKeyboard(),
    });
  } catch (err) {
    console.error('Error in sendTaskPreview:', err?.message || err);
    await bot.sendMessage(chatId, '⚠️ Error loading tasks. Please try again.');
  }
}

async function insertTaskEntry({ session, supabase }) {
  try {
    const payload = session.payload;

    console.log(`🔗 Connecting to Supabase to insert ${payload.task_type}...`);

    const result = await supabase.from('financial_tasks').insert({
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
      challenge_duration_days: payload.task_type === 'challenge' ? payload.challenge_duration_days : null,
      challenge_end_date: payload.task_type === 'challenge' ? payload.challenge_end_date : null,
      // Store Telegram numeric id separately to avoid conflicting with UUID user ids
      telegram_user_id: payload.user_id || null,
      completed: false,
    });

    if (result.error) {
      console.error(`❌ Supabase error:`, result.error);
      return result;
    }

    console.log(`✅ Supabase insert successful:`, result.data);
    return result;
  } catch (err) {
    console.error(`❌ Exception in insertTaskEntry:`, err);
    return { error: err, data: null };
  }
}

async function handleTaskMessage({ chatId, text, sessions, bot, supabase, sendMainMenu, userId }) {
  const session = sessions.get(chatId);

  if (!session || session.module !== 'task') {
    return false;
  }

  console.log(`📨 Task message received | Chat: ${chatId}, Step: ${session.step}, Text: "${text.substring(0, 50)}"`);

  if (session.step === 'title') {
    const title = text.trim();

    if (!title) {
      const label = session.payload.task_type === 'routine' ? 'Routine' : session.payload.task_type === 'challenge' ? 'Challenge' : 'Task';
      await bot.sendMessage(chatId, `${label} name cannot be empty. Enter ${label.toLowerCase()} name:`);
      return true;
    }

    session.payload.title = title;
    console.log(`📝 Title set: "${title}"`);

    if (session.payload.task_type === 'routine') {
      session.step = 'routine_frequency';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, '🔄 Select routine frequency:', {
        reply_markup: getFrequencyPickerKeyboard(),
      });
      return true;
    }

    if (session.payload.task_type === 'challenge') {
      session.step = 'challenge_duration';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, '🏆 How many days for this challenge?', {
        reply_markup: getChallengeDurationKeyboard(),
      });
      return true;
    }

    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, '📅 When is this task due?', {
      reply_markup: getDatePickerKeyboard(),
    });
    return true;
  }

  if (session.step === 'routine_frequency') {
    await bot.sendMessage(chatId, 'Please use the buttons to select frequency.');
    return true;
  }

  if (session.step === 'routine_days') {
    await bot.sendMessage(chatId, 'Please use the buttons to select days.');
    return true;
  }

  if (session.step === 'routine_month_day') {
    await bot.sendMessage(chatId, 'Please use the buttons to select the day.');
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

  if (session.step === 'challenge_custom_duration') {
    const days = parseInt(text.trim(), 10);
    if (isNaN(days) || days <= 0 || days > 365) {
      await bot.sendMessage(chatId, 'Please enter a valid number between 1 and 365:');
      return true;
    }
    session.payload.challenge_duration_days = days;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const offset = endDate.getTimezoneOffset() * 60000;
    session.payload.challenge_end_date = new Date(endDate.getTime() - offset).toISOString().split('T')[0];
    session.step = 'due_date_picker';
    sessions.set(chatId, session);
    await bot.sendMessage(chatId, `✅ Challenge duration: ${days} days\n\nWhen should this challenge start?`, {
      reply_markup: getDatePickerKeyboard(),
    });
    return true;
  }

  if (session.step === 'description') {
    const description = text.trim();
    session.payload.description = description.toLowerCase() === 'skip' ? null : description;

    console.log(`💾 Saving ${session.payload.task_type}:`, {
      title: session.payload.title,
      type: session.payload.task_type,
      dueDate: session.payload.due_date,
      dueTime: session.payload.due_time,
      userId: session.payload.user_id,
    });

    const { error, data } = await insertTaskEntry({ session, supabase });

    if (error) {
      console.error(`❌ Database error saving ${session.payload.task_type}:`, error);
      await bot.sendMessage(chatId, `Could not save ${session.payload.task_type}: ${error.message}`);
      sessions.delete(chatId);
      await sendMainMenu(chatId, 'Operation failed. Choose an option:');
      return true;
    }

    console.log(`✅ ${session.payload.task_type} saved successfully!`, { id: data?.[0]?.id });

    const typeLabel = session.payload.task_type === 'routine' ? 'Routine' : session.payload.task_type === 'challenge' ? 'Challenge' : 'Task';
    const emoji = session.payload.task_type === 'routine' ? '🔄' : session.payload.task_type === 'challenge' ? '🏆' : '✅';
    
    let summaryMsg = `${emoji} ${typeLabel} Summary:\n\n`;
    summaryMsg += `📌 Name: ${session.payload.title}\n`;
    
    if (session.payload.task_type === 'routine') {
      summaryMsg += `🔁 Frequency: ${session.payload.routine_frequency}\n`;
      summaryMsg += `📅 Days: ${session.payload.routine_days.join(', ')}\n`;
    } else if (session.payload.task_type === 'challenge') {
      summaryMsg += `⏱️ Duration: ${session.payload.challenge_duration_days} days\n`;
      const endDate = new Date(`${session.payload.challenge_end_date}T00:00:00`);
      const formattedEndDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(endDate);
      summaryMsg += `📅 End Date: ${formattedEndDate}\n`;
    }
    
    summaryMsg += `🗓️ Start Date: ${session.payload.due_date ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${session.payload.due_date}T00:00:00`)) : 'Not set'}\n`;
    if (session.payload.due_time) summaryMsg += `⏰ Time: ${session.payload.due_time}\n`;
    if (session.payload.description) summaryMsg += `📝 Notes: ${session.payload.description}\n`;
    
    sessions.delete(chatId);
    await bot.sendMessage(chatId, summaryMsg + `\n✅ ${typeLabel} created successfully!`);
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
