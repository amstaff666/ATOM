const STYLE_KEYS = [
  'color', 'background', 'backgroundColor', 'fontSize', 'fontWeight',
  'padding', 'margin', 'borderRadius', 'opacity', 'letterSpacing', 'lineHeight',
]

export const APP_COMMAND_TYPES = [
  'navigate',
  'set_theme',
  'create_influencer',
  'update_influencer',
  'delete_influencer',
  'list_influencers',
  'update_element',
  'update_page',
  'select_element',
]

const ROUTES = {
  home: '/',
  influencers: '/influencers',
  create: '/create',
  settings: '/settings',
  inspiration: '/inspiration',
  'brand-deals': '/brand-deals',
  branddeals: '/brand-deals',
}

export function buildCommandSystemPrompt(context = {}) {
  const influencers = (context.influencers || []).map(i => `- ${i.name} (${i.niche || 'n/a'})`).join('\n') || '(tühi)'
  const elements = (context.editableElements || [])
    .map(e => `- ${e.id}: "${e.label}" [${e.kind}] tekst="${e.currentText ?? e.defaultText ?? ''}"`)
    .join('\n') || '(sellel lehel pole registreeritud elemente)'

  const active = context.activeElement
    ? `${context.activeElement.id} ("${context.activeElement.label}")`
    : '(pole valitud — kasuta select_element või küsi kasutajalt elementi valida)'

  return `You are the command interpreter for AI Influencer Studio. Parse the user's request and return JSON ONLY.

Available command types:
- navigate: { "path": "/influencers" | "/create" | "/settings" | "/inspiration" | "/brand-deals" | "/" }
- set_theme: { "theme": "dark" | "light" }
- create_influencer: { "name": string, "backstory"?: string, "niche"?: string, "gender"?: "Female"|"Male" }
- update_influencer: { "name": string, "backstory"?: string, "niche"?: string, "physicalDesc"?: string, "audience"?: string }
- delete_influencer: { "name": string }
- list_influencers: {}
- select_element: { "elementId": string } — vali element muutmiseks
- update_element: { "elementId": string, "text"?: string, "style"?: { "color"?, "background"?, "fontSize"?, "fontWeight"?, "padding"?, "borderRadius"?, "opacity"? } }
- update_page: { "style"?: { "background"?, "color"?, "padding"? } } — muudab praeguse lehe tausta/stiili

CURRENT PAGE CONTEXT (critical):
- route: ${context.route || '/'}
- page: ${context.page?.label || 'unknown'} (${context.page?.id || ''})
- active element: ${active}
- pick mode: ${context.pickMode ? 'on' : 'off'}

Editable elements on this page:
${elements}

Current page style overrides: ${JSON.stringify(context.pageStyle || {})}

Other context:
- theme: ${context.theme || 'dark'}
- influencers:
${influencers}

Response schema:
{"reply":"confirmation in user's language","commands":[{"type":"...","params":{}}]}

Rules:
- Nav/header elements (nav.brand, nav.link.influencers, nav.create, etc.) are GLOBAL — use their elementId for update_element; source file is Nav.jsx.
- When user wants to change "this page", "current element", "heading", "button text", "color", "nav", "menu" — use update_element or update_page on the CURRENT route.
- If user refers to active/current element, use active element id above; if none, use select_element first OR pick elementId from the list by label.
- For text changes use update_element.text; for design use update_element.style.
- Use same language as user for reply.
- Max 6 commands per response.`
}

export function parseCommandResponse(text, context = {}) {
  if (!text?.trim()) throw new Error('Tühi vastus serverist')
  let raw = text.trim()
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Server ei tagastanud JSON käske')
  const parsed = JSON.parse(raw.slice(start, end + 1))
  if (!parsed || typeof parsed.reply !== 'string') throw new Error('Vigane käsu vastus (puudub reply)')
  const commands = Array.isArray(parsed.commands) ? parsed.commands : []
  return {
    reply: parsed.reply.trim(),
    commands: commands.map(c => sanitizeCommand(c, context)).filter(Boolean),
  }
}

function pickStyle(obj = {}) {
  const style = {}
  for (const k of STYLE_KEYS) {
    if (obj[k] != null && obj[k] !== '') style[k] = String(obj[k])
  }
  return style
}

function resolveElementId(elementId, label, context) {
  if (elementId) return elementId
  const elements = context.editableElements || []
  if (context.activeElement?.id) return context.activeElement.id
  if (!label) return null
  const q = label.toLowerCase()
  const hit = elements.find(e => e.label?.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
  return hit?.id || null
}

function sanitizeCommand(cmd, context = {}) {
  if (!cmd || typeof cmd.type !== 'string') return null
  if (!APP_COMMAND_TYPES.includes(cmd.type)) return null
  const params = cmd.params && typeof cmd.params === 'object' ? { ...cmd.params } : {}

  if (cmd.type === 'navigate') {
    const path = ROUTES[params.path?.replace(/^\//, '').toLowerCase()] || params.path
    if (!path || typeof path !== 'string') return null
    return { type: 'navigate', params: { path } }
  }
  if (cmd.type === 'set_theme') {
    const theme = params.theme === 'light' ? 'light' : params.theme === 'dark' ? 'dark' : null
    if (!theme) return null
    return { type: 'set_theme', params: { theme } }
  }
  if (cmd.type === 'list_influencers') return { type: 'list_influencers', params: {} }
  if (['create_influencer', 'update_influencer', 'delete_influencer'].includes(cmd.type)) {
    if (!params.name || typeof params.name !== 'string') return null
    return { type: cmd.type, params }
  }
  if (cmd.type === 'select_element') {
    const elementId = resolveElementId(params.elementId, params.label, context)
    if (!elementId) return null
    return { type: 'select_element', params: { elementId } }
  }
  if (cmd.type === 'update_element') {
    const elementId = resolveElementId(params.elementId, params.label, context)
    if (!elementId) return null
    const style = pickStyle(params.style)
    const out = { elementId }
    if (params.text != null) out.text = String(params.text)
    if (Object.keys(style).length) out.style = style
    if (out.text == null && !Object.keys(style).length) return null
    return { type: 'update_element', params: out }
  }
  if (cmd.type === 'update_page') {
    const style = pickStyle(params.style)
    if (!Object.keys(style).length) return null
    return { type: 'update_page', params: { style } }
  }
  return null
}

export function sanitizeCommandsList(commands, context = {}) {
  if (!Array.isArray(commands)) return []
  return commands.map(c => sanitizeCommand(c, context)).filter(Boolean)
}