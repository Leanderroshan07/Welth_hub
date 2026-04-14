import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import CashFlow from './CashFlow';
import FinancialTasks from './FinancialTasks';
import GoalTracking from './GoalTracking';
import ChallengesTracker from './ChallengesTracker';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getTransactionMeta(entry) {
  if (entry.entry_type === 'income') {
    return {
      icon: 'payments',
      iconTone: 'secondary',
      amountClass: 'secondary',
      amountSign: '+',
      title: entry.note?.trim() || 'Income Entry',
      subtitle: `${entry.account_name || 'Account'} | Income`,
      tag: entry.category || 'Income',
    };
  }

  if (entry.entry_type === 'expense') {
    const title = entry.note?.trim() || 'Expense Entry';
    const foodLike = /food|dinner|lunch|cafe|restaurant/i.test(`${entry.category || ''} ${title}`);

    return {
      icon: foodLike ? 'restaurant' : 'school',
      iconTone: 'tertiary',
      amountClass: 'tertiary',
      amountSign: '-',
      title,
      subtitle: `${entry.account_name || 'Account'} | Expense`,
      tag: entry.category || 'Expense',
    };
  }

  return {
    icon: 'swap_horiz',
    iconTone: 'primary',
    amountClass: 'primary',
    amountSign: '',
    title: 'Transfer',
    subtitle: `${entry.from_account || 'Source'} | ${entry.to_account || 'Destination'}`,
    tag: 'Transfer',
  };
}

function getLocalDateKey(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

function formatCalendarDate(dateString) {
  if (!dateString) {
    return 'Invalid date';
  }

  const normalized = String(dateString).includes('T') ? String(dateString) : `${dateString}T00:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function formatCalendarDateTime(dateString, timeString) {
  if (!dateString) {
    return 'Invalid date';
  }

  const normalized = String(dateString).includes('T') ? String(dateString) : `${dateString}T00:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);

  if (!timeString) {
    return formattedDate;
  }

  return `${formattedDate} at ${timeString}`;
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
}

function buildMonthCells(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const leadingDays = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();

  const cells = [];

  for (let index = leadingDays - 1; index >= 0; index -= 1) {
    const day = previousMonthDays - index;
    cells.push(new Date(year, month - 1, day));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length < 42) {
    const nextDay = cells.length - leadingDays - daysInMonth + 1;
    cells.push(new Date(year, month + 1, nextDay));
  }

  return cells;
}

function getCalendarEventTone(eventType) {
  if (eventType === 'task') {
    return 'task';
  }

  if (eventType === 'income') {
    return 'income';
  }

  if (eventType === 'expense') {
    return 'expense';
  }

  return 'transfer';
}

export default function App() {
  const [activePage, setActivePage] = useState('wealth');
  const [taskReferenceFilter, setTaskReferenceFilter] = useState('due-date');
  const [isPriorityFilterMenuOpen, setIsPriorityFilterMenuOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subAccounts, setSubAccounts] = useState([]);
  const [financialTasks, setFinancialTasks] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [newSubAccountName, setNewSubAccountName] = useState('');
  const [addingSubAccount, setAddingSubAccount] = useState(false);
  const [isMonthlyTransactionsOpen, setIsMonthlyTransactionsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey(new Date()));
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isMonthExpanded, setIsMonthExpanded] = useState(false);
  const [monthlyTransactionFilter, setMonthlyTransactionFilter] = useState('all');
  const priorityFilterMenuRef = useRef(null);

  const [transactionForm, setTransactionForm] = useState({
    entryType: 'income',
    amount: '',
    accountName: '',
    fromAccount: '',
    toAccount: '',
    category: '',
    subCategoryId: '',
    note: '',
    subAccountId: '',
  });

  // Left-sidebar export controls (compact)
  const [sideExportPeriod, setSideExportPeriod] = useState('day');
  const [sideExportDay, setSideExportDay] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  });
  const [sideExportMonth, setSideExportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sideExportYear, setSideExportYear] = useState(() => String(new Date().getFullYear()));

  const sideExportableEntries = useMemo(() => {
    if (sideExportPeriod === 'day') {
      return entries.filter((entry) => String(entry.occurred_at || '').startsWith(sideExportDay));
    }

    if (sideExportPeriod === 'month') {
      return entries.filter((entry) => String(entry.occurred_at || '').startsWith(`${sideExportMonth}-`));
    }

    return entries.filter((entry) => String(entry.occurred_at || '').startsWith(`${sideExportYear}-`));
  }, [entries, sideExportPeriod, sideExportDay, sideExportMonth, sideExportYear]);

  function sideToCsvCell(value) {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function handleSideExport() {
    if (sideExportableEntries.length === 0) {
      setToast?.({ message: 'No transactions for selected period.', type: 'error' });
      return;
    }

    const rows = [
      ['Entry Type', 'Amount', 'Account', 'From Account', 'To Account', 'Category', 'Sub-Category Id', 'Sub-Account Id', 'Note', 'Occurred At'],
      ...sideExportableEntries.map((entry) => [
        entry.entry_type || '',
        entry.amount || '',
        entry.account_name || '',
        entry.from_account || '',
        entry.to_account || '',
        entry.category || '',
        entry.sub_category_id || '',
        entry.sub_account_id || '',
        entry.note || '',
        entry.occurred_at || '',
      ]),
    ];

    const stamp = sideExportPeriod === 'day' ? sideExportDay : sideExportPeriod === 'month' ? sideExportMonth : sideExportYear;
    const csv = rows.map((row) => row.map((cell) => sideToCsvCell(cell)).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `money_manager_leftsidebar_${sideExportPeriod}_${stamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast?.({ message: 'Export downloaded.', type: 'success' });
  }

  const accountNames = useMemo(() => accounts.map((item) => item.name), [accounts]);
  const categoryNames = useMemo(() => categories.map((item) => item.name), [categories]);
  const subAccountOptions = useMemo(() => subAccounts, [subAccounts]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.name === transactionForm.category) || null,
    [categories, transactionForm.category],
  );
  const filteredSubCategoryOptions = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return subCategories.filter((subCategory) => subCategory.category_id === selectedCategory.id);
  }, [selectedCategory, subCategories]);

  const accountBalances = useMemo(() => {
    const balances = new Map();
    accounts.forEach((account) => {
      balances.set(account.name, Number(account.opening_balance || 0));
    });
    entries.forEach((entry) => {
      const amount = Number(entry.amount || 0);
      if (entry.entry_type === 'income' && entry.account_name) {
        balances.set(entry.account_name, (balances.get(entry.account_name) || 0) + amount);
      }
      if (entry.entry_type === 'expense' && entry.account_name) {
        balances.set(entry.account_name, (balances.get(entry.account_name) || 0) - amount);
      }
      if (entry.entry_type === 'transfer') {
        if (entry.from_account) {
          balances.set(entry.from_account, (balances.get(entry.from_account) || 0) - amount);
        }
        if (entry.to_account) {
          balances.set(entry.to_account, (balances.get(entry.to_account) || 0) + amount);
        }
      }
    });
    return balances;
  }, [accounts, entries]);

  const calendarEvents = useMemo(() => {
    const taskEvents = financialTasks.map((task) => ({
      id: `task-${task.id}`,
      dateKey: task.due_date,
      timeValue: task.due_time || '23:59',
      eventType: 'task',
      title: task.title,
      subtitle: task.description || (task.completed ? 'Completed' : 'Task'),
      detail: task.completed ? 'Done' : task.task_type || 'task',
      completed: task.completed,
      tone: getCalendarEventTone('task'),
      icon: task.completed ? 'check_circle' : task.task_type === 'routine' ? 'repeat' : 'event_note',
    }));

    const moneyEvents = entries
      .filter((entry) => entry.occurred_at)
      .map((entry) => {
        let title = entry.note?.trim() || 'Money Entry';
        let detail = entry.category || 'Entry';

        if (entry.entry_type === 'income') {
          title = entry.note?.trim() || 'Income';
          detail = `${entry.account_name || 'Account'} · ${money(entry.amount)}`;
        }

        if (entry.entry_type === 'expense') {
          title = entry.note?.trim() || 'Expense';
          detail = `${entry.account_name || 'Account'} · ${money(entry.amount)}`;
        }

        if (entry.entry_type === 'transfer') {
          title = entry.note?.trim() || 'Transfer';
          detail = `${entry.from_account || 'Source'} → ${entry.to_account || 'Destination'}`;
        }

        return {
          id: `entry-${entry.id}`,
          dateKey: entry.occurred_at,
          timeValue: entry.occurred_at?.includes('T') ? entry.occurred_at.split('T')[1]?.slice(0, 5) || '12:00' : '12:00',
          eventType: entry.entry_type,
          title,
          subtitle: detail,
          detail: entry.entry_type === 'transfer' ? 'Transfer' : money(entry.amount),
          amount: Number(entry.amount || 0),
          tone: getCalendarEventTone(entry.entry_type),
          icon: entry.entry_type === 'income' ? 'call_received' : entry.entry_type === 'expense' ? 'call_made' : 'swap_horiz',
        };
      });

    return [...taskEvents, ...moneyEvents].sort((left, right) => {
      const dateCompare = String(left.dateKey).localeCompare(String(right.dateKey));
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return String(left.timeValue).localeCompare(String(right.timeValue));
    });
  }, [entries, financialTasks]);

  const calendarEventsByDate = useMemo(() => {
    const grouped = new Map();

    calendarEvents.forEach((event) => {
      if (!grouped.has(event.dateKey)) {
        grouped.set(event.dateKey, []);
      }
      grouped.get(event.dateKey).push(event);
    });

    return grouped;
  }, [calendarEvents]);

  const calendarCells = useMemo(() => buildMonthCells(calendarMonth), [calendarMonth]);

  const selectedDateEvents = useMemo(() => calendarEventsByDate.get(selectedDate) || [], [calendarEventsByDate, selectedDate]);

  const subAccountNameById = useMemo(() => {
    const mapped = new Map();
    subAccounts.forEach((item) => {
      mapped.set(item.id, item.name);
    });
    return mapped;
  }, [subAccounts]);

  const selectedDateTasks = useMemo(
    () =>
      financialTasks
        .filter((task) => task.due_date === selectedDate)
        .sort((left, right) => String(left.due_time || '23:59').localeCompare(String(right.due_time || '23:59'))),
    [financialTasks, selectedDate],
  );

  const selectedDateMoneyEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.occurred_at?.startsWith(selectedDate))
        .sort((left, right) => String(left.occurred_at).localeCompare(String(right.occurred_at))),
    [entries, selectedDate],
  );

  const selectedDateMoneySummary = useMemo(
    () =>
      selectedDateMoneyEntries.reduce(
        (acc, entry) => {
          const amount = Number(entry.amount || 0);
          if (entry.entry_type === 'income') {
            acc.income += amount;
          }
          if (entry.entry_type === 'expense') {
            acc.expense += amount;
          }
          return acc;
        },
        { income: 0, expense: 0 },
      ),
    [selectedDateMoneyEntries],
  );

  const currentMonthEvents = useMemo(
    () => calendarEvents.filter((event) => event.dateKey.startsWith(`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`)),
    [calendarEvents, calendarMonth],
  );

  const taskReferenceFilters = [
    { key: 'due-date', label: 'Due Date' },
    { key: 'routine', label: 'Routine' },
    { key: 'challenge', label: 'Challenges' },
    { key: 'task', label: 'Task' },
  ];

  const filteredTaskReferenceTasks = useMemo(() => {
    const toDateValue = (task) => new Date(`${task.due_date || '1970-01-01'}T${task.due_time || '23:59'}:00`).getTime();

    const sortedTasks = [...financialTasks].sort((left, right) => {
      const dateDifference = toDateValue(left) - toDateValue(right);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return String(left.title || '').localeCompare(String(right.title || ''));
    });

    if (taskReferenceFilter === 'due-date') {
      return sortedTasks;
    }

    return sortedTasks.filter((task) => (task.task_type || 'task') === taskReferenceFilter);
  }, [financialTasks, taskReferenceFilter]);

  const currentMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date()),
    [],
  );

  const monthlyTransactions = useMemo(() => {
    const monthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    return entries
      .filter((entry) => entry.occurred_at?.startsWith(monthPrefix))
      .sort((left, right) => String(right.occurred_at).localeCompare(String(left.occurred_at)));
  }, [entries]);

  const filteredMonthlyTransactions = useMemo(() => {
    if (monthlyTransactionFilter === 'all') {
      return monthlyTransactions;
    }

    return monthlyTransactions.filter((entry) => entry.entry_type === monthlyTransactionFilter);
  }, [monthlyTransactions, monthlyTransactionFilter]);

  const monthlyTransactionTotals = useMemo(() => {
    return monthlyTransactions.reduce(
      (acc, entry) => {
        const amount = Number(entry.amount || 0);

        if (entry.entry_type === 'income') {
          acc.income += amount;
        }

        if (entry.entry_type === 'expense') {
          acc.expense += amount;
        }

        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [monthlyTransactions]);

  const calendarStats = useMemo(() => {
    return currentMonthEvents.reduce(
      (acc, event) => {
        if (event.eventType === 'task' && !event.completed) {
          acc.tasks += 1;
        }

        if (event.eventType === 'income') {
          acc.income += Number(event.amount || 0);
        }

        if (event.eventType === 'expense') {
          acc.expense += Number(event.amount || 0);
        }

        return acc;
      },
      { income: 0, expense: 0, tasks: 0 },
    );
  }, [currentMonthEvents]);

  const todayDateKey = useMemo(() => getLocalDateKey(new Date()), []);
  const monthTitle = useMemo(() => formatMonthTitle(calendarMonth), [calendarMonth]);
  const selectedDateLabel = useMemo(() => formatCalendarDateTime(selectedDate), [selectedDate]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  async function loadData() {
    setError('');

    const [entriesRes, accountsRes, categoriesRes, subCategoriesRes, subAccountsRes, tasksRes] = await Promise.all([
      supabase.from('ledger_entries').select('*').order('occurred_at', { ascending: false }),
      supabase.from('accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('sub_categories').select('*').order('created_at', { ascending: true }),
      supabase.from('sub_accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('financial_tasks').select('*').order('due_date', { ascending: true }),
    ]);

    if (entriesRes.error || accountsRes.error || categoriesRes.error || tasksRes.error) {
      setError('Failed to load dashboard data. Please run updated Supabase schema.sql first.');
      if (tasksRes.error) console.error('Tasks error:', tasksRes.error);
      setEntries(entriesRes.data ?? []);
      setAccounts(accountsRes.data ?? []);
      setCategories(categoriesRes.data ?? []);
      setSubCategories(subCategoriesRes.data ?? []);
      setSubAccounts(subAccountsRes.data ?? []);
      setFinancialTasks(tasksRes.data ?? []);
      return;
    }

    setEntries(entriesRes.data ?? []);
    setAccounts(accountsRes.data ?? []);
    setCategories(categoriesRes.data ?? []);
    setSubCategories(subCategoriesRes.data ?? []);
    setSubAccounts(subAccountsRes.data ?? []);
    setFinancialTasks(tasksRes.data ?? []);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    setTransactionForm((current) => {
      const nextAccount = accountNames.includes(current.accountName) ? current.accountName : accountNames[0] || '';
      const nextFrom = accountNames.includes(current.fromAccount) ? current.fromAccount : accountNames[0] || '';
      const defaultTo = accountNames[1] || accountNames[0] || '';
      const nextTo = accountNames.includes(current.toAccount) ? current.toAccount : defaultTo;
      const nextCategory = categoryNames.includes(current.category) ? current.category : categoryNames[0] || '';
      const matchedCategory = categories.find((category) => category.name === nextCategory) || null;
      const availableSubCategories = matchedCategory
        ? subCategories.filter((subCategory) => subCategory.category_id === matchedCategory.id)
        : [];
      const validSubCategory = availableSubCategories.some((subCategory) => subCategory.id === current.subCategoryId)
        ? current.subCategoryId
        : '';

      return {
        ...current,
        accountName: nextAccount,
        fromAccount: nextFrom,
        toAccount: nextTo,
        category: nextCategory,
        subCategoryId: validSubCategory,
      };
    });
  }, [accountNames, categories, categoryNames, subCategories]);

  useEffect(() => {
    if (!isPriorityFilterMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (priorityFilterMenuRef.current && !priorityFilterMenuRef.current.contains(event.target)) {
        setIsPriorityFilterMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isPriorityFilterMenuOpen]);

  function openTransactionModal() {
    setSubmitError('');
    setNewSubAccountName('');
    setTransactionForm((current) => ({
      ...current,
      entryType: 'income',
      amount: '',
      accountName: accountNames[0] || '',
      fromAccount: accountNames[0] || '',
      toAccount: accountNames[1] || accountNames[0] || '',
      category: categoryNames[0] || '',
      subCategoryId: '',
      note: '',
      subAccountId: '',
    }));
    setIsModalOpen(true);
  }

  function closeTransactionModal() {
    setIsModalOpen(false);
    setSubmitError('');
    setNewSubAccountName('');
  }

  function updateTransactionField(name, value) {
    setTransactionForm((current) => ({ ...current, [name]: value }));
  }

  async function addSubAccountFromTransaction() {
    const cleanName = newSubAccountName.trim();

    if (!cleanName) {
      setSubmitError('Enter sub-account name.');
      return;
    }

    if (transactionForm.entryType === 'transfer') {
      setSubmitError('Sub-account is only for income or expense.');
      return;
    }

    setAddingSubAccount(true);
    setSubmitError('');

    const { data, error: insertError } = await supabase
      .from('sub_accounts')
      .insert({
        name: cleanName,
        parent_account_id: null,
        opening_balance: 0,
      })
      .select('id')
      .single();

    if (insertError) {
      setSubmitError(insertError.message);
      setAddingSubAccount(false);
      return;
    }

    await loadData();
    setTransactionForm((current) => ({ ...current, subAccountId: data.id }));
    setNewSubAccountName('');
    setAddingSubAccount(false);
    showToast('Sub-account added.', 'success');
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    if (!accountNames.length) {
      setSubmitError('Add at least one account in Cash Flow page.');
      return;
    }

    if (transactionForm.entryType !== 'transfer' && !categoryNames.length) {
      setSubmitError('Add at least one category in Cash Flow page.');
      return;
    }

    const amountValue = Number(transactionForm.amount);
    if (!amountValue || amountValue <= 0) {
      setSubmitError('Amount must be greater than 0.');
      return;
    }

    if (transactionForm.entryType === 'expense') {
      const accountName = transactionForm.accountName;
      const currentBalance = accountBalances.get(accountName) || 0;
      const balanceAfterExpense = currentBalance - amountValue;
      
      if (balanceAfterExpense < 0) {
        setSubmitError(`⚠️ Low balance! Current: ${money(currentBalance)}, After expense: ${money(balanceAfterExpense)}. This will result in negative balance.`);
        return;
      }
    }

    setSaving(true);

    const payload = {
      entry_type: transactionForm.entryType,
      amount: amountValue,
      account_name: transactionForm.entryType === 'transfer' ? null : transactionForm.accountName,
      from_account: transactionForm.entryType === 'transfer' ? transactionForm.fromAccount : null,
      to_account: transactionForm.entryType === 'transfer' ? transactionForm.toAccount : null,
      category: transactionForm.entryType === 'transfer' ? null : transactionForm.category || null,
      sub_category_id: transactionForm.entryType === 'transfer' ? null : transactionForm.subCategoryId || null,
      note: transactionForm.note.trim() || null,
      sub_account_id: transactionForm.subAccountId || null,
    };

    const { error: insertError } = await supabase.from('ledger_entries').insert(payload);

    if (insertError) {
      setSubmitError(insertError.message);
      showToast(insertError.message, 'error');
      setSaving(false);
      return;
    }

    await loadData();
    setSaving(false);
    closeTransactionModal();
    showToast('Transaction added successfully.', 'success');
  }

  async function toggleTaskComplete(taskId, completed) {
    const { error } = await supabase
      .from('financial_tasks')
      .update({ completed: !completed })
      .eq('id', taskId);

    if (!error) {
      await loadData();
      showToast(!completed ? 'Task marked complete.' : 'Task marked incomplete.', 'success');
    }
  }

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, item) => {
        const amount = Number(item.amount || 0);

        if (item.entry_type === 'income') {
          acc.income += amount;
        }

        if (item.entry_type === 'expense') {
          acc.expense += amount;
        }

        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [entries]);

  const netTotal = totals.income - totals.expense;

  const recentTransactions = useMemo(() => {
    return entries.slice(0, 4).map((entry) => ({
      id: entry.id,
      amount: Number(entry.amount || 0),
      ...getTransactionMeta(entry),
    }));
  }, [entries]);

  const currentDate = useMemo(() => {
    const now = new Date();
    const dayDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit' }).format(now);
    const weekDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(now);
    const month = new Intl.DateTimeFormat('en-GB', { month: '2-digit' }).format(now);
    const year = new Intl.DateTimeFormat('en-GB', { year: 'numeric' }).format(now);
    return {
      dayDate,
      weekDay,
      monthYear: `${month}.${year}`,
    };
  }, []);

  const summaryMax = Math.max(totals.income, totals.expense, Math.abs(netTotal), 1);

  const summaryCards = [
    {
      key: 'income',
      label: 'Total Income',
      value: totals.income,
      tone: 'secondary',
      icon: 'trending_up',
      badge: 'Live Update',
      progress: Math.max(18, Math.round((totals.income / summaryMax) * 100)),
    },
    {
      key: 'expense',
      label: 'Total Expense',
      value: totals.expense,
      tone: 'tertiary',
      icon: 'trending_down',
      badge: '7 Days',
      progress: Math.max(12, Math.round((totals.expense / summaryMax) * 100)),
    },
    {
      key: 'net',
      label: 'Net Total',
      value: netTotal,
      tone: 'primary',
      icon: 'account_balance',
      badge: netTotal >= 0 ? 'Healthy' : 'Watch Closely',
      progress: Math.max(18, Math.round((Math.abs(netTotal) / summaryMax) * 100)),
    },
  ];

  const priorityTasks = useMemo(() => {
    return filteredTaskReferenceTasks.slice(0, 5);
  }, [filteredTaskReferenceTasks]);

  return (
    <div className="wealth-page">
      <aside className="side-nav">
        <div className="logo">Wealth Hub</div>

        <div className="profile-row">
          <div className="profile-image-wrap">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBl97F5ZJB_Gsh4dmYEtyHGKcRP3VrTs92Uo4finXqXyf-COo66LnWjBYq39U2Z__dl2fyjrK1_UAwM2CKGo44kDZ6EX_DtS_hPN9VNbppu_IqRARdGwUC9BNf1IDMhe2ItWwu_L7cZjd40HlK6RdBzIHkFzgpyGaw9eR3tQbjWV3oTIX3JLaguWXMDtEMWoFqQH8DH84nOccB_1bwpoE6vqjbMhzGrHrIQIP5MWwCFmml1wzFT_spelQHaNN21X_KcxLAH-7nBK_ls"
              alt="User profile"
            />
          </div>
          <div>
            <p className="welcome">WELCOME</p>
            <p className="name">Roshan</p>
          </div>
        </div>

        <nav className="menu">
          <button
            type="button"
            className={`menu-item ${activePage === 'wealth' ? 'active' : ''}`}
            onClick={() => setActivePage('wealth')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Wealth Hub</span>
          </button>
          <button
            type="button"
            className={`menu-item ${activePage === 'cashflow' ? 'active' : ''}`}
            onClick={() => setActivePage('cashflow')}
          >
            <span className="material-symbols-outlined">payments</span>
            <span>Cash Flow</span>
          </button>
          <button
            type="button"
            className={`menu-item ${activePage === 'tasks' ? 'active' : ''}`}
            onClick={() => setActivePage('tasks')}
          >
            <span className="material-symbols-outlined">checklist</span>
            <span>Financial Tasks</span>
          </button>
          <button
            type="button"
            className={`menu-item ${activePage === 'goals' ? 'active' : ''}`}
            onClick={() => setActivePage('goals')}
          >
            <span className="material-symbols-outlined">flag</span>
            <span>Goal Tracking</span>
          </button>
          <button
            type="button"
            className={`menu-item ${activePage === 'challenges' ? 'active' : ''}`}
            onClick={() => setActivePage('challenges')}
          >
            <span className="material-symbols-outlined">local_fire_department</span>
            <span>Challenges</span>
          </button>
          <button type="button" className="menu-item">
            <span className="material-symbols-outlined">trending_up</span>
            <span>Investments</span>
          </button>
          <button type="button" className="menu-item">
            <span className="material-symbols-outlined">leaderboard</span>
            <span>Analytics</span>
          </button>
          <button type="button" className="menu-item">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button>
        </nav>

        <button type="button" className="new-transaction-btn" onClick={openTransactionModal}>
          <span className="material-symbols-outlined">add</span>
          New Transaction
        </button>
        <div className="side-export-card">
          <p className="side-export-title">Export</p>
          <div className="side-export-controls">
            <select value={sideExportPeriod} onChange={(e) => setSideExportPeriod(e.target.value)}>
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>

            {sideExportPeriod === 'day' ? (
              <input type="date" value={sideExportDay} onChange={(e) => setSideExportDay(e.target.value)} />
            ) : null}

            {sideExportPeriod === 'month' ? (
              <input type="month" value={sideExportMonth} onChange={(e) => setSideExportMonth(e.target.value)} />
            ) : null}

            {sideExportPeriod === 'year' ? (
              <input type="number" min="2000" max="2100" value={sideExportYear} onChange={(e) => setSideExportYear(e.target.value)} />
            ) : null}

            <button type="button" className="side-export-btn" onClick={handleSideExport}>Download</button>
            <small className="side-export-count">{sideExportableEntries.length} entries</small>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="top-nav">
          <button type="button" className="icon-btn" aria-label="Search">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button type="button" className="icon-btn" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="avatar-chip">
            <span className="material-symbols-outlined">account_circle</span>
          </div>
        </header>

        <div className="content-scroll">
          {error ? <p className="status-message">{error}</p> : null}

          {activePage === 'wealth' ? (
            <>
              <section className="dashboard-hero">
                <div className="dashboard-date">
                  <h2>{currentDate.dayDate}</h2>
                  <div className="dashboard-date-meta">
                    <p className="dashboard-weekday">{currentDate.weekDay}</p>
                    <p className="dashboard-month">{currentDate.monthYear}</p>
                  </div>
                </div>
              </section>

              <section className="summary-cards-grid">
                {summaryCards.map((card) => (
                  <article key={card.key} className={`glass-card summary-stat-card summary-stat-card--${card.tone}`}>
                    <div className={`summary-stat-accent summary-stat-accent--${card.tone}`} />
                    <div className="summary-stat-top">
                      <div className={`summary-stat-icon summary-stat-icon--${card.tone}`}>
                        <span className="material-symbols-outlined">{card.icon}</span>
                      </div>
                      <span className="summary-stat-chip">{card.badge}</span>
                    </div>
                    <p className="summary-stat-label">{card.label}</p>
                    <div className="summary-stat-value">{money(card.value)}</div>
                    <div className="summary-stat-track">
                      <div className={`summary-stat-bar summary-stat-bar--${card.tone}`} style={{ width: `${card.progress}%` }} />
                    </div>
                  </article>
                ))}
              </section>

              <div className="dash-grid dashboard-grid-modern">
                <section className="transactions-panel glass-panel">
                  <div className="panel-head panel-head--modern">
                    <div>
                      <h3>Recent Activity</h3>
                      <p className="panel-subtitle">Your digital footprint for today</p>
                    </div>
                    <button type="button" onClick={() => setIsMonthlyTransactionsOpen(true)}>
                      View All
                    </button>
                  </div>

                  <div className="transactions-list transactions-list--modern">
                    {recentTransactions.map((transaction) => (
                      <article key={transaction.id} className="transaction-row transaction-row--modern">
                        <div className="transaction-main">
                          <div className={`txn-icon ${transaction.iconTone}`}>
                            <span className="material-symbols-outlined">{transaction.icon}</span>
                          </div>
                          <div>
                            <h4>{transaction.title}</h4>
                            <p>{transaction.subtitle}</p>
                          </div>
                        </div>
                        <div className="transaction-side">
                          <p className={`txn-amount ${transaction.amountClass}`}>
                            {transaction.amountSign} {money(transaction.amount)}
                          </p>
                          <span>{transaction.tag}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="dashboard-right">
                  <section className="tasks-panel glass-panel priority-panel">
                    <div className="panel-head panel-head--modern">
                      <h3>Priority Tasks</h3>
                      <div className="priority-filter-menu-wrap" ref={priorityFilterMenuRef}>
                        <button
                          type="button"
                          className="panel-dots-btn"
                          aria-label="Open priority task filters"
                          aria-expanded={isPriorityFilterMenuOpen}
                          onClick={() => setIsPriorityFilterMenuOpen((current) => !current)}
                        >
                          <span className="material-symbols-outlined panel-dots">more_vert</span>
                        </button>

                        {isPriorityFilterMenuOpen ? (
                          <div className="priority-filter-menu" role="menu" aria-label="Priority task filters">
                            {taskReferenceFilters.map((filter) => {
                              const isActive = taskReferenceFilter === filter.key;

                              return (
                                <button
                                  key={filter.key}
                                  type="button"
                                  className={`priority-filter-option ${isActive ? 'active' : ''}`}
                                  role="menuitemradio"
                                  aria-checked={isActive}
                                  onClick={() => {
                                    setTaskReferenceFilter(filter.key);
                                    setIsPriorityFilterMenuOpen(false);
                                  }}
                                >
                                  {filter.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <ul className="priority-list">
                      {priorityTasks.length === 0 ? (
                        <li className="priority-empty">No tasks yet</li>
                      ) : (
                        priorityTasks.map((task) => {
                          const dueDate = new Date(task.due_date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          dueDate.setHours(0, 0, 0, 0);
                          const isOverdue = dueDate < today;

                          return (
                            <li key={task.id} className={`priority-item ${task.completed ? 'completed' : ''}`}>
                              <div className={`priority-check ${task.completed ? 'completed' : ''}`}>
                                {task.completed ? (
                                  <span className="material-symbols-outlined">check</span>
                                ) : null}
                              </div>
                              <div className="priority-copy">
                                <span className={`priority-title ${task.completed ? 'completed' : ''}`}>{task.title}</span>
                                <small className={`priority-meta ${isOverdue && !task.completed ? 'overdue' : ''}`}>
                                  {task.completed ? 'Completed' : isOverdue ? 'Overdue' : formatCalendarDate(task.due_date)}
                                </small>
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </section>
                </div>
              </div>
            </>
          ) : activePage === 'cashflow' ? (
            <CashFlow accounts={accounts} entries={entries} onDataRefresh={loadData} showToast={showToast} />
          ) : activePage === 'tasks' ? (
            <FinancialTasks showToast={showToast} onTasksChange={loadData} />
          ) : activePage === 'goals' ? (
            <GoalTracking
              showToast={showToast}
              onGoalsChange={loadData}
              subAccounts={subAccounts}
              entries={entries}
            />
          ) : activePage === 'challenges' ? (
            <ChallengesTracker showToast={showToast} onChallengesChange={loadData} />
          ) : null}
        </div>
      </main>

      {isMonthlyTransactionsOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsMonthlyTransactionsOpen(false)}>
          <div
            className="transaction-modal transaction-modal--wide"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{currentMonthLabel} Transactions</h3>
              <button type="button" className="icon-btn" onClick={() => setIsMonthlyTransactionsOpen(false)} aria-label="Close transactions view">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="monthly-summary-row">
              <div>
                <p className="summary-label">MONTHLY INCOME</p>
                <p className="monthly-summary-value secondary">{money(monthlyTransactionTotals.income)}</p>
              </div>
              <div>
                <p className="summary-label">MONTHLY EXPENSE</p>
                <p className="monthly-summary-value tertiary">{money(monthlyTransactionTotals.expense)}</p>
              </div>
              <div>
                <p className="summary-label">TRANSACTIONS</p>
                <p className="monthly-summary-value">{filteredMonthlyTransactions.length}</p>
              </div>
            </div>

            <div className="transaction-filter-bar" role="tablist" aria-label="Transaction filters">
              {[
                { key: 'all', label: 'All' },
                { key: 'income', label: 'Income' },
                { key: 'expense', label: 'Expense' },
                { key: 'transfer', label: 'Transfer' },
              ].map((filter) => {
                const isActive = monthlyTransactionFilter === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    className={`transaction-filter-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setMonthlyTransactionFilter(filter.key)}
                    aria-pressed={isActive}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="monthly-transactions-list">
              {filteredMonthlyTransactions.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '1rem' }}>No transactions found for this month.</p>
              ) : (
                filteredMonthlyTransactions.map((entry) => {
                  const meta = getTransactionMeta(entry);

                  return (
                    <article key={entry.id} className="transaction-row">
                      <div className="transaction-main">
                        <div className={`txn-icon ${meta.iconTone}`}>
                          <span className="material-symbols-outlined">{meta.icon}</span>
                        </div>
                        <div>
                          <h4>{meta.title}</h4>
                          <p>
                            {formatCalendarDateTime(entry.occurred_at, entry.occurred_at?.includes('T') ? entry.occurred_at.split('T')[1]?.slice(0, 5) : '')}
                          </p>
                        </div>
                      </div>
                      <div className="transaction-side">
                        <p className={`txn-amount ${meta.amountClass}`}>
                          {meta.amountSign} {money(entry.amount)}
                        </p>
                        <span>{entry.entry_type}</span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeTransactionModal}>
          <div className="transaction-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Transaction</h3>
              <button type="button" className="icon-btn" onClick={closeTransactionModal} aria-label="Close modal">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="transaction-form" onSubmit={handleTransactionSubmit}>
              <label>
                Type
                <select
                  value={transactionForm.entryType}
                  onChange={(event) => updateTransactionField('entryType', event.target.value)}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </label>

              <label>
                Amount
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transactionForm.amount}
                  onChange={(event) => updateTransactionField('amount', event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>

              {transactionForm.entryType === 'transfer' ? (
                <div className="transaction-row-grid">
                  <label>
                    From Account
                    <select
                      value={transactionForm.fromAccount}
                      onChange={(event) => updateTransactionField('fromAccount', event.target.value)}
                    >
                      {accountNames.map((accountName) => (
                        <option key={accountName} value={accountName}>
                          {accountName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    To Account
                    <select
                      value={transactionForm.toAccount}
                      onChange={(event) => updateTransactionField('toAccount', event.target.value)}
                    >
                      {accountNames.map((accountName) => (
                        <option key={accountName} value={accountName}>
                          {accountName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <label>
                  Account
                  <select
                    value={transactionForm.accountName}
                    onChange={(event) => updateTransactionField('accountName', event.target.value)}
                  >
                    {accountNames.map((accountName) => (
                      <option key={accountName} value={accountName}>
                        {accountName}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {transactionForm.entryType !== 'transfer' ? (
                <>
                  <label>
                    Category
                    <select
                      value={transactionForm.category}
                      onChange={(event) => {
                        updateTransactionField('category', event.target.value);
                        updateTransactionField('subCategoryId', '');
                      }}
                    >
                      {categoryNames.map((categoryName) => (
                        <option key={categoryName} value={categoryName}>
                          {categoryName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Sub-Category (Optional)
                    <select
                      value={transactionForm.subCategoryId}
                      onChange={(event) => updateTransactionField('subCategoryId', event.target.value)}
                      disabled={filteredSubCategoryOptions.length === 0}
                    >
                      <option value="">None</option>
                      {filteredSubCategoryOptions.map((subCategory) => (
                        <option key={subCategory.id} value={subCategory.id}>
                          {subCategory.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              <label>
                Note
                <input
                  value={transactionForm.note}
                  onChange={(event) => updateTransactionField('note', event.target.value)}
                  placeholder="Optional note"
                />
              </label>

              <label>
                Sub-Account (Optional, shared across accounts)
                <select
                  value={transactionForm.subAccountId}
                  onChange={(event) => updateTransactionField('subAccountId', event.target.value)}
                >
                  <option value="">None</option>
                  {transactionForm.entryType !== 'transfer'
                    ? subAccountOptions.map((subAccount) => (
                        <option key={subAccount.id} value={subAccount.id}>
                          {subAccount.name}
                        </option>
                      ))
                    : null}
                </select>
              </label>

              {submitError ? <p className="submit-error">{submitError}</p> : null}

              <button type="submit" className="submit-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save Transaction'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <div className={`toast ${toast.type}`}>{toast.message}</div> : null}
    </div>
  );
}
