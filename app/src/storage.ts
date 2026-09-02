import type {
  ActiveWorkout,
  ExerciseLog,
  SetLog,
  WorkoutMode,
  WorkoutSession,
} from './types'

const STORAGE_KEY = 'home-gym-sessions'
const ACTIVE_KEY = 'home-gym-active'

export function loadSessions(): WorkoutSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as WorkoutSession[]
  } catch {
    return []
  }
}

export function saveSessions(sessions: WorkoutSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSetId(): string {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function emptySet(): SetLog {
  return { id: createSetId(), reps: 8, weight: 0, done: false }
}

export function lastSetsForExercise(
  sessions: WorkoutSession[],
  exerciseId: string,
  excludeSessionId?: string,
): SetLog[] | undefined {
  for (const session of sessions) {
    if (session.id === excludeSessionId) continue
    const log = session.exercises.find((item) => item.exerciseId === exerciseId)
    if (log && log.sets.length > 0) return log.sets
  }
  return undefined
}

export function isSameCalendarDay(iso: string, now = new Date()): boolean {
  const date = new Date(iso)
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function findTodaysSession(
  sessions: WorkoutSession[],
  programId: string,
  dayId: string,
): WorkoutSession | undefined {
  return sessions.find(
    (session) =>
      session.programId === programId &&
      session.dayId === dayId &&
      isSameCalendarDay(session.date),
  )
}

export function buildSessionLogs(
  exerciseIds: string[],
  sessions: WorkoutSession[],
  excludeSessionId?: string,
): ExerciseLog[] {
  return exerciseIds.map((exerciseId) => {
    const last = lastSetsForExercise(sessions, exerciseId, excludeSessionId)
    const count = last?.length ?? 3
    return {
      exerciseId,
      done: false,
      sets: Array.from({ length: count }, (_, index) => ({
        id: `${createSetId()}-${index}`,
        reps: last?.[index]?.reps ?? 8,
        weight: last?.[index]?.weight ?? 0,
        done: false,
      })),
    }
  })
}

export function createWorkoutSession(
  programId: string,
  dayId: string,
  exerciseIds: string[],
  sessions: WorkoutSession[],
): WorkoutSession {
  return {
    id: createSessionId(),
    programId,
    dayId,
    date: new Date().toISOString(),
    exercises: buildSessionLogs(exerciseIds, sessions),
  }
}

export function upsertSession(
  sessions: WorkoutSession[],
  session: WorkoutSession,
): WorkoutSession[] {
  return [session, ...sessions.filter((item) => item.id !== session.id)]
}

function isWorkoutMode(value: unknown): value is WorkoutMode {
  return value === 'edit' || value === 'perform'
}

export function loadActiveWorkout(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const value = parsed as Partial<ActiveWorkout>
    if (
      typeof value.programId !== 'string' ||
      typeof value.dayId !== 'string' ||
      !value.session ||
      typeof value.session.id !== 'string' ||
      !Array.isArray(value.session.exercises)
    ) {
      return null
    }
    return {
      programId: value.programId,
      dayId: value.dayId,
      mode: isWorkoutMode(value.mode) ? value.mode : 'perform',
      session: value.session,
    }
  } catch {
    return null
  }
}

export function saveActiveWorkout(active: ActiveWorkout | null): void {
  if (!active) {
    localStorage.removeItem(ACTIVE_KEY)
    return
  }
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
}
