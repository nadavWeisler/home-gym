import { bodyPartLabel, exerciseById } from '../data/exercises'
import type { Program, WorkoutMode } from '../types'

type Props = {
  programs: Program[]
  onStart: (programId: string, dayId: string, mode: WorkoutMode) => void
  onBuildProgram: () => void
}

export function Programs({ programs, onStart, onBuildProgram }: Props) {
  if (programs.length === 0) {
    return (
      <section className="empty-program hero-card">
        <span className="hero-icon" aria-hidden="true">
          ◆
        </span>
        <h2>Let&apos;s start working out</h2>
        <p>
          Build your first program from the equipment you have at home. Pick your
          gear, choose exercises, and save a plan that fits your space.
        </p>
        <button type="button" className="btn btn-lg" onClick={onBuildProgram}>
          Build my program
        </button>
      </section>
    )
  }

  return (
    <section>
      <div className="section-head programs-head">
        <div>
          <p className="section-eyebrow">Your training</p>
          <h2>Programs</h2>
          <p>
            Plan a session or jump straight in and mark each movement done as you
            go.
          </p>
        </div>
        <button type="button" className="btn secondary" onClick={onBuildProgram}>
          + New program
        </button>
      </div>

      <div className="grid program-grid">
        {programs.map((program, index) => (
          <article
            key={program.id}
            className="panel program-card"
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            <div className="program-card-top">
              <div>
                <h3>{program.name}</h3>
                <p>{program.description}</p>
              </div>
              <span className="stat-pill">
                {program.days.reduce(
                  (total, day) => total + day.exerciseIds.length,
                  0,
                )}{' '}
                moves
              </span>
            </div>

            <div className="day-list">
              {program.days.map((day) => (
                <div key={day.id} className="day-block">
                  <div className="day-block-head">
                    <div>
                      <strong>{day.name}</strong>
                      <span>{day.exerciseIds.length} exercises</span>
                    </div>
                  </div>

                  <div className="program-preview" aria-hidden="true">
                    {day.exerciseIds.slice(0, 6).map((exerciseId) => {
                      const exercise = exerciseById[exerciseId]
                      if (!exercise?.image) return null
                      return (
                        <img
                          key={exerciseId}
                          src={exercise.image}
                          alt=""
                          loading="lazy"
                        />
                      )
                    })}
                    {day.exerciseIds.length > 6 ? (
                      <span className="preview-more">
                        +{day.exerciseIds.length - 6}
                      </span>
                    ) : null}
                  </div>

                  <ol className="training-order">
                    {day.exerciseIds.map((exerciseId) => {
                      const exercise = exerciseById[exerciseId]
                      return (
                        <li key={exerciseId}>
                          {exercise?.name ?? exerciseId}
                          {exercise ? (
                            <span className="training-tag">
                              {bodyPartLabel[exercise.bodyPart]}
                            </span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ol>

                  <div className="day-actions">
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => onStart(program.id, day.id, 'edit')}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onStart(program.id, day.id, 'perform')}
                    >
                      Start workout
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
