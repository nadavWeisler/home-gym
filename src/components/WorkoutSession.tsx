import { useState } from 'react'
import { bodyPartLabel, exerciseById } from '../data/exercises'
import { programById } from '../data/programs'
import { createSessionId } from '../storage'
import type { ExerciseLog, ProgramDay, SetLog, WorkoutSession } from '../types'

type Props = {
  programId: string
  dayId: string
  onCancel: () => void
  onSave: (session: WorkoutSession) => void
}

function createSetId(): string {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function emptySet(): SetLog {
  return { id: createSetId(), reps: 8, weight: 0 }
}

function buildInitialLogs(exerciseIds: string[]): ExerciseLog[] {
  return exerciseIds.map((exerciseId) => ({
    exerciseId,
    sets: [emptySet(), emptySet(), emptySet()],
  }))
}

export function WorkoutSessionView({
  programId,
  dayId,
  onCancel,
  onSave,
}: Props) {
  const program = programById[programId]
  const day: ProgramDay | undefined = program?.days.find(
    (item: ProgramDay) => item.id === dayId,
  )

  const [logs, setLogs] = useState<ExerciseLog[]>(() =>
    buildInitialLogs(day?.exerciseIds ?? []),
  )
  const [notes, setNotes] = useState('')

  if (!program || !day) {
    return (
      <section>
        <p className="empty">Program not found.</p>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Back
        </button>
      </section>
    )
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number,
  ) {
    setLogs((prev) =>
      prev.map((log, i) => {
        if (i !== exerciseIndex) return log
        return {
          ...log,
          sets: log.sets.map((set, j) =>
            j === setIndex ? { ...set, [field]: value } : set,
          ),
        }
      }),
    )
  }

  function addSet(exerciseIndex: number) {
    setLogs((prev) =>
      prev.map((log, i) =>
        i === exerciseIndex
          ? { ...log, sets: [...log.sets, emptySet()] }
          : log,
      ),
    )
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setLogs((prev) =>
      prev.map((log, i) => {
        if (i !== exerciseIndex) return log
        if (log.sets.length <= 1) return log
        return {
          ...log,
          sets: log.sets.filter((_, j) => j !== setIndex),
        }
      }),
    )
  }

  function handleSave() {
    const session: WorkoutSession = {
      id: createSessionId(),
      programId,
      dayId,
      date: new Date().toISOString(),
      exercises: logs,
      notes: notes.trim() || undefined,
    }
    onSave(session)
  }

  return (
    <section>
      <div className="workout-header">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2>{day.name}</h2>
          <p>
            {program.name} · {day.exerciseIds.length} exercises
          </p>
        </div>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className="workout-stack">
        {logs.map((log, exerciseIndex) => {
          const exercise = exerciseById[log.exerciseId]
          if (!exercise) return null

          return (
            <article key={log.exerciseId} className="panel exercise-log">
              <div className="exercise-log-head">
                <img src={exercise.image} alt="" />
                <div>
                  <h3>{exercise.name}</h3>
                  <span>{bodyPartLabel[exercise.bodyPart]}</span>
                </div>
              </div>

              <div className="sets">
                {log.sets.map((set, setIndex) => (
                  <div key={set.id} className="set-row">
                    <label>{setIndex + 1}</label>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="Reps"
                      aria-label={`Reps for set ${setIndex + 1}`}
                      value={set.reps}
                      onChange={(event) =>
                        updateSet(
                          exerciseIndex,
                          setIndex,
                          'reps',
                          Number(event.target.value) || 0,
                        )
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      inputMode="decimal"
                      placeholder="Weight"
                      aria-label={`Weight for set ${setIndex + 1}`}
                      value={set.weight}
                      onChange={(event) =>
                        updateSet(
                          exerciseIndex,
                          setIndex,
                          'weight',
                          Number(event.target.value) || 0,
                        )
                      }
                    />
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      aria-label={`Remove set ${setIndex + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn secondary"
                onClick={() => addSet(exerciseIndex)}
              >
                Add set
              </button>
            </article>
          )
        })}
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <label htmlFor="notes" style={{ display: 'block', marginBottom: 8 }}>
          Notes (optional)
        </label>
        <input
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Felt strong, short on sleep, etc."
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            background: '#0e1411',
            color: 'var(--text)',
            borderRadius: 8,
            padding: '0.55rem 0.7rem',
          }}
        />
      </div>

      <div className="workout-actions">
        <button type="button" className="btn" onClick={handleSave}>
          Save workout
        </button>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Discard
        </button>
      </div>
    </section>
  )
}
