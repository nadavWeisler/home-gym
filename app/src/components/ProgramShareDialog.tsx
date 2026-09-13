import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import {
  downloadProgramJson,
  programByteLength,
  programFitsInQr,
  serializeProgram,
} from '../programTransfer'
import type { Program } from '../types'

type Props = {
  program: Program
  onClose: () => void
}

export function ProgramShareDialog({ program, onClose }: Props) {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrOversized, setQrOversized] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const onCloseRef = useRef(onClose)
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
    let cancelled = false
    const payload = serializeProgram(program)

    async function renderQr() {
      if (!programFitsInQr(payload)) {
        if (!cancelled) {
          setQrUrl(null)
          setQrOversized(true)
        }
        return
      }

      try {
        const url = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: programByteLength(payload) > 1600 ? 'L' : 'M',
          margin: 1,
          width: 280,
          color: { dark: '#06140c', light: '#ffffff' },
        })
        if (!cancelled) {
          setQrUrl(url)
          setQrOversized(false)
        }
      } catch {
        if (!cancelled) {
          setQrUrl(null)
          setQrOversized(true)
        }
      }
    }

    void renderQr()
    return () => {
      cancelled = true
    }
  }, [program])

  async function copyJson() {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(serializeProgram(program))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopyError('Could not copy. Download the JSON file instead.')
    }
  }

  return createPortal(
    <div className="lightbox" onClick={onClose} role="presentation">
      <div
        className="lightbox-dialog transfer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close share program"
        >
          ×
        </button>

        <div className="lightbox-caption">
          <p className="section-eyebrow">Transfer</p>
          <h3 id="share-title">Share program</h3>
          <p>{program.name}</p>
        </div>

        {qrOversized ? (
          <p className="transfer-note">
            This program is too large for one QR code. Copy or download the JSON
            and import it on the other device.
          </p>
        ) : qrUrl ? (
          <div className="transfer-qr">
            <img src={qrUrl} alt={`QR code for ${program.name}`} />
          </div>
        ) : (
          <p className="transfer-note">Preparing QR…</p>
        )}

        {!qrOversized ? (
          <p className="transfer-note">
            Scan this code on the other device, or use JSON if the camera cannot
            read it.
          </p>
        ) : null}

        {copyError ? <p className="transfer-error">{copyError}</p> : null}

        <div className="transfer-actions">
          <button type="button" className="btn secondary" onClick={copyJson}>
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => downloadProgramJson(program)}
          >
            Download JSON
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
