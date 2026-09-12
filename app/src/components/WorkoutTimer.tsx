import { useEffect, useRef, useState } from 'react'

const DEFAULT_REST_SECONDS = 45
const TIMER_KEY = 'home-gym-timer'

type Props = {
  sessionId: string
  sessionRunning: boolean
  restNonce: number
}

type TimerSnapshot = {
  sessionId: string
  sessionStartedAt: number | null
  sessionOffsetMs: number
  restEndsAt: number | null
  restDuration: number
  restPausedRemainingMs: number | null
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function freshSnapshot(sessionId: string): TimerSnapshot {
  return {
    sessionId,
    sessionStartedAt: null,
    sessionOffsetMs: 0,
    restEndsAt: null,
    restDuration: DEFAULT_REST_SECONDS,
    restPausedRemainingMs: null,
  }
}

function readSnapshot(sessionId: string): TimerSnapshot {
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    if (!raw) return freshSnapshot(sessionId)
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return freshSnapshot(sessionId)
    const value = parsed as Partial<TimerSnapshot>
    if (value.sessionId !== sessionId) return freshSnapshot(sessionId)
    return {
      sessionId,
      sessionStartedAt:
        typeof value.sessionStartedAt === 'number' ? value.sessionStartedAt : null,
      sessionOffsetMs:
        typeof value.sessionOffsetMs === 'number' ? value.sessionOffsetMs : 0,
      restEndsAt: typeof value.restEndsAt === 'number' ? value.restEndsAt : null,
      restDuration:
        typeof value.restDuration === 'number' && value.restDuration > 0
          ? value.restDuration
          : DEFAULT_REST_SECONDS,
      restPausedRemainingMs:
        typeof value.restPausedRemainingMs === 'number'
          ? value.restPausedRemainingMs
          : null,
    }
  } catch {
    return freshSnapshot(sessionId)
  }
}

function writeSnapshot(snapshot: TimerSnapshot): void {
  localStorage.setItem(TIMER_KEY, JSON.stringify(snapshot))
}

function restSeconds(snapshot: TimerSnapshot, now: number): number {
  if (snapshot.restEndsAt != null) {
    return Math.max(0, Math.ceil((snapshot.restEndsAt - now) / 1000))
  }
  if (snapshot.restPausedRemainingMs != null) {
    return Math.max(0, Math.ceil(snapshot.restPausedRemainingMs / 1000))
  }
  return snapshot.restDuration
}

function sessionSeconds(snapshot: TimerSnapshot, now: number): number {
  const runningMs =
    snapshot.sessionStartedAt != null
      ? Math.max(0, now - snapshot.sessionStartedAt)
      : 0
  return Math.floor((snapshot.sessionOffsetMs + runningMs) / 1000)
}

export function WorkoutTimer({
  sessionId,
  sessionRunning,
  restNonce,
}: Props) {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(sessionId))
  const [now, setNow] = useState(() => Date.now())
  const sessionRunningRef = useRef(sessionRunning)
  sessionRunningRef.current = sessionRunning

  useEffect(() => {
    const loaded = readSnapshot(sessionId)
    const at = Date.now()
    if (sessionRunningRef.current && loaded.sessionStartedAt == null) {
      loaded.sessionStartedAt = at
    } else if (!sessionRunningRef.current && loaded.sessionStartedAt != null) {
      loaded.sessionOffsetMs += at - loaded.sessionStartedAt
      loaded.sessionStartedAt = null
    }
    setSnapshot(loaded)
  }, [sessionId])

  useEffect(() => {
    writeSnapshot(snapshot)
  }, [snapshot])

  useEffect(() => {
    function tick() {
      setNow(Date.now())
    }

    const timer = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [])

  useEffect(() => {
    const at = Date.now()
    if (sessionRunning) {
      setSnapshot((prev) =>
        prev.sessionStartedAt == null
          ? { ...prev, sessionStartedAt: at }
          : prev,
      )
      return
    }

    setSnapshot((prev) => {
      if (prev.sessionStartedAt == null) return prev
      return {
        ...prev,
        sessionOffsetMs: prev.sessionOffsetMs + (at - prev.sessionStartedAt),
        sessionStartedAt: null,
      }
    })
  }, [sessionRunning])

  useEffect(() => {
    if (restNonce === 0) return
    setSnapshot((prev) => ({
      ...prev,
      restEndsAt: Date.now() + prev.restDuration * 1000,
      restPausedRemainingMs: null,
    }))
  }, [restNonce])

  useEffect(() => {
    if (snapshot.restEndsAt == null || snapshot.restEndsAt > now) return
    setSnapshot((prev) => {
      if (prev.restEndsAt == null || prev.restEndsAt > Date.now()) return prev
      return { ...prev, restEndsAt: null, restPausedRemainingMs: 0 }
    })
  }, [now, snapshot.restEndsAt])

  const remaining = restSeconds(snapshot, now)
  const elapsed = sessionSeconds(snapshot, now)
  const resting = snapshot.restEndsAt != null && remaining > 0

  function changeDuration(value: number) {
    const seconds = Math.max(1, value)
    setSnapshot((prev) => ({
      ...prev,
      restDuration: seconds,
      restPausedRemainingMs:
        prev.restEndsAt == null ? null : prev.restPausedRemainingMs,
    }))
  }

  function toggleRest() {
    const at = Date.now()
    setSnapshot((prev) => {
      if (prev.restEndsAt != null && prev.restEndsAt > at) {
        return {
          ...prev,
          restEndsAt: null,
          restPausedRemainingMs: prev.restEndsAt - at,
        }
      }

      const seconds = restSeconds(prev, at)
      const nextSeconds = seconds > 0 ? seconds : prev.restDuration
      return {
        ...prev,
        restEndsAt: at + nextSeconds * 1000,
        restPausedRemainingMs: null,
      }
    })
  }

  function resetRest() {
    setSnapshot((prev) => ({
      ...prev,
      restEndsAt: null,
      restPausedRemainingMs: null,
    }))
  }

  return (
    <div className="timer-widget">
      <div className="timer-block">
        <p className="timer-label">Session</p>
        <p className="timer-digits">{formatClock(elapsed)}</p>
      </div>
      <div className="timer-block">
        <p className="timer-label">Rest</p>
        <p className={`timer-digits ${remaining === 0 ? 'done' : ''}`}>
          {formatClock(remaining)}
        </p>
        <label className="timer-duration">
          <input
            type="number"
            min={1}
            inputMode="numeric"
            aria-label="Rest seconds"
            value={snapshot.restDuration}
            onChange={(event) =>
              changeDuration(Number(event.target.value) || 0)
            }
          />
          <span>s</span>
        </label>
        <div className="timer-controls">
          <button type="button" className="btn" onClick={toggleRest}>
            {resting ? 'Pause' : 'Start'}
          </button>
          <button type="button" className="btn secondary" onClick={resetRest}>
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
