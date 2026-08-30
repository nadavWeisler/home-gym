import { useEffect, useRef, useState } from 'react'

const REST_PRESETS = [30, 60, 90, 120] as const

type Props = {
  sessionRunning: boolean
  restNonce: number
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function WorkoutTimer({ sessionRunning, restNonce }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(90)
  const [remaining, setRemaining] = useState(90)
  const [resting, setResting] = useState(false)
  const durationRef = useRef(duration)
  durationRef.current = duration

  useEffect(() => {
    if (!sessionRunning) return
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [sessionRunning])

  useEffect(() => {
    if (!resting) return
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setResting(false)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resting])

  useEffect(() => {
    if (restNonce === 0) return
    setRemaining(durationRef.current)
    setResting(true)
  }, [restNonce])

  function applyPreset(seconds: number) {
    setDuration(seconds)
    setRemaining(seconds)
    setResting(false)
  }

  return (
    <div className="timer-widget">
      <div>
        <p className="timer-label">Session</p>
        <p className="timer-digits">{formatClock(elapsed)}</p>
      </div>
      <div>
        <p className="timer-label">Rest</p>
        <p className={`timer-digits ${remaining === 0 ? 'done' : ''}`}>
          {formatClock(remaining)}
        </p>
        <div className="timer-presets">
          {REST_PRESETS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              className={`chip ${duration === seconds ? 'active' : ''}`}
              onClick={() => applyPreset(seconds)}
            >
              {seconds}s
            </button>
          ))}
        </div>
        <div className="timer-controls">
          <button
            type="button"
            className="btn"
            onClick={() => setResting((value) => !value)}
          >
            {resting ? 'Pause' : 'Start rest'}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setRemaining(duration)
              setResting(false)
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
