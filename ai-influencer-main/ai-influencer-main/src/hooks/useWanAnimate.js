// ─────────────────────────────────────────────────────────────────────────────
// useWanAnimate — React hook for Wan 2.2 Animate generation
// ─────────────────────────────────────────────────────────────────────────────
// Wraps the wanAnimate adapter with React state. Used by WanAnimateStudio
// (and any other call site). Returns:
//
//   {
//     submit({ imageFile, videoFile, mode, quality }),  // kicks off a job
//     cancel(),                                         // aborts in-flight job
//     reset(),                                          // clears state
//     status:        'idle' | 'uploading' | 'queued' | 'generating'
//                    | 'succeeded' | 'failed' | 'cancelled',
//     progress:      0..100,                            // best-effort
//     statusText:    string,                            // e.g. 'SUCCEEDED' / error
//     videoUrl:      string | null,                     // final CDN URL
//     error:         Error | null,
//     isRunning:     boolean,                           // any non-terminal status
//   }
//
// Persistence: stores the in-flight job's sessionHash + a fingerprint of the
// inputs in localStorage so a page reload can re-attach to the SSE stream
// (best-effort — re-attaching mid-stream is fragile and may not always work).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  submitWanJob, pollWanJob, cancelWanJob, validateInputs, DEFAULT_MODE, DEFAULT_QUALITY,
} from '../utils/wanAnimate'

const STORAGE_KEY = 'wan_animate_inflight_v1'

function fingerprint({ imageFile, videoFile, mode, quality }) {
  return [
    imageFile?.name || '', imageFile?.size || 0,
    videoFile?.name || '', videoFile?.size || 0,
    mode, quality,
  ].join('|')
}

export function useWanAnimate() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)

  const jobRef = useRef(null)        // handle returned by submitJob
  const abortRef = useRef(null)      // local AbortController for cancel()
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const setSafe = useCallback((fn) => { if (mountedRef.current) fn() }, [])

  const cancel = useCallback(() => {
    if (jobRef.current) cancelWanJob(jobRef.current)
    abortRef.current?.abort()
    setSafe(() => { setStatus('cancelled'); setProgress(0) })
  }, [setSafe])

  const reset = useCallback(() => {
    cancel()
    setSafe(() => {
      setStatus('idle'); setProgress(0); setStatusText(''); setVideoUrl(null); setError(null)
    })
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [cancel, setSafe])

  const submit = useCallback(async ({
    imageFile, videoFile, mode = DEFAULT_MODE, quality = DEFAULT_QUALITY,
  }) => {
    // 1. Validate
    const errs = validateInputs({ imageFile, videoFile })
    if (errs.length) {
      setError(new Error(errs.join('; ')))
      setStatus('failed')
      return null
    }
    if (!imageFile || !videoFile) {
      setError(new Error('Both reference image and template video are required'))
      setStatus('failed')
      return null
    }

    // 2. Reset prior state
    setError(null); setVideoUrl(null); setStatusText(''); setProgress(0)
    const abort = new AbortController()
    abortRef.current = abort

    // 3. Persist for resume-after-reload (best-effort)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        fingerprint: fingerprint({ imageFile, videoFile, mode, quality }),
        startedAt: Date.now(),
      }))
    } catch {}

    try {
      // 4. Submit (uploads + opens SSE + triggers join)
      setStatus('uploading')
      const job = await submitWanJob({
        imageFile, videoFile, mode, quality, signal: abort.signal,
      })
      jobRef.current = job

      setSafe(() => setStatus('queued'))

      // 5. Poll (awaits the SSE completion promise wired up at submit time)
      setStatus('generating')
      const result = await pollWanJob(job, {
        signal: abort.signal,
        onProgress: ({ progress, statusText }) => {
          setSafe(() => { if (progress != null) setProgress(progress); if (statusText) setStatusText(statusText) })
        },
      })

      // 6. Terminal
      if (result.status === 'succeeded') {
        setSafe(() => {
          setVideoUrl(result.videoUrl)
          setStatusText(result.statusText || 'SUCCEEDED')
          setProgress(100)
          setStatus('succeeded')
        })
      } else {
        setSafe(() => {
          setStatusText(result.statusText || 'FAILED')
          setError(new Error(result.statusText || 'Wan generation failed'))
          setStatus('failed')
        })
      }
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      return result
    } catch (e) {
      if (e.name === 'AbortError' || abort.signal.aborted) {
        setSafe(() => setStatus('cancelled'))
      } else {
        setSafe(() => {
          setError(e instanceof Error ? e : new Error(String(e)))
          setStatus('failed')
        })
      }
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      return null
    }
  }, [setSafe])

  return {
    submit, cancel, reset,
    status, progress, statusText, videoUrl, error,
    isRunning: status === 'uploading' || status === 'queued' || status === 'generating',
  }
}