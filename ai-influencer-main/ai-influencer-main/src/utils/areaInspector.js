import {
  NAV_FILE, isNavElementId, resolveNavElementIdFromText, resolveNavElementIdFromTree,
} from './pageRegistry'

const STYLE_PROPS = [
  'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily',
  'padding', 'margin', 'borderRadius', 'display', 'width', 'height',
  'lineHeight', 'letterSpacing', 'opacity', 'textAlign',
]

export function captureDomDetail(el) {
  if (!el || !el.getBoundingClientRect) return null
  const cs = getComputedStyle(el)
  const computed = {}
  for (const k of STYLE_PROPS) computed[k] = cs[k]

  const ancestors = []
  let cur = el.parentElement
  for (let i = 0; i < 4 && cur; i++) {
    ancestors.push({
      tag: cur.tagName?.toLowerCase(),
      id: cur.id || null,
      className: typeof cur.className === 'string' ? cur.className.slice(0, 80) : null,
      editableId: cur.getAttribute?.('data-editable-id') || null,
    })
    cur = cur.parentElement
  }

  return {
    outerHtml: (el.outerHTML || '').slice(0, 2500),
    className: typeof el.className === 'string' ? el.className.slice(0, 120) : null,
    htmlId: el.id || null,
    ariaLabel: el.getAttribute?.('aria-label') || null,
    role: el.getAttribute?.('role') || null,
    computed,
    ancestors,
    childCount: el.children?.length ?? 0,
  }
}

export function enrichSelectionWithDom(selection, route) {
  if (!selection) return null
  let el = null
  let elementId = selection.elementId || null

  if (elementId) {
    el = document.querySelector(`[data-editable-id="${elementId}"], [data-nav-id="${elementId}"]`)
  }
  if (!el && selection.markedRect) {
    const cx = (selection.markedRect.left + selection.markedRect.right) / 2
    const cy = (selection.markedRect.top + selection.markedRect.bottom) / 2
    const stack = (document.elementsFromPoint(cx, cy) || [])
      .filter(n => !n.closest?.('[data-area-picker]') && !n.closest?.('[data-chat-ui]'))
    for (const node of stack) {
      const navId = resolveNavElementIdFromTree(node)
      if (navId) {
        elementId = elementId || navId
        el = node.closest?.(`[data-editable-id="${navId}"], [data-nav-id="${navId}"]`) || node
        break
      }
      const editable = node.closest?.('[data-editable-id]')
      if (editable) {
        el = editable
        elementId = elementId || editable.getAttribute('data-editable-id')
        break
      }
    }
    el = el || stack[0] || null
  }

  if (!elementId && selection.visibleText) {
    elementId = resolveNavElementIdFromText(selection.visibleText)
  }
  if (!elementId && el) {
    elementId = resolveNavElementIdFromTree(el)
  }

  const inNav = selection.isNav || !!el?.closest?.('.nav-root')
  const file = elementId && isNavElementId(elementId)
    ? NAV_FILE
    : (inNav ? NAV_FILE : selection.file)

  return {
    ...selection,
    route: selection.route || route,
    elementId: elementId || selection.elementId || null,
    file,
    isNav: inNav || (elementId ? isNavElementId(elementId) : false),
    domDetail: captureDomDetail(el),
    capturedAt: Date.now(),
  }
}

export function isAreaQuestion(text) {
  const t = text.trim()
  return /\?$|^(kuidas|mis|miks|kas|selgita|kirjelda|töötab|paremaks|soovit|paranda|aita|explain|how|what|why|improve)/i.test(t)
}