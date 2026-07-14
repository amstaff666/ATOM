export const STYLE_KEYS = [
  'color', 'background', 'backgroundColor', 'fontSize', 'fontWeight',
  'padding', 'margin', 'borderRadius', 'opacity', 'letterSpacing', 'lineHeight',
]

export const NAV_STORAGE_KEY = '__nav__'
export const NAV_FILE = 'src/components/Nav.jsx'

/** Globaalne header — sama kõigil lehtedel */
export const NAV_REGISTRY = {
  'nav.brand': { label: 'Logo tekst', kind: 'text', defaultText: 'Influencer Studio', file: NAV_FILE },
  'nav.link.influencers': { label: 'Nav: Influencers', kind: 'link', defaultText: 'Influencers', file: NAV_FILE },
  'nav.link.inspiration': { label: 'Nav: Inspiration', kind: 'link', defaultText: 'Inspiration', file: NAV_FILE },
  'nav.link.brand-deals': { label: 'Nav: Brand Deals', kind: 'link', defaultText: 'Brand Deals', file: NAV_FILE },
  'nav.create': { label: 'Nav: Create nupp', kind: 'button', defaultText: '+ Create', file: NAV_FILE },
  'nav.theme': { label: 'Nav: teema nupp', kind: 'button', defaultText: 'Theme toggle', file: NAV_FILE },
  'nav.settings': { label: 'Nav: Settings', kind: 'link', defaultText: 'Settings', file: NAV_FILE },
}

const NAV_TEXT_TO_ID = Object.fromEntries(
  Object.entries(NAV_REGISTRY)
    .filter(([, m]) => m.defaultText)
    .map(([id, m]) => [m.defaultText.trim().toLowerCase(), id]),
)

export const PAGE_REGISTRY = {
  '/': {
    id: 'landing',
    label: 'Avaleht',
    file: 'src/pages/Landing.jsx',
    elements: {
      'landing.badge': { label: 'Ülemine silt', kind: 'text', defaultText: 'Made by Dan Kieft', file: 'src/pages/Landing.jsx' },
      'landing.title': { label: 'Pealkiri', kind: 'text', defaultText: 'Create Your', file: 'src/pages/Landing.jsx' },
      'landing.subtitle': { label: 'Kirjeldus', kind: 'text', defaultText: 'Build, manage, and grow your AI influencers.', file: 'src/pages/Landing.jsx' },
      'landing.cta': { label: 'CTA nupp', kind: 'button', defaultText: 'Get Started →', file: 'src/pages/Landing.jsx' },
    },
  },
  '/settings': {
    id: 'settings',
    label: 'Seaded',
    file: 'src/pages/Settings.jsx',
    elements: {
      'settings.title': { label: 'Lehe pealkiri', kind: 'text', defaultText: 'Settings', file: 'src/pages/Settings.jsx' },
    },
  },
  '/inspiration': {
    id: 'inspiration',
    label: 'Inspiratsioon',
    file: 'src/pages/Inspiration.jsx',
    elements: {
      'inspiration.title': { label: 'Lehe pealkiri', kind: 'text', defaultText: 'Inspiration', file: 'src/pages/Inspiration.jsx' },
    },
  },
  '/influencers': {
    id: 'influencers',
    label: 'Influencerid',
    file: 'src/pages/Influencers.jsx',
    elements: {
      'influencers.heading': { label: 'Lehe pealkiri', kind: 'text', defaultText: 'Your Influencers', file: 'src/pages/Influencers.jsx' },
    },
  },
  '/create': {
    id: 'create',
    label: 'Loo influencer',
    file: 'src/pages/Create.jsx',
    elements: {
      'create.heading': { label: 'Wizard pealkiri', kind: 'text', defaultText: 'Create Influencer', file: 'src/pages/Create.jsx' },
    },
  },
  '/brand-deals': {
    id: 'brand-deals',
    label: 'Brand Deals',
    file: 'src/pages/BrandDeals.jsx',
    elements: {
      'branddeals.title': { label: 'Lehe pealkiri', kind: 'text', defaultText: 'Brand Deals', file: 'src/pages/BrandDeals.jsx' },
    },
  },
}

export function isNavElementId(elementId) {
  return typeof elementId === 'string' && elementId.startsWith('nav.')
}

export function overrideStorageKey(elementId, route) {
  return isNavElementId(elementId) ? NAV_STORAGE_KEY : route
}

export function getPageMeta(route) {
  return PAGE_REGISTRY[route] || { id: 'unknown', label: route, elements: {} }
}

export function getElementMeta(route, elementId) {
  if (isNavElementId(elementId)) return NAV_REGISTRY[elementId] || null
  const page = getPageMeta(route)
  return page.elements?.[elementId] || null
}

export function listEditableElements(route) {
  const page = getPageMeta(route)
  const pageEls = Object.entries(page.elements || {}).map(([id, meta]) => ({ id, ...meta }))
  const navEls = Object.entries(NAV_REGISTRY).map(([id, meta]) => ({ id, ...meta, global: true }))
  return [...navEls, ...pageEls]
}

export function resolveSourceFile(route, elementId) {
  if (isNavElementId(elementId)) {
    return NAV_REGISTRY[elementId]?.file || NAV_FILE
  }
  if (elementId) {
    const el = getElementMeta(route, elementId)
    if (el?.file) return el.file
  }
  return getPageMeta(route).file || null
}

const NAV_HREF_TO_ID = {
  '/influencers': 'nav.link.influencers',
  '/inspiration': 'nav.link.inspiration',
  '/brand-deals': 'nav.link.brand-deals',
  '/create': 'nav.create',
  '/settings': 'nav.settings',
}

/** Tuvasta nav element ilma data-editable-id-ta (vanad markup-id) */
export function resolveNavElementIdFromDom(el) {
  if (!el) return null

  const navRoot = el.closest?.('.nav-root')
  if (!navRoot) return null

  const navId = el.closest?.('[data-nav-id]')?.getAttribute('data-nav-id')
  if (isNavElementId(navId)) return navId

  const editable = el.closest?.('[data-editable-id]')
  if (editable) {
    const id = editable.getAttribute('data-editable-id')
    if (isNavElementId(id)) return id
  }

  if (el.classList?.contains('nav-brand-label') || el.closest?.('.nav-brand-label')) return 'nav.brand'

  const link = el.closest?.('a.nav-link, a[href]')
  if (link) {
    const href = link.getAttribute('href') || ''
    if (href === '/') {
      if (link.querySelector?.('[data-editable-id="nav.brand"], .nav-brand-label')) return 'nav.brand'
      return 'nav.brand'
    }
    if (NAV_HREF_TO_ID[href]) return NAV_HREF_TO_ID[href]
  }

  if (el.closest?.('button[title*="mode"], button[title*="teema"]')) return 'nav.theme'

  return null
}

/** Tuvasta nav element nähtava teksti järgi */
export function resolveNavElementIdFromText(text) {
  const q = (text || '').trim().toLowerCase()
  if (!q) return null
  if (NAV_TEXT_TO_ID[q]) return NAV_TEXT_TO_ID[q]
  const hit = Object.entries(NAV_REGISTRY).find(([, m]) => {
    const d = (m.defaultText || '').toLowerCase()
    return d && (q.includes(d) || d.includes(q))
  })
  return hit?.[0] || null
}

/** Tuvasta nav element, käies üles DOM-is */
export function resolveNavElementIdFromTree(el) {
  let cur = el
  while (cur && cur !== document.body) {
    const id = resolveNavElementIdFromDom(cur)
    if (id) return id
    cur = cur.parentElement
  }
  return null
}