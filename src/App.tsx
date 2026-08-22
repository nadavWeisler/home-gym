import { useEffect, useState } from 'react'
import { ExerciseBank } from './components/ExerciseBank'
import { History } from './components/History'
import { Programs } from './components/Programs'
import { WorkoutSessionView } from './components/WorkoutSession'
import { loadSessions, saveSessions } from './storage'
import type { WorkoutSession } from './types'

type Tab = 'programs' | 'exercises' | 'history'

type ActiveWorkout = {
  programId: string
  dayId: string
}

export default function App() {
  const [tab, setTab] = useState<Tab>('programs')
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => loadSessions())
  const [active, setActive] = useState<ActiveWorkout | null>(null)

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  function startWorkout(programId: string, dayId: string) {
    setActive({ programId, dayId })
  }

  function saveWorkout(session: WorkoutSession) {
    setSessions((prev) => [session, ...prev])
    setActive(null)
    setTab('history')
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((session) => session.id !== id))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Home Gym</h1>
          <p>Track sessions from your exercise bank</p>
        </div>
        {!active ? (
          <nav className="nav" aria-label="Main">
            <button
              type="button"
              className={`nav-btn ${tab === 'programs' ? 'active' : ''}`}
              onClick={() => setTab('programs')}
            >
              Programs
            </button>
            <button
              type="button"
              className={`nav-btn ${tab === 'exercises' ? 'active' : ''}`}
              onClick={() => setTab('exercises')}
            >
              Exercises
            </button>
            <button
              type="button"
              className={`nav-btn ${tab === 'history' ? 'active' : ''}`}
              onClick={() => setTab('history')}
            >
              History
            </button>
          </nav>
        ) : null}
      </header>

      <main>
        {active ? (
          <WorkoutSessionView
            programId={active.programId}
            dayId={active.dayId}
            onCancel={() => setActive(null)}
            onSave={saveWorkout}
          />
        ) : null}

        {!active && tab === 'programs' ? (
          <Programs onStart={startWorkout} />
        ) : null}

        {!active && tab === 'exercises' ? <ExerciseBank /> : null}

        {!active && tab === 'history' ? (
          <History sessions={sessions} onDelete={deleteSession} />
        ) : null}
      </main>
    </div>
  )
}
