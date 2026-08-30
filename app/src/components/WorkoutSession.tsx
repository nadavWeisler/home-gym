import { useState } from 'react'
import { bodyPartLabel, exerciseById } from '../data/exercises'
import { createSessionId } from '../storage'
import type {
  Exercise,
  ExerciseLog,
  Program,
  ProgramDay,
  SetLog,
  WorkoutMode,
  WorkoutSession,
} from '../types'
import { ExerciseGuide } from './ExerciseGuide'
import { ExerciseReplacePicker } from './ExerciseReplacePicker'
import { WorkoutTimer } from './WorkoutTimer'

type Props = {
  program: Program
  day: ProgramDay
  initialMode: WorkoutMode
  onCancel: () => void
  onSave: (session: WorkoutSession) => void
  onSaveProgram: (exerciseIds: string[]) => void
}

function createSetId(): string {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function emptySet(): SetLog {
  return { id: createSetId(), reps: 8, weight: 0, done: false }
}

function buildInitialLogs(exerciseIds: string[]): ExerciseLog[] {
  return exerciseIds.map((exerciseId) => ({
    exerciseId,
    done: false,
    sets: [emptySet(), emptySet(), emptySet()],
  }))
}

function remainingWork(logs: ExerciseLog[]): boolean {
  return logs.some((log) => !log.done || log.sets.some((set) => !set.done))
}

export function WorkoutSessionView({
  program,
  day,
  initialMode,
  onCancel,
  onSave,
  onSaveProgram,
}: Props) {
  const [mode, setMode] = useState<WorkoutMode>(initialMode)
  const [logs, setLogs] = useState<ExerciseLog[]>(() =>
    buildInitialLogs(day.exerciseIds),
  )
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<Exercise | null>(null)
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [restNonce, setRestNonce] = useState(0)

  const doneCount = logs.filter((log) => log.done).length
  const currentLog = logs[currentIndex]
  const currentExercise = currentLog
    ? exerciseById[currentLog.exerciseId]
    : undefined

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
          ? { ...log, sets: [...log.sets, emptySet()], done: false }
          : log,
      ),
    )
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setLogs((prev) =>
      prev.map((log, i) => {
        if (i !== exerciseIndex) return log
        if (log.sets.length <= 1) return log
        const sets = log.sets.filter((_, j) => j !== setIndex)
        return { ...log, sets, done: sets.every((set) => set.done) }
      }),
    )
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= logs.length) return
    setLogs((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
    if (currentIndex === index) setCurrentIndex(nextIndex)
  }

  function replaceExercise(exerciseIndex: number, newExerciseId: string) {
    setLogs((prev) =>
      prev.map((log, i) =>
        i === exerciseIndex
          ? { ...log, exerciseId: newExerciseId, done: false }
          : log,
      ),
    )
    setReplacingIndex(null)
  }

  function toggleSetDone(exerciseIndex: number, setIndex: number) {
    const willBeDone = !logs[exerciseIndex]?.sets[setIndex]?.done
    const nextLogs = logs.map((log, i) => {
      if (i !== exerciseIndex) return log
      const sets = log.sets.map((set, j) =>
        j === setIndex ? { ...set, done: !set.done } : set,
      )
      return { ...log, sets, done: sets.every((set) => set.done) }
    })
    setLogs(nextLogs)
    if (willBeDone && remainingWork(nextLogs)) {
      setRestNonce((value) => value + 1)
    }
  }

  function markExerciseDone(exerciseIndex: number) {
    setLogs((prev) =>
      prev.map((log, i) =>
        i === exerciseIndex
          ? { ...log, done: true, sets: log.sets.map((set) => ({ ...set, done: true })) }
          : log,
      ),
    )
    const nextOpen = logs.findIndex(
      (log, index) => index !== exerciseIndex && !log.done,
    )
    if (nextOpen >= 0) setCurrentIndex(nextOpen)
    if (remainingWork(logs.filter((_, index) => index !== exerciseIndex))) {
      setRestNonce((value) => value + 1)
    }
  }

  function handleSave() {
    const session: WorkoutSession = {
      id: createSessionId(),
      programId: program.id,
      dayId: day.id,
      date: new Date().toISOString(),
      exercises: logs,
      notes: notes.trim() || undefined,
    }
    onSave(session)
  }

  function handleSaveProgram() {
    onSaveProgram(logs.map((log) => log.exerciseId))
  }

  function renderModeBody() {
    switch (mode) {
      case 'edit':
        return (
          <div className="workout-stack">
            {logs.map((log, exerciseIndex) => {
              const exercise = exerciseById[log.exerciseId]
              if (!exercise) return null

              return (
                <article key={log.exerciseId} className="panel exercise-log">
                  <div className="exercise-log-head">
                    <span className="order-badge">{exerciseIndex + 1}</span>
                    <button
                      type="button"
                      className="exercise-image-btn"
                      onClick={() => setPreview(exercise)}
                      aria-label={`View larger photo of ${exercise.name}`}
                    >
                      <img src={exercise.image} alt="" />
                    </button>
                    <div>
                      <h3>{exercise.name}</h3>
                      <span>{bodyPartLabel[exercise.bodyPart]}</span>
                    </div>
                    <div className="reorder">
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => setReplacingIndex(exerciseIndex)}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => moveExercise(exerciseIndex, -1)}
                        disabled={exerciseIndex === 0}
                        aria-label="Move earlier"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => moveExercise(exerciseIndex, 1)}
                        disabled={exerciseIndex === logs.length - 1}
                        aria-label="Move later"
                      >
                        ↓
                      </button>
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
        )
      case 'perform':
        if (!currentLog || !currentExercise) {
          return <p className="empty">No exercises in this session.</p>
        }

        return (
          <article
            className={`panel perform-hero ${currentLog.done ? 'is-done' : ''}`}
          >
              <div className="perform-frames">
                {(currentExercise.images.length > 0
                  ? currentExercise.images
                  : [currentExercise.image]
                ).map((src, index, frames) => (
                  <button
                    key={src}
                    type="button"
                    className="exercise-image-btn"
                    onClick={() => setPreview(currentExercise)}
                    aria-label={
                      frames.length === 2
                        ? index === 0
                          ? `View larger start position of ${currentExercise.name}`
                          : `View larger finish position of ${currentExercise.name}`
                        : `View larger photo of ${currentExercise.name}`
                    }
                  >
                    <img src={src} alt="" />
                    {frames.length > 1 ? (
                      <span className="photo-count">
                        {frames.length === 2
                          ? index === 0
                            ? 'Start'
                            : 'Finish'
                          : `Step ${index + 1}`}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="perform-copy">
                <p className="body-part">
                  Exercise {currentIndex + 1} of {logs.length}
                </p>
                <h3>{currentExercise.name}</h3>
                <p>{bodyPartLabel[currentExercise.bodyPart]}</p>
              </div>

              <div className="sets">
                {currentLog.sets.map((set, setIndex) => (
                  <div key={set.id} className="set-row with-done">
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
                          currentIndex,
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
                          currentIndex,
                          setIndex,
                          'weight',
                          Number(event.target.value) || 0,
                        )
                      }
                    />
                    <button
                      type="button"
                      className={`btn done-btn ${set.done ? 'active' : ''}`}
                      onClick={() => toggleSetDone(currentIndex, setIndex)}
                    >
                      {set.done ? 'Done' : 'Mark done'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="perform-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    setCurrentIndex((value) => Math.max(0, value - 1))
                  }
                  disabled={currentIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => markExerciseDone(currentIndex)}
                  disabled={Boolean(currentLog.done)}
                >
                  {currentLog.done ? 'Exercise done' : 'Mark exercise done'}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    setCurrentIndex((value) =>
                      Math.min(logs.length - 1, value + 1),
                    )
                  }
                  disabled={currentIndex === logs.length - 1}
                >
                  Next
                </button>
              </div>
            </article>
          )
        default: {
        const _exhaustive: never = mode
        return _exhaustive
      }
    }
  }

  return (
    <section className={`workout-session is-${mode}`}>
      <div className="workout-header panel">
        <div className="section-head workout-head-copy">
          <p className="section-eyebrow">
            {mode === 'edit' ? 'Planning' : 'In progress'}
          </p>
          <h2>{day.name}</h2>
          <p>{program.name}</p>
        </div>
        <div className="mode-switch" role="tablist" aria-label="Workout mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'edit'}
            className={`nav-btn ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'perform'}
            className={`nav-btn ${mode === 'perform' ? 'active' : ''}`}
            onClick={() => setMode('perform')}
          >
            Workout
          </button>
        </div>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className={mode === 'perform' ? 'perform-toolbar' : 'timer-idle'}>
        <WorkoutTimer
          sessionRunning={mode === 'perform'}
          restNonce={restNonce}
        />
        {mode === 'perform' ? (
          <>
            <p className="progress-copy">
              {doneCount} / {logs.length} exercises done
            </p>
            <div className="progress-chips">
              {logs.map((log, index) => {
                const exercise = exerciseById[log.exerciseId]
                return (
                  <button
                    key={log.exerciseId}
                    type="button"
                    className={`chip ${index === currentIndex ? 'active' : ''} ${log.done ? 'done' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    {index + 1}. {exercise?.name ?? log.exerciseId}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}
      </div>

      {renderModeBody()}

      {mode === 'edit' ? (
        <div className="panel notes-panel">
          <label className="field" htmlFor="notes">
            <span>Notes (optional)</span>
            <input
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Felt strong, short on sleep, etc."
            />
          </label>
        </div>
      ) : null}

      <div className="workout-actions">
        {mode === 'edit' ? (
          <>
            <button type="button" className="btn" onClick={handleSaveProgram}>
              Save program
            </button>
            <button type="button" className="btn secondary" onClick={() => setMode('perform')}>
              Start workout
            </button>
          </>
        ) : null}
        <button type="button" className="btn" onClick={handleSave}>
          Save workout
        </button>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Discard
        </button>
      </div>

      {preview ? (
        <ExerciseGuide exercise={preview} onClose={() => setPreview(null)} />
      ) : null}

      {replacingIndex !== null && exerciseById[logs[replacingIndex]?.exerciseId ?? ''] ? (
        <ExerciseReplacePicker
          current={exerciseById[logs[replacingIndex].exerciseId]}
          usedExerciseIds={logs.map((log) => log.exerciseId)}
          onSelect={(exercise) =>
            replaceExercise(replacingIndex, exercise.id)
          }
          onClose={() => setReplacingIndex(null)}
        />
      ) : null}
    </section>
  )
}
