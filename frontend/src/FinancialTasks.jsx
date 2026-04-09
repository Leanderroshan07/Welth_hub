import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const TASK_TYPES = [
  { value: 'routine', label: 'Routine', badge: 'bg-cyan-500/20 text-cyan-100 ring-cyan-400/30' },
  { value: 'task', label: 'Task', badge: 'bg-amber-500/20 text-amber-100 ring-amber-400/30' },
  { value: 'challenge', label: 'Challenge', badge: 'bg-rose-500/20 text-rose-100 ring-rose-400/30' },
];

const ROUTINE_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const WEEKDAY_OPTIONS = [
  { value: 'sun', label: 'Sun' },
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
];

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function getTodayDateString(referenceDate = new Date()) {
  const offset = referenceDate.getTimezoneOffset() * 60000;
  return new Date(referenceDate.getTime() - offset).toISOString().split('T')[0];
}

function getTaskTypeMeta(taskType) {
  return TASK_TYPES.find((item) => item.value === taskType) || TASK_TYPES[1];
}

function getRoutineFrequencyLabel(frequency) {
  return ROUTINE_FREQUENCIES.find((item) => item.value === frequency)?.label || '';
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
}

function buildMonthCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

function formatRoutineSchedule(task) {
  if (task.task_type !== 'routine') {
    return '';
  }

  if (task.routine_frequency === 'monthly') {
    return `Monthly on day ${task.routine_month_day || '—'}`;
  }

  const selectedDays = Array.isArray(task.routine_days) ? task.routine_days : [];
  const dayLabel = selectedDays.length > 0
    ? selectedDays
        .map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label || day)
        .join(', ')
    : 'No days selected';

  return `${getRoutineFrequencyLabel(task.routine_frequency) || 'Routine'} on ${dayLabel}`;
}

function isSameDate(leftDate, rightDate) {
  return leftDate === rightDate;
}

function TaskTypeBadge({ taskType }) {
  const meta = getTaskTypeMeta(taskType);

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${meta.badge}`}>{meta.label}</span>;
}

function TaskCard({ task, onToggleComplete, onDelete, overdue = false, completed = false }) {
  const routineSchedule = formatRoutineSchedule(task);
  const isChallenge = task.task_type === 'challenge';

  return (
    <article
      className={`financial-task-card rounded-3xl border p-4 shadow-[0_16px_48px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-white/20 ${
        overdue
          ? 'border-rose-400/20 bg-rose-500/5'
          : isChallenge && completed
            ? 'challenge completed border-emerald-300/30 bg-gradient-to-br from-emerald-400/25 via-emerald-500/15 to-cyan-400/10'
            : completed
              ? 'completed border-white/10 bg-white/5 opacity-75'
              : isChallenge
                ? 'challenge border-rose-300/20 bg-rose-500/10'
                : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggleComplete(task.id, task.completed)}
          className={`mt-1 h-5 w-5 cursor-pointer rounded border-white/20 bg-white/10 text-cyan-400 focus:ring-cyan-400/30 ${isChallenge ? 'challenge-seat-control' : ''}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-base font-semibold text-white ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
            <TaskTypeBadge taskType={task.task_type} />
          </div>
          <p className="mt-1 text-sm text-slate-300">
            Due: {formatDate(task.due_date)}
            {task.due_time ? ` at ${task.due_time}` : ''}
          </p>
          {routineSchedule ? <p className="mt-1 text-xs uppercase tracking-[0.14em] text-cyan-200/70">{routineSchedule}</p> : null}
          {task.description ? <p className="mt-2 text-sm leading-6 text-slate-400">{task.description}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          aria-label="Delete task"
        >
          <span className="material-symbols-outlined text-[1.1rem]">delete</span>
        </button>
      </div>
    </article>
  );
}

function TaskGroup({ title, count, tasks, emptyMessage, accentClass, onToggleComplete, onDelete, overdue = false }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className={`text-xl font-bold ${accentClass}`}>{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{count} task{count === 1 ? '' : 's'}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              overdue={overdue}
              completed={task.completed}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function FinancialTasks({ showToast, onTasksChange }) {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [routineCalendarView, setRoutineCalendarView] = useState(new Date());

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    taskDate: getTodayDateString(),
    taskTime: '',
    dueDate: getTodayDateString(),
    dueTime: '',
    taskType: 'task',
    routineFrequency: 'daily',
    routineDays: ['mon'],
    routineMonthDay: '1',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const { data, error } = await supabase
      .from('financial_tasks')
      .select('*')
      .order('due_date', { ascending: true })
      .order('due_time', { ascending: true });

    if (!error) {
      setTasks(data || []);
    }
  }

  function openModal() {
    setSubmitError('');
    setRoutineCalendarView(new Date());
    setTaskForm({
      title: '',
      description: '',
      taskDate: getTodayDateString(),
      taskTime: '',
      dueDate: getTodayDateString(),
      dueTime: '',
      taskType: 'task',
      routineFrequency: 'daily',
      routineDays: ['mon'],
      routineMonthDay: '1',
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSubmitError('');
  }

  function updateTaskField(field, value) {
    setTaskForm((current) => ({ ...current, [field]: value }));
  }

  function toggleRoutineDay(dayValue) {
    setTaskForm((current) => {
      const hasDay = current.routineDays.includes(dayValue);
      const nextDays = hasDay
        ? current.routineDays.filter((day) => day !== dayValue)
        : [...current.routineDays, dayValue];

      return { ...current, routineDays: nextDays };
    });
  }

  function selectRoutineMonthDay(dayValue) {
    setTaskForm((current) => ({
      ...current,
      routineMonthDay: String(dayValue),
    }));
  }

  function shiftRoutineCalendar(monthOffset) {
    setRoutineCalendarView((current) => new Date(current.getFullYear(), current.getMonth() + monthOffset, 1));
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    if (!taskForm.title.trim()) {
      setSubmitError('Task title is required.');
      return;
    }

    if (!taskForm.dueDate) {
      setSubmitError('Due date is required.');
      return;
    }

    const isRoutine = taskForm.taskType === 'routine';

    if (isRoutine && !taskForm.routineFrequency) {
      setSubmitError('Pick a routine frequency.');
      return;
    }

    if (isRoutine && ['daily', 'weekly'].includes(taskForm.routineFrequency) && taskForm.routineDays.length === 0) {
      setSubmitError('Select at least one day for the routine.');
      return;
    }

    if (isRoutine && taskForm.routineFrequency === 'monthly') {
      const monthDay = Number(taskForm.routineMonthDay);

      if (!monthDay || monthDay < 1 || monthDay > 31) {
        setSubmitError('Enter a valid month day between 1 and 31.');
        return;
      }
    }

    setSaving(true);

    const { error: insertError } = await supabase.from('financial_tasks').insert({
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      task_date: taskForm.taskDate,
      task_time: taskForm.taskTime || null,
      due_date: taskForm.dueDate,
      due_time: taskForm.dueTime || null,
      task_type: taskForm.taskType,
      routine_frequency: isRoutine ? taskForm.routineFrequency : null,
      routine_days: isRoutine && ['daily', 'weekly'].includes(taskForm.routineFrequency) ? taskForm.routineDays : [],
      routine_month_day: isRoutine && taskForm.routineFrequency === 'monthly' ? Number(taskForm.routineMonthDay) : null,
    });

    if (insertError) {
      setSubmitError(insertError.message);
      showToast?.(insertError.message, 'error');
      setSaving(false);
      return;
    }

    await loadTasks();
    await onTasksChange?.();
    setSaving(false);
    closeModal();
    showToast?.('Task added successfully.', 'success');
  }

  async function toggleTaskComplete(taskId, completed) {
    const { error } = await supabase
      .from('financial_tasks')
      .update({ completed: !completed })
      .eq('id', taskId);

    if (!error) {
      await loadTasks();
      await onTasksChange?.();
      showToast?.(!completed ? 'Task marked complete.' : 'Task marked incomplete.', 'success');
    }
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from('financial_tasks').delete().eq('id', taskId);

    if (!error) {
      await loadTasks();
      await onTasksChange?.();
      showToast?.('Task deleted.', 'success');
    } else {
      showToast?.(error.message, 'error');
    }
  }

  const todayDate = getTodayDateString();

  const overdueTasks = useMemo(
    () => tasks.filter((task) => !task.completed && task.due_date < todayDate),
    [tasks, todayDate],
  );

  const dueTodayTasks = useMemo(
    () => tasks.filter((task) => !task.completed && isSameDate(task.due_date, todayDate)),
    [tasks, todayDate],
  );

  const upcomingTasks = useMemo(
    () => tasks.filter((task) => !task.completed && task.due_date > todayDate),
    [tasks, todayDate],
  );

  const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);

  const dueDateGroups = useMemo(() => {
    const grouped = new Map();

    tasks.forEach((task) => {
      if (!grouped.has(task.due_date)) {
        grouped.set(task.due_date, []);
      }
      grouped.get(task.due_date).push(task);
    });

    return Array.from(grouped.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([dueDate, dueTasks]) => ({
        dueDate,
        dueTasks,
        pendingCount: dueTasks.filter((task) => !task.completed).length,
      }));
  }, [tasks]);

  const dashboardCards = [
    {
      label: 'Overdue',
      value: overdueTasks.length,
      helper: 'Past due and not complete',
      tone: 'from-rose-500/25 to-rose-400/10 text-rose-100 border-rose-400/20',
    },
    {
      label: 'Due Today',
      value: dueTodayTasks.length,
      helper: 'Needs attention now',
      tone: 'from-amber-500/25 to-amber-400/10 text-amber-100 border-amber-400/20',
    },
    {
      label: 'Upcoming',
      value: upcomingTasks.length,
      helper: 'Due later or tomorrow',
      tone: 'from-cyan-500/25 to-cyan-400/10 text-cyan-100 border-cyan-400/20',
    },
    {
      label: 'Completed',
      value: completedTasks.length,
      helper: 'Finished tasks',
      tone: 'from-emerald-500/25 to-emerald-400/10 text-emerald-100 border-emerald-400/20',
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 text-slate-100 lg:px-6">
      <header className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-cyan-200/70">Financial Tasks</p>
          <h2 className="font-['Manrope'] text-3xl font-black tracking-tight text-white sm:text-4xl">
            Track routines, tasks, and challenges by due date.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Use the task dashboard to spot overdue items first, then plan what is due today and what is coming next.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          onClick={openModal}
          aria-label="Add task"
        >
          <span className="material-symbols-outlined text-[1.1rem]">add</span>
          Add Task
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => (
          <article
            key={card.label}
            className={`rounded-[1.5rem] border bg-gradient-to-br p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)] ${card.tone}`}
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/65">{card.label}</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <span className="font-['Manrope'] text-4xl font-black leading-none">{card.value}</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[0.7rem] font-medium text-white/75">
                Due date based
              </span>
            </div>
            <p className="mt-3 text-sm text-white/72">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">Due date dashboard</p>
              <h3 className="mt-1 text-lg font-bold text-white">Upcoming schedule</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {dueDateGroups.length} due dates
            </span>
          </div>

          {dueDateGroups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
              No tasks available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {dueDateGroups.slice(0, 6).map((group) => (
                <div
                  key={group.dueDate}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{formatDate(group.dueDate)}</p>
                    <p className="text-xs text-slate-400">
                      {group.dueTasks.length} task{group.dueTasks.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">
                    {group.pendingCount} pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">Task types</p>
          <h3 className="mt-1 text-lg font-bold text-white">Category mix</h3>
          <div className="mt-4 space-y-3">
            {TASK_TYPES.map((taskType) => {
              const count = tasks.filter((task) => (task.task_type || 'task') === taskType.value).length;

              return (
                <div key={taskType.value} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${taskType.badge}`}>
                      {taskType.label}
                    </span>
                    <span className="text-xl font-black text-white">{count}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${tasks.length ? (count / tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <TaskGroup
        title="Overdue Tasks"
        count={overdueTasks.length}
        tasks={overdueTasks}
        emptyMessage="No overdue tasks"
        accentClass="text-rose-200"
        onToggleComplete={toggleTaskComplete}
        onDelete={deleteTask}
        overdue
      />

      <TaskGroup
        title="Upcoming Tasks"
        count={upcomingTasks.length}
        tasks={upcomingTasks}
        emptyMessage="No upcoming tasks"
        accentClass="text-cyan-200"
        onToggleComplete={toggleTaskComplete}
        onDelete={deleteTask}
      />

      <TaskGroup
        title="Completed Tasks"
        count={completedTasks.length}
        tasks={completedTasks}
        emptyMessage="No completed tasks"
        accentClass="text-emerald-200"
        onToggleComplete={toggleTaskComplete}
        onDelete={deleteTask}
        completed
      />

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4" onClick={closeModal}>
          <div
            className="w-full max-w-2xl rounded-[1.75rem] border border-white/10 bg-[#0f1418]/95 p-5 text-slate-100 shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-white">Add Financial Task</h3>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                onClick={closeModal}
                aria-label="Close"
              >
                x
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-200">
                Task Title
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                  value={taskForm.title}
                  onChange={(event) => updateTaskField('title', event.target.value)}
                  placeholder="e.g., Pay insurance premium"
                />
              </label>

              <label className="block text-sm font-medium text-slate-200">
                Description (Optional)
                <textarea
                  className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                  value={taskForm.description}
                  onChange={(event) => updateTaskField('description', event.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-200">
                  Task Date
                  <input
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    value={taskForm.taskDate}
                    onChange={(event) => updateTaskField('taskDate', event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Task Time (Optional)
                  <input
                    type="time"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    value={taskForm.taskTime}
                    onChange={(event) => updateTaskField('taskTime', event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-200">
                  Due Date
                  <input
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    value={taskForm.dueDate}
                    onChange={(event) => updateTaskField('dueDate', event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Due Time (Optional)
                  <input
                    type="time"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    value={taskForm.dueTime}
                    onChange={(event) => updateTaskField('dueTime', event.target.value)}
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-200">
                Task Type
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                  value={taskForm.taskType}
                  onChange={(event) => updateTaskField('taskType', event.target.value)}
                >
                  <option value="routine">Routine</option>
                  <option value="task">Task</option>
                  <option value="challenge">Challenge</option>
                </select>
              </label>

              {taskForm.taskType === 'routine' ? (
                <div className="space-y-4 rounded-3xl border border-cyan-400/15 bg-cyan-500/5 p-4">
                  <label className="block text-sm font-medium text-slate-200">
                    Routine Type
                    <select
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                      value={taskForm.routineFrequency}
                      onChange={(event) => updateTaskField('routineFrequency', event.target.value)}
                    >
                      {ROUTINE_FREQUENCIES.map((frequency) => (
                        <option key={frequency.value} value={frequency.value}>
                          {frequency.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {(taskForm.routineFrequency === 'daily' || taskForm.routineFrequency === 'weekly') ? (
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {taskForm.routineFrequency === 'daily' ? 'Customize Days' : 'Customize Week'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Choose the days this routine should repeat on.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                        {WEEKDAY_OPTIONS.map((day) => {
                          const selected = taskForm.routineDays.includes(day.value);

                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleRoutineDay(day.value)}
                              className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                                selected
                                  ? 'border-cyan-300 bg-cyan-400/20 text-cyan-50'
                                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {taskForm.routineFrequency === 'monthly' ? (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-200">Customize Month</p>
                          <p className="mt-1 text-xs text-slate-400">Pick a date on the calendar. The selected day will repeat every month.</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          Day {taskForm.routineMonthDay || '1'}
                        </span>
                      </div>

                      <div className="mt-3 rounded-3xl border border-white/10 bg-black/15 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => shiftRoutineCalendar(-1)}
                            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                            aria-label="Previous month"
                          >
                            <span className="material-symbols-outlined text-[1rem]">chevron_left</span>
                          </button>
                          <p className="text-sm font-semibold text-white">{formatMonthYear(routineCalendarView)}</p>
                          <button
                            type="button"
                            onClick={() => shiftRoutineCalendar(1)}
                            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                            aria-label="Next month"
                          >
                            <span className="material-symbols-outlined text-[1rem]">chevron_right</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {WEEKDAY_OPTIONS.map((day) => (
                            <div key={day.value} className="py-1">
                              {day.label}
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 grid grid-cols-7 gap-2">
                          {buildMonthCalendar(routineCalendarView).map((cell, index) => {
                            if (!cell) {
                              return <div key={`empty-${index}`} className="aspect-square rounded-2xl border border-transparent" />;
                            }

                            const dayNumber = cell.getDate();
                            const selected = String(dayNumber) === taskForm.routineMonthDay;

                            return (
                              <button
                                key={cell.toISOString()}
                                type="button"
                                onClick={() => selectRoutineMonthDay(dayNumber)}
                                className={`aspect-square rounded-2xl border text-sm font-semibold transition ${
                                  selected
                                    ? 'border-cyan-300 bg-cyan-400/20 text-cyan-50 shadow-[0_0_0_1px_rgba(103,232,249,0.35)]'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                                }`}
                              >
                                {dayNumber}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {submitError ? (
                <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{submitError}</p>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={saving}
              >
                {saving ? 'Adding...' : 'Add Task'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
