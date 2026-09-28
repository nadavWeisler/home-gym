import { useState } from 'react'
import type { Exercise } from '../types'

type Variant = 'perform' | 'detail'

function framesOf(exercise: Exercise): string[] {
  const frames = exercise.images.filter((src) => src.length > 0)
  if (frames.length > 0) return frames
  return exercise.image ? [exercise.image] : []
}

function positionLabel(index: number, total: number): string {
  if (total === 2) return index === 0 ? 'Start' : 'Finish'
  return `Step ${index + 1}`
}

function switchLabel(exercise: Exercise, index: number, total: number): string {
  const current = positionLabel(index, total)
  const next = positionLabel((index + 1) % total, total).toLowerCase()
  return `${current} position of ${exercise.name}. Tap to show ${next}.`
}

export function PosePhoto({
  exercise,
  variant,
}: {
  exercise: Exercise
  variant: Variant
}) {
  const frames = framesOf(exercise)
  const [index, setIndex] = useState(0)
  const total = frames.length
  const safeIndex = total === 0 ? 0 : index % total
  const canToggle = total > 1
  const label = total > 0 ? positionLabel(safeIndex, total) : 'Start'

  function showNext() {
    if (!canToggle) return
    setIndex((value) => (value + 1) % total)
  }

  switch (variant) {
    case 'perform':
      if (total === 0) {
        return (
          <div className="perform-frames">
            <div className="exercise-photo-fallback perform-photo-fallback">
              No photo
            </div>
          </div>
        )
      }
      if (!canToggle) {
        return (
          <div className="perform-frames">
            <div className="exercise-image-static">
              <img src={frames[0]} alt="" />
            </div>
          </div>
        )
      }
      return (
        <div className="perform-frames">
          <button
            type="button"
            className="exercise-image-btn pose-toggle"
            onClick={showNext}
            aria-label={switchLabel(exercise, safeIndex, total)}
          >
            <img src={frames[safeIndex]} alt="" />
            <span className="photo-count">{label}</span>
            <span className="photo-hint">Tap to switch</span>
          </button>
        </div>
      )
    case 'detail':
      return (
        <figure className="pick-frame">
          {total === 0 ? (
            <div className="exercise-photo-fallback" aria-hidden="true">
              No photo
            </div>
          ) : canToggle ? (
            <button
              type="button"
              className="pick-photo"
              onClick={showNext}
              aria-label={switchLabel(exercise, safeIndex, total)}
            >
              <img src={frames[safeIndex]} alt="" />
            </button>
          ) : (
            <img src={frames[0]} alt="" />
          )}
          <figcaption>
            {label}
            {canToggle ? ' · tap to switch' : ''}
          </figcaption>
        </figure>
      )
    default: {
      const _exhaustive: never = variant
      return _exhaustive
    }
  }
}
