import jsQR from 'jsqr'

const JSQR_MAX_EDGE = 720

type BarcodeDetectorResult = { rawValue?: string }

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>
}

type BarcodeDetectorCtor = new (options?: {
  formats?: string[]
}) => BarcodeDetectorInstance

export class CameraScanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CameraScanError'
  }
}

export type QrFrameReader = {
  read: (video: HTMLVideoElement) => Promise<string | null>
}

type CameraFailureName =
  | 'denied'
  | 'missing'
  | 'busy'
  | 'insecure'
  | 'unavailable'

export function cameraErrorMessage(error: unknown): string {
  if (error instanceof CameraScanError) return error.message

  const failure = classifyCameraFailure(error)
  switch (failure) {
    case 'denied':
      return 'Camera permission was denied. Import from a file or paste JSON instead.'
    case 'missing':
      return 'No camera was found. Import from a file or paste JSON instead.'
    case 'busy':
      return 'The camera is in use by another app. Import from a file or paste JSON instead.'
    case 'insecure':
      return 'Camera scan needs HTTPS. Import from a file or paste JSON instead.'
    case 'unavailable':
      return 'Camera permission failed or no camera is available. Import from a file or paste JSON instead.'
    default: {
      const _exhaustive: never = failure
      return _exhaustive
    }
  }
}

function classifyCameraFailure(error: unknown): CameraFailureName {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'missing'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'busy'
    case 'SecurityError':
      return 'insecure'
    default:
      return 'unavailable'
  }
}

export async function requestProgramCamera(): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new CameraScanError(
      'Camera scan needs HTTPS. Import from a file or paste JSON instead.',
    )
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraScanError(
      'This browser cannot open a camera. Import from a file or paste JSON instead.',
    )
  }

  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    { audio: false, video: { facingMode: { ideal: 'environment' } } },
    { audio: false, video: true },
  ]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new CameraScanError(
        'Camera permission failed or no camera is available. Import from a file or paste JSON instead.',
      )
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

export async function bindCameraToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.muted = true
  video.playsInline = true
  video.autoplay = true
  video.srcObject = stream
  await video.play()
}

export function createQrFrameReader(): QrFrameReader {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const Detector = shouldUseNativeBarcodeDetector() ? getBarcodeDetectorCtor() : null
  let detector: BarcodeDetectorInstance | null = Detector
    ? new Detector({ formats: ['qr_code'] })
    : null

  return {
    async read(video) {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null
      if (video.videoWidth < 8 || video.videoHeight < 8) return null

      if (detector) {
        try {
          const codes = await detector.detect(video)
          const raw = codes[0]?.rawValue?.trim()
          return raw && raw.length > 0 ? raw : null
        } catch {
          detector = null
        }
      }

      if (!context) return null
      return decodeWithJsQr(video, canvas, context)
    },
  }
}

export function waitScanFrame(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function shouldUseNativeBarcodeDetector(): boolean {
  if (!getBarcodeDetectorCtor()) return false
  return !isWebKitQrHost()
}

function isWebKitQrHost(): boolean {
  const ua = navigator.userAgent
  if (/iP(hone|ad|od)/.test(ua)) return true
  // iPadOS reports a desktop Mac UA; Shape Detection is still a WebKit stub.
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Android/i.test(ua)
}

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

function decodeWithJsQr(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): string | null {
  const scale = Math.min(1, JSQR_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight))
  const width = Math.max(8, Math.round(video.videoWidth * scale))
  const height = Math.max(8, Math.round(video.videoHeight * scale))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  context.drawImage(video, 0, 0, width, height)
  const image = context.getImageData(0, 0, width, height)
  const code = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' })
  return code ? payloadFromJsQr(code) : null
}

function payloadFromJsQr(code: { binaryData: number[]; data: string }): string {
  try {
    const decoded = new TextDecoder('utf-8').decode(Uint8Array.from(code.binaryData))
    if (decoded.trim().startsWith('{')) return decoded
  } catch {
    // Use the library string if the bytes are not UTF-8 JSON.
  }
  return code.data
}
