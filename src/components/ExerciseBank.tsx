import { useMemo, useState } from 'react'
import {
  EXERCISE_DATA_SOURCE,
  bodyPartLabel,
  equipmentOptions,
  exercises,
  formatEquipment,
} from '../data/exercises'
import type { BodyPart, Exercise } from '../types'
import { ExerciseGuide } from './ExerciseGuide'

const PAGE_SIZE = 48

export function ExerciseBank() {
  const [filter, setFilter] = useState<BodyPart | 'all'>('all')
  const [equipment, setEquipment] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState<Exercise | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return exercises.filter((exercise) => {
      if (filter !== 'all' && exercise.bodyPart !== filter) return false
      if (equipment !== 'all' && exercise.equipment !== equipment) return false
      if (!needle) return true
      return (
        exercise.name.toLowerCase().includes(needle) ||
        formatEquipment(exercise.equipment).toLowerCase().includes(needle)
      )
    })
  }, [equipment, filter, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const parts = Object.keys(bodyPartLabel) as BodyPart[]

  function updateFilter(next: BodyPart | 'all') {
    setFilter(next)
    setPage(1)
  }

  function updateEquipment(next: string) {
    setEquipment(next)
    setPage(1)
  }

  return (
    <section>
      <div className="section-head">
        <p className="section-eyebrow">Reference</p>
        <h2>Exercise bank</h2>
        <p>
          {exercises.length} movements with start/finish photos from{' '}
          <a
            href={EXERCISE_DATA_SOURCE.url}
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            {EXERCISE_DATA_SOURCE.name}
          </a>
          . Tap a photo to view form cues and instructions.
        </p>
      </div>

      <div className="search-wrap">
        <input
          className="search-input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
          placeholder="Search by name or equipment…"
          aria-label="Search exercises"
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">Muscle group</span>
        <div className="filters">
          <button
            type="button"
            className={`chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => updateFilter('all')}
          >
            All
          </button>
          {parts.map((part) => (
            <button
              key={part}
              type="button"
              className={`chip ${filter === part ? 'active' : ''}`}
              onClick={() => updateFilter(part)}
            >
              {bodyPartLabel[part]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Equipment</span>
        <div className="filters">
          <button
            type="button"
            className={`chip ${equipment === 'all' ? 'active' : ''}`}
            onClick={() => updateEquipment('all')}
          >
            Any
          </button>
          {equipmentOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip ${equipment === option ? 'active' : ''}`}
              onClick={() => updateEquipment(option)}
            >
              {formatEquipment(option)}
            </button>
          ))}
        </div>
      </div>

      <p className="result-count">
        Showing {visible.length} of {filtered.length} exercise
        {filtered.length === 1 ? '' : 's'}
      </p>

      {visible.length === 0 ? (
        <div className="empty-state panel">
          <p>No exercises match those filters.</p>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setFilter('all')
              setEquipment('all')
              setQuery('')
              setPage(1)
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid exercise-grid">
          {visible.map((exercise) => (
            <article key={exercise.id} className="panel exercise-card">
              <button
                type="button"
                className="exercise-image-btn"
                onClick={() => setPreview(exercise)}
                aria-label={`View larger photo of ${exercise.name}`}
              >
                <img src={exercise.image} alt="" loading="lazy" />
                {exercise.images.length > 1 ? (
                  <span className="photo-count">{exercise.images.length} photos</span>
                ) : null}
              </button>
              <div className="meta">
                <span className="body-part">{bodyPartLabel[exercise.bodyPart]}</span>
                <h3>{exercise.name}</h3>
                <span className="equipment">{formatEquipment(exercise.equipment)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <div className="pager">
          <button
            type="button"
            className="btn secondary"
            disabled={safePage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </button>
          <span>
            Page {safePage} of {pageCount}
          </span>
          <button
            type="button"
            className="btn secondary"
            disabled={safePage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Next
          </button>
        </div>
      ) : null}

      {preview ? (
        <ExerciseGuide exercise={preview} onClose={() => setPreview(null)} />
      ) : null}
    </section>
  )
}
