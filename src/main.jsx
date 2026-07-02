import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { phaseOne } from './data/phase1.js';
import { phaseTwo } from './data/phase2.js';
import './styles.css';

const STORAGE_KEY = 'cali-progress-v1';
const MIN_CIRCUIT_SESSION_MS = 10 * 60 * 1000;
const HIIT_ROUND_MS = 2.5 * 60 * 1000;
const HIIT_ROUNDS = 4;
const phases = [phaseOne, phaseTwo];

const defaultPlan = [
  { day: 'Lun', type: 'Circuit' },
  { day: 'Mar', type: '' },
  { day: 'Mer', type: 'Circuit' },
  { day: 'Jeu', type: '' },
  { day: 'Ven', type: 'Circuit' },
  { day: 'Sam', type: '' },
  { day: 'Dim', type: '' },
];

const planOptions = ['', 'Circuit', 'HIIT'];
const phaseTwoPlanOptions = ['', ...phaseTwo.circuits.map((circuit) => circuit.name)];
const views = [
  { id: 'home', label: 'Circuit', icon: 'home' },
  { id: 'timer', label: 'Chrono', icon: 'timer' },
  { id: 'warmup', label: 'Etirements', icon: 'stretch' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
];

const hiitCircuit = [
  { id: 'burpees', name: 'Burpees', amount: 10, unit: 'reps' },
  { id: 'bateau', name: 'Bateau', amount: 30, unit: 'sec' },
  { id: 'jumping-jacks', name: 'Jumping jacks', amount: 50, unit: 'reps' },
  { id: 'twists-russes', name: 'Twists russes', amount: 20, unit: 'reps' },
  { id: 'gainage-cote', name: 'Gainage cote', amount: 30, unit: 'sec/cote' },
  { id: 'mountain-climbers', name: 'Mountain climbers', amount: 30, unit: 'reps' },
  { id: 'sit-up-chaise', name: 'Sit up en chaise', amount: 15, unit: 'reps' },
];

const trainingProtocols = {
  prep: [
    { label: 'Format', value: '4 series' },
    { label: 'Volume', value: '2-5 reps max' },
    { label: 'Repos', value: '5 min entre series' },
  ],
  classic: [
    { label: 'Tours', value: '4 circuits' },
    { label: 'Repos court', value: '45-60 sec' },
    { label: 'Repos tour', value: '2 min' },
  ],
  hiit: [
    { label: 'Tours', value: `${HIIT_ROUNDS} circuits` },
    { label: 'Repos exos', value: '15-20 sec' },
    { label: 'Repos tour', value: '1 min' },
  ],
  phaseTwoTechnique: [
    { label: 'Objectifs', value: '1-2 exos' },
    { label: 'Repos', value: '1-2 min' },
    { label: 'Format', value: 'essais propres' },
  ],
  phaseTwoCircuit: [
    { label: 'Fin de seance', value: '1 circuit' },
    { label: 'Type', value: 'au choix' },
    { label: 'Repos', value: 'selon circuit' },
  ],
};

const warmupSets = {
  stretch: {
    label: 'Etirements',
    exerciseSeconds: 30,
    restSeconds: 5,
    exercises: [
      'Tendu sur la barre de traction',
      'Etirements pectoraux - bras gauche',
      'Etirements pectoraux - bras droit',
      'Etirements obliques - cote gauche',
      'Etirements obliques - cote droit',
      'Etirements abdos',
      'Toucher le bout de ses pieds assis',
      'Jambe pliee tenue derriere les fesses - gauche',
      'Jambe pliee tenue derriere les fesses - droite',
    ],
  },
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      completed: saved?.completed ?? {},
      circuitNotes: saved?.circuitNotes ?? {},
      activePhaseId: phases.some((phase) => phase.id === saved?.activePhaseId) ? saved.activePhaseId : null,
      plan: normalizePlan(saved?.plan),
      sessions: Array.isArray(saved?.sessions) ? saved.sessions : [],
      records: saved?.records ?? {},
    };
  } catch {
    return getDefaultState();
  }
}

function getDefaultState() {
  return { completed: {}, circuitNotes: {}, activePhaseId: null, plan: defaultPlan, sessions: [], records: {} };
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
  if (type === 'Circuit + HIIT') return 'HIIT';
  return '';
}

function normalizePlanForPhase(plan, phase) {
  const options = phase.id === phaseTwo.id ? phaseTwoPlanOptions : planOptions;
  return normalizePlan(plan).map((slot) => ({
    ...slot,
    type: options.includes(slot.type) ? slot.type : '',
  }));
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function App() {
  const [state, setState] = useState(loadState);
  const [activeView, setActiveView] = useState('home');
  const [activeFamily, setActiveFamily] = useState(phaseOne.families[0].id);
  const [summary, setSummary] = useState(null);
  const [stopwatchMessage, setStopwatchMessage] = useState('');
  const [stopwatchReps, setStopwatchReps] = useState({});
  const [stopwatch, setStopwatch] = useState(createClockState);
  const [warmup, setWarmup] = useState(createWarmupState);

  useClockTicker(stopwatch, setStopwatch);
  useWarmupTicker(warmup, setWarmup);

  useEffect(() => {
    if (!warmup.completedSession) return;
    recordWarmupSession(warmup.completedSession);
  }, [warmup.completedSession]);

  const phaseOneComplete = isPhaseComplete(phaseOne, state.completed);
  const activePhase = phases.find((phase) => phase.id === state.activePhaseId) ?? (phaseOneComplete ? phaseTwo : phaseOne);
  const activePlanOptions = activePhase.id === phaseTwo.id ? phaseTwoPlanOptions : planOptions;
  const stats = useMemo(() => getStats(state, activePhase), [state, activePhase]);
  const currentFamily = activePhase.families.find((family) => family.id === activeFamily) ?? activePhase.families[0];
  const circuitGoals = activePhase.families.map((family) => ({
    family,
    level: getCurrentLevel(family, state.completed),
  }));

  useEffect(() => {
    if (!activePhase.families.some((family) => family.id === activeFamily)) {
      setActiveFamily(activePhase.families[0].id);
    }
  }, [activeFamily, activePhase]);

  function updateState(updater) {
    setState((previous) => {
      const next = updater(previous);
      saveState(next);
      return next;
    });
  }

  function toggleLevel(familyId, levelId) {
    const family = activePhase.families.find((item) => item.id === familyId);
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

      return {
        ...previous,
        completed,
        activePhaseId: activePhase.id === phaseOne.id && isPhaseComplete(phaseOne, completed) ? phaseTwo.id : previous.activePhaseId,
      };
    });
  }

  function selectPhase(phaseId) {
    updateState((previous) => ({
      ...previous,
      activePhaseId: phaseId,
      plan: normalizePlanForPhase(previous.plan, phases.find((phase) => phase.id === phaseId) ?? phaseOne),
    }));
  }

  function updatePlan(index, type) {
    updateState((previous) => ({
      ...previous,
      plan: previous.plan.map((slot, slotIndex) => (slotIndex === index ? { ...slot, type } : slot)),
    }));
  }

  function recordSession(session) {
    let recordedSummary;
    updateState((previous) => {
      const nextSession = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        ...session,
      };
      const recordResult = updateRecords(previous.records, nextSession.exercises);
      recordedSummary = {
        ...nextSession,
        newRecords: recordResult.newRecords,
        previousXp: getTotalXp(previous),
        nextXp: getTotalXp({ ...previous, sessions: [...previous.sessions, nextSession] }),
      };

      return {
        ...previous,
        sessions: [nextSession, ...previous.sessions],
        records: recordResult.records,
      };
    });
    setSummary(recordedSummary);
  }

  function getStopwatchExercises() {
    const exercises = activePhase.families
      .map((family) => ({
        id: family.id,
        name: family.name,
        reps: Number(stopwatchReps[family.id]) || 0,
      }))
      .filter((exercise) => exercise.reps > 0);

    return exercises;
  }

  function updateStopwatchReps(familyId, value) {
    const reps = Math.max(0, Number(value) || 0);
    setStopwatchReps((previous) => ({ ...previous, [familyId]: reps }));
  }

  function bumpStopwatchReps(familyId, amount) {
    setStopwatchReps((previous) => ({
      ...previous,
      [familyId]: Math.max(0, (Number(previous[familyId]) || 0) + amount),
    }));
  }

  function recordStopwatchSession() {
    const durationMs = getClockElapsed(stopwatch);
    if (durationMs < MIN_CIRCUIT_SESSION_MS) {
      return;
    }

    const exercises = getStopwatchExercises();

    recordSession({
      type: 'Circuit',
      durationMs,
      exercises,
      totalReps: exercises.reduce((total, exercise) => total + exercise.reps, 0),
      xp: getSessionXp(durationMs, exercises),
    });
    setStopwatch(createClockState());
    setStopwatchReps({});
    setStopwatchMessage('');
  }

  function recordHiitSession() {
    const exercises = hiitCircuit.map((exercise) => ({
      id: `hiit-${exercise.id}`,
      name: exercise.name,
      reps: exercise.amount,
      unit: exercise.unit,
    }));

    recordSession({
      type: 'HIIT Phase 1 - tour',
      durationMs: HIIT_ROUND_MS,
      exercises,
      totalReps: exercises
        .filter((exercise) => exercise.unit === 'reps')
        .reduce((total, exercise) => total + exercise.reps, 0),
      xp: getSessionXp(HIIT_ROUND_MS, exercises),
    });
  }

  function recordWarmupSession(finalWarmup) {
    const set = warmupSets[finalWarmup.mode];
    const completedExercises = set.exercises.slice(0, finalWarmup.index + 1);
    const durationMs =
      completedExercises.length * set.exerciseSeconds * 1000 +
      Math.max(0, completedExercises.length - 1) * set.restSeconds * 1000;

    recordSession({
      type: set.label,
      durationMs,
      exercises: completedExercises.map((name) => ({ id: slugify(name), name, reps: 1 })),
      totalReps: completedExercises.length,
      xp: getSessionXp(durationMs, completedExercises),
    });
    setWarmup(createWarmupState());
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{activePhase.name}</p>
          <h1>{getViewTitle(activeView, activePhase)}</h1>
        </div>
        <div className="rank-box">
          <span>Rang</span>
          <strong>{stats.rank}</strong>
        </div>
      </section>

      <nav className="app-nav" aria-label="Navigation principale">
        {views.map((view) => (
          <button
            aria-label={view.label}
            className={activeView === view.id ? 'nav-icon active' : 'nav-icon'}
            key={view.id}
            onClick={() => setActiveView(view.id)}
            title={view.label}
          >
            <Icon name={view.icon} />
          </button>
        ))}
      </nav>

      <section className="glass-panel progress-panel">
        <div>
          <span className="muted">Progression</span>
          <strong>{stats.completedDone}/{stats.completedTotal} niveaux valides</strong>
        </div>
        <div className="progress-track" aria-label={`Progression ${stats.percent}%`}>
          <span style={{ width: `${stats.percent}%` }} />
        </div>
        <p>{stats.totalXp} XP / {stats.requiredDone} niveaux principaux / {stats.optionalDone} optionnels</p>
      </section>

      {activeView === 'home' && (
        <HomeView
          activeFamily={activeFamily}
          activePhase={activePhase}
          activePlanOptions={activePlanOptions}
          circuitGoals={circuitGoals}
          currentFamily={currentFamily}
          onLevelToggle={toggleLevel}
          onPlanChange={updatePlan}
          onPhaseChange={selectPhase}
          onSelectFamily={setActiveFamily}
          onSaveHiit={recordHiitSession}
          phaseOneComplete={phaseOneComplete}
          plan={state.plan}
          completed={state.completed}
          sessions={state.sessions}
        />
      )}
      {activeView === 'timer' && (
        <StopwatchView
          clock={stopwatch}
          circuitGoals={circuitGoals}
          message={stopwatchMessage}
          onClockChange={setStopwatch}
          onRepsChange={updateStopwatchReps}
          onRepsStep={bumpStopwatchReps}
          onSave={recordStopwatchSession}
          reps={stopwatchReps}
        />
      )}
      {activeView === 'warmup' && <WarmupView warmup={warmup} onWarmupChange={setWarmup} />}
      {activeView === 'stats' && <StatsView stats={stats} records={state.records} sessions={state.sessions} />}

      {summary && <SessionSummary summary={summary} onClose={() => setSummary(null)} />}
    </main>
  );
}

function HomeView(props) {
  const hiitRoundsToday = getTodayHiitRounds(props.sessions);
  const isPhaseTwo = props.activePhase.id === phaseTwo.id;

  return (
    <>
      <section className="glass-panel section phase-panel">
        <div className="section-title">
          <h2>Phase active</h2>
          <span>{props.phaseOneComplete ? 'Phase 2 debloquee' : 'Phase 1 en cours'}</span>
        </div>
        <div className="phase-switch" aria-label="Choix de phase">
          {phases.map((phase) => (
            <button
              className={props.activePhase.id === phase.id ? 'active' : ''}
              disabled={phase.id === phaseTwo.id && !props.phaseOneComplete}
              key={phase.id}
              onClick={() => props.onPhaseChange(phase.id)}
            >
              {phase.name}
            </button>
          ))}
        </div>
      </section>

      <section className="glass-panel section">
        <div className="section-title">
          <h2>Planning</h2>
        </div>
        <div className="week-grid">
          {props.plan.map((slot, index) => (
            <label className={slot.type ? 'day-card filled' : 'day-card'} key={slot.day}>
              <span>{slot.day}</span>
              <select
                value={props.activePlanOptions.includes(slot.type) ? slot.type : ''}
                onChange={(event) => props.onPlanChange(index, event.target.value)}
              >
                {props.activePlanOptions.map((option) => (
                  <option value={option} key={option}>
                    {option || 'Vide'}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <CollapsibleSection title={isPhaseTwo ? 'Seance phase 2' : 'Seance circuit'} summary={isPhaseTwo ? 'technique + circuit' : 'prochaine cible'} defaultOpen>
        {isPhaseTwo ? (
          <>
            <ProtocolGrid items={trainingProtocols.phaseTwoTechnique} title="Technique" />
            <ProtocolGrid items={trainingProtocols.phaseTwoCircuit} title="Circuit" />
          </>
        ) : (
          <>
            <ProtocolGrid items={trainingProtocols.prep} title="Pre-entrainement" />
            <ProtocolGrid items={trainingProtocols.classic} title="Circuit classique" />
          </>
        )}
        <div className="circuit-list">
          {props.circuitGoals.map(({ family, level }) => (
            <article className="circuit-item" key={family.id}>
              <button className="circuit-target" onClick={() => props.onSelectFamily(family.id)}>
                <span>{family.name}</span>
                <strong>{level.name}</strong>
              </button>
            </article>
          ))}
        </div>
        {isPhaseTwo && (
          <div className="hiit-list compact">
            {phaseTwo.circuits.map((circuit) => (
              <article className="hiit-item" key={circuit.id}>
                <span>{circuit.name}</span>
                <strong>au choix</strong>
              </article>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {!isPhaseTwo && (
        <CollapsibleSection className="hiit-page" title="HIIT" summary={`${hiitRoundsToday}/${HIIT_ROUNDS} tours`}>
          <ProtocolGrid items={trainingProtocols.hiit} title="Protocole" />
          <div className="hiit-counter" aria-label={`Tours HIIT ${hiitRoundsToday} sur ${HIIT_ROUNDS}`}>
            {Array.from({ length: HIIT_ROUNDS }, (_, index) => (
              <span className={index < hiitRoundsToday ? 'done' : ''} key={index} />
            ))}
          </div>
          <div className="hiit-list compact">
            {hiitCircuit.map((exercise) => (
              <article className="hiit-item" key={exercise.id}>
                <span>{exercise.name}</span>
                <strong>{formatExerciseAmount(exercise.amount, exercise.unit)}</strong>
              </article>
            ))}
          </div>
          <button className="primary-action hiit-save" disabled={hiitRoundsToday >= HIIT_ROUNDS} onClick={props.onSaveHiit}>
            Enregistrer 1 tour
          </button>
        </CollapsibleSection>
      )}

      <section className="glass-panel section">
        <div className="section-title">
          <h2>Objectifs</h2>
          <span>{props.currentFamily.finalGoal}</span>
        </div>
        <div className="tabs">
          {props.activePhase.families.map((family) => (
            <button
              className={family.id === props.activeFamily ? 'active' : ''}
              key={family.id}
              onClick={() => props.onSelectFamily(family.id)}
            >
              {family.name}
            </button>
          ))}
        </div>
        <div className="levels">
          {props.currentFamily.levels.map((level) => (
            <article className={props.completed[level.id] ? 'level-card done' : 'level-card'} key={level.id}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(props.completed[level.id])}
                  onChange={() => props.onLevelToggle(props.currentFamily.id, level.id)}
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
    </>
  );
}

function StopwatchView({ clock, circuitGoals, message, onClockChange, onRepsChange, onRepsStep, onSave, reps }) {
  const [activeRepFamily, setActiveRepFamily] = useState(circuitGoals[0]?.family.id);
  const elapsedMs = getClockElapsed(clock);
  const isPausedWithTime = !clock.running && elapsedMs > 0;
  const canSave = elapsedMs >= MIN_CIRCUIT_SESSION_MS;
  const activeGoal = circuitGoals.find(({ family }) => family.id === activeRepFamily) ?? circuitGoals[0];
  const totalReps = Object.values(reps).reduce((total, value) => total + (Number(value) || 0), 0);

  return (
    <section className="glass-panel section timer-page">
      <div className="timer-display">{formatDuration(elapsedMs)}</div>
      <div className="stopwatch-actions">
        {clock.running ? (
          <button aria-label="Pause" className="round-action" onClick={() => onClockChange(pauseClock(clock))}>
            <Icon name="pause" />
          </button>
        ) : (
          <button aria-label="Lecture" className="round-action" onClick={() => onClockChange(startClock(clock))}>
            <Icon name="play" />
          </button>
        )}
        {isPausedWithTime && (
          <>
            <button aria-label="Reinitialiser" className="icon-action" onClick={() => onClockChange(createClockState())}>
              <Icon name="reset" />
            </button>
            <button className="primary-action save-action" disabled={!canSave} onClick={onSave}>
              Enregistrer
            </button>
          </>
        )}
      </div>
      {message && <p className="session-rule warning">{message}</p>}
      <div className="session-reps">
        <div className="rep-tabs" aria-label="Exercices de la seance">
          {circuitGoals.map(({ family }) => (
            <button
              className={activeGoal?.family.id === family.id ? 'active' : ''}
              key={family.id}
              onClick={() => setActiveRepFamily(family.id)}
            >
              <span>{family.name}</span>
              <strong>{reps[family.id] ?? 0}</strong>
            </button>
          ))}
        </div>
        {activeGoal && (
          <article className="rep-tracker">
            <div>
              <span>{activeGoal.family.name}</span>
              <strong>{activeGoal.level.name}</strong>
            </div>
            <div className="rep-controls">
              <button aria-label={`Retirer une rep ${activeGoal.family.name}`} onClick={() => onRepsStep(activeGoal.family.id, -1)}>
                -1
              </button>
              <input
                aria-label={`Repetitions ${activeGoal.family.name}`}
                inputMode="numeric"
                min="0"
                type="number"
                value={reps[activeGoal.family.id] ?? 0}
                onChange={(event) => onRepsChange(activeGoal.family.id, event.target.value)}
              />
              <button aria-label={`Ajouter une rep ${activeGoal.family.name}`} onClick={() => onRepsStep(activeGoal.family.id, 1)}>
                +1
              </button>
              <button aria-label={`Ajouter cinq reps ${activeGoal.family.name}`} onClick={() => onRepsStep(activeGoal.family.id, 5)}>
                +5
              </button>
            </div>
          </article>
        )}
        <p className="rep-total">{totalReps} reps notees</p>
      </div>
    </section>
  );
}

function ProtocolGrid({ items, title }) {
  return (
    <div className="protocol-block">
      <span>{title}</span>
      <div className="protocol-grid">
        {items.map((item) => (
          <article key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function CollapsibleSection({ children, className = '', defaultOpen = false, summary, title }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`glass-panel section collapsible-section ${className}`}>
      <button
        aria-expanded={open}
        className="collapse-toggle"
        onClick={() => setOpen((previous) => !previous)}
      >
        <span>
          <strong>{title}</strong>
          {summary && <small>{summary}</small>}
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} />
      </button>
      {open && <div className="collapsible-content">{children}</div>}
    </section>
  );
}

function WarmupView({ warmup, onWarmupChange }) {
  const set = warmupSets[warmup.mode];
  const currentName = set.exercises[warmup.index];
  const nextName = set.exercises[warmup.index + 1] ?? 'fin de seance';
  const totalSteps = set.exercises.length;
  const seconds = warmup.phase === 'exercise' ? set.exerciseSeconds : set.restSeconds;
  const progress = ((warmup.index + (warmup.phase === 'rest' ? 0.5 : 0)) / totalSteps) * 100;

  function skip(direction) {
    onWarmupChange((previous) => ({
      ...previous,
      index: clamp(previous.index + direction, 0, warmupSets[previous.mode].exercises.length - 1),
      phase: 'exercise',
      remainingMs: warmupSets[previous.mode].exerciseSeconds * 1000,
      updatedAt: Date.now(),
    }));
  }

  return (
    <section className="glass-panel section warmup-page">
      <div className="warmup-card">
        <span>{warmup.phase === 'exercise' ? 'Exercice' : 'Repos'}</span>
        <h2>{warmup.phase === 'exercise' ? currentName : `prochain : ${nextName}`}</h2>
        <strong>{formatTimerSeconds(Math.ceil(warmup.remainingMs / 1000 || seconds))}</strong>
      </div>
      <div className="control-row">
        <button aria-label="Precedent" title="Precedent" onClick={() => skip(-1)}>
          <Icon name="previous" />
        </button>
        {warmup.running ? (
          <button aria-label="Pause" title="Pause" onClick={() => onWarmupChange((previous) => ({ ...previous, running: false }))}>
            <Icon name="pause" />
          </button>
        ) : (
          <button
            aria-label="Lecture"
            title="Lecture"
            onClick={() => onWarmupChange((previous) => ({ ...previous, running: true, updatedAt: Date.now() }))}
          >
            <Icon name="play" />
          </button>
        )}
        <button aria-label="Suivant" title="Suivant" onClick={() => skip(1)}>
          <Icon name="next" />
        </button>
      </div>
      <div className="step-dots" aria-label={`Progression ${Math.round(progress)}%`}>
        {set.exercises.map((exercise, index) => (
          <span className={index <= warmup.index ? 'active' : ''} title={exercise} key={exercise} />
        ))}
      </div>
    </section>
  );
}

function StatsView({ stats, records, sessions }) {
  return (
    <>
      <section className="stats-grid">
        <StatCard label="Temps total" value={formatDuration(stats.totalTrainingMs)} />
        <StatCard label="Seances" value={stats.sessionCount} />
        <StatCard label="Moyenne" value={formatDuration(stats.averageSessionMs)} />
        <StatCard label="Plus longue" value={formatDuration(stats.longestSessionMs)} />
      </section>
      <section className="glass-panel section">
        <div className="section-title">
          <h2>Progression</h2>
        </div>
        <div className="chart-bars">
          {stats.weekBuckets.map((bucket) => (
            <div className="chart-column" key={bucket.label}>
              <span style={{ height: `${Math.max(8, bucket.percent)}%` }} />
              <small>{bucket.label}</small>
            </div>
          ))}
        </div>
      </section>
      <CalendarView sessions={sessions} />
      <CollapsibleSection title="Exercices" summary={`${stats.exerciseRows.length} suivis`}>
        <div className="exercise-stats">
          {stats.exerciseRows.map((row) => (
            <article key={row.id}>
              <strong>{row.name}</strong>
              <span>Total {formatExerciseAmount(row.total, row.unit)}</span>
              <span>Semaine {formatExerciseAmount(row.week, row.unit)}</span>
              <span>Mois {formatExerciseAmount(row.month, row.unit)}</span>
              <em>Record {formatExerciseAmount(records[row.id] ?? 0, row.unit)}</em>
            </article>
          ))}
        </div>
      </CollapsibleSection>
    </>
  );
}

function CalendarView({ sessions }) {
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const calendar = getCurrentMonthCalendar(sessions);
  const selectedSessions = sessions.filter((session) => toDateKey(session.date) === selectedDate);

  return (
    <>
      <section className="glass-panel section">
        <div className="section-title">
          <h2>Historique</h2>
          <span>{calendar.monthLabel}</span>
        </div>
        <div className="calendar-grid">
          {calendar.days.map((day) => (
            <button
              className={`${day.inMonth ? '' : 'muted-day'} ${day.hasSession ? 'trained' : ''} ${day.key === selectedDate ? 'selected' : ''}`}
              key={day.key}
              onClick={() => setSelectedDate(day.key)}
            >
              {day.label}
            </button>
          ))}
        </div>
      </section>
      <CollapsibleSection title={formatHumanDate(selectedDate)} summary={`${selectedSessions.length} seance(s)`} defaultOpen>
        <div className="section-title">
          <h2>Detail</h2>
          <span>{selectedSessions.length} seance(s)</span>
        </div>
        <div className="history-list">
          {selectedSessions.length === 0 && <p className="empty-state">Aucune seance enregistree ce jour.</p>}
          {selectedSessions.map((session) => (
            <article key={session.id}>
              <strong>{session.type} - {formatDuration(session.durationMs)}</strong>
              <span>{session.totalReps} reps - {session.xp} XP</span>
              <p>{session.exercises.map((exercise) => `${exercise.name}: ${formatExerciseAmount(exercise.reps, exercise.unit)}`).join(' / ') || 'Chronometre libre'}</p>
            </article>
          ))}
        </div>
      </CollapsibleSection>
    </>
  );
}

function SessionSummary({ summary, onClose }) {
  const levelBefore = Math.floor(summary.previousXp / 500);
  const nextPercent = ((summary.nextXp % 500) / 500) * 100;

  return (
    <div className="summary-backdrop" role="dialog" aria-modal="true">
      <section className="summary-card">
        <p className="eyebrow">Seance terminee</p>
        <h2>{summary.type}</h2>
        <div className="summary-grid">
          <StatCard label="Temps" value={formatDuration(summary.durationMs)} />
          <StatCard label="XP gagnee" value={`+${summary.xp}`} />
          <StatCard label="Repetitions" value={summary.totalReps} />
          <StatCard label="Records" value={summary.newRecords.length} />
        </div>
        <div className="xp-result">
          <span>Niveau {levelBefore + 1}</span>
          <div className="progress-track">
            <span style={{ width: `${nextPercent}%` }} />
          </div>
          <small>{summary.nextXp} XP au total</small>
        </div>
        {summary.newRecords.length > 0 && (
          <div className="record-list">
            {summary.newRecords.map((record) => (
              <span key={record.id}>Nouveau record: {record.name} {formatExerciseAmount(record.reps, record.unit)}</span>
            ))}
          </div>
        )}
        <button className="primary-action" onClick={onClose}>Valider</button>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Icon({ name }) {
  const common = {
    'aria-hidden': 'true',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  };

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }
  if (name === 'timer') {
    return (
      <svg {...common}>
        <path d="M9 2h6" />
        <path d="M12 14l3-3" />
        <path d="M12 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
      </svg>
    );
  }
  if (name === 'hiit') {
    return (
      <svg {...common}>
        <path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z" />
      </svg>
    );
  }
  if (name === 'stretch') {
    return (
      <svg {...common}>
        <path d="M7 4.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
        <path d="M10 9l3.5 2.5L18 10" />
        <path d="M13.5 11.5 11 16l-5 4" />
        <path d="M12 16h5l3 4" />
      </svg>
    );
  }
  if (name === 'stats') {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-9" />
      </svg>
    );
  }
  if (name === 'calendar') {
    return (
      <svg {...common}>
        <path d="M7 3v3" />
        <path d="M17 3v3" />
        <path d="M4 8h16" />
        <path d="M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" />
      </svg>
    );
  }
  if (name === 'play') {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l9.8-6.8c.6-.4.6-1.2 0-1.6L9.6 4.4C8.9 3.9 8 4.4 8 5.2Z" />
      </svg>
    );
  }
  if (name === 'pause') {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M8 5h3v14H8z" />
        <path d="M13 5h3v14h-3z" />
      </svg>
    );
  }
  if (name === 'previous') {
    return (
      <svg {...common}>
        <path d="m11 17-5-5 5-5" />
        <path d="m18 17-5-5 5-5" />
      </svg>
    );
  }
  if (name === 'next') {
    return (
      <svg {...common}>
        <path d="m6 17 5-5-5-5" />
        <path d="m13 17 5-5-5-5" />
      </svg>
    );
  }
  if (name === 'chevron-up') {
    return (
      <svg {...common}>
        <path d="m6 15 6-6 6 6" />
      </svg>
    );
  }
  if (name === 'chevron-down') {
    return (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 4v6h6" />
      <path d="M20 12a8 8 0 0 1-14.9 4" />
      <path d="M5 10a8 8 0 0 1 14.9-4" />
    </svg>
  );
}

function useClockTicker(clock, setClock) {
  useEffect(() => {
    if (!clock.running) return undefined;
    const interval = setInterval(() => {
      setClock((previous) => (previous.running ? { ...previous, now: Date.now() } : previous));
    }, 250);
    return () => clearInterval(interval);
  }, [clock.running, setClock]);
}

function useWarmupTicker(warmup, setWarmup) {
  useEffect(() => {
    if (!warmup.running) return undefined;
    const interval = setInterval(() => {
      setWarmup((previous) => {
        if (!previous.running) return previous;
        const now = Date.now();
        const nextRemaining = previous.remainingMs - (now - previous.updatedAt);
        if (nextRemaining > 0) return { ...previous, remainingMs: nextRemaining, updatedAt: now };

        const set = warmupSets[previous.mode];
        if (previous.phase === 'exercise') {
          return { ...previous, phase: 'rest', remainingMs: set.restSeconds * 1000, updatedAt: now };
        }
        if (previous.index >= set.exercises.length - 1) {
          return { ...previous, running: false, completedSession: previous };
        }
        return { ...previous, index: previous.index + 1, phase: 'exercise', remainingMs: set.exerciseSeconds * 1000, updatedAt: now };
      });
    }, 250);
    return () => clearInterval(interval);
  }, [warmup.running, setWarmup]);
}

function createClockState() {
  return { elapsedMs: 0, running: false, startedAt: null, now: Date.now() };
}

function createWarmupState(mode = 'stretch') {
  const set = warmupSets[mode];
  return {
    mode,
    index: 0,
    phase: 'exercise',
    remainingMs: set.exerciseSeconds * 1000,
    running: false,
    updatedAt: Date.now(),
    completedSession: null,
  };
}

function startClock(clock) {
  if (clock.running) return clock;
  return { ...clock, running: true, startedAt: Date.now(), now: Date.now() };
}

function pauseClock(clock) {
  if (!clock.running) return clock;
  return { ...clock, running: false, elapsedMs: getClockElapsed(clock), startedAt: null };
}

function getClockElapsed(clock) {
  if (!clock.running || !clock.startedAt) return clock.elapsedMs;
  return clock.elapsedMs + (clock.now - clock.startedAt);
}

function getCurrentLevel(family, completed) {
  return family.levels.find((level) => !completed[level.id]) ?? family.levels[family.levels.length - 1];
}

function getTodayHiitRounds(sessions) {
  const today = toDateKey(new Date());
  return sessions.filter((session) => session.type === 'HIIT Phase 1 - tour' && toDateKey(session.date) === today).length;
}

function getStats(state, activePhase) {
  const levelStats = getLevelStats(state.completed, activePhase);
  const totalTrainingMs = state.sessions.reduce((total, session) => total + session.durationMs, 0);
  const sessionCount = state.sessions.length;
  const longestSessionMs = Math.max(0, ...state.sessions.map((session) => session.durationMs));
  const exerciseRows = getExerciseRows(state.sessions, activePhase);
  const totalXp = getTotalXp(state);

  return {
    ...levelStats,
    totalXp,
    totalTrainingMs,
    sessionCount,
    averageSessionMs: sessionCount ? totalTrainingMs / sessionCount : 0,
    longestSessionMs,
    exerciseRows,
    weekBuckets: getWeekBuckets(state.sessions),
  };
}

function getLevelStats(completed, phase = phaseOne) {
  const levels = phase.families.flatMap((family) => family.levels);
  const required = levels.filter((level) => !level.optional);
  const optional = levels.filter((level) => level.optional);
  const completedLevels = levels.filter((level) => completed[level.id]);
  const requiredDone = required.filter((level) => completed[level.id]).length;
  const optionalDone = optional.filter((level) => completed[level.id]).length;
  const percent = Math.round((completedLevels.length / levels.length) * 100);

  return {
    completedDone: completedLevels.length,
    completedTotal: levels.length,
    requiredDone,
    optionalDone,
    percent,
    rank: getRank(requiredDone, required.length, phase),
  };
}

function getRank(done, total, phase = phaseOne) {
  const ratio = done / total;
  if (phase.id === phaseTwo.id && ratio === 1) return 'Phase 2';
  if (ratio === 1) return 'Phase 1';
  if (ratio >= 0.75) return 'B';
  if (ratio >= 0.5) return 'C';
  if (ratio >= 0.25) return 'D';
  return 'E';
}

function getTotalXp(state) {
  const progressionXp = phases.reduce((total, phase) => {
    const levelStats = getLevelStats(state.completed, phase);
    return total + levelStats.requiredDone * 100 + levelStats.optionalDone * 40;
  }, 0);
  const sessionXp = state.sessions.reduce((total, session) => total + session.xp, 0);
  return progressionXp + sessionXp;
}

function getSessionXp(durationMs, exercises) {
  const minutes = Math.max(1, Math.round(durationMs / 60000));
  const repBonus = exercises.reduce((total, exercise) => total + (exercise.reps || 0), 0);
  return Math.min(240, minutes * 8 + repBonus * 2);
}

function getExerciseRows(sessions, activePhase = phaseOne) {
  const rows = new Map();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  activePhase.families.forEach((family) => {
    rows.set(family.id, { id: family.id, name: family.name, total: 0, week: 0, month: 0, unit: 'reps' });
  });

  sessions.forEach((session) => {
    const date = new Date(session.date);
    session.exercises.forEach((exercise) => {
      const row = rows.get(exercise.id) ?? { id: exercise.id, name: exercise.name, total: 0, week: 0, month: 0, unit: exercise.unit ?? 'reps' };
      row.total += exercise.reps || 0;
      if (date >= weekStart) row.week += exercise.reps || 0;
      if (date >= monthStart) row.month += exercise.reps || 0;
      row.unit = exercise.unit ?? row.unit ?? 'reps';
      rows.set(exercise.id, row);
    });
  });

  return Array.from(rows.values());
}

function getWeekBuckets(sessions) {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const weekStart = startOfWeek(new Date());
  const buckets = days.map((label, index) => {
    const key = toDateKey(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index));
    const minutes = sessions
      .filter((session) => toDateKey(session.date) === key)
      .reduce((total, session) => total + session.durationMs / 60000, 0);
    return { label, minutes };
  });
  const max = Math.max(1, ...buckets.map((bucket) => bucket.minutes));
  return buckets.map((bucket) => ({ ...bucket, percent: (bucket.minutes / max) * 100 }));
}

function updateRecords(records, exercises) {
  const next = { ...records };
  const newRecords = [];

  exercises.forEach((exercise) => {
    if ((exercise.reps || 0) > (next[exercise.id] || 0)) {
      next[exercise.id] = exercise.reps;
      newRecords.push(exercise);
    }
  });

  return { records: next, newRecords };
}

function parseReps(value) {
  if (!value) return 0;
  let total = 0;
  const text = String(value).toLowerCase().replace(/(\d+)\s*x\s*(\d+)/g, (_, sets, reps) => {
    total += Number(sets) * Number(reps);
    return ' ';
  });
  return total + [...text.matchAll(/\d+/g)].reduce((sum, match) => sum + Number(match[0]), 0);
}

function getCurrentMonthCalendar(sessions) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(now.getFullYear(), now.getMonth(), 1 - startOffset);
  const trainedDays = new Set(sessions.map((session) => toDateKey(session.date)));

  return {
    monthLabel: first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    days: Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = toDateKey(date);
      return {
        key,
        label: date.getDate(),
        inMonth: date.getMonth() === now.getMonth(),
        hasSession: trainedDays.has(key),
      };
    }),
  };
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);
  return copy;
}

function toDateKey(dateLike) {
  const date = new Date(dateLike);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatHumanDate(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatTimerSeconds(seconds) {
  return `0:${String(seconds).padStart(2, '0')}`;
}

function formatExerciseAmount(amount, unit = 'reps') {
  if (unit === 'sec') return `${amount} sec`;
  if (unit === 'sec/cote') return `${amount} sec / cote`;
  return `${amount} reps`;
}

function getViewTitle(view, phase = phaseOne) {
  if (view === 'timer') return 'Chronometre';
  if (view === 'hiit') return 'HIIT Phase 1';
  if (view === 'warmup') return 'Etirements';
  if (view === 'stats') return 'Statistiques';
  if (view === 'calendar') return 'Calendrier';
  if (phase.id === phaseTwo.id) return 'Objectifs phase 2';
  return 'Objectif premier circuit complet';
}

function isPhaseComplete(phase, completed) {
  return phase.families
    .flatMap((family) => family.levels)
    .filter((level) => !level.optional)
    .every((level) => completed[level.id]);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

createRoot(document.getElementById('root')).render(<App />);
