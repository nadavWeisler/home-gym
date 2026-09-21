import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { parseProgramPayload, ProgramTransferError } from '../programTransfer'
import {
  bindCameraToVideo,
  cameraErrorMessage,
  createQrFrameReader,
  requestProgramCamera,
  stopMediaStream,
  waitScanFrame,
} from '../qrScan'
import type { Program } from '../types'

type Props = {
  onClose: () => void
  onImport: (program: Program) => void
}

type ScanPhase = 'idle' | 'starting' | 'live'

export function ProgramImportDialog({ onClose, onImport }: Props) {
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sessionRef = useRef(0)
  const lockedRef = useRef(false)
  const onImportRef = useRef(onImport)
  const onCloseRef = useRef(onClose)
  onImportRef.current = onImport
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      sessionRef.current += 1
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (phase !== 'live') return
    const liveVideo = videoRef.current
    const liveStream = streamRef.current
    if (!liveVideo || !liveStream) {
      setError(
        'Could not start the camera preview. Import from a file or paste JSON instead.',
      )
      stopScan()
      return
    }
    const videoEl: HTMLVideoElement = liveVideo
    const streamEl: MediaStream = liveStream

    let cancelled = false
    const reader = createQrFrameReader()

    async function scanLoop() {
      try {
        await bindCameraToVideo(videoEl, streamEl)
      } catch (caught) {
        if (cancelled) return
        setError(cameraErrorMessage(caught))
        stopScan()
        return
      }

      while (!cancelled) {
        try {
          const text = await reader.read(videoEl)
          if (cancelled) return
          if (text && (await applyPayload(text))) return
        } catch {
          // Keep the live preview going if a single frame fails to decode.
        }
        await waitScanFrame(80)
      }
    }

    void scanLoop()

    return () => {
      cancelled = true
      videoEl.srcObject = null
    }
  }, [phase])

  async function startScan() {
    const session = ++sessionRef.current
    setError(null)
    setPhase('starting')
    try {
      const stream = await requestProgramCamera()
      if (session !== sessionRef.current) {
        stopMediaStream(stream)
        return
      }
      streamRef.current = stream
      setPhase('live')
    } catch (caught) {
      if (session !== sessionRef.current) return
      setPhase('idle')
      setError(cameraErrorMessage(caught))
    }
  }

  function stopScan() {
    sessionRef.current += 1
    stopMediaStream(streamRef.current)
    streamRef.current = null
    setPhase('idle')
  }

  async function applyPayload(raw: string): Promise<boolean> {
    if (lockedRef.current) return false
    try {
      const program = parseProgramPayload(raw)
      lockedRef.current = true
      setError(null)
      stopScan()
      onImportRef.current(program)
      return true
    } catch (caught) {
      lockedRef.current = false
      setError(
        caught instanceof ProgramTransferError
          ? caught.message
          : 'Could not read a training program. Try the file or paste fallback.',
      )
      return false
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      await applyPayload(await file.text())
    } catch {
      setError('Could not read that file.')
    }
  }

  function renderScanControl() {
    switch (phase) {
      case 'starting':
        return (
          <div className="transfer-scanner">
            <p className="transfer-note">Starting camera…</p>
            <button type="button" className="btn ghost" onClick={stopScan}>
              Cancel
            </button>
          </div>
        )
      case 'live':
        return (
          <div className="transfer-scanner">
            <video
              ref={videoRef}
              className="transfer-scanner-video"
              muted
              playsInline
              autoPlay
            />
            <p className="transfer-note">Point the camera at the program QR.</p>
            <button type="button" className="btn ghost" onClick={stopScan}>
              Stop camera
            </button>
          </div>
        )
      case 'idle':
        return (
          <button type="button" className="btn" onClick={() => void startScan()}>
            Scan QR
          </button>
        )
      default: {
        const _exhaustive: never = phase
        return _exhaustive
      }
    }
  }

  return createPortal(
    <div className="lightbox" onClick={onClose} role="presentation">
      <div
        className="lightbox-dialog transfer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close import program"
        >
          ×
        </button>

        <div className="lightbox-caption">
          <p className="section-eyebrow">Transfer</p>
          <h3 id="import-title">Import program</h3>
          <p>
            Scan a QR from another device, or import the program JSON. This
            replaces a matching program locally and does not touch workout
            history.
          </p>
        </div>

        {renderScanControl()}

        <div className="transfer-actions">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void onFile(file)
            }}
          />
          <button
            type="button"
            className="btn secondary"
            onClick={() => fileRef.current?.click()}
          >
            Import JSON file
          </button>
        </div>

        <label className="field">
          <span>Paste JSON</span>
          <textarea
            rows={5}
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder='{"id":"…","name":"…","days":[…]}'
          />
        </label>

        <div className="transfer-actions">
          <button
            type="button"
            className="btn secondary"
            disabled={!paste.trim()}
            onClick={() => void applyPayload(paste)}
          >
            Import pasted JSON
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
        </div>

        {error ? <p className="transfer-error">{error}</p> : null}
      </div>
    </div>,
    document.body,
  )
}
