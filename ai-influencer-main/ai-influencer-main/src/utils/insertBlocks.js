export const INSERT_TYPES = {
  text: {
    id: 'text',
    label: 'Lisa tekst',
    emoji: '¶',
    needsContent: true,
    contentLabel: 'Tekst',
    contentPlaceholder: 'Sisesta uus tekst…',
    defaultContent: 'Uus tekst',
  },
  heading: {
    id: 'heading',
    label: 'Lisa pealkiri',
    emoji: 'H',
    needsContent: true,
    contentLabel: 'Pealkiri',
    contentPlaceholder: 'Sisesta pealkiri…',
    defaultContent: 'Uus pealkiri',
  },
  button: {
    id: 'button',
    label: 'Lisa nupp',
    emoji: '◎',
    needsContent: true,
    contentLabel: 'Nupu tekst',
    contentPlaceholder: 'Nt Klõpsa siia',
    defaultContent: 'Uus nupp',
  },
  image: {
    id: 'image',
    label: 'Lisa pilt',
    emoji: '🖼',
    needsUrl: true,
    contentLabel: 'Pildi URL',
    contentPlaceholder: 'Vali arvutist või kleebi URL…',
    defaultContent: '',
  },
  video: {
    id: 'video',
    label: 'Lisa video',
    emoji: '▶',
    needsUrl: true,
    contentLabel: 'Video URL',
    contentPlaceholder: 'Vali arvutist või kleebi URL…',
    defaultContent: '',
  },
  block: {
    id: 'block',
    label: 'Lisa plokk',
    emoji: '▦',
    needsContent: false,
    defaultContent: '',
  },
}

export const INSERT_OPTIONS = Object.values(INSERT_TYPES)

function slugPageId(route, pageId) {
  return (pageId || route.replace(/^\//, '') || 'page').replace(/[^a-z0-9]/gi, '') || 'page'
}

function newInsertId(pageKey, type) {
  return `${pageKey}.insert.${type}.${Date.now().toString(36)}`
}

function esc(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function buildInsertSnippet(type, { pageId, route, content } = {}) {
  const pageKey = slugPageId(route, pageId)
  const t = INSERT_TYPES[type]
  if (!t) throw new Error(`Tundmatu tüüp: ${type}`)

  const text = content?.trim() || t.defaultContent || 'Uus sisu'
  const id = newInsertId(pageKey, type)

  switch (type) {
    case 'text':
      return `<Editable as="p" id="${id}" defaultText="${esc(text)}" style={{ fontSize: 16, color: 'var(--text-primary)', margin: '16px 0', lineHeight: 1.65 }} />`
    case 'heading':
      return `<Editable as="h2" id="${id}" defaultText="${esc(text)}" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: '20px 0 12px', color: 'var(--text-primary)' }} />`
    case 'button':
      return `<Editable as="button" id="${id}" defaultText="${esc(text)}" style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#EC4899,#8B5CF6)', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', margin: '12px 0' }} />`
    case 'image':
      return `<div style={{ margin: '20px 0' }}>
          <img src="${esc(text)}" alt="" style={{ width: '100%', maxWidth: 560, borderRadius: 14, display: 'block' }} />
          <Editable as="p" id="${id}" defaultText="Pildi kirjeldus" style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }} />
        </div>`
    case 'video':
      return `<video src="${esc(text)}" controls playsInline style={{ width: '100%', maxWidth: 640, borderRadius: 14, margin: '20px 0', display: 'block' }} />`
    case 'block': {
      const blockId = id
      return `<div style={{ padding: 24, margin: '20px 0', borderRadius: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Editable as="h3" id="${blockId}.title" defaultText="Uus plokk" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }} />
          <Editable as="p" id="${blockId}.body" defaultText="Lisa siia sisu või kirjeldus…" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }} />
        </div>`
    }
    default:
      throw new Error(`Tundmatu tüüp: ${type}`)
  }
}

export function buildInsertInstruction(type, { content, snippet, selection } = {}) {
  const t = INSERT_TYPES[type]
  const anchor = selection?.elementId
    ? `Editable id="${selection.elementId}"`
    : selection?.visibleText
    ? `tekst "${selection.visibleText}"`
    : 'märgitud ala lähedal olev element'

  return `Lisa lehele uus ${t?.label?.toLowerCase() || type} ${anchor} järele (sama parent konteineris, JSX sibling).
${content ? `Kasutaja sisu: "${content}"` : ''}

Kleebi TÄPSELT see JSX snippet otse pärast ankru-elementi:
${snippet}

Reeglid:
- Ära kustuta olemasolevat koodi.
- Lisa import Editable kui failis seda pole veel.
- Säilita ülejäänud fail muutmata.`
}

export function parseInsertCommand(text) {
  const m = text.trim().match(/^\/lisa\s+(tekst|pealkiri|nupp|pilt|video|plokk)(?:\s+(.+))?$/i)
  if (!m) return null
  const map = {
    tekst: 'text',
    pealkiri: 'heading',
    nupp: 'button',
    pilt: 'image',
    video: 'video',
    plokk: 'block',
  }
  const type = map[m[1].toLowerCase()]
  const rest = m[2]?.trim() || ''
  return { type, content: rest }
}

export function matchInsertIntent(text) {
  const m = text.trim().match(/^lisa\s+(tekst|pealkiri|nuppu?|pilt|video|plokki?|element)(?:\s+(.+))?$/i)
  if (!m) return null
  const map = {
    tekst: 'text',
    pealkiri: 'heading',
    nupp: 'button',
    nuppu: 'button',
    pilt: 'image',
    video: 'video',
    plokk: 'block',
    plokki: 'block',
    element: 'block',
  }
  return { type: map[m[1].toLowerCase()] || 'block', content: m[2]?.trim() || '' }
}