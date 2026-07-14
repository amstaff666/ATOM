const STORAGE_KEY = 'chat_undo_v1'
const MAX_ENTRIES = 5

const MUTATING_COMMANDS = new Set([
  'update_element',
  'update_page',
  'create_influencer',
  'update_influencer',
  'delete_influencer',
  'set_theme',
])

function readStack() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeStack(stack) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stack.slice(-MAX_ENTRIES)))
  } catch (e) {
    console.warn('[chatUndo] save failed', e)
  }
}

export function getUndoStack() {
  return readStack().slice().reverse()
}

export function pushUndoEntry({ label, parts }) {
  if (!parts?.length) return
  const stack = readStack()
  stack.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: (label || 'Muudatus').slice(0, 100),
    at: Date.now(),
    parts,
  })
  writeStack(stack)
}

export function popUndoEntry() {
  const stack = readStack()
  if (!stack.length) return null
  const entry = stack.pop()
  writeStack(stack)
  return entry
}

export function snapshotPageOverrides() {
  try {
    return JSON.parse(localStorage.getItem('page_editor_v1') || '{}')
  } catch {
    return {}
  }
}

export function snapshotInfluencers(influencers) {
  return JSON.parse(JSON.stringify(influencers))
}

function commandLabel(cmd) {
  const p = cmd.params || {}
  switch (cmd.type) {
    case 'update_element':
      return `Eelvaade: ${p.elementId || 'element'}${p.text != null ? ` → "${String(p.text).slice(0, 30)}"` : ''}`
    case 'update_page':
      return 'Eelvaade: lehe stiil'
    case 'set_theme':
      return `Teema → ${p.theme || '?'}`
    case 'create_influencer':
      return `Loodud influencer: ${p.name || '?'}`
    case 'update_influencer':
      return `Uuendatud: ${p.name || '?'}`
    case 'delete_influencer':
      return `Kustutatud: ${p.name || '?'}`
    default:
      return cmd.type
  }
}

export function recordCommandUndo(commands, { influencers, theme }) {
  const mutating = (commands || []).filter(c => MUTATING_COMMANDS.has(c.type))
  if (!mutating.length) return

  const parts = []
  if (mutating.some(c => c.type === 'update_element' || c.type === 'update_page')) {
    parts.push({ type: 'page_overrides', data: snapshotPageOverrides() })
  }
  if (mutating.some(c => ['create_influencer', 'update_influencer', 'delete_influencer'].includes(c.type))) {
    parts.push({ type: 'influencers', data: snapshotInfluencers(influencers) })
  }
  if (mutating.some(c => c.type === 'set_theme')) {
    parts.push({ type: 'theme', data: theme })
  }

  const label = mutating.length === 1
    ? commandLabel(mutating[0])
    : `Käsud (${mutating.length}): ${commandLabel(mutating[0])}`

  pushUndoEntry({ label, parts })
}

export function recordPageOverrideUndo(label) {
  pushUndoEntry({
    label: label || 'Eelvaade',
    parts: [{ type: 'page_overrides', data: snapshotPageOverrides() }],
  })
}

export function recordInfluencerUndo(label, influencers) {
  pushUndoEntry({
    label: label || 'Influencer',
    parts: [{ type: 'influencers', data: snapshotInfluencers(influencers) }],
  })
}

export function recordThemeUndo(theme) {
  pushUndoEntry({
    label: `Teema → ${theme === 'light' ? 'light' : 'dark'}`,
    parts: [{ type: 'theme', data: theme }],
  })
}

export function recordSourceFileUndo(label) {
  pushUndoEntry({
    label: label || 'Lähtefail',
    parts: [{ type: 'source_file' }],
  })
}

export async function performUndo({ pageEditor, setInfluencers, setTheme }) {
  const entry = popUndoEntry()
  if (!entry) throw new Error('Võtmiseks pole midagi — undo ajalugu on tühi')

  const restored = []

  for (const part of entry.parts) {
    switch (part.type) {
      case 'page_overrides': {
        const data = part.data || {}
        localStorage.setItem('page_editor_v1', JSON.stringify(data))
        pageEditor?.restoreOverrides?.(data)
        restored.push('eelvaade')
        break
      }
      case 'influencers': {
        setInfluencers(part.data || [])
        restored.push('influencerid')
        break
      }
      case 'theme': {
        const t = part.data === 'light' ? 'light' : 'dark'
        setTheme(t)
        localStorage.setItem('theme', t)
        restored.push('teema')
        break
      }
      case 'source_file': {
        const res = await fetch('/api/undo-source', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error?.message || 'Lähtefaili undo ebaõnnestus')
        }
        restored.push(`fail ${data.file || ''}`.trim())
        break
      }
      default:
        break
    }
  }

  return { label: entry.label, restored }
}