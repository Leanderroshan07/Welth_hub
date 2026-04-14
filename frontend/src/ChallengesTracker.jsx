import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function getChallengeProgress(challenge) {
  if (!challenge.due_date || !challenge.challenge_end_date) return 0;
  
  const start = new Date(`${challenge.due_date}T00:00:00`);
  const end = new Date(`${challenge.challenge_end_date}T00:00:00`);
  const today = new Date();
  const today_normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((today_normalized - start) / (1000 * 60 * 60 * 24));
  const progress = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 100);
  
  return Math.round(progress);
}

function formatDaysRemaining(challenge) {
  if (!challenge.challenge_end_date) return 'N/A';
  
  const end = new Date(`${challenge.challenge_end_date}T00:00:00`);
  const today = new Date();
  const today_normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const daysRemaining = Math.ceil((end - today_normalized) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) return 'Ended';
  if (daysRemaining === 0) return 'Today';
  if (daysRemaining === 1) return '1 day left';
  return `${daysRemaining} days left`;
}

function ChallengeCard({ challenge, onToggleComplete, onDelete, completed = false }) {
  const progress = getChallengeProgress(challenge);
  const daysRemaining = formatDaysRemaining(challenge);
  const isCompleted = challenge.completed || completed;
  
  let statusGradient = 'from-amber-500/25 to-amber-400/10 border-amber-400/20';
  if (progress >= 100) {
    statusGradient = 'from-emerald-500/25 to-emerald-400/10 border-emerald-400/20';
  } else if (progress >= 75) {
    statusGradient = 'from-cyan-500/25 to-cyan-400/10 border-cyan-400/20';
  }

  return (
    <article className={`rounded-3xl border p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 ${
      isCompleted
        ? 'completed border-white/10 bg-white/5 opacity-75'
        : `bg-gradient-to-br ${statusGradient}`
    }`}>
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={challenge.completed}
          onChange={() => onToggleComplete(challenge.id, challenge.completed)}
          className={`mt-1 h-6 w-6 cursor-pointer rounded border-white/20 bg-white/10 text-rose-400 focus:ring-rose-400/30`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-lg font-semibold text-white ${challenge.completed ? 'line-through text-slate-400' : ''}`}>
              {challenge.title}
            </h4>
            <span className="inline-flex items-center rounded-full border border-rose-400/30 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100">
              🏆 Challenge
            </span>
          </div>
          
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm text-slate-300">
              <span>
                📅 {formatDate(challenge.due_date)} → {formatDate(challenge.challenge_end_date)}
              </span>
              <span className="font-semibold text-rose-100">{daysRemaining}</span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-300 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-300">{progress}%</span>
            </div>

            <div className="flex flex-wrap gap-1">
              <span className="inline-block rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                ⏱️ {challenge.challenge_duration_days} days
              </span>
              {challenge.due_time && (
                <span className="inline-block rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                  🕐 {challenge.due_time}
                </span>
              )}
            </div>
          </div>

          {challenge.description && (
            <p className="mt-3 text-sm leading-6 text-slate-400">{challenge.description}</p>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => onDelete(challenge.id)}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          aria-label="Delete challenge"
        >
          <span className="material-symbols-outlined text-[1.1rem]">delete</span>
        </button>
      </div>
    </article>
  );
}

export default function ChallengesTracker({ showToast, onChallengesChange }) {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    loadChallenges();
  }, []);

  async function loadChallenges() {
    const { data, error } = await supabase
      .from('financial_tasks')
      .select('*')
      .eq('task_type', 'challenge')
      .order('due_date', { ascending: true })
      .order('challenge_end_date', { ascending: true });

    if (!error) {
      setChallenges(data || []);
    }
  }

  async function toggleChallengeComplete(challengeId, completed) {
    const { error } = await supabase
      .from('financial_tasks')
      .update({ completed: !completed })
      .eq('id', challengeId);

    if (!error) {
      await loadChallenges();
      await onChallengesChange?.();
      showToast?.(!completed ? '🎉 Challenge marked complete!' : 'Challenge marked incomplete.', 'success');
    }
  }

  async function deleteChallenge(challengeId) {
    const { error } = await supabase
      .from('financial_tasks')
      .delete()
      .eq('id', challengeId);

    if (!error) {
      await loadChallenges();
      await onChallengesChange?.();
      showToast?.('Challenge deleted.', 'success');
    } else {
      showToast?.(error.message, 'error');
    }
  }

  const activeChallenges = useMemo(
    () => challenges.filter((c) => !c.completed),
    [challenges]
  );

  const completedChallenges = useMemo(
    () => challenges.filter((c) => c.completed),
    [challenges]
  );

  const inProgressChallenges = useMemo(() => {
    const today = new Date();
    const today_normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return activeChallenges.filter((c) => {
      const start = new Date(`${c.due_date}T00:00:00`);
      const end = new Date(`${c.challenge_end_date}T00:00:00`);
      return today_normalized >= start && today_normalized <= end;
    });
  }, [activeChallenges]);

  const upcomingChallenges = useMemo(() => {
    const today = new Date();
    const today_normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return activeChallenges.filter((c) => {
      const start = new Date(`${c.due_date}T00:00:00`);
      return today_normalized < start;
    });
  }, [activeChallenges]);

  const endedChallenges = useMemo(() => {
    const today = new Date();
    const today_normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return activeChallenges.filter((c) => {
      const end = new Date(`${c.challenge_end_date}T00:00:00`);
      return today_normalized > end;
    });
  }, [activeChallenges]);

  const dashboardCards = [
    {
      label: 'Active',
      value: activeChallenges.length,
      helper: 'Ongoing challenges',
      tone: 'from-cyan-500/25 to-cyan-400/10 text-cyan-100 border-cyan-400/20',
      emoji: '🎯',
    },
    {
      label: 'In Progress',
      value: inProgressChallenges.length,
      helper: 'Challenges active now',
      tone: 'from-rose-500/25 to-rose-400/10 text-rose-100 border-rose-400/20',
      emoji: '🏃',
    },
    {
      label: 'Upcoming',
      value: upcomingChallenges.length,
      helper: 'Starting soon',
      tone: 'from-amber-500/25 to-amber-400/10 text-amber-100 border-amber-400/20',
      emoji: '⏭️',
    },
    {
      label: 'Completed',
      value: completedChallenges.length,
      helper: 'Finished challenges',
      tone: 'from-emerald-500/25 to-emerald-400/10 text-emerald-100 border-emerald-400/20',
      emoji: '✅',
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 text-slate-100 lg:px-6">
      <header className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-cyan-200/70">Challenge Tracker</p>
          <h2 className="font-['Manrope'] text-3xl font-black tracking-tight text-white sm:text-4xl">
            🏆 Track your personal challenges
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Monitor your active challenges, track progress, and celebrate completed goals. Start a new challenge through your Telegram bot.
          </p>
        </div>
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
              <span className="text-3xl">{card.emoji}</span>
            </div>
            <p className="mt-3 text-sm text-white/72">{card.helper}</p>
          </article>
        ))}
      </section>

      {inProgressChallenges.length > 0 && (
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">🔥 Challenges in Progress</h3>
              <p className="mt-1 text-sm text-slate-400">{inProgressChallenges.length} active challenge{inProgressChallenges.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="space-y-3">
            {inProgressChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onToggleComplete={toggleChallengeComplete}
                onDelete={deleteChallenge}
              />
            ))}
          </div>
        </section>
      )}

      {upcomingChallenges.length > 0 && (
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">📅 Upcoming Challenges</h3>
              <p className="mt-1 text-sm text-slate-400">{upcomingChallenges.length} challenge{upcomingChallenges.length === 1 ? '' : 's'} waiting</p>
            </div>
          </div>
          <div className="space-y-3">
            {upcomingChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onToggleComplete={toggleChallengeComplete}
                onDelete={deleteChallenge}
              />
            ))}
          </div>
        </section>
      )}

      {endedChallenges.length > 0 && (
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">⏰ Ended (Not Completed)</h3>
              <p className="mt-1 text-sm text-slate-400">{endedChallenges.length} challenge{endedChallenges.length === 1 ? '' : 's'} ended</p>
            </div>
          </div>
          <div className="space-y-3">
            {endedChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onToggleComplete={toggleChallengeComplete}
                onDelete={deleteChallenge}
              />
            ))}
          </div>
        </section>
      )}

      {completedChallenges.length > 0 && (
        <section className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-500/5 p-5 shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">🎉 Completed Challenges</h3>
              <p className="mt-1 text-sm text-slate-400">{completedChallenges.length} challenge{completedChallenges.length === 1 ? '' : 's'} conquered</p>
            </div>
          </div>
          <div className="space-y-3">
            {completedChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onToggleComplete={toggleChallengeComplete}
                onDelete={deleteChallenge}
                completed
              />
            ))}
          </div>
        </section>
      )}

      {challenges.length === 0 && (
        <section className="rounded-[1.75rem] border border-dashed border-white/20 bg-white/5 p-12 text-center">
          <p className="text-3xl mb-2">🎯</p>
          <h3 className="text-lg font-bold text-white">No challenges yet</h3>
          <p className="mt-2 text-slate-400">
            Create your first challenge through the Telegram bot to get started. Challenges can be 7, 14, 30, or custom days long.
          </p>
        </section>
      )}
    </section>
  );
}
