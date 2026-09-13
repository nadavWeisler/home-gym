import { coerceProgram } from './programStorage'
import type { Program } from './types'

/** QR version 40, error correction L — max 8-bit capacity. */
export const QR_MAX_BYTES = 2953

export class ProgramTransferError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProgramTransferError'
  }
}

export function serializeProgram(program: Program): string {
  const normalized = coerceProgram(program)
  if (!normalized) {
    throw new ProgramTransferError('That program cannot be shared.')
  }
  return JSON.stringify(normalized)
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
  const program = coerceProgram(candidate)
  if (!program) {
    throw new ProgramTransferError('That file is not a training program.')
  }
  return program
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
