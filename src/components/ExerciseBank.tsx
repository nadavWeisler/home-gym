import { useMemo, useState } from 'react'
import {
  EXERCISE_DATA_SOURCE,
  bodyPartLabel,
  exercises,
} from '../data/exercises'
import type { BodyPart } from '../types'

export function ExerciseBank() {
  const [filter, setFilter] = useState<BodyPart | 'all'>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return exercises
    return exercises.filter((exercise) => exercise.bodyPart === filter)
  }, [filter])

  const parts = Object.keys(bodyPartLabel) as BodyPart[]

  return (
    <section>
      <div className="section-head">
        <h2>Exercise bank</h2>
        <p>
          Free-weight movements with demo photos from{' '}
          <a
            href={EXERCISE_DATA_SOURCE.url}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            {EXERCISE_DATA_SOURCE.name}
          </a>{' '}
          ({EXERCISE_DATA_SOURCE.license}).
        </p>
      </div>

      <div className="filters">
        <button
          type="button"
          className={`chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {parts.map((part) => (
          <button
            key={part}
            type="button"
            className={`chip ${filter === part ? 'active' : ''}`}
            onClick={() => setFilter(part)}
          >
            {bodyPartLabel[part]}
          </button>
        ))}
      </div>

      <div className="grid exercise-grid">
        {filtered.map((exercise, index) => (
          <article
            key={exercise.id}
            className="panel exercise-card"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <img src={exercise.image} alt="" />
            <div className="meta">
              <span className="body-part">{bodyPartLabel[exercise.bodyPart]}</span>
              <h3>{exercise.name}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
