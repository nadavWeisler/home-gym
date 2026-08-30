import type { Program } from './types'

const PROGRAMS_KEY = 'home-gym-programs'

export function loadPrograms(): Program[] {
  try {
    const raw = localStorage.getItem(PROGRAMS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Program[]
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

export function updateProgramDay(
  programs: Program[],
  programId: string,
  dayId: string,
  exerciseIds: string[],
): Program[] {
  return programs.map((program) => {
    if (program.id !== programId) return program
    return {
      ...program,
      days: program.days.map((day) =>
        day.id === dayId ? { ...day, exerciseIds } : day,
      ),
    }
  })
}
