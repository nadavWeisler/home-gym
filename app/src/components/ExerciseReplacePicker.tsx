import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  bodyPartLabel,
  exercises,
  formatEquipment,
} from '../data/exercises'
import type { Exercise } from '../types'

type Props = {
  current: Exercise
  usedExerciseIds: string[]
  onSelect: (exercise: Exercise) => void
  onClose: () => void
}

export function ExerciseReplacePicker({
  current,
  usedExerciseIds,
  onSelect,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const [query, setQuery] = useState('')
  const [equipment, setEquipment] = useState('all')
  onCloseRef.current = onClose

  const equipmentOptions = useMemo(() => {
    const values = new Set(
      exercises
        .filter((exercise) => exercise.bodyPart === current.bodyPart)
        .filter((exercise) => exercise.id !== current.id)
        .map((exercise) => exercise.equipment),
    )
    return [...values].sort((a, b) => a.localeCompare(b))
  }, [current.bodyPart, current.id])

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return exercises
      .filter((exercise) => exercise.bodyPart === current.bodyPart)
      .filter((exercise) => exercise.id !== current.id)
      .filter((exercise) =>
        equipment === 'all' ? true : exercise.equipment === equipment,
      )
      .filter((exercise) => {
        if (!needle) return true
        return (
          exercise.name.toLowerCase().includes(needle) ||
          formatEquipment(exercise.equipment).toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [current.bodyPart, current.id, equipment, query])

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return createPortal(
    <div className="lightbox" onClick={onClose} role="presentation">
      <div
        className="lightbox-dialog replace-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close replace picker"
        >
          ×
        </button>

        <div className="replace-head">
          <h3 id="replace-title">Replace exercise</h3>
          <p>
            Replacing <strong>{current.name}</strong> · only{' '}
            {bodyPartLabel[current.bodyPart]} exercises are shown.
          </p>
        </div>

        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${bodyPartLabel[current.bodyPart].toLowerCase()} exercises`}
          aria-label="Search replacement exercises"
        />

        <div className="filters replace-filters">
          <button
            type="button"
            className={`chip ${equipment === 'all' ? 'active' : ''}`}
            onClick={() => setEquipment('all')}
          >
            Any equipment
          </button>
          {equipmentOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip ${equipment === option ? 'active' : ''}`}
              onClick={() => setEquipment(option)}
            >
              {formatEquipment(option)}
            </button>
          ))}
        </div>

        <p className="result-count">
          {options.length} option{options.length === 1 ? '' : 's'}
        </p>

        {options.length === 0 ? (
          <p className="empty">No exercises match those filters.</p>
        ) : (
          <ul className="replace-list">
            {options.map((exercise) => {
              const alreadyUsed = usedExerciseIds.includes(exercise.id)
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    className="replace-option"
                    onClick={() => onSelect(exercise)}
                  >
                    <img src={exercise.image} alt="" />
                    <span className="replace-option-copy">
                      <strong>{exercise.name}</strong>
                      <span>
                        {formatEquipment(exercise.equipment)}
                        {alreadyUsed ? ' · already in session' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  )
}
