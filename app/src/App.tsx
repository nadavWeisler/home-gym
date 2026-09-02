import { useEffect, useMemo, useState } from 'react'
import { ExerciseBank } from './components/ExerciseBank'
import { History } from './components/History'
import { ProgramBuilder } from './components/ProgramBuilder'
import { Programs } from './components/Programs'
import { WorkoutSessionView } from './components/WorkoutSession'
import {
  loadPrograms,
  programLookup,
  savePrograms,
  updateProgramDay,
} from './programStorage'
import {
  createWorkoutSession,
  findTodaysSession,
  loadActiveWorkout,
  loadSessions,
  saveActiveWorkout,
  saveSessions,
  upsertSession,
} from './storage'
import type {
  ActiveWorkout,
  Program,
  ProgramDay,
  WorkoutMode,
  WorkoutSession,
} from './types'

type Tab = 'programs' | 'exercises' | 'history'

const tabs: { id: Tab; label: string; short: string }[] = [
  { id: 'programs', label: 'Programs', short: 'Plans' },
  { id: 'exercises', label: 'Exercises', short: 'Bank' },
  { id: 'history', label: 'History', short: 'Log' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('programs')
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => loadSessions())
  const [programs, setPrograms] = useState<Program[]>(() => loadPrograms())
  const [showBuilder, setShowBuilder] = useState(() => loadPrograms().length === 0)
  const [active, setActive] = useState<ActiveWorkout | null>(() =>
    loadActiveWorkout(),
  )

  const programById = useMemo(() => programLookup(programs), [programs])

  const activeProgram = active ? programById[active.programId] : undefined
  const activeDay = activeProgram?.days.find(
    (day: ProgramDay) => day.id === active?.dayId,
  )

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  useEffect(() => {
    savePrograms(programs)
  }, [programs])

  useEffect(() => {
    saveActiveWorkout(active)
  }, [active])

  useEffect(() => {
    if (!active) return
    const program = programById[active.programId]
    const dayExists = program?.days.some((day) => day.id === active.dayId)
    if (!program || !dayExists) setActive(null)
  }, [active, programById])

  function saveProgramDay(
    programId: string,
    dayId: string,
    exerciseIds: string[],
  ) {
    setPrograms((prev) => updateProgramDay(prev, programId, dayId, exerciseIds))
  }

  function addProgram(program: Program) {
    setPrograms((prev) => [...prev, program])
    setShowBuilder(false)
    setTab('programs')
  }

  function startWorkout(programId: string, dayId: string, mode: WorkoutMode) {
    const program = programById[programId]
    const day = program?.days.find((item: ProgramDay) => item.id === dayId)
    if (!program || !day) return
    const session =
      findTodaysSession(sessions, programId, dayId) ??
      createWorkoutSession(programId, dayId, day.exerciseIds, sessions)
    setActive({ programId, dayId, mode, session })
  }

  function persistDraft(session: WorkoutSession) {
    setActive((prev) => (prev ? { ...prev, session } : prev))
  }

  function changeWorkoutMode(mode: WorkoutMode) {
    setActive((prev) => (prev ? { ...prev, mode } : prev))
  }

  function saveWorkout(session: WorkoutSession) {
    saveProgramDay(
      session.programId,
      session.dayId,
      session.exercises.map((log) => log.exerciseId),
    )
    setSessions((prev) => upsertSession(prev, session))
    setActive(null)
    setTab('history')
  }

  function saveProgramChanges(
    programId: string,
    dayId: string,
    exerciseIds: string[],
  ) {
    saveProgramDay(programId, dayId, exerciseIds)
    setActive(null)
    setTab('programs')
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((session) => session.id !== id))
  }

  const showNav = !active && !showBuilder

  function renderNav(className: string) {
    return (
      <nav className={className} aria-label="Main">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-btn ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <span className="nav-btn-label">{item.label}</span>
            <span className="nav-btn-short">{item.short}</span>
          </button>
        ))}
      </nav>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-row">
            <span className="brand-mark" aria-hidden="true" />
            <h1>Home Gym</h1>
          </div>
          <p>Your personal training space</p>
        </div>
        {showNav ? renderNav('nav nav-desktop') : null}
      </header>

      <main className="page-content" key={showBuilder ? 'builder' : active ? 'workout' : tab}>
        {showBuilder ? (
          <ProgramBuilder
            isFirstProgram={programs.length === 0}
            onComplete={addProgram}
            onCancel={
              programs.length > 0 ? () => setShowBuilder(false) : undefined
            }
          />
        ) : null}

        {active && activeProgram && activeDay ? (
          <WorkoutSessionView
            program={activeProgram}
            day={activeDay}
            initialMode={active.mode}
            session={active.session}
            previousSessions={sessions}
            onCancel={() => setActive(null)}
            onSave={saveWorkout}
            onDraft={persistDraft}
            onModeChange={changeWorkoutMode}
            onSaveProgram={(exerciseIds) =>
              saveProgramChanges(active.programId, active.dayId, exerciseIds)
            }
          />
        ) : null}

        {!active && !showBuilder && tab === 'programs' ? (
          <Programs
            programs={programs}
            onStart={startWorkout}
            onBuildProgram={() => setShowBuilder(true)}
          />
        ) : null}

        {!active && !showBuilder && tab === 'exercises' ? <ExerciseBank /> : null}

        {!active && !showBuilder && tab === 'history' ? (
          <History
            sessions={sessions}
            programById={programById}
            onDelete={deleteSession}
          />
        ) : null}
      </main>

      {showNav ? renderNav('nav nav-mobile bottom-nav') : null}
    </div>
  )
}
