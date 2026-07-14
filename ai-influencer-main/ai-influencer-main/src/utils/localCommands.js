const ROUTES = {
  home: '/',
  influencers: '/influencers',
  create: '/create',
  settings: '/settings',
  inspiration: '/inspiration',
  'brand-deals': '/brand-deals',
  branddeals: '/brand-deals',
}

export function parseLocalCommand(input) {
  const text = input.trim()
  if (!text) return null

  if (text === '/help' || text === '/abi') {
    return {
      reply: 'Kiirkäsud: /vali (küsi ala kohta), /muuda (muuda faili), /kliki (elemendi valimine), /lisa tekst, /tühista.',
      commands: [],
    }
  }

  const elementPick = text.match(/^\/element\s+(\S+)/i)
  if (elementPick) {
    return {
      reply: `Valin elemendi ${elementPick[1]}.`,
      commands: [{ type: 'select_element', params: { elementId: elementPick[1] } }],
    }
  }

  if (/^\/(tume|dark)$/i.test(text)) {
    return { reply: 'Lülitan tumeda teema sisse.', commands: [{ type: 'set_theme', params: { theme: 'dark' } }] }
  }
  if (/^\/(hele|light)$/i.test(text)) {
    return { reply: 'Lülitan heleda teema sisse.', commands: [{ type: 'set_theme', params: { theme: 'light' } }] }
  }

  const go = text.match(/^\/(?:mine|go)\s+(\S+)/i)
  if (go) {
    const path = ROUTES[go[1].toLowerCase()]
    if (path) return { reply: `Navigeerin: ${path}`, commands: [{ type: 'navigate', params: { path } }] }
  }

  const create = text.match(/^\/(?:loo|create)\s+(.+)/i)
  if (create) {
    const name = create[1].trim()
    return {
      reply: `Loon influencera "${name}".`,
      commands: [{ type: 'create_influencer', params: { name } }],
    }
  }

  const list = text.match(/^\/(?:nimekiri|list)$/i)
  if (list) {
    return { reply: 'Loen influencerite nimekirja.', commands: [{ type: 'list_influencers', params: {} }] }
  }

  if (/^\/tühista$/i.test(text) || /^\/clear$/i.test(text)) {
    return { reply: 'Tühistan valitud ala.', commands: [{ type: 'clear_area', params: {} }] }
  }

  return null
}

export function isPickModeToggle(input) {
  return /^\/kliki$/i.test(input.trim())
}

export function isAreaPickModeToggle(input) {
  return /^\/muuda$/i.test(input.trim())
}