// ─────────────────────────────────────────────────────────────────────────────
// WanAnimateStudio — drop-in UI block for Wan 2.2 Animate
// ─────────────────────────────────────────────────────────────────────────────
// Self-contained. Renders: ref image picker + template video picker +
// mode/quality dropdowns + Generate / Cancel buttons + progress + result
// video player. Uses inline styles + CSS vars per project convention.
//
// Usage from a parent (e.g. inside Influencers.jsx Video Studio):
//
//   import WanAnimateStudio from '../components/WanAnimateStudio'
//
//   <WanAnimateStudio
//     defaultImageUrl={influencer.generationHistory?.find(h=>h.type==='photo')?.url}
//     onVideoReady={(url) => onUpdate({ generationHistory: [{id:generateId(),
//                                  type:'video', label:'Wan Animate', url, date:Date.now()},
//                                  ...(influencer.generationHistory||[])] })}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { useWanAnimate } from '../hooks/useWanAnimate'
import { WAN_MODES, WAN_QUALITIES, WAN_LIMITS, _backend } from '../utils/wanAnimate'

const MODE_LABELS = {
  'wan2.2-animate-move': 'Move — drive character from video',
  'wan2.2-animate-mix':  'Mix — replace character in video',
}
const QUALITY_LABELS = {
  'wan-pro': 'Pro — 25fps · 720p',
  'wan-std': 'Std — 15fps · 720p',
}

function fileFromUrl(url, name, type) {
  // Convert a remote URL (e.g. previous photo) to a File-like blob the upload
  // endpoint can consume. Falls back to fetching the URL.
  return fetch(url)
    .then(r => r.blob())
    .then(blob => new File([blob], name || 'image', { type: type || blob.type || 'image/jpeg' }))
}

export default function WanAnimateStudio({ defaultImageUrl, onVideoReady, style = {} }) {
  const {
    submit, cancel, reset,
    status, progress, statusText, videoUrl, error, isRunning,
  } = useWanAnimate()

  const [imageFile, setImageFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [mode, setMode] = useState(WAN_MODES[0])
  const [quality, setQuality] = useState(WAN_QUALITIES[0])
  const [prefillNote, setPrefillNote] = useState('')

  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  function pickImageFromHistory(url) {
    fileFromUrl(url, 'reference.jpg').then(f => {
      setImageFile(f)
      setPrefillNote(`Loaded reference from history (${Math.round(f.size / 1024)} KB)`)
    }).catch(e => setPrefillNote(`Failed to load: ${e.message}`))
  }

  async function handleGenerate() {
    const result = await submit({ imageFile, videoFile, mode, quality })
    if (result?.videoUrl && onVideoReady) onVideoReady(result.videoUrl)
  }

  // ── Styles (inline + CSS vars per CLAUDE.md) ────────────────────────
  const wrap = {
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 16,
    background: 'var(--bg-card, var(--bg))',
    color: 'var(--text-primary)',
    display: 'flex', flexDirection: 'column', gap: 12,
    ...style,
  }
  const headerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }
  const title = { fontSize: 18, fontWeight: 600, margin: 0 }
  const sub = { fontSize: 12, color: 'var(--text-secondary)', margin: 0 }
  const row = { display: 'flex', gap: 12, flexWrap: 'wrap' }
  const col = { display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 220px', minWidth: 220 }
  const label = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }
  const btn = (variant = 'primary') => ({
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: variant === 'primary' ? 'var(--accent, #5b8def)' : 'var(--bg-elev, #2a2a2a)',
    color: variant === 'primary' ? '#fff' : 'var(--text-primary)',
    cursor: 'pointer', fontWeight: 500,
    opacity: isRunning && variant === 'primary' ? 0.6 : 1,
  })
  const picker = (hasFile) => ({
    border: `2px dashed ${hasFile ? 'var(--accent, #5b8def)' : 'var(--border)'}`,
    borderRadius: 8, padding: 12, textAlign: 'center',
    background: hasFile ? 'var(--bg-elev, rgba(91,141,239,0.06))' : 'transparent',
    cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
  })
  const progressOuter = {
    height: 6, background: 'var(--bg-elev, #2a2a2a)', borderRadius: 3, overflow: 'hidden',
  }
  const progressInner = {
    height: '100%', background: 'var(--accent, #5b8def)',
    width: `${progress}%`, transition: 'width 0.4s ease',
  }
  const statusChip = (s) => {
    const color = {
      idle: 'var(--text-secondary)',
      uploading: 'var(--text-secondary)',
      queued: '#d4a017',
      generating: '#5b8def',
      succeeded: '#3fb950',
      failed: '#f85149',
      cancelled: '#8b949e',
    }[s] || 'var(--text-secondary)'
    return {
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, background: color, color: '#fff',
    }
  }

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <h3 style={title}>Wan 2.2 Animate</h3>
        <span style={statusChip(status)}>{status.toUpperCase()}</span>
      </div>
      <p style={sub}>
        Animate or replace a character using a reference image + template video.
        Backend: <code>{_backend}</code>.
      </p>

      <div style={row}>
        <div style={col}>
          <span style={label}>Reference image (jpg/png/webp/bmp · ≤ {WAN_LIMITS.image.maxBytes / 1024 / 1024}MB)</span>
          <label style={picker(!!imageFile)} onClick={() => imageInputRef.current?.click()}>
            {imageFile ? `${imageFile.name} · ${Math.round(imageFile.size / 1024)} KB` : 'Click to pick an image'}
          </label>
          <input
            ref={imageInputRef}
            type="file"
            accept={WAN_LIMITS.acceptedImageFormats.join(',')}
            style={{ display: 'none' }}
            onChange={e => { setImageFile(e.target.files?.[0] || null); setPrefillNote('') }}
          />
          {defaultImageUrl && !imageFile && (
            <button type="button" onClick={() => pickImageFromHistory(defaultImageUrl)} style={{ ...btn('secondary'), padding: '6px 10px', fontSize: 12 }}>
              Use last photo from history
            </button>
          )}
        </div>

        <div style={col}>
          <span style={label}>Template video (mp4/avi/mov · ≤ {WAN_LIMITS.video.maxBytes / 1024 / 1024}MB · {WAN_LIMITS.video.minDurationS}–{WAN_LIMITS.video.maxDurationS}s)</span>
          <label style={picker(!!videoFile)} onClick={() => videoInputRef.current?.click()}>
            {videoFile ? `${videoFile.name} · ${Math.round(videoFile.size / 1024 / 1024)} MB` : 'Click to pick a video'}
          </label>
          <input
            ref={videoInputRef}
            type="file"
            accept={WAN_LIMITS.acceptedVideoFormats.join(',')}
            style={{ display: 'none' }}
            onChange={e => setVideoFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div style={row}>
        <div style={col}>
          <span style={label}>Mode</span>
          <select value={mode} onChange={e => setMode(e.target.value)} disabled={isRunning}
            style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elev, #2a2a2a)', color: 'var(--text-primary)' }}>
            {WAN_MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
          </select>
        </div>
        <div style={col}>
          <span style={label}>Quality</span>
          <select value={quality} onChange={e => setQuality(e.target.value)} disabled={isRunning}
            style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elev, #2a2a2a)', color: 'var(--text-primary)' }}>
            {WAN_QUALITIES.map(q => <option key={q} value={q}>{QUALITY_LABELS[q]}</option>)}
          </select>
        </div>
      </div>

      {prefillNote && <p style={{ ...sub, fontStyle: 'italic' }}>{prefillNote}</p>}

      {isRunning && (
        <div style={progressOuter}><div style={progressInner} /></div>
      )}

      {statusText && !isRunning && (
        <p style={{ ...sub, color: status === 'failed' ? '#f85149' : 'var(--text-secondary)' }}>
          {statusText}
        </p>
      )}
      {error && status !== 'failed' && (
        <p style={{ ...sub, color: '#f85149' }}>{error.message}</p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {!isRunning ? (
          <button type="button" style={btn('primary')} onClick={handleGenerate}
            disabled={!imageFile || !videoFile}>
            Generate
          </button>
        ) : (
          <button type="button" style={btn('secondary')} onClick={cancel}>
            Cancel
          </button>
        )}
        {(status === 'succeeded' || status === 'failed' || status === 'cancelled') && (
          <button type="button" style={btn('secondary')} onClick={reset}>Reset</button>
        )}
      </div>

      {videoUrl && (
        <div style={{ marginTop: 8 }}>
          <span style={label}>Result</span>
          <video src={videoUrl} controls style={{ width: '100%', borderRadius: 8, marginTop: 4 }} />
          <a href={videoUrl} download={`wan-animate-${Date.now()}.mp4`}
             style={{ display: 'inline-block', marginTop: 4, color: 'var(--accent, #5b8def)', fontSize: 13 }}>
            Download MP4
          </a>
        </div>
      )}
    </div>
  )
}