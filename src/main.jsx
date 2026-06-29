import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { phaseOne } from './data/phase1.js';
import './styles.css';

const STORAGE_KEY = 'cali-progress-v1';

const defaultPlan = [
  { day: 'Lun', type: 'Circuit Phase 1' },
  { day: 'Mar', type: '' },
  { day: 'Mer', type: 'Progression technique' },
  { day: 'Jeu', type: '' },
  { day: 'Ven', type: 'Circuit Phase 1' },
  { day: 'Sam', type: 'Etirements' },
  { day: 'Dim', type: '' },
];

const planOptions = ['', 'Circuit Phase 1', 'Progression technique', 'Etirements'];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      completed: saved?.completed ?? {},
      logs: saved?.logs ?? [],
      plan: saved?.plan ?? defaultPlan,
    };
  } catch {
    return { completed: {}, logs: [], plan: defaultPlan };
  }
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function App() {
  const [state, setState] = useState(loadState);
  const [activeFamily, setActiveFamily] = useState(phaseOne.families[0].id);
  const [logDraft, setLogDraft] = useState({
    exercise: phaseOne.families[0].name,
    reps: '',
    note: '',
  });

  const stats = useMemo(() => getStats(state.completed), [state.completed]);
  const currentFamily = phaseOne.families.find((family) => family.id === activeFamily);
  const nextGoals = phaseOne.families.map((family) => ({
    family,
    level: family.levels.find((level) => !level.optional && !state.completed[level.id]),
  }));

  function updateState(updater) {
    setState((previous) => {
      const next = updater(previous);
      saveState(next);
      return next;
    });
  }

  function toggleLevel(levelId) {
    updateState((previous) => ({
      ...previous,
      completed: {
        ...previous.completed,
        [levelId]: !previous.completed[levelId],
      },
    }));
  }

  function updatePlan(index, type) {
    updateState((previous) => ({
      ...previous,
      plan: previous.plan.map((slot, slotIndex) => (slotIndex === index ? { ...slot, type } : slot)),
    }));
  }

  function addLog(event) {
    event.preventDefault();
    if (!logDraft.reps.trim() && !logDraft.note.trim()) return;

    updateState((previous) => ({
      ...previous,
      logs: [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          ...logDraft,
        },
        ...previous.logs,
      ].slice(0, 30),
    }));
    setLogDraft({ ...logDraft, reps: '', note: '' });
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{phaseOne.name}</p>
          <h1>Objectif premier circuit complet</h1>
        </div>
        <div className="rank-box">
          <span>Rang</span>
          <strong>{stats.rank}</strong>
        </div>
      </section>

      <section className="progress-panel">
        <div>
          <span className="muted">Progression</span>
          <strong>{stats.requiredDone}/{stats.requiredTotal} niveaux cles</strong>
        </div>
        <div className="progress-track" aria-label={`Progression ${stats.percent}%`}>
          <span style={{ width: `${stats.percent}%` }} />
        </div>
        <p>{stats.xp} XP gagnes · {stats.optionalDone} optionnel(s) valide(s)</p>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>Planning</h2>
          <span>calisthenie uniquement</span>
        </div>
        <div className="week-grid">
          {state.plan.map((slot, index) => (
            <label className={slot.type ? 'day-card filled' : 'day-card'} key={slot.day}>
              <span>{slot.day}</span>
              <select value={slot.type} onChange={(event) => updatePlan(index, event.target.value)}>
                {planOptions.map((option) => (
                  <option value={option} key={option}>
                    {option || 'Vide'}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>A faire ensuite</h2>
          <span>niveaux obligatoires</span>
        </div>
        <div className="next-list">
          {nextGoals.map(({ family, level }) => (
            <button className="next-item" key={family.id} onClick={() => setActiveFamily(family.id)}>
              <span>{family.name}</span>
              <strong>{level ? level.name : 'Maitrise'}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>Objectifs</h2>
          <span>{currentFamily.finalGoal}</span>
        </div>
        <div className="tabs">
          {phaseOne.families.map((family) => (
            <button
              className={family.id === activeFamily ? 'active' : ''}
              key={family.id}
              onClick={() => setActiveFamily(family.id)}
            >
              {family.name}
            </button>
          ))}
        </div>
        <div className="levels">
          {currentFamily.levels.map((level) => (
            <article className={state.completed[level.id] ? 'level-card done' : 'level-card'} key={level.id}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(state.completed[level.id])}
                  onChange={() => toggleLevel(level.id)}
                />
                <span>
                  {level.name}
                  {level.optional && <em>Optionnel</em>}
                </span>
              </label>
              <p>{level.validation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>Journal</h2>
          <span>records et cadence</span>
        </div>
        <form className="log-form" onSubmit={addLog}>
          <select
            value={logDraft.exercise}
            onChange={(event) => setLogDraft({ ...logDraft, exercise: event.target.value })}
          >
            {phaseOne.families.map((family) => (
              <option value={family.name} key={family.id}>
                {family.name}
              </option>
            ))}
          </select>
          <input
            inputMode="text"
            placeholder="Series / reps"
            value={logDraft.reps}
            onChange={(event) => setLogDraft({ ...logDraft, reps: event.target.value })}
          />
          <input
            placeholder="Note rapide"
            value={logDraft.note}
            onChange={(event) => setLogDraft({ ...logDraft, note: event.target.value })}
          />
          <button type="submit">Ajouter</button>
        </form>
        <div className="log-list">
          {state.logs.length === 0 && <p className="empty">Aucune seance notee pour le moment.</p>}
          {state.logs.map((log) => (
            <article className="log-item" key={log.id}>
              <div>
                <strong>{log.exercise}</strong>
                <span>{new Date(log.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <p>{log.reps || log.note}</p>
              {log.reps && log.note && <small>{log.note}</small>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function getStats(completed) {
  const levels = phaseOne.families.flatMap((family) => family.levels);
  const required = levels.filter((level) => !level.optional);
  const optional = levels.filter((level) => level.optional);
  const requiredDone = required.filter((level) => completed[level.id]).length;
  const optionalDone = optional.filter((level) => completed[level.id]).length;
  const percent = Math.round((requiredDone / required.length) * 100);
  const xp = requiredDone * 100 + optionalDone * 40;

  return {
    requiredDone,
    requiredTotal: required.length,
    optionalDone,
    percent,
    xp,
    rank: getRank(requiredDone, required.length),
  };
}

function getRank(done, total) {
  const ratio = done / total;
  if (ratio === 1) return 'Phase 1';
  if (ratio >= 0.75) return 'B';
  if (ratio >= 0.5) return 'C';
  if (ratio >= 0.25) return 'D';
  return 'E';
}

createRoot(document.getElementById('root')).render(<App />);
