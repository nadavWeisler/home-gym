import { bodyPartLabel, exerciseById } from '../data/exercises'
import { programById } from '../data/programs'
import type { ProgramDay, WorkoutSession } from '../types'

type Props = {
  sessions: WorkoutSession[]
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

export function History({ sessions, onDelete }: Props) {
  if (sessions.length === 0) {
    return (
      <section>
        <div className="section-head">
          <h2>History</h2>
          <p>Saved workouts will show up here.</p>
        </div>
        <p className="empty">
          No sessions yet. Start a program to log your first workout.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="section-head">
        <h2>History</h2>
        <p>
          {sessions.length} saved workout{sessions.length === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="history-list">
        {sessions.map((session) => {
          const program = programById[session.programId]
          const day = program?.days.find(
            (item: ProgramDay) => item.id === session.dayId,
          )

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

              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                {program?.name ?? 'Program'}
                {session.notes ? ` · ${session.notes}` : ''}
              </p>

              <ul>
                {session.exercises.map((log) => {
                  const exercise = exerciseById[log.exerciseId]
                  const summary = log.sets
                    .map((set) => `${set.reps}×${set.weight}`)
                    .join(', ')

                  return (
                    <li key={log.exerciseId}>
                      <strong style={{ color: 'var(--text)' }}>
                        {exercise?.name ?? log.exerciseId}
                      </strong>
                      {exercise ? ` · ${bodyPartLabel[exercise.bodyPart]}` : ''}
                      {` — ${summary}`}
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
