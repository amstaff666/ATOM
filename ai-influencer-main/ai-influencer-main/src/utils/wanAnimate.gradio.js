// ─────────────────────────────────────────────────────────────────────────────
// Wan Animate — Gradio Space backend (variant 1)
// ─────────────────────────────────────────────────────────────────────────────
// Talks to https://techprotrade-wan2-2-animate.hf.space directly from the
// browser using the Gradio 5.x Queue Protocol:
//
//   1. POST  /gradio_api/upload              (multipart, image + video)
//   2. POST  /gradio_api/queue/join          (start predict with file URLs)
//   3. GET   /gradio_api/queue/data?session_hash=…   (SSE stream of progress
//      + final result; respond to send_hash / send_data_hash handshake events)
//
// CORS: HF Spaces echo the request's Origin in Access-Control-Allow-Origin,
// so browser calls work as long as the Space is publicly accessible.
//
// Concurrency: the Space caps at 100 (queue(default_concurrency_limit=100)),
// but ZeroGPU may impose stricter limits — failures bubble up via the SSE
// 'process_failed' event.
// ─────────────────────────────────────────────────────────────────────────────

import {
  WAN_MODES, WAN_QUALITIES, DEFAULT_MODE, DEFAULT_QUALITY,
} from './wanAnimate'

const SPACE_HOST = 'https://techprotrade-wan2-2-animate.hf.space'
const GRADIO_API = `${SPACE_HOST}/gradio_api`
const PREDICT_FN_INDEX = 0  // app.predict is the first registered function

// ── Debug ───────────────────────────────────────────────────────────────
const DEBUG = false
const log = (...a) => { if (DEBUG) console.log('[wan:gradio]', ...a) }

// ── Tiny utilities ──────────────────────────────────────────────────────

function randomHash() {
  // 12-char base36 — enough entropy for Gradio session uniqueness
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

function buildFileData(uploaded) {
  // uploaded: { path?, url, orig_name, meta? } from /upload response
  // Gradio 5.x accepts either the full dict or just the URL string for file inputs.
  return {
    path: uploaded.path || uploaded.url.split('/').pop(),
    url: uploaded.url,
    ...(uploaded.orig_name ? { orig_name: uploaded.orig_name } : {}),
    meta: { _type: 'gradio.FileData' },
  }
}

async function readSSE(response, onMessage, signal) {
  // Stream newline-delimited SSE blocks; each event may span multiple lines
  // until a blank line. Gradio sends only 'event: data' / 'data: <json>' pairs.
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let currentEvent = 'message'
  let currentData = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      buf += decoder.decode(value, { stream: true })
      let nl
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).replace(/\r$/, '')
        buf = buf.slice(nl + 1)
        if (line === '') {
          // dispatch accumulated event
          if (currentData) {
            try { onMessage(currentEvent, JSON.parse(currentData)) }
            catch (e) { log('sse: bad json', currentData, e) }
          }
          currentEvent = 'message'; currentData = ''
        } else if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          currentData += line.slice(5).trimStart()
        }
      }
    }
    // flush trailing event
    if (currentData) {
      try { onMessage(currentEvent, JSON.parse(currentData)) }
      catch (e) { log('sse: trailing bad json', currentData, e) }
    }
  } finally {
    try { reader.releaseLock() } catch {}
  }
}

// ── File upload ─────────────────────────────────────────────────────────

async function uploadFiles(files, signal) {
  const form = new FormData()
  for (const f of files) form.append('files', f, f.name || 'file')
  const res = await fetch(`${GRADIO_API}/upload`, {
    method: 'POST',
    body: form,
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Wan upload failed (${res.status}): ${t.slice(0, 200)}`)
  }
  const arr = await res.json()
  if (!Array.isArray(arr) || arr.length !== files.length) {
    throw new Error(`Wan upload returned unexpected payload: ${JSON.stringify(arr).slice(0, 200)}`)
  }
  return arr
}

// ── Queue join + SSE handshake ──────────────────────────────────────────

function openSSE(sessionHash, controller, onMessage) {
  // Returns the fetch Promise for the SSE stream.
  return fetch(`${GRADIO_API}/queue/data?session_hash=${encodeURIComponent(sessionHash)}`, {
    method: 'GET',
    headers: { Accept: 'text/event-stream' },
    signal: controller.signal,
  }).then(res => {
    if (!res.ok || !res.body) {
      throw new Error(`Wan SSE open failed (${res.status})`)
    }
    return readSSE(res, onMessage, controller.signal)
  })
}

async function joinQueue({ sessionHash, fnIndex, data, signal }) {
  const res = await fetch(`${GRADIO_API}/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      fn_index: fnIndex,
      trigger_id: fnIndex,    // accepted as opaque by Gradio
      session_hash: sessionHash,
      event_data: null,
    }),
    signal,
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Wan queue join failed (${res.status}): ${t.slice(0, 200)}`)
  }
  // join response body is usually empty — drain it so the connection cleans up
  try { await res.text() } catch {}
}

async function ackHash({ sessionHash, fnIndex, hash, signal }) {
  // Two-way handshake: server asks client to confirm a hash by re-posting.
  await fetch(`${GRADIO_API}/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn_index: fnIndex, session_hash: sessionHash, hash }),
    signal,
  }).catch(() => { /* best-effort; server retries on next event */ })
}

// ── Public API ──────────────────────────────────────────────────────────

export async function submitJob({
  imageFile, videoFile, mode = DEFAULT_MODE, quality = DEFAULT_QUALITY, signal,
}) {
  if (!WAN_MODES.includes(mode)) throw new Error(`Invalid mode: ${mode}`)
  if (!WAN_QUALITIES.includes(quality)) throw new Error(`Invalid quality: ${quality}`)
  if (!imageFile) throw new Error('imageFile is required')
  if (!videoFile) throw new Error('videoFile is required')

  const sessionHash = randomHash()
  const controller = new AbortController()
  // chain upstream abort → internal controller
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  log('submit', { sessionHash, mode, quality })

  // 1. Upload both files in one call — order matters: image first, video second
  const uploaded = await uploadFiles([imageFile, videoFile], controller.signal)
  log('uploaded', uploaded.map(u => u.url))

  // 2. Open SSE FIRST so we don't miss send_hash / process_starts events
  // 3. Trigger join with the uploaded FileData + dropdown values
  const completion = new Promise((resolve, reject) => {
    let resolved = false
    openSSE(sessionHash, controller, async (_evt, msg) => {
      try {
        switch (msg.msg) {
          case 'send_hash':
          case 'send_data_hash':
            await ackHash({
              sessionHash, fnIndex: PREDICT_FN_INDEX, hash: msg.hash, signal: controller.signal,
            })
            break
          case 'process_starts':
            log('process_starts', msg)
            break
          case 'process_generating':
            // Intermediate progress; output.data may carry a partial FileData
            log('process_generating', msg.output?.data)
            break
          case 'process_completed':
            resolved = true
            controller.abort()  // close SSE
            const data = msg.output?.data || []
            // output_video is data[0] (FileData or {video:{url}}), output_status is data[1]
            const videoNode = data[0]
            const statusText = data[1] || (msg.success ? 'SUCCEEDED' : 'FAILED')
            const videoUrl = videoNode?.video?.url || videoNode?.url || null
            resolve({
              status: statusText.startsWith('FAILED') || msg.success === false ? 'failed' : 'succeeded',
              videoUrl,
              statusText,
              raw: msg,
            })
            break
          case 'process_failed':
          case 'failed':
            resolved = true
            controller.abort()
            reject(new Error(
              (msg.output?.error || msg.error || 'Wan generation failed').toString()
            ))
            break
          default:
            log('sse: unhandled msg', msg.msg)
        }
      } catch (e) {
        if (!resolved) { resolved = true; controller.abort(); reject(e) }
      }
    }).catch(e => {
      if (!resolved) reject(e)
    })

    // After the SSE listener is attached, fire the join
    joinQueue({
      sessionHash,
      fnIndex: PREDICT_FN_INDEX,
      data: [
        buildFileData(uploaded[0]),  // ref_img
        buildFileData(uploaded[1]),  // video
        mode,
        quality,
      ],
      signal: controller.signal,
    }).catch(e => {
      if (!resolved) reject(e)
    })
  })

  return {
    sessionHash,
    controller,
    completion,
  }
}

export async function pollJob(jobHandle, { signal, onProgress } = {}) {
  if (signal) {
    if (signal.aborted) jobHandle.controller.abort()
    else signal.addEventListener('abort', () => jobHandle.controller.abort(), { once: true })
  }
  // completion was wired at submit time; just await it
  const result = await jobHandle.completion
  if (onProgress) onProgress({ progress: 100, status: result.status, statusText: result.statusText })
  return result
}

export function cancelJob(jobHandle) {
  try { jobHandle.controller.abort() } catch {}
}