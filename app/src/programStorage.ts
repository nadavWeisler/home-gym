import type { Program, ProgramDay, ProgramExercise, ProgramSet } from './types'

const PROGRAMS_KEY = 'home-gym-programs'

export const DEFAULT_TARGET_REPS = 8
export const DEFAULT_TARGET_SETS = 3

export function emptyProgramSet(): ProgramSet {
  return { reps: DEFAULT_TARGET_REPS, weight: 0 }
}

export function defaultProgramSets(): ProgramSet[] {
  return Array.from({ length: DEFAULT_TARGET_SETS }, () => emptyProgramSet())
}

export function dayExerciseIds(day: ProgramDay): string[] {
  return day.exercises.map((item) => item.exerciseId)
}

export function programSetLabel(sets: ProgramSet[]): string {
  if (sets.length === 0) return ''
  const first = sets[0]
  const uniform = sets.every(
    (set) => set.reps === first.reps && set.weight === first.weight,
  )
  if (!uniform) return `${sets.length} sets`
  return first.weight > 0
    ? `${sets.length}×${first.reps} @ ${first.weight}`
    : `${sets.length}×${first.reps}`
}

export function normalizeProgramExercises(
  exercises: ProgramExercise[],
): ProgramExercise[] {
  return exercises
    .filter((item) => item.exerciseId.length > 0)
    .map((item) => ({
      exerciseId: item.exerciseId,
      sets: (item.sets.length > 0 ? item.sets : defaultProgramSets()).map(
        (set) => ({
          reps: Number.isFinite(set.reps) ? set.reps : DEFAULT_TARGET_REPS,
          weight: Number.isFinite(set.weight) ? set.weight : 0,
        }),
      ),
    }))
}

export function coerceProgram(value: unknown): Program | null {
  if (!value || typeof value !== 'object') return null
  const program = value as {
    id?: unknown
    name?: unknown
    description?: unknown
    days?: unknown
  }
  if (
    typeof program.id !== 'string' ||
    program.id.length === 0 ||
    typeof program.name !== 'string' ||
    typeof program.description !== 'string' ||
    !Array.isArray(program.days) ||
    program.days.length === 0
  ) {
    return null
  }

  const days: ProgramDay[] = []
  for (const rawDay of program.days) {
    const day = coerceProgramDay(rawDay)
    if (!day) return null
    days.push(day)
  }

  return {
    id: program.id,
    name: program.name,
    description: program.description,
    days,
  }
}

export function loadPrograms(): Program[] {
  try {
    const raw = localStorage.getItem(PROGRAMS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => coerceProgram(item))
      .filter((item): item is Program => item !== null)
  } catch {
    return []
  }
}

export function savePrograms(programs: Program[]): void {
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs))
}

export function createProgramId(): string {
  return `program-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function programLookup(programs: Program[]): Record<string, Program> {
  return Object.fromEntries(programs.map((program) => [program.id, program]))
}

export function upsertProgram(programs: Program[], incoming: Program): Program[] {
  const coerced = coerceProgram(incoming)
  if (!coerced) return programs
  const index = programs.findIndex((program) => program.id === coerced.id)
  if (index === -1) return [...programs, coerced]
  return programs.map((program, programIndex) =>
    programIndex === index ? coerced : program,
  )
}

export function updateProgramDay(
  programs: Program[],
  programId: string,
  dayId: string,
  exercises: ProgramExercise[],
): Program[] {
  return programs.map((program) => {
    if (program.id !== programId) return program
    return {
      id: program.id,
      name: program.name,
      description: program.description,
      days: program.days.map((day) =>
        day.id === dayId
          ? {
              id: day.id,
              name: day.name,
              exercises: normalizeProgramExercises(exercises),
            }
          : {
              id: day.id,
              name: day.name,
              exercises: normalizeProgramExercises(day.exercises),
            },
      ),
    }
  })
}

function coerceProgramDay(value: unknown): ProgramDay | null {
  if (!value || typeof value !== 'object') return null
  const day = value as {
    id?: unknown
    name?: unknown
    exercises?: unknown
    exerciseIds?: unknown
  }
  if (typeof day.id !== 'string' || day.id.length === 0) return null
  if (typeof day.name !== 'string') return null

  if (Array.isArray(day.exercises)) {
    const exercises: ProgramExercise[] = []
    for (const raw of day.exercises) {
      const exercise = coerceProgramExercise(raw)
      if (!exercise) return null
      exercises.push(exercise)
    }
    return { id: day.id, name: day.name, exercises }
  }

  if (Array.isArray(day.exerciseIds)) {
    if (!day.exerciseIds.every((id) => typeof id === 'string')) return null
    return {
      id: day.id,
      name: day.name,
      exercises: day.exerciseIds
        .filter((id) => id.length > 0)
        .map((exerciseId) => ({
          exerciseId,
          sets: defaultProgramSets(),
        })),
    }
  }

  return null
}

function coerceProgramExercise(value: unknown): ProgramExercise | null {
  if (!value || typeof value !== 'object') return null
  const exercise = value as { exerciseId?: unknown; sets?: unknown }
  if (typeof exercise.exerciseId !== 'string' || exercise.exerciseId.length === 0) {
    return null
  }
  if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
    return { exerciseId: exercise.exerciseId, sets: defaultProgramSets() }
  }
  const sets: ProgramSet[] = []
  for (const raw of exercise.sets) {
    if (!raw || typeof raw !== 'object') return null
    const set = raw as { reps?: unknown; weight?: unknown }
    if (typeof set.reps !== 'number' || typeof set.weight !== 'number') return null
    sets.push({ reps: set.reps, weight: set.weight })
  }
  return { exerciseId: exercise.exerciseId, sets }
}
