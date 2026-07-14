import fs from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

const ROOT = path.join(process.cwd(), '.chat-undo')
const STACK_FILE = path.join(ROOT, 'stack.json')
const FILES_DIR = path.join(ROOT, 'files')
const MAX_ENTRIES = 5

async function ensureDirs() {
  await fs.mkdir(FILES_DIR, { recursive: true })
  try {
    await fs.access(STACK_FILE)
  } catch {
    await fs.writeFile(STACK_FILE, '[]', 'utf8')
  }
}

async function readStack() {
  await ensureDirs()
  const raw = await fs.readFile(STACK_FILE, 'utf8')
  return JSON.parse(raw || '[]')
}

async function writeStack(stack) {
  await fs.writeFile(STACK_FILE, JSON.stringify(stack), 'utf8')
}

export async function pushSourceUndo({ file, previousContent, label }) {
  await ensureDirs()
  const stack = await readStack()
  const id = `${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
  const safeName = file.replace(/[/\\]/g, '__')
  const backupPath = path.join(FILES_DIR, `${id}__${safeName}`)
  await fs.writeFile(backupPath, previousContent, 'utf8')

  stack.push({
    id,
    file,
    backupPath,
    label: (label || file).slice(0, 120),
    at: Date.now(),
  })

  while (stack.length > MAX_ENTRIES) {
    const removed = stack.shift()
    await fs.unlink(removed.backupPath).catch(() => {})
  }

  await writeStack(stack)
  return id
}

export async function popSourceUndo() {
  const stack = await readStack()
  if (!stack.length) return null

  const entry = stack.pop()
  const content = await fs.readFile(entry.backupPath, 'utf8')
  const abs = path.join(process.cwd(), entry.file.replace(/\\/g, '/'))
  await fs.writeFile(abs, content, 'utf8')
  await fs.unlink(entry.backupPath).catch(() => {})
  await writeStack(stack)

  return { file: entry.file, label: entry.label }
}

export async function peekSourceUndoStack() {
  const stack = await readStack()
  return stack.slice(-MAX_ENTRIES).reverse().map(e => ({
    id: e.id,
    file: e.file,
    label: e.label,
    at: e.at,
  }))
}