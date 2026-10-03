import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_REST_SECONDS = 45
const TIMER_KEY = 'home-gym-timer'

// Best-effort rest cues on a running Web Audio context: a short tick at 3, 2,
// and 1, and a longer done tone at 0. The done tone also plays when the
// countdown hits zero if that schedule did not arm. Vibration and a
// notification fire once at 0 when the browser allows them. Locked or
// backgrounded pages often suspend timers and audio until the user returns, so
// lock-screen sound is not guaranteed.
type AudioContextCtor = typeof AudioContext

let audioContext: AudioContext | null = null
let chimeEndsAt: number | null = null
let chimeStop: (() => void) | null = null
let playedEndsAt: number | null = null
let notifyPermissionAsked = false

function audioContextCtor(): AudioContextCtor | null {
  const legacy = window as Window & { webkitAudioContext?: AudioContextCtor }
  return window.AudioContext ?? legacy.webkitAudioContext ?? null
}

function getAudioContext(): AudioContext | null {
  const Ctor = audioContextCtor()
  if (!Ctor) return null
  if (!audioContext) audioContext = new Ctor()
  return audioContext
}

function unlockRestAlerts(): void {
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') void ctx.resume()
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'default' || notifyPermissionAsked) return
  notifyPermissionAsked = true
  void Notification.requestPermission()
}

function stopChime(): void {
  chimeStop?.()
  chimeStop = null
  chimeEndsAt = null
}

function cancelPendingChime(): void {
  if (chimeEndsAt != null && playedEndsAt === chimeEndsAt) return
  stopChime()
}

const TICK_LEAD_SECONDS = [3, 2, 1] as const
const TICK_LATE_MS = 200

function stopNodes(nodes: AudioNode[]): void {
  for (const node of nodes) {
    try {
      node.disconnect()
    } catch {
      // Nodes throw if they are already disconnected.
    }
  }
}

function playTick(ctx: AudioContext, when: number): () => void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1760, when)
  osc.frequency.exponentialRampToValueAtTime(880, when + 0.045)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(0.14, when + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(when)
  osc.stop(when + 0.07)
  return () => stopNodes([gain, osc])
}

function playTone(ctx: AudioContext, when: number): () => void {
  const first = ctx.createOscillator()
  const second = ctx.createOscillator()
  const gain = ctx.createGain()
  first.type = 'sine'
  second.type = 'sine'
  first.frequency.setValueAtTime(523.25, when)
  second.frequency.setValueAtTime(783.99, when)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(0.22, when + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.06, when + 0.16)
  gain.gain.exponentialRampToValueAtTime(0.24, when + 0.19)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.62)
  first.connect(gain)
  second.connect(gain)
  gain.connect(ctx.destination)
  first.start(when)
  second.start(when + 0.16)
  first.stop(when + 0.2)
  second.stop(when + 0.64)
  return () => stopNodes([gain, first, second])
}

function scheduleChime(endsAt: number): void {
  if (chimeEndsAt === endsAt) return
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state !== 'running') {
    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') scheduleChime(endsAt)
        })
        .catch(() => {})
    }
    return
  }
  stopChime()
  const stops: Array<() => void> = []
  const nowMs = Date.now()
  for (const secondsLeft of TICK_LEAD_SECONDS) {
    const atMs = endsAt - secondsLeft * 1000
    if (nowMs - atMs > TICK_LATE_MS) continue
    const when = ctx.currentTime + Math.max(0, atMs - nowMs) / 1000
    stops.push(playTick(ctx, when))
  }
  const doneDelay = Math.max(0, (endsAt - nowMs) / 1000)
  stops.push(playTone(ctx, ctx.currentTime + doneDelay))
  chimeEndsAt = endsAt
  chimeStop = () => {
    for (const stop of stops) stop()
  }
}

function vibrateRestDone(): void {
  try {
    navigator.vibrate?.([160, 70, 160])
  } catch {
    // Vibration is unsupported or blocked.
  }
}

function notifyRestDone(): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification('Rest complete', {
      body: 'Time for the next set.',
      tag: 'home-gym-rest',
    })
  } catch {
    // Some browsers only construct Notification from a service worker.
  }
}

function signalRestComplete(endsAt: number): void {
  if (playedEndsAt === endsAt) return
  playedEndsAt = endsAt
  const ctx = getAudioContext()
  const scheduledWillPlay = chimeEndsAt === endsAt && ctx?.state === 'running'
  if (!scheduledWillPlay && ctx) {
    stopChime()
    const play = () => {
      chimeEndsAt = endsAt
      chimeStop = playTone(ctx, ctx.currentTime + 0.02)
    }
    if (ctx.state === 'running') play()
    else void ctx.resume().then(play).catch(() => {})
  }
  vibrateRestDone()
  notifyRestDone()
}

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
  const armedEndsAt = useRef<number | null>(null)
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

  useEffect(() => {
    if (!sessionRunning) return
    function onGesture() {
      unlockRestAlerts()
    }
    window.addEventListener('pointerdown', onGesture, true)
    window.addEventListener('keydown', onGesture, true)
    return () => {
      window.removeEventListener('pointerdown', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
    }
  }, [sessionRunning])

  const remaining = restSeconds(snapshot, now)
  const elapsed = sessionSeconds(snapshot, now)
  const resting = snapshot.restEndsAt != null && remaining > 0
  const showFinalCount = resting && remaining <= 3

  useEffect(() => {
    const endsAt = snapshot.restEndsAt
    if (endsAt != null && remaining > 0) {
      armedEndsAt.current = endsAt
      scheduleChime(endsAt)
      return
    }
    if (endsAt != null && remaining === 0 && armedEndsAt.current === endsAt) {
      armedEndsAt.current = null
      signalRestComplete(endsAt)
    }
  }, [snapshot.restEndsAt, remaining])

  useEffect(() => {
    const endsAt = snapshot.restEndsAt
    if (endsAt == null) {
      cancelPendingChime()
      return
    }
    const delay = Math.max(0, endsAt - Date.now())
    const timer = window.setTimeout(() => {
      if (armedEndsAt.current !== endsAt) return
      armedEndsAt.current = null
      signalRestComplete(endsAt)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [snapshot.restEndsAt])

  useEffect(() => () => cancelPendingChime(), [])

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
    <>
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
      {showFinalCount
        ? createPortal(
            <div className="rest-countdown" role="status" aria-live="assertive">
              <p className="rest-countdown-label">Rest</p>
              <span
                key={remaining}
                className="rest-countdown-digit"
                aria-hidden="true"
              >
                {remaining}
              </span>
              <span className="visually-hidden">Rest ends in {remaining}</span>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
