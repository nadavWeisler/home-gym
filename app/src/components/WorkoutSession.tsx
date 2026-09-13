import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bodyPartLabel, exerciseById } from '../data/exercises'
import { defaultProgramSets } from '../programStorage'
import {
  createSetId,
  lastSetsForExercise,
  logsFromProgramExercises,
} from '../storage'
import type {
  Exercise,
  ExerciseLog,
  Program,
  ProgramDay,
  ProgramExercise,
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
  session: WorkoutSession
  previousSessions: WorkoutSession[]
  onCancel: () => void
  onSave: (session: WorkoutSession) => void
  onDraft: (session: WorkoutSession) => void
  onModeChange: (mode: WorkoutMode) => void
  onSaveProgram: (exercises: ProgramExercise[]) => void
}

type EditSet = {
  key: string
  reps: number
  weight: number
}

type EditExercise = {
  exerciseId: string
  sets: EditSet[]
}

function remainingWork(logs: ExerciseLog[]): boolean {
  return logs.some((log) => !log.done || log.sets.some((set) => !set.done))
}

function lastLabel(ghost: SetLog | undefined): string {
  if (!ghost) return '—'
  return `${ghost.weight}×${ghost.reps}`
}

function SetGhost({ ghost }: { ghost: SetLog | undefined }) {
  return (
    <span
      className="set-ghost"
      title={ghost ? 'Last time' : undefined}
      aria-label={ghost ? `Last time ${lastLabel(ghost)}` : 'No previous set'}
    >
      {lastLabel(ghost)}
    </span>
  )
}

function SetsHead() {
  return (
    <div className="sets-head">
      <span>#</span>
      <span>Last</span>
      <span>Reps</span>
      <span>Weight</span>
      <span />
    </div>
  )
}

function toEditExercises(exercises: ProgramExercise[]): EditExercise[] {
  return exercises.map((item) => ({
    exerciseId: item.exerciseId,
    sets: (item.sets.length > 0 ? item.sets : defaultProgramSets()).map(
      (set) => ({
        key: createSetId(),
        reps: set.reps,
        weight: set.weight,
      }),
    ),
  }))
}

function toProgramExercises(items: EditExercise[]): ProgramExercise[] {
  return items.map((item) => ({
    exerciseId: item.exerciseId,
    sets: item.sets.map((set) => ({ reps: set.reps, weight: set.weight })),
  }))
}

function sessionHasLoggedWork(logs: ExerciseLog[]): boolean {
  return logs.some((log) => log.done || log.sets.some((set) => set.done))
}

export function WorkoutSessionView({
  program,
  day,
  initialMode,
  session,
  previousSessions,
  onCancel,
  onSave,
  onDraft,
  onModeChange,
  onSaveProgram,
}: Props) {
  const [mode, setMode] = useState<WorkoutMode>(initialMode)
  const [targets, setTargets] = useState<EditExercise[]>(() =>
    toEditExercises(day.exercises),
  )
  const [logs, setLogs] = useState<ExerciseLog[]>(() => session.exercises)
  const [notes, setNotes] = useState(session.notes ?? '')
  const [preview, setPreview] = useState<Exercise | null>(null)
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)
  const [currentIndex, setCurrentIndex] = useState(() => {
    const open = session.exercises.findIndex((log) => !log.done)
    return open >= 0 ? open : 0
  })
  const [restNonce, setRestNonce] = useState(0)
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false)
  const onDraftRef = useRef(onDraft)
  onDraftRef.current = onDraft

  const lastByExercise = useMemo(() => {
    const map: Record<string, SetLog[]> = {}
    const ids = [
      ...logs.map((log) => log.exerciseId),
      ...targets.map((item) => item.exerciseId),
    ]
    for (const exerciseId of ids) {
      const last = lastSetsForExercise(
        previousSessions,
        exerciseId,
        session.id,
      )
      if (last) map[exerciseId] = last
    }
    return map
  }, [logs, targets, previousSessions, session.id])

  useEffect(() => {
    onDraftRef.current({
      id: session.id,
      programId: program.id,
      dayId: day.id,
      date: session.date,
      exercises: logs,
      notes: notes.trim() || undefined,
    })
  }, [logs, notes, session.id, session.date, program.id, day.id])

  const doneCount = logs.filter((log) => log.done).length
  const currentLog = logs[currentIndex]
  const currentExercise = currentLog
    ? exerciseById[currentLog.exerciseId]
    : undefined
  const replacingTarget = replacingIndex !== null ? targets[replacingIndex] : undefined

  function changeMode(next: WorkoutMode) {
    if (next === 'perform' && !sessionHasLoggedWork(logs)) {
      const nextLogs = logsFromProgramExercises(toProgramExercises(targets))
      setLogs(nextLogs)
      setCurrentIndex(0)
    }
    setMode(next)
    onModeChange(next)
  }

  function updateLogSet(
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

  function updateTargetSet(
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number,
  ) {
    setTargets((prev) =>
      prev.map((item, i) => {
        if (i !== exerciseIndex) return item
        return {
          ...item,
          sets: item.sets.map((set, j) =>
            j === setIndex ? { ...set, [field]: value } : set,
          ),
        }
      }),
    )
  }

  function addTargetSet(exerciseIndex: number) {
    setTargets((prev) =>
      prev.map((item, i) => {
        if (i !== exerciseIndex) return item
        const last = item.sets[item.sets.length - 1]
        return {
          ...item,
          sets: [
            ...item.sets,
            {
              key: createSetId(),
              reps: last?.reps ?? 8,
              weight: last?.weight ?? 0,
            },
          ],
        }
      }),
    )
  }

  function removeTargetSet(exerciseIndex: number, setIndex: number) {
    setTargets((prev) =>
      prev.map((item, i) => {
        if (i !== exerciseIndex) return item
        if (item.sets.length <= 1) return item
        return {
          ...item,
          sets: item.sets.filter((_, j) => j !== setIndex),
        }
      }),
    )
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= targets.length) return
    setTargets((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  function replaceExercise(exerciseIndex: number, newExerciseId: string) {
    setTargets((prev) =>
      prev.map((item, i) =>
        i === exerciseIndex
          ? {
              exerciseId: newExerciseId,
              sets: defaultProgramSets().map((set) => ({
                key: createSetId(),
                ...set,
              })),
            }
          : item,
      ),
    )
    setReplacingIndex(null)
  }

  function removeExercise(index: number) {
    setTargets((prev) => prev.filter((_, i) => i !== index))
    setReplacingIndex((current) => {
      if (current === null) return null
      if (current === index) return null
      return current > index ? current - 1 : current
    })
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
    const nextSession: WorkoutSession = {
      id: session.id,
      programId: program.id,
      dayId: day.id,
      date: session.date,
      exercises: logs,
      notes: notes.trim() || undefined,
    }
    onSave(nextSession)
  }

  function handleSaveProgram() {
    onSaveProgram(toProgramExercises(targets))
  }

  function renderModeBody() {
    switch (mode) {
      case 'edit':
        return (
          <div className="workout-stack">
            {targets.length === 0 ? (
              <p className="empty">No exercises in this day.</p>
            ) : null}
            {targets.map((item, exerciseIndex) => {
              const exercise = exerciseById[item.exerciseId]
              if (!exercise) return null

              return (
                <article key={item.exerciseId} className="panel exercise-log">
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
                        className="btn danger"
                        onClick={() => removeExercise(exerciseIndex)}
                      >
                        Delete
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
                        disabled={exerciseIndex === targets.length - 1}
                        aria-label="Move later"
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  <div className="sets">
                    <SetsHead />
                    {item.sets.map((set, setIndex) => (
                      <div key={set.key} className="set-row">
                        <label>{setIndex + 1}</label>
                        <SetGhost
                          ghost={lastByExercise[item.exerciseId]?.[setIndex]}
                        />
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="Reps"
                          aria-label={`Target reps for set ${setIndex + 1}`}
                          value={set.reps}
                          onChange={(event) =>
                            updateTargetSet(
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
                          aria-label={`Target weight for set ${setIndex + 1}`}
                          value={set.weight}
                          onChange={(event) =>
                            updateTargetSet(
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
                          onClick={() =>
                            removeTargetSet(exerciseIndex, setIndex)
                          }
                          aria-label={`Remove target set ${setIndex + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => addTargetSet(exerciseIndex)}
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

              <p className="perform-copy body-part">
                {bodyPartLabel[currentExercise.bodyPart]}
              </p>

              <div className="sets">
                <SetsHead />
                {currentLog.sets.map((set, setIndex) => (
                  <div key={set.id} className="set-row with-done">
                    <label>{setIndex + 1}</label>
                    <SetGhost
                      ghost={lastByExercise[currentLog.exerciseId]?.[setIndex]}
                    />
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="Reps"
                      aria-label={`Reps for set ${setIndex + 1}`}
                      value={set.reps}
                      onChange={(event) =>
                        updateLogSet(
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
                        updateLogSet(
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
                      Done
                    </button>
                  </div>
                ))}
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
            onClick={() => changeMode('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'perform'}
            className={`nav-btn ${mode === 'perform' ? 'active' : ''}`}
            onClick={() => changeMode('perform')}
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
          sessionId={session.id}
          sessionRunning={mode === 'perform'}
          restNonce={restNonce}
        />
        {mode === 'perform' && currentExercise ? (
          <div className="current-exercise">
            <button
              type="button"
              className="current-exercise-toggle"
              aria-expanded={exerciseSheetOpen}
              aria-controls="exercise-sheet"
              onClick={() => setExerciseSheetOpen((open) => !open)}
            >
              <span className="current-exercise-name">
                {currentExercise.name}
              </span>
              <span className="progress-copy">
                {currentIndex + 1}/{logs.length}
                {doneCount > 0 ? ` · ${doneCount} done` : ''}
              </span>
            </button>
            {exerciseSheetOpen ? (
              <div
                id="exercise-sheet"
                className="exercise-sheet"
                role="listbox"
                aria-label="Exercises"
              >
                {logs.map((log, index) => {
                  const exercise = exerciseById[log.exerciseId]
                  return (
                    <button
                      key={log.exerciseId}
                      type="button"
                      role="option"
                      aria-selected={index === currentIndex}
                      className={`exercise-sheet-item ${index === currentIndex ? 'active' : ''} ${log.done ? 'done' : ''}`}
                      onClick={() => {
                        setCurrentIndex(index)
                        setExerciseSheetOpen(false)
                      }}
                    >
                      <span className="order-badge">{index + 1}</span>
                      {exercise?.name ?? log.exerciseId}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
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
            <button type="button" className="btn secondary" onClick={() => changeMode('perform')}>
              Start workout
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={handleSave}>
            Save workout
          </button>
        )}
        <button type="button" className="btn secondary" onClick={onCancel}>
          Discard
        </button>
      </div>

      {mode === 'perform' && currentLog
        ? createPortal(
            <div className="perform-sticky-bar">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setExerciseSheetOpen(false)
                  setCurrentIndex((value) => Math.max(0, value - 1))
                }}
                disabled={currentIndex === 0}
                aria-label="Previous exercise"
              >
                Prev
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => markExerciseDone(currentIndex)}
                disabled={Boolean(currentLog.done)}
              >
                {currentLog.done ? 'Done' : 'Mark done'}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setExerciseSheetOpen(false)
                  setCurrentIndex((value) =>
                    Math.min(logs.length - 1, value + 1),
                  )
                }}
                disabled={currentIndex === logs.length - 1}
                aria-label="Next exercise"
              >
                Next
              </button>
            </div>,
            document.body,
          )
        : null}

      {preview ? (
        <ExerciseGuide exercise={preview} onClose={() => setPreview(null)} />
      ) : null}

      {replacingTarget && exerciseById[replacingTarget.exerciseId] ? (
        <ExerciseReplacePicker
          current={exerciseById[replacingTarget.exerciseId]}
          usedExerciseIds={targets.map((item) => item.exerciseId)}
          onSelect={(exercise) =>
            replaceExercise(replacingIndex ?? 0, exercise.id)
          }
          onClose={() => setReplacingIndex(null)}
        />
      ) : null}
    </section>
  )
}
