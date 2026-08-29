import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bodyPartLabel, formatEquipment } from '../data/exercises'
import type { Exercise } from '../types'

type Props = {
  exercise: Exercise
  onClose: () => void
}

function frameLabel(index: number, total: number): string {
  if (total === 2) return index === 0 ? 'Start position' : 'Finish position'
  return `Step ${index + 1} of ${total}`
}

export function ExerciseGuide({ exercise, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const [frame, setFrame] = useState(0)
  onCloseRef.current = onClose

  const total = exercise.images.length
  const current = exercise.images[frame] ?? exercise.image

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key === 'ArrowRight' && total > 1) {
        setFrame((index) => (index + 1) % total)
        return
      }
      if (event.key === 'ArrowLeft' && total > 1) {
        setFrame((index) => (index - 1 + total) % total)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [total])

  function showNext() {
    if (total > 1) setFrame((index) => (index + 1) % total)
  }

  return createPortal(
    <div className="lightbox" onClick={onClose} role="presentation">
      <div
        className="lightbox-dialog guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close guide"
        >
          ×
        </button>

        {current ? (
          <button
            type="button"
            className="guide-stage"
            onClick={showNext}
            aria-label={
              total > 1
                ? `Show next photo, ${frameLabel(frame, total)}`
                : exercise.name
            }
          >
            <img src={current} alt="" />
            {total > 1 ? (
              <span className="guide-step">{frameLabel(frame, total)}</span>
            ) : null}
          </button>
        ) : null}

        {total > 1 ? (
          <div className="guide-thumbs" role="tablist" aria-label="Movement photos">
            {exercise.images.map((src, index) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={index === frame}
                className={`guide-thumb ${index === frame ? 'active' : ''}`}
                onClick={() => setFrame(index)}
              >
                <img src={src} alt="" />
                <span>{frameLabel(index, total)}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="lightbox-caption">
          <h3 id="lightbox-title">{exercise.name}</h3>
          <p>
            {bodyPartLabel[exercise.bodyPart]} · {formatEquipment(exercise.equipment)}
          </p>
        </div>

        {exercise.instructions.length > 0 ? (
          <div className="guide-how">
            <h4>How to</h4>
            <ol>
              {exercise.instructions.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
