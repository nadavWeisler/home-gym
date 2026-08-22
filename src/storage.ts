import type { WorkoutSession } from './types'

const STORAGE_KEY = 'home-gym-sessions'

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
