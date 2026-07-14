const UPLOAD_ENDPOINT = '/api/upload-media'

function parseError(data, status) {
  return data?.error?.message || data?.message || `Viga ${status}`
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Faili lugemine ebaõnnestus'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error || new Error('Faili lugemine ebaõnnestus'))
    reader.readAsDataURL(file)
  })
}

export async function listLocalMedia(type) {
  const kind = type === 'video' ? 'video' : 'image'
  const res = await fetch(`${UPLOAD_ENDPOINT}?type=${kind}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseError(data, res.status))
  return Array.isArray(data.files) ? data.files : []
}

export async function uploadLocalMedia(file, type) {
  if (!file) throw new Error('Fail puudub')
  const data = await fileToBase64(file)
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: type === 'video' ? 'video' : 'image',
      filename: file.name,
      mimeType: file.type,
      data,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseError(json, res.status))
  return json
}

export function mediaAccept(type) {
  return type === 'video' ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov' : 'image/*'
}