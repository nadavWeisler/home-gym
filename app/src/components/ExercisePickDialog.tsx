import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { bodyPartLabel, formatEquipment } from '../data/exercises'
import type { Exercise } from '../types'

type Props = {
  exercise: Exercise
  selected: boolean
  canAdd: boolean
  onAdd: () => void
  onRemove: () => void
  onClose: () => void
}

function oneLineDescription(exercise: Exercise): string {
  const first = exercise.instructions[0]?.trim()
  if (first) {
    return first.length > 160 ? `${first.slice(0, 157).trimEnd()}…` : first
  }
  return `${bodyPartLabel[exercise.bodyPart]} movement using ${formatEquipment(exercise.equipment).toLowerCase()}.`
}

function PhotoFrame({
  src,
  label,
}: {
  src: string | undefined
  label: string
}) {
  return (
    <figure className="pick-frame">
      {src ? (
        <img src={src} alt="" />
      ) : (
        <div className="exercise-photo-fallback" aria-hidden="true">
          No photo
        </div>
      )}
      <figcaption>{label}</figcaption>
    </figure>
  )
}

export function ExercisePickDialog({
  exercise,
  selected,
  canAdd,
  onAdd,
  onRemove,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const start = exercise.images[0] ?? exercise.image
  const finish = exercise.images[1]

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
        className="lightbox-dialog pick-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pick-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close exercise details"
        >
          ×
        </button>

        <div className="lightbox-caption">
          <h3 id="pick-title">{exercise.name}</h3>
          <p>
            {bodyPartLabel[exercise.bodyPart]} ·{' '}
            {formatEquipment(exercise.equipment)}
          </p>
          <p className="pick-description">{oneLineDescription(exercise)}</p>
        </div>

        <div className="pick-frames">
          <PhotoFrame src={start || undefined} label="Start" />
          <PhotoFrame src={finish} label="Finish" />
        </div>

        <div className="pick-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          {selected ? (
            <button type="button" className="btn danger" onClick={onRemove}>
              Remove
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={onAdd}
              disabled={!canAdd}
            >
              {canAdd ? 'Add to workout' : 'Limit reached'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
