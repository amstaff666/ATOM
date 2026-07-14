import {
  getElementMeta, getPageMeta, isNavElementId, NAV_FILE,
  resolveNavElementIdFromDom, resolveNavElementIdFromText, resolveNavElementIdFromTree,
} from './pageRegistry'

function rectsIntersect(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function overlapArea(a, b) {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return x * y
}

function getVisibleText(el) {
  if (!el) return ''
  const t = (el.innerText || el.textContent || '').trim()
  return t.slice(0, 200)
}

function buildRect(el) {
  const r = el.getBoundingClientRect()
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  }
}

export function normalizeSelectionRect(start, end) {
  const left = Math.min(start.x, end.x)
  const top = Math.min(start.y, end.y)
  const right = Math.max(start.x, end.x)
  const bottom = Math.max(start.y, end.y)
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function isPickerLayer(el) {
  return el?.closest?.('[data-area-picker]') != null || el?.closest?.('[data-chat-ui]') != null
}

function resolveFile(elementId, meta, route) {
  if (isNavElementId(elementId)) return meta?.file || NAV_FILE
  return meta?.file || getPageMeta(route).file || null
}

function buildSelectionFromElement(el, elementId, meta, route) {
  const inNav = !!el.closest?.('.nav-root')
  const visibleText = getVisibleText(el)
  let resolvedId = elementId || resolveNavElementIdFromTree(el)
  if (!resolvedId && inNav) {
    resolvedId = resolveNavElementIdFromText(visibleText)
  }
  const resolvedMeta = meta || (resolvedId ? getElementMeta(route, resolvedId) : null)
  const rect = buildRect(el)
  const id = resolvedId || null
  return {
    route,
    elementId: id,
    label: resolvedMeta?.label || (inNav ? 'Navigatsioon' : el.tagName?.toLowerCase()) || 'element',
    kind: resolvedMeta?.kind || (inNav ? 'nav' : 'unknown'),
    file: id ? resolveFile(id, resolvedMeta, route) : (inNav ? NAV_FILE : (meta?.file || getPageMeta(route).file || null)),
    visibleText,
    tagName: el.tagName?.toLowerCase() || 'div',
    rect,
    markedRect: null,
    selectorHint: id ? `[data-editable-id="${id}"], [data-nav-id="${id}"]` : (inNav ? '.nav-root' : null),
    isNav: isNavElementId(id) || inNav,
  }
}

export function resolveAreaAtPoint(x, y, route) {
  const stack = (document.elementsFromPoint(x, y) || []).filter(el => !isPickerLayer(el))

  for (const el of stack) {
    const id = el.getAttribute?.('data-editable-id')
    if (id) {
      const meta = getElementMeta(route, id)
      return buildSelectionFromElement(el, id, meta, route)
    }
  }

  for (const el of stack) {
    const navId = resolveNavElementIdFromTree(el)
    if (navId) {
      return buildSelectionFromElement(el, navId, getElementMeta(route, navId), route)
    }
  }

  const leaf = stack.find(el => {
    const tag = el.tagName?.toLowerCase()
    if (!tag || ['html', 'body', 'main', 'section'].includes(tag)) return false
    if (el.closest?.('.nav-root')) return true
    return getVisibleText(el).length > 0
  })
  if (leaf) return buildSelectionFromElement(leaf, null, null, route)
  return null
}

export function resolveAreaInRect(selectionRect, route) {
  const candidates = [...document.querySelectorAll(
    '[data-editable-id], [data-nav-id], .nav-root a, .nav-brand-label, .nav-root button',
  )]
  let best = null
  let bestScore = 0

  for (const el of candidates) {
    const target = el.hasAttribute?.('data-editable-id') ? el : el
    const r = buildRect(target)
    if (!rectsIntersect(r, selectionRect)) continue
    const score = overlapArea(r, selectionRect)
    if (score > bestScore) {
      bestScore = score
      const id = target.getAttribute?.('data-editable-id')
        || target.getAttribute?.('data-nav-id')
        || resolveNavElementIdFromTree(target)
      best = buildSelectionFromElement(target, id, id ? getElementMeta(route, id) : null, route)
    }
  }

  if (best) return best

  const cx = (selectionRect.left + selectionRect.right) / 2
  const cy = (selectionRect.top + selectionRect.bottom) / 2
  return resolveAreaAtPoint(cx, cy, route)
}