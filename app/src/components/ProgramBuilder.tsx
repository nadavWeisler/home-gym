import { useMemo, useState } from 'react'
import {
  bodyPartLabel,
  buildableBodyParts,
  equipmentOptions,
  exerciseById,
  exercises,
  formatEquipment,
} from '../data/exercises'
import { createProgramId } from '../programStorage'
import type { BodyPart, Program } from '../types'

type WizardStep = 'welcome' | 'equipment' | 'exercises' | 'finish'

type Props = {
  isFirstProgram: boolean
  onComplete: (program: Program) => void
  onCancel?: () => void
}

function emptySelections(): Record<Exclude<BodyPart, 'full'>, string[]> {
  return {
    chest: [],
    back: [],
    shoulders: [],
    arms: [],
    legs: [],
    core: [],
  }
}

export function ProgramBuilder({ isFirstProgram, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<WizardStep>(isFirstProgram ? 'welcome' : 'equipment')
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set())
  const [muscleIndex, setMuscleIndex] = useState(0)
  const [selections, setSelections] =
    useState<Record<Exclude<BodyPart, 'full'>, string[]>>(emptySelections)
  const [programName, setProgramName] = useState('My Workout')
  const [query, setQuery] = useState('')

  const currentMuscle = buildableBodyParts[muscleIndex]

  const exercisesForMuscle = useMemo(() => {
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

  const selectedCount = useMemo(
    () =>
      buildableBodyParts.reduce(
        (total, part) => total + selections[part].length,
        0,
      ),
    [selections],
  )

  const equipmentSummary = useMemo(
    () =>
      [...selectedEquipment]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => formatEquipment(value))
        .join(', '),
    [selectedEquipment],
  )

  function toggleEquipment(value: string) {
    setSelectedEquipment((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function toggleExercise(exerciseId: string) {
    setSelections((prev) => {
      const current = prev[currentMuscle]
      const nextIds = current.includes(exerciseId)
        ? current.filter((id) => id !== exerciseId)
        : [...current, exerciseId]
      return { ...prev, [currentMuscle]: nextIds }
    })
  }

  function goToExercises() {
    setMuscleIndex(0)
    setQuery('')
    setStep('exercises')
  }

  function goNextMuscle() {
    if (muscleIndex < buildableBodyParts.length - 1) {
      setMuscleIndex((index) => index + 1)
      setQuery('')
      return
    }
    setStep('finish')
  }

  function goPrevMuscle() {
    if (muscleIndex > 0) {
      setMuscleIndex((index) => index - 1)
      setQuery('')
      return
    }
    setStep('equipment')
  }

  function buildProgram(): Program {
    const exerciseIds = buildableBodyParts.flatMap((part) => selections[part])
    return {
      id: createProgramId(),
      name: programName.trim() || 'My Workout',
      description: `Home gym program · ${equipmentSummary}`,
      days: [
        {
          id: 'day-1',
          name: 'Workout',
          exerciseIds,
        },
      ],
    }
  }

  function handleCreate() {
    onComplete(buildProgram())
  }

  return (
    <section className="program-builder">
      <BuilderSteps
        step={step}
        isFirstProgram={isFirstProgram}
        muscleIndex={muscleIndex}
      />

      {step === 'welcome' ? (
        <div className="builder-panel welcome-panel hero-card">
          <span className="hero-icon" aria-hidden="true">
            ◆
          </span>
          <p className="builder-eyebrow">Welcome</p>
          <h2>Let&apos;s start working out</h2>
          <p>
            Build a program from the equipment you have at home. Pick your gear,
            then choose exercises for each muscle group.
          </p>
          <button
            type="button"
            className="btn btn-lg"
            onClick={() => setStep('equipment')}
          >
            Build my program
          </button>
        </div>
      ) : null}

      {step === 'equipment' ? (
        <div className="builder-panel panel">
          <div className="section-head">
            <p className="section-eyebrow">Step 1</p>
            <h2>Your equipment</h2>
            <p>Select everything you have available. Exercises will be filtered to match.</p>
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
                      exercises.filter((exercise) => exercise.equipment === value)
                        .length
                    }{' '}
                    exercises
                  </span>
                </button>
              )
            })}
          </div>
          <div className="builder-actions">
            {onCancel ? (
              <button type="button" className="btn ghost" onClick={onCancel}>
                Cancel
              </button>
            ) : (
              <span />
            )}
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
      ) : null}

      {step === 'exercises' ? (
        <div className="builder-panel panel">
          <div className="section-head">
            <p className="section-eyebrow">
              Step 2 · {muscleIndex + 1}/{buildableBodyParts.length}
            </p>
            <h2>{bodyPartLabel[currentMuscle]}</h2>
            <p>
              Choose exercises for {bodyPartLabel[currentMuscle].toLowerCase()} using{' '}
              {equipmentSummary || 'your equipment'}.
            </p>
          </div>

          <div className="search-wrap">
            <input
              className="search-input"
              type="search"
              placeholder={`Search ${bodyPartLabel[currentMuscle].toLowerCase()} exercises…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {exercisesForMuscle.length === 0 ? (
            <p className="empty builder-empty">
              No {bodyPartLabel[currentMuscle].toLowerCase()} exercises for this
              equipment. Skip this group or go back and add more gear.
            </p>
          ) : (
            <div className="builder-exercise-grid">
              {exercisesForMuscle.map((exercise) => {
                const selected = selections[currentMuscle].includes(exercise.id)
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    className={`builder-exercise-card ${selected ? 'selected' : ''}`}
                    onClick={() => toggleExercise(exercise.id)}
                    aria-pressed={selected}
                  >
                    {exercise.image ? (
                      <img src={exercise.image} alt="" loading="lazy" />
                    ) : null}
                    <span>{exercise.name}</span>
                    <small>{formatEquipment(exercise.equipment)}</small>
                  </button>
                )
              })}
            </div>
          )}

          <p className="builder-selection-count">
            {selections[currentMuscle].length} selected for{' '}
            {bodyPartLabel[currentMuscle].toLowerCase()} · {selectedCount} total
          </p>

          <div className="builder-actions">
            <button type="button" className="btn secondary" onClick={goPrevMuscle}>
              Back
            </button>
            <button type="button" className="btn" onClick={goNextMuscle}>
              {muscleIndex < buildableBodyParts.length - 1 ? 'Next muscle group' : 'Review program'}
            </button>
          </div>
        </div>
      ) : null}

      {step === 'finish' ? (
        <div className="builder-panel panel">
          <div className="section-head">
            <p className="section-eyebrow">Step 3</p>
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
              <strong>Equipment:</strong> {equipmentSummary}
            </p>
            {selectedCount === 0 ? (
              <p className="empty">No exercises selected yet.</p>
            ) : (
              <ol className="training-order">
                {buildableBodyParts.flatMap((part) =>
                  selections[part].map((exerciseId) => {
                    const exercise = exerciseById[exerciseId]
                    return (
                      <li key={exerciseId}>
                        {exercise?.name ?? exerciseId}
                        {exercise
                          ? ` · ${bodyPartLabel[exercise.bodyPart]}`
                          : ''}
                      </li>
                    )
                  }),
                )}
              </ol>
            )}
          </div>

          <div className="builder-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setMuscleIndex(buildableBodyParts.length - 1)
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
      ) : null}
    </section>
  )
}

const stepLabels: Record<WizardStep, string> = {
  welcome: 'Start',
  equipment: 'Gear',
  exercises: 'Moves',
  finish: 'Save',
}

function BuilderSteps({
  step,
  isFirstProgram,
  muscleIndex,
}: {
  step: WizardStep
  isFirstProgram: boolean
  muscleIndex: number
}) {
  const steps = (['welcome', 'equipment', 'exercises', 'finish'] as const).filter(
    (item) => !(item === 'welcome' && !isFirstProgram),
  )
  const currentIndex = steps.indexOf(step)

  return (
    <div className="builder-steps" aria-hidden="true">
      {steps.map((item, index) => {
        const done = currentIndex > index
        const active = step === item
        const label =
          item === 'exercises' && active
            ? bodyPartLabel[buildableBodyParts[muscleIndex]]
            : stepLabels[item]

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
