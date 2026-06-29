import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { phaseOne } from './data/phase1.js';
import './styles.css';

const STORAGE_KEY = 'cali-progress-v1';

const defaultPlan = [
  { day: 'Lun', type: 'Circuit' },
  { day: 'Mar', type: '' },
  { day: 'Mer', type: 'Circuit' },
  { day: 'Jeu', type: '' },
  { day: 'Ven', type: 'Circuit' },
  { day: 'Sam', type: '' },
  { day: 'Dim', type: '' },
];

const planOptions = ['', 'Circuit', 'Circuit + HIIT'];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      completed: saved?.completed ?? {},
      circuitNotes: saved?.circuitNotes ?? {},
      plan: normalizePlan(saved?.plan),
    };
  } catch {
    return { completed: {}, circuitNotes: {}, plan: defaultPlan };
  }
}

function normalizePlan(savedPlan) {
  if (!Array.isArray(savedPlan)) return defaultPlan;

  return defaultPlan.map((defaultSlot, index) => {
    const savedSlot = savedPlan[index];
    if (!savedSlot) return defaultSlot;

    return {
      day: defaultSlot.day,
      type: planOptions.includes(savedSlot.type) ? savedSlot.type : normalizePlanType(savedSlot.type),
    };
  });
}

function normalizePlanType(type) {
  if (type === 'Circuit Phase 1' || type === 'Progression technique') return 'Circuit';
  return '';
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function App() {
  const [state, setState] = useState(loadState);
  const [activeFamily, setActiveFamily] = useState(phaseOne.families[0].id);

  const stats = useMemo(() => getStats(state.completed), [state.completed]);
  const currentFamily = phaseOne.families.find((family) => family.id === activeFamily);
  const circuitGoals = phaseOne.families.map((family) => ({
    family,
    level: family.levels.find((level) => !state.completed[level.id]),
  }));

  function updateState(updater) {
    setState((previous) => {
      const next = updater(previous);
      saveState(next);
      return next;
    });
  }

  function toggleLevel(familyId, levelId) {
    const family = phaseOne.families.find((item) => item.id === familyId);
    const levelIndex = family.levels.findIndex((level) => level.id === levelId);
    const isCompleted = Boolean(state.completed[levelId]);

    updateState((previous) => {
      const completed = { ...previous.completed };
      family.levels.forEach((level, index) => {
        if (isCompleted) {
          if (index >= levelIndex) completed[level.id] = false;
        } else if (index <= levelIndex) {
          completed[level.id] = true;
        }
      });

      return { ...previous, completed };
    });
  }

  function updatePlan(index, type) {
    updateState((previous) => ({
      ...previous,
      plan: previous.plan.map((slot, slotIndex) => (slotIndex === index ? { ...slot, type } : slot)),
    }));
  }

  function updateCircuitNote(familyId, value) {
    updateState((previous) => ({
      ...previous,
      circuitNotes: {
        ...previous.circuitNotes,
        [familyId]: value,
      },
    }));
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

      <section className="glass-panel progress-panel">
        <div>
          <span className="muted">Progression</span>
          <strong>{stats.completedDone}/{stats.completedTotal} niveaux valides</strong>
        </div>
        <div className="progress-track" aria-label={`Progression ${stats.percent}%`}>
          <span style={{ width: `${stats.percent}%` }} />
        </div>
        <p>{stats.xp} XP / {stats.requiredDone} niveaux principaux / {stats.optionalDone} optionnels</p>
      </section>

      <section className="glass-panel section">
        <div className="section-title">
          <h2>Planning</h2>
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

      <section className="glass-panel section">
        <div className="section-title">
          <h2>Circuit</h2>
          <span>prochaine cible et reps</span>
        </div>
        <div className="circuit-list">
          {circuitGoals.map(({ family, level }) => (
            <article className="circuit-item" key={family.id}>
              <button className="circuit-target" onClick={() => setActiveFamily(family.id)}>
                <span>{family.name}</span>
                <strong>{level ? level.name : 'Maitrise'}</strong>
              </button>
              <label>
                <span>Mes reps</span>
                <input
                  value={state.circuitNotes[family.id] ?? ''}
                  onChange={(event) => updateCircuitNote(family.id, event.target.value)}
                  placeholder="ex: 3x5 propres, 2 negatives lentes"
                />
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel section">
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
                  onChange={() => toggleLevel(currentFamily.id, level.id)}
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
    </main>
  );
}

function getStats(completed) {
  const levels = phaseOne.families.flatMap((family) => family.levels);
  const required = levels.filter((level) => !level.optional);
  const optional = levels.filter((level) => level.optional);
  const completedLevels = levels.filter((level) => completed[level.id]);
  const requiredDone = required.filter((level) => completed[level.id]).length;
  const optionalDone = optional.filter((level) => completed[level.id]).length;
  const percent = Math.round((completedLevels.length / levels.length) * 100);
  const xp = requiredDone * 100 + optionalDone * 40;

  return {
    completedDone: completedLevels.length,
    completedTotal: levels.length,
    requiredDone,
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
