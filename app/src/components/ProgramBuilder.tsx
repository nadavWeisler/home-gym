import { useMemo, useState } from 'react'
import {
  bodyPartLabel,
  equipmentOptions,
  exerciseById,
  exercises,
  formatEquipment,
} from '../data/exercises'
import {
  emptyProgramSelections,
  pickRangeLabel,
  remainingLabel,
  workoutTypeById,
  workoutTypes,
  type MuscleSelections,
  type WorkoutType,
  type WorkoutTypeId,
} from '../data/workoutTypes'
import { createProgramId } from '../programStorage'
import type { Exercise, Program } from '../types'
import { ExercisePickDialog } from './ExercisePickDialog'

type WizardStep = 'welcome' | 'type' | 'equipment' | 'exercises' | 'finish'

type Props = {
  isFirstProgram: boolean
  onComplete: (program: Program) => void
  onCancel?: () => void
}

export function ProgramBuilder({ isFirstProgram, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<WizardStep>(isFirstProgram ? 'welcome' : 'type')
  const [workoutTypeId, setWorkoutTypeId] = useState<WorkoutTypeId | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(
    () => new Set(),
  )
  const [dayIndex, setDayIndex] = useState(0)
  const [muscleIndex, setMuscleIndex] = useState(0)
  const [selections, setSelections] = useState<Record<string, MuscleSelections>>(
    {},
  )
  const [programName, setProgramName] = useState('My Workout')
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<Exercise | null>(null)

  const workoutType = workoutTypeId ? workoutTypeById[workoutTypeId] : undefined
  const currentDay = workoutType?.days[dayIndex]
  const currentTarget = currentDay?.muscles[muscleIndex]
  const currentMuscle = currentTarget?.part
  const currentPicks =
    currentDay && currentMuscle
      ? (selections[currentDay.id]?.[currentMuscle] ?? [])
      : []

  const exercisesForMuscle = useMemo(() => {
    if (!currentMuscle) return []
    const needle = query.trim().toLowerCase()
    return exercises
      .filter((exercise) => exercise.bodyPart === currentMuscle)
      .filter((exercise) => selectedEquipment.has(exercise.equipment))
      .filter((exercise) => {
        if (!needle) return true
        return exercise.name.toLowerCase().includes(needle)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [currentMuscle, query, selectedEquipment])

  const selectedCount = useMemo(() => {
    return Object.values(selections).reduce((total, dayPicks) => {
      return (
        total +
        Object.values(dayPicks).reduce((sum, ids) => sum + ids.length, 0)
      )
    }, 0)
  }, [selections])

  const equipmentSummary = useMemo(
    () =>
      [...selectedEquipment]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => formatEquipment(value))
        .join(', '),
    [selectedEquipment],
  )

  function chooseType(id: WorkoutTypeId) {
    const nextType = workoutTypeById[id]
    setWorkoutTypeId(id)
    setSelections(emptyProgramSelections(nextType))
    setDayIndex(0)
    setMuscleIndex(0)
    setProgramName(nextType.name)
  }

  function toggleEquipment(value: string) {
    setSelectedEquipment((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function addExercise(exerciseId: string) {
    if (!currentDay || !currentMuscle || !currentTarget) return
    if (currentPicks.includes(exerciseId)) return
    if (currentPicks.length >= currentTarget.max) return
    setSelections((prev) => ({
      ...prev,
      [currentDay.id]: {
        ...prev[currentDay.id],
        [currentMuscle]: [...currentPicks, exerciseId],
      },
    }))
    setPreview(null)
  }

  function removeExercise(exerciseId: string) {
    if (!currentDay || !currentMuscle) return
    setSelections((prev) => ({
      ...prev,
      [currentDay.id]: {
        ...prev[currentDay.id],
        [currentMuscle]: currentPicks.filter((id) => id !== exerciseId),
      },
    }))
    setPreview(null)
  }

  function goToExercises() {
    setDayIndex(0)
    setMuscleIndex(0)
    setQuery('')
    setStep('exercises')
  }

  function goNextMuscle() {
    if (!workoutType || !currentDay) return
    if (muscleIndex < currentDay.muscles.length - 1) {
      setMuscleIndex((index) => index + 1)
      setQuery('')
      return
    }
    if (dayIndex < workoutType.days.length - 1) {
      setDayIndex((index) => index + 1)
      setMuscleIndex(0)
      setQuery('')
      return
    }
    setStep('finish')
  }

  function goPrevMuscle() {
    if (!workoutType) {
      setStep('equipment')
      return
    }
    if (muscleIndex > 0) {
      setMuscleIndex((index) => index - 1)
      setQuery('')
      return
    }
    if (dayIndex > 0) {
      const previous = workoutType.days[dayIndex - 1]
      setDayIndex((index) => index - 1)
      setMuscleIndex(previous.muscles.length - 1)
      setQuery('')
      return
    }
    setStep('equipment')
  }

  function nextExerciseLabel(): string {
    if (!workoutType || !currentDay) return 'Continue'
    if (muscleIndex < currentDay.muscles.length - 1) {
      const nextPart = currentDay.muscles[muscleIndex + 1].part
      return `Next: ${bodyPartLabel[nextPart]}`
    }
    if (dayIndex < workoutType.days.length - 1) {
      return `Next: ${workoutType.days[dayIndex + 1].name}`
    }
    return 'Review program'
  }

  function buildProgram(type: WorkoutType): Program {
    return {
      id: createProgramId(),
      name: programName.trim() || type.name,
      description: `${type.name} · ${equipmentSummary}`,
      days: type.days.map((day) => ({
        id: day.id,
        name: day.name,
        exerciseIds: day.muscles.flatMap(
          (target) => selections[day.id]?.[target.part] ?? [],
        ),
      })),
    }
  }

  function handleCreate() {
    if (!workoutType) return
    onComplete(buildProgram(workoutType))
  }

  function renderStep() {
    switch (step) {
      case 'welcome':
        return (
          <div className="builder-panel welcome-panel hero-card">
            <span className="hero-icon" aria-hidden="true">
              ◆
            </span>
            <p className="builder-eyebrow">Welcome</p>
            <h2>Let&apos;s start working out</h2>
            <p>
              Choose a split, pick the gear you have at home, then add exercises
              within a clear limit for each muscle group.
            </p>
            <button
              type="button"
              className="btn btn-lg"
              onClick={() => setStep('type')}
            >
              Build my program
            </button>
          </div>
        )
      case 'type':
        return (
          <div className="builder-panel panel has-sticky-actions">
            <div className="section-head">
              <p className="section-eyebrow">Step 1</p>
              <h2>Workout type</h2>
              <p>
                Pick the split first. Equipment and exercise limits will follow
                that structure.
              </p>
            </div>
            <div className="workout-type-grid">
              {workoutTypes.map((type) => {
                const active = workoutTypeId === type.id
                return (
                  <button
                    key={type.id}
                    type="button"
                    className={`workout-type-card ${active ? 'active' : ''}`}
                    onClick={() => chooseType(type.id)}
                    aria-pressed={active}
                  >
                    <strong>{type.name}</strong>
                    <span>{type.description}</span>
                    <small>
                      {type.days.length === 1
                        ? '1 workout day'
                        : `${type.days.length} workout days`}
                      {' · '}
                      {type.days.map((day) => day.name).join(', ')}
                    </small>
                  </button>
                )
              })}
            </div>
            <div className="builder-sticky-bar">
              {isFirstProgram ? (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setStep('welcome')}
                >
                  Back
                </button>
              ) : onCancel ? (
                <button type="button" className="btn ghost" onClick={onCancel}>
                  Cancel
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="btn"
                disabled={!workoutTypeId}
                onClick={() => setStep('equipment')}
              >
                Next: equipment
              </button>
            </div>
          </div>
        )
      case 'equipment':
        return (
          <div className="builder-panel panel has-sticky-actions">
            <div className="section-head">
              <p className="section-eyebrow">Step 2</p>
              <h2>Your equipment</h2>
              <p>
                Select everything you have available. Exercises will be filtered
                to match.
              </p>
            </div>
            <div className="equipment-grid">
              {equipmentOptions.map((value) => {
                const active = selectedEquipment.has(value)
                return (
                  <button
                    key={value}
                    type="button"
                    className={`equipment-card ${active ? 'active' : ''}`}
                    onClick={() => toggleEquipment(value)}
                    aria-pressed={active}
                  >
                    <strong>{formatEquipment(value)}</strong>
                    <span>
                      {
                        exercises.filter(
                          (exercise) => exercise.equipment === value,
                        ).length
                      }{' '}
                      exercises
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="builder-sticky-bar">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setStep('type')}
              >
                Back
              </button>
              <button
                type="button"
                className="btn"
                disabled={selectedEquipment.size === 0}
                onClick={goToExercises}
              >
                Next: pick exercises
              </button>
            </div>
          </div>
        )
      case 'exercises': {
        if (!workoutType || !currentDay || !currentTarget || !currentMuscle) {
          return (
            <div className="builder-panel panel">
              <p className="empty">Choose a workout type to continue.</p>
              <button
                type="button"
                className="btn"
                onClick={() => setStep('type')}
              >
                Back to workout type
              </button>
            </div>
          )
        }

        const partLabel = bodyPartLabel[currentMuscle]
        const muscleStep = muscleIndex + 1
        const muscleTotal = currentDay.muscles.length

        return (
          <div className="builder-panel panel has-sticky-actions">
            <div className="section-head">
              <p className="section-eyebrow">
                {workoutType.days.length > 1
                  ? `${currentDay.name} day · ${dayIndex + 1}/${workoutType.days.length}`
                  : workoutType.name}{' '}
                · {muscleStep}/{muscleTotal}
              </p>
              <h2>{partLabel}</h2>
              <p>
                {pickRangeLabel(currentTarget, partLabel)} using{' '}
                {equipmentSummary || 'your equipment'}. {currentDay.blurb}
              </p>
            </div>

            {workoutType.days.length > 1 ? (
              <div className="builder-day-chips" aria-label="Program days">
                {workoutType.days.map((day, index) => (
                  <span
                    key={day.id}
                    className={`chip ${index === dayIndex ? 'active' : ''} ${index < dayIndex ? 'is-past' : ''}`}
                  >
                    {day.name}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="builder-limit-copy">
              {remainingLabel(currentPicks.length, currentTarget.max)}
            </p>

            <div className="search-wrap">
              <input
                className="search-input"
                type="search"
                placeholder={`Search ${partLabel.toLowerCase()} exercises…`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            {exercisesForMuscle.length === 0 ? (
              <p className="empty builder-empty">
                No {partLabel.toLowerCase()} exercises for this equipment. Skip
                this group or go back and add more gear.
              </p>
            ) : (
              <div className="builder-exercise-grid">
                {exercisesForMuscle.map((exercise) => {
                  const selected = currentPicks.includes(exercise.id)
                  return (
                    <article
                      key={exercise.id}
                      className={`builder-exercise-card ${selected ? 'selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="builder-exercise-open"
                        onClick={() => setPreview(exercise)}
                      >
                        {exercise.image ? (
                          <img src={exercise.image} alt="" loading="lazy" />
                        ) : (
                          <div
                            className="exercise-photo-fallback"
                            aria-hidden="true"
                          >
                            No photo
                          </div>
                        )}
                        <span>{exercise.name}</span>
                        <small>{formatEquipment(exercise.equipment)}</small>
                        {selected ? (
                          <span className="builder-selected-badge">Added</span>
                        ) : null}
                      </button>
                      {selected ? (
                        <button
                          type="button"
                          className="builder-exercise-remove"
                          onClick={() => removeExercise(exercise.id)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            )}

            <div className="builder-sticky-bar">
              <button
                type="button"
                className="btn secondary"
                onClick={goPrevMuscle}
              >
                Back
              </button>
              <button type="button" className="btn" onClick={goNextMuscle}>
                {nextExerciseLabel()}
              </button>
            </div>
          </div>
        )
      }
      case 'finish':
        return (
          <div className="builder-panel panel has-sticky-actions">
            <div className="section-head">
              <p className="section-eyebrow">Save</p>
              <h2>Name your program</h2>
              <p>Review your workout and save it to your home gym.</p>
            </div>

            <label className="field">
              <span>Program name</span>
              <input
                type="text"
                value={programName}
                onChange={(event) => setProgramName(event.target.value)}
                placeholder="My Workout"
              />
            </label>

            <div className="builder-review">
              <p>
                <strong>Type:</strong> {workoutType?.name ?? '—'}
              </p>
              <p>
                <strong>Equipment:</strong> {equipmentSummary}
              </p>
              {selectedCount === 0 ? (
                <p className="empty">No exercises selected yet.</p>
              ) : (
                workoutType?.days.map((day) => {
                  const ids = day.muscles.flatMap(
                    (target) => selections[day.id]?.[target.part] ?? [],
                  )
                  if (ids.length === 0) return null
                  return (
                    <div key={day.id} className="builder-review-day">
                      <strong>{day.name}</strong>
                      <ol className="training-order">
                        {ids.map((exerciseId) => {
                          const exercise = exerciseById[exerciseId]
                          return (
                            <li key={`${day.id}-${exerciseId}`}>
                              {exercise?.name ?? exerciseId}
                              {exercise
                                ? ` · ${bodyPartLabel[exercise.bodyPart]}`
                                : ''}
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )
                })
              )}
            </div>

            <div className="builder-sticky-bar">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  if (!workoutType) {
                    setStep('type')
                    return
                  }
                  setDayIndex(workoutType.days.length - 1)
                  setMuscleIndex(
                    workoutType.days[workoutType.days.length - 1].muscles
                      .length - 1,
                  )
                  setStep('exercises')
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn"
                disabled={selectedCount === 0}
                onClick={handleCreate}
              >
                Save program
              </button>
            </div>
          </div>
        )
      default: {
        const _exhaustive: never = step
        return _exhaustive
      }
    }
  }

  const previewSelected = Boolean(
    preview && currentPicks.includes(preview.id),
  )
  const previewCanAdd = Boolean(
    preview &&
      currentTarget &&
      !previewSelected &&
      currentPicks.length < currentTarget.max,
  )

  return (
    <section className="program-builder">
      <BuilderSteps
        step={step}
        isFirstProgram={isFirstProgram}
        dayName={currentDay?.name}
        muscleLabel={currentMuscle ? bodyPartLabel[currentMuscle] : undefined}
      />

      {renderStep()}

      {preview ? (
        <ExercisePickDialog
          exercise={preview}
          selected={previewSelected}
          canAdd={previewCanAdd}
          onAdd={() => addExercise(preview.id)}
          onRemove={() => removeExercise(preview.id)}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </section>
  )
}

const stepLabels: Record<WizardStep, string> = {
  welcome: 'Start',
  type: 'Type',
  equipment: 'Gear',
  exercises: 'Moves',
  finish: 'Save',
}

function BuilderSteps({
  step,
  isFirstProgram,
  dayName,
  muscleLabel,
}: {
  step: WizardStep
  isFirstProgram: boolean
  dayName?: string
  muscleLabel?: string
}) {
  const steps = (
    ['welcome', 'type', 'equipment', 'exercises', 'finish'] as const
  ).filter((item) => !(item === 'welcome' && !isFirstProgram))
  const currentIndex = steps.indexOf(step)

  return (
    <div className="builder-steps" aria-hidden="true">
      {steps.map((item, index) => {
        const done = currentIndex > index
        const active = step === item
        let label = stepLabels[item]
        if (item === 'exercises' && active) {
          label = muscleLabel ?? dayName ?? label
        }

        return (
          <div
            key={item}
            className={`builder-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
          >
            <span className="builder-step-num">{done ? '✓' : index + 1}</span>
            <span className="builder-step-label">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
