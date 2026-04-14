import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function daysLeft(targetDate) {
  if (!targetDate) return null;
  const today = new Date();
  const target = new Date(`${targetDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function GoalTracking({ showToast, onGoalsChange, subAccounts: externalSubAccounts = [], entries: externalEntries = [] }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    sub_account_id: '__new__',
    new_sub_account_name: '',
    target_amount: '',
    target_date: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [topUpByGoalId, setTopUpByGoalId] = useState({});

  useEffect(() => {
    fetchGoals();
  }, []);

  async function fetchGoals() {
    setLoading(true);
    const goalsRes = await supabase.from('goals').select('*').order('created_at', { ascending: false });

    if (goalsRes.error) {
      setError(`Failed to load goals: ${goalsRes.error.message}`);
    } else {
      setGoals(goalsRes.data || []);
      setError('');
    }

    setLoading(false);
  }

  function getTrackedAmount(goal) {
    if (!goal.sub_account_id) {
      return Number(goal.current_amount || 0);
    }

    const linkedSubAccount = externalSubAccounts.find((item) => item.id === goal.sub_account_id);
    const opening = Number(linkedSubAccount?.opening_balance || 0);
    const movedAmount = externalEntries
      .filter((entry) => entry.sub_account_id === goal.sub_account_id)
      .reduce((sum, entry) => {
        const amount = Number(entry.amount || 0);
        return sum + (entry.entry_type === 'expense' ? -amount : amount);
      }, 0);

    return opening + movedAmount;
  }

  async function addGoalProgress(goal) {
    const raw = topUpByGoalId[goal.id];
    const amount = Number(raw);

    if (!amount || amount <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }

    const nextAmount = Number(goal.current_amount || 0) + amount;
    const { error: updateError } = await supabase.from('goals').update({ current_amount: nextAmount }).eq('id', goal.id);

    if (updateError) {
      setError(`Failed to update goal progress: ${updateError.message}`);
      return;
    }

    setTopUpByGoalId((current) => ({ ...current, [goal.id]: '' }));
    showToast?.('Goal progress updated.', 'success');
    await fetchGoals();
    await onGoalsChange?.();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!form.title || !form.target_amount || !form.target_date) {
      setError('Title, target amount and target date are required.');
      setSaving(false);
      return;
    }

    let selectedSubAccountId = form.sub_account_id || null;

    if (form.sub_account_id === '__new__') {
      const cleanName = form.new_sub_account_name.trim() || `${form.title.trim()} Goal`;

      const { data: insertedSubAccount, error: subAccountError } = await supabase
        .from('sub_accounts')
        .insert({
          name: cleanName,
          parent_account_id: null,
          opening_balance: 0,
        })
        .select('id')
        .single();

      if (subAccountError) {
        setError(`Failed to create sub-account: ${subAccountError.message}`);
        setSaving(false);
        return;
      }

      selectedSubAccountId = insertedSubAccount.id;
    }

    const { error } = await supabase.from('goals').insert([
      {
        title: form.title,
        target_amount: parseFloat(form.target_amount),
        target_date: form.target_date,
        description: form.description,
        current_amount: 0,
        sub_account_id: selectedSubAccountId,
      },
    ]);

    if (error) {
      setError(`Failed to add goal: ${error.message}`);
    }
    else {
      setShowForm(false);
      setForm({
        title: '',
        sub_account_id: '__new__',
        new_sub_account_name: '',
        target_amount: '',
        target_date: '',
        description: '',
      });
      showToast?.('Goal added and linked to account/sub-account.', 'success');
      await fetchGoals();
      await onGoalsChange?.();
    }

    setSaving(false);
  }

  const goalStats = goals.reduce(
    (acc, goal) => {
      const trackedAmount = getTrackedAmount(goal);
      const targetAmount = Number(goal.target_amount || 0);
      acc.total += 1;
      acc.remaining += Math.max(targetAmount - trackedAmount, 0);
      if (targetAmount > 0 && trackedAmount >= targetAmount) {
        acc.completed += 1;
      }
      return acc;
    },
    { total: 0, completed: 0, remaining: 0 },
  );

  return (
    <div className="goal-tracking-container">
      <div className="goal-tracking-header">
        <div>
          <h2>Goal Tracking</h2>
          <p className="goal-subtitle">Create a goal sub-account, fund it from New Transaction, and track completion live.</p>
        </div>
        <button type="button" className="goal-action-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add Goal'}
        </button>
      </div>

      <div className="goal-stats-grid">
        <article className="goal-stat-card">
          <p>Total Goals</p>
          <strong>{goalStats.total}</strong>
        </article>
        <article className="goal-stat-card">
          <p>Completed</p>
          <strong>{goalStats.completed}</strong>
        </article>
        <article className="goal-stat-card">
          <p>Total Remaining</p>
          <strong>{money(goalStats.remaining)}</strong>
        </article>
      </div>

      {(showForm || (!loading && goals.length === 0)) && (
        <form onSubmit={handleSubmit} className="goal-form">
          <div>
            <label>Goal Title</label>
            <input
              type="text"
              placeholder="e.g., Save for vacation"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label>Target Sub-Account</label>
            <select
              value={form.sub_account_id}
              onChange={(e) => setForm({ ...form, sub_account_id: e.target.value })}
              required
            >
              {externalSubAccounts.map((subAccount) => (
                <option key={subAccount.id} value={subAccount.id}>{subAccount.name}</option>
              ))}
              <option value="__new__">Create new sub-account for this goal</option>
            </select>
          </div>

          {form.sub_account_id === '__new__' && (
            <div>
              <label>New Sub-Account Name</label>
              <input
                type="text"
                placeholder="Optional (uses goal title by default)"
                value={form.new_sub_account_name}
                onChange={(e) => setForm({ ...form, new_sub_account_name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label>Target Amount (₹)</label>
            <input
              type="number"
              placeholder="e.g., 50000"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              required
            />
          </div>

          <div>
            <label>Target Date</label>
            <input
              type="date"
              value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              required
            />
          </div>

          <div>
            <label>Description (Optional)</label>
            <textarea
              placeholder="Add notes about your goal..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <button type="submit" disabled={saving}>
            {saving ? 'Creating Goal...' : '✨ Create Goal'}
          </button>
          {error && <div className="goal-error">{error}</div>}
        </form>
      )}
      {loading ? (
        <div className="goal-empty-state">⏳ Loading your goals...</div>
      ) : goals.length === 0 ? (
        <div className="goal-empty-state">
          <p style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>🎯 No Goals Yet</p>
          <p>Click "Add Goal" above to start tracking your financial goals</p>
        </div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const trackedAmount = getTrackedAmount(goal);
            const remaining = Math.max(Number(goal.target_amount || 0) - trackedAmount, 0);
            const percent = goal.target_amount > 0 ? Math.round((trackedAmount / goal.target_amount) * 100) : 0;
            const linkedSubAccount = externalSubAccounts.find((item) => item.id === goal.sub_account_id);
            const targetDaysLeft = daysLeft(goal.target_date);
            const isCompleted = goal.target_amount > 0 && trackedAmount >= goal.target_amount;

            return (
              <div key={goal.id} className="goal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem' }}>
                  <h3 style={{ margin: 0 }}>{goal.title}</h3>
                  {isCompleted && <span style={{ fontSize: '1.5rem' }}>✅</span>}
                </div>

                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }}
                  />
                </div>

                <div className="goal-amount-row">
                  <span>{money(trackedAmount)} / {money(goal.target_amount)}</span>
                  <span className="goal-percentage">{percent}%</span>
                </div>

                <div className="goal-meta">💰 Remaining: <strong style={{ color: '#fff' }}>{money(remaining)}</strong></div>

                <div className="goal-meta">
                  📅 Target: <strong style={{ color: '#fff' }}>{new Date(goal.target_date).toLocaleDateString('en-IN')}</strong>
                </div>

                <div className="goal-meta">
                  ⏱️ {targetDaysLeft === null ? 'No deadline set' : targetDaysLeft < 0 ? `⚠️ ${Math.abs(targetDaysLeft)} days overdue` : `${targetDaysLeft} days remaining`}
                </div>

                {linkedSubAccount && (
                  <div className="goal-status">
                    🏦 Linked to <strong>{linkedSubAccount.name}</strong> sub-account
                  </div>
                )}

                {goal.description && (
                  <div className="goal-description" style={{ fontStyle: 'italic', paddingTop: '0.3rem' }}>
                    "{goal.description}"
                  </div>
                )}

                <div className="goal-status" style={{ marginTop: '0.5rem' }}>
                  {isCompleted ? '🎉 Goal Completed!' : '📊 Progress auto-tracked from sub-account'}
                </div>

                {!goal.sub_account_id && (
                  <div className="goal-progress-actions">
                    <input
                      type="number"
                      min="0"
                      placeholder="Add progress amount"
                      value={topUpByGoalId[goal.id] ?? ''}
                      onChange={(event) => setTopUpByGoalId((current) => ({ ...current, [goal.id]: event.target.value }))}
                    />
                    <button type="button" onClick={() => addGoalProgress(goal)}>Update</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
