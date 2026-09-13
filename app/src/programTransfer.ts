import type { Program, ProgramDay } from './types'

/** QR version 40, error correction L — max 8-bit capacity. */
export const QR_MAX_BYTES = 2953

export class ProgramTransferError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProgramTransferError'
  }
}

export function serializeProgram(program: Program): string {
  return JSON.stringify(normalizeProgram(program))
}

export function programByteLength(payload: string): number {
  return new TextEncoder().encode(payload).length
}

export function programFitsInQr(payload: string): boolean {
  return programByteLength(payload) <= QR_MAX_BYTES
}

export function programFileName(program: Program): string {
  const slug =
    program.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'program'
  return `${slug}.json`
}

export function parseProgramPayload(raw: string): Program {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    throw new ProgramTransferError('That JSON is not valid.')
  }

  const candidate = unwrapPayload(parsed)
  if (!isProgram(candidate)) {
    throw new ProgramTransferError('That file is not a training program.')
  }
  return normalizeProgram(candidate)
}

export function downloadProgramJson(program: Program): void {
  const payload = serializeProgram(program)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = programFileName(program)
  link.click()
  URL.revokeObjectURL(url)
}

function unwrapPayload(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') return parsed
  if (!('program' in parsed)) return parsed

  const envelope = parsed as { v?: unknown; program: unknown }
  if (envelope.v !== undefined && envelope.v !== 1) {
    throw new ProgramTransferError('This program transfer version is not supported.')
  }
  return envelope.program
}

function isProgramDay(value: unknown): value is ProgramDay {
  if (!value || typeof value !== 'object') return false
  const day = value as Partial<ProgramDay>
  return (
    typeof day.id === 'string' &&
    day.id.length > 0 &&
    typeof day.name === 'string' &&
    Array.isArray(day.exerciseIds) &&
    day.exerciseIds.every((id) => typeof id === 'string')
  )
}

function isProgram(value: unknown): value is Program {
  if (!value || typeof value !== 'object') return false
  const program = value as Partial<Program>
  return (
    typeof program.id === 'string' &&
    program.id.length > 0 &&
    typeof program.name === 'string' &&
    typeof program.description === 'string' &&
    Array.isArray(program.days) &&
    program.days.length > 0 &&
    program.days.every(isProgramDay)
  )
}

function normalizeProgram(program: Program): Program {
  return {
    id: program.id,
    name: program.name,
    description: program.description,
    days: program.days.map((day) => ({
      id: day.id,
      name: day.name,
      exerciseIds: day.exerciseIds.filter((id) => id.length > 0),
    })),
  }
}
