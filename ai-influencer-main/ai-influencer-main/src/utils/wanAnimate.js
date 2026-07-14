// ─────────────────────────────────────────────────────────────────────────────
// Wan Animate — backend adapter facade
// ─────────────────────────────────────────────────────────────────────────────
// Two backends live behind this single API:
//
//   • 'gradio'    → browser → Gradio Space (current; uses /gradio_api/upload,
//                  /gradio_api/queue/join, /gradio_api/queue/data SSE)
//   • 'dashscope' → browser → /api/wan-animate/* Vercel proxy → DashScope
//                  direct. Stub for now; flip when ready.
//
// Switch via env: VITE_WAN_ANIMATE_BACKEND=dashscope in .env.local / Vercel.
//
// All call sites import from THIS file only — the swap is invisible to the UI.
// ─────────────────────────────────────────────────────────────────────────────

import * as gradio from './wanAnimate.gradio'
// import * as dashscope from './wanAnimate.dashscope'  // uncomment when wired

const BACKEND = (import.meta.env?.VITE_WAN_ANIMATE_BACKEND) || 'gradio'

const REGISTRY = { gradio /*, dashscope */ }

if (!REGISTRY[BACKEND]) {
  throw new Error(
    `Unknown VITE_WAN_ANIMATE_BACKEND='${BACKEND}'. ` +
    `Known backends: ${Object.keys(REGISTRY).join(', ')}`
  )
}

const impl = REGISTRY[BACKEND]

// ── Public constants — match Gradio app.py's dropdown choices ───────────
export const WAN_MODES = ['wan2.2-animate-move', 'wan2.2-animate-mix']
export const WAN_QUALITIES = ['wan-pro', 'wan-std']
export const DEFAULT_MODE = 'wan2.2-animate-move'
export const DEFAULT_QUALITY = 'wan-pro'

// ── Limits — mirrored from Space's UI helper text ───────────────────────
export const WAN_LIMITS = {
  video: { maxBytes: 200 * 1024 * 1024, minDurationS: 2, maxDurationS: 30, aspectMin: 1 / 3, aspectMax: 3 },
  image: { maxBytes: 5 * 1024 * 1024, minShortSide: 200, maxLongSide: 4096 },
  acceptedVideoFormats: ['video/mp4', 'video/avi', 'video/quicktime'],
  acceptedImageFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
}

// ── Public API ──────────────────────────────────────────────────────────
// All backends must implement this contract:
//
//   submitJob({ imageFile, videoFile, mode, quality, signal })
//     → { jobHandle, jobId }
//
//   pollJob(jobHandle, { signal, onProgress, intervalMs })
//     → { status: 'succeeded' | 'failed' | 'cancelled',
//         videoUrl?, statusText?, error? }

export function submitWanJob(args) { return impl.submitJob(args) }
export function pollWanJob(handle, opts) { return impl.pollJob(handle, opts) }
export function cancelWanJob(handle) { return impl.cancelJob?.(handle) }

// ── Helpers exposed for the UI ──────────────────────────────────────────

export function validateInputs({ imageFile, videoFile }) {
  const errs = []
  if (imageFile) {
    if (imageFile.size > WAN_LIMITS.image.maxBytes) errs.push(`Image > ${WAN_LIMITS.image.maxBytes / 1024 / 1024}MB`)
    if (!WAN_LIMITS.acceptedImageFormats.includes(imageFile.type)) errs.push(`Image format ${imageFile.type || 'unknown'} not supported`)
  }
  if (videoFile) {
    if (videoFile.size > WAN_LIMITS.video.maxBytes) errs.push(`Video > ${WAN_LIMITS.video.maxBytes / 1024 / 1024}MB`)
    if (!WAN_LIMITS.acceptedVideoFormats.includes(videoFile.type)) errs.push(`Video format ${videoFile.type || 'unknown'} not supported`)
  }
  return errs
}

// ── Debug ───────────────────────────────────────────────────────────────
export const _backend = BACKEND