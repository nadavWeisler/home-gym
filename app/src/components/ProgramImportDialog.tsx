import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { parseProgramPayload, ProgramTransferError } from '../programTransfer'
import type { Program } from '../types'

type Props = {
  onClose: () => void
  onImport: (program: Program) => void
}

const SCANNER_ID = 'program-qr-scanner'

export function ProgramImportDialog({ onClose, onImport }: Props) {
  const [scanning, setScanning] = useState(false)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
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
    }
  }, [])

  useEffect(() => {
    if (!scanning) return

    let cancelled = false
    const scanner = new Html5Qrcode(SCANNER_ID, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    })
    scannerRef.current = scanner

    async function startCamera() {
      const onScan = (text: string) => {
        void applyPayload(text)
      }

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          onScan,
          () => undefined,
        )
      } catch {
        if (cancelled) return
        try {
          await scanner.start(
            { facingMode: 'user' },
            { fps: 8, qrbox: { width: 220, height: 220 } },
            onScan,
            () => undefined,
          )
        } catch {
          if (cancelled) return
          await safeStop(scanner)
          scannerRef.current = null
          setScanning(false)
          setError(
            'Camera permission failed or no camera is available. Import from a file or paste JSON instead.',
          )
        }
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      void safeStop(scanner).then(() => {
        if (scannerRef.current === scanner) scannerRef.current = null
      })
    }
  }, [scanning])

  async function applyPayload(raw: string) {
    if (lockedRef.current) return
    try {
      const program = parseProgramPayload(raw)
      lockedRef.current = true
      setError(null)
      setScanning(false)
      onImportRef.current(program)
    } catch (caught) {
      lockedRef.current = false
      setError(
        caught instanceof ProgramTransferError
          ? caught.message
          : 'Could not read a training program. Try the file or paste fallback.',
      )
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

        {scanning ? (
          <div className="transfer-scanner">
            <div id={SCANNER_ID} />
            <button
              type="button"
              className="btn ghost"
              onClick={() => setScanning(false)}
            >
              Stop camera
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setError(null)
              setScanning(true)
            }}
          >
            Scan QR
          </button>
        )}

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

async function safeStop(scanner: Html5Qrcode): Promise<void> {
  try {
    if (scanner.isScanning) await scanner.stop()
  } catch {
    // Already stopped.
  }
  try {
    scanner.clear()
  } catch {
    // Dialog already unmounted the preview.
  }
}
