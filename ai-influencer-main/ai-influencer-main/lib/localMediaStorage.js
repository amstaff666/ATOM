import fs from 'fs/promises'
import path from 'path'

const UPLOAD_ROOT = 'public/uploads'
const DIRS = {
  image: 'images',
  video: 'videos',
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v'])
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'])

const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_VIDEO_BYTES = 80 * 1024 * 1024

function safeBaseName(name) {
  const base = path.basename(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
  return base.slice(0, 80) || 'file'
}

function extFromMime(mime, type) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-m4v': '.m4v',
  }
  if (map[mime]) return map[mime]
  return type === 'video' ? '.mp4' : '.jpg'
}

function validateType(type, ext, mime) {
  if (type === 'image') {
    if (!IMAGE_EXT.has(ext.toLowerCase()) && !IMAGE_MIME.has(mime)) {
      throw new Error('Lubatud on ainult pildiformaadid (jpg, png, gif, webp, svg)')
    }
    return 'image'
  }
  if (type === 'video') {
    if (!VIDEO_EXT.has(ext.toLowerCase()) && !VIDEO_MIME.has(mime)) {
      throw new Error('Lubatud on ainult videod (mp4, webm, mov)')
    }
    return 'video'
  }
  throw new Error('type peab olema image või video')
}

async function ensureDir(absDir) {
  await fs.mkdir(absDir, { recursive: true })
}

export async function saveUploadedMedia({ type, filename, mimeType, dataBase64 }) {
  if (!dataBase64) throw new Error('Faili sisu puudub')

  const rawExt = path.extname(filename || '')
  const kind = validateType(type, rawExt, mimeType || '')
  const buf = Buffer.from(dataBase64, 'base64')

  const max = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (buf.length > max) {
    throw new Error(`Fail on liiga suur (max ${kind === 'video' ? '80' : '15'} MB)`)
  }

  const ext = rawExt || extFromMime(mimeType, kind)
  const storedName = `${Date.now()}-${safeBaseName(path.basename(filename, ext))}${ext}`
  const relDir = path.join(UPLOAD_ROOT, DIRS[kind]).replace(/\\/g, '/')
  const absDir = path.join(process.cwd(), relDir)
  await ensureDir(absDir)

  const relPath = `${relDir}/${storedName}`
  const absPath = path.join(process.cwd(), relPath)
  await fs.writeFile(absPath, buf)

  const url = `/${relDir}/${storedName}`.replace(/\\/g, '/')
  return {
    url,
    path: relPath.replace(/\\/g, '/'),
    name: storedName,
    type: kind,
    size: buf.length,
  }
}

export async function listUploadedMedia(type) {
  const kind = type === 'video' ? 'video' : 'image'
  const relDir = path.join(UPLOAD_ROOT, DIRS[kind]).replace(/\\/g, '/')
  const absDir = path.join(process.cwd(), relDir)
  await ensureDir(absDir)

  const entries = await fs.readdir(absDir, { withFileTypes: true })
  const files = []

  for (const ent of entries) {
    if (!ent.isFile()) continue
    const ext = path.extname(ent.name).toLowerCase()
    const allowed = kind === 'video' ? VIDEO_EXT : IMAGE_EXT
    if (!allowed.has(ext)) continue
    const abs = path.join(absDir, ent.name)
    const stat = await fs.stat(abs)
    const url = `/${relDir}/${ent.name}`.replace(/\\/g, '/')
    files.push({
      url,
      name: ent.name,
      type: kind,
      size: stat.size,
      mtime: stat.mtimeMs,
    })
  }

  files.sort((a, b) => b.mtime - a.mtime)
  return files
}