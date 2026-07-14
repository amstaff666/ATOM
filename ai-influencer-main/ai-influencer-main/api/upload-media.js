import { rateLimit, clientIp } from '../lib/rateLimit.js'
import { saveUploadedMedia, listUploadedMedia } from '../lib/localMediaStorage.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (process.env.VERCEL) {
    return res.status(501).json({
      error: { message: 'Kohalike failide salvestamine töötab ainult dev-keskkonnas (npm run dev).' },
    })
  }

  const rl = rateLimit(clientIp(req.headers))
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: { message: 'Liiga palju päringuid — oota hetk.' } })
  }

  if (req.method === 'GET') {
    try {
      const type = req.query?.type === 'video' ? 'video' : 'image'
      const files = await listUploadedMedia(type)
      return res.status(200).json({ files })
    } catch (e) {
      return res.status(500).json({ error: { message: e.message } })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  const { type, filename, mimeType, data } = req.body || {}
  if (!type || !data) {
    return res.status(400).json({ error: { message: 'type ja data on kohustuslikud' } })
  }

  try {
    const saved = await saveUploadedMedia({
      type,
      filename,
      mimeType,
      dataBase64: data,
    })
    return res.status(200).json(saved)
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } })
  }
}