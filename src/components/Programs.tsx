import { programs } from '../data/programs'

type Props = {
  onStart: (programId: string, dayId: string) => void
}

export function Programs({ onStart }: Props) {
  return (
    <section>
      <div className="section-head">
        <h2>Programs</h2>
        <p>Pick a default plan and start logging sets, reps, and weight.</p>
      </div>

      <div className="grid program-grid">
        {programs.map((program) => (
          <article key={program.id} className="panel program-card">
            <div>
              <h3>{program.name}</h3>
              <p>{program.description}</p>
            </div>
            <div className="day-list">
              {program.days.map((day) => (
                <div key={day.id} className="day-row">
                  <div>
                    <strong>{day.name}</strong>
                    <span>{day.exerciseIds.length} exercises</span>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onStart(program.id, day.id)}
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
