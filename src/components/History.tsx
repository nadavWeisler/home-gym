import { bodyPartLabel, exerciseById } from '../data/exercises'
import type { Program, ProgramDay, WorkoutSession } from '../types'

type Props = {
  sessions: WorkoutSession[]
  programById: Record<string, Program>
  onDelete: (id: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function History({ sessions, programById, onDelete }: Props) {
  const totalExercises = sessions.reduce(
    (total, session) => total + session.exercises.length,
    0,
  )

  if (sessions.length === 0) {
    return (
      <section>
        <div className="section-head">
          <p className="section-eyebrow">Progress</p>
          <h2>History</h2>
          <p>Every saved workout lands here.</p>
        </div>
        <div className="empty-state hero-card">
          <span className="hero-icon" aria-hidden="true">
            ◷
          </span>
          <h3>No sessions yet</h3>
          <p>Start a program and save your first workout to build a training log.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="section-head">
        <p className="section-eyebrow">Progress</p>
        <h2>History</h2>
        <p>Your completed workouts and logged sets.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card panel">
          <span className="stat-value">{sessions.length}</span>
          <span className="stat-label">Workouts</span>
        </div>
        <div className="stat-card panel">
          <span className="stat-value">{totalExercises}</span>
          <span className="stat-label">Exercises logged</span>
        </div>
      </div>

      <div className="history-list">
        {sessions.map((session) => {
          const program = programById[session.programId]
          const day = program?.days.find(
            (item: ProgramDay) => item.id === session.dayId,
          )
          const doneCount = session.exercises.filter((log) => log.done).length

          return (
            <article key={session.id} className="panel history-item">
              <header>
                <div>
                  <h3>{day?.name ?? 'Workout'}</h3>
                  <time dateTime={session.date}>{formatDate(session.date)}</time>
                </div>
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => onDelete(session.id)}
                >
                  Delete
                </button>
              </header>

              <div className="history-meta">
                <span className="stat-pill">{program?.name ?? 'Program'}</span>
                <span className="stat-pill subtle">
                  {doneCount}/{session.exercises.length} done
                </span>
                {session.notes ? (
                  <span className="history-notes">{session.notes}</span>
                ) : null}
              </div>

              <ul className="history-exercises">
                {session.exercises.map((log) => {
                  const exercise = exerciseById[log.exerciseId]
                  const summary = log.sets
                    .map((set) => `${set.reps}×${set.weight}`)
                    .join(', ')

                  return (
                    <li key={log.exerciseId} className={log.done ? 'is-done' : ''}>
                      <span className="history-exercise-name">
                        {log.done ? '✓ ' : ''}
                        {exercise?.name ?? log.exerciseId}
                      </span>
                      {exercise ? (
                        <span className="training-tag">
                          {bodyPartLabel[exercise.bodyPart]}
                        </span>
                      ) : null}
                      <span className="history-sets">{summary}</span>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}
