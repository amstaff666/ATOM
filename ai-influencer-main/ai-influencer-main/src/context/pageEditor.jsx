import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getPageMeta, listEditableElements, getElementMeta, STYLE_KEYS,
  isNavElementId, overrideStorageKey, NAV_STORAGE_KEY,
} from '../utils/pageRegistry'

const STORAGE_KEY = 'page_editor_v1'
const PageEditorContext = createContext(null)

function readAllOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeAllOverrides(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[pageEditor] save failed', e)
  }
}

function pickStyles(patch = {}) {
  const style = {}
  for (const k of STYLE_KEYS) {
    if (patch[k] != null && patch[k] !== '') style[k] = String(patch[k])
  }
  return style
}

export function PageEditorProvider({ children }) {
  const { pathname } = useLocation()
  const pageMeta = useMemo(() => getPageMeta(pathname), [pathname])

  const [overrides, setOverrides] = useState(readAllOverrides)
  const [activeElementId, setActiveElementId] = useState(null)
  const [pickMode, setPickMode] = useState(false)
  const [areaPickMode, setAreaPickMode] = useState(false)
  const [areaIntent, setAreaIntent] = useState('edit')
  const [selectedArea, setSelectedArea] = useState(null)
  const [pendingSourceInstruction, setPendingSourceInstruction] = useState(null)
  const [lastFlashId, setLastFlashId] = useState(null)

  useEffect(() => {
    setActiveElementId(null)
    setSelectedArea(null)
  }, [pathname])

  const enablePickMode = useCallback((on) => {
    setPickMode(on)
    if (on) setAreaPickMode(false)
  }, [])

  const enableAreaPickMode = useCallback((on, intent = 'edit') => {
    setAreaPickMode(on)
    if (on) {
      setPickMode(false)
      setAreaIntent(intent === 'ask' ? 'ask' : 'edit')
    }
  }, [])

  const clearSelectedArea = useCallback(() => {
    setSelectedArea(null)
    setPendingSourceInstruction(null)
  }, [])

  useEffect(() => {
    writeAllOverrides(overrides)
  }, [overrides])

  const pageOverrides = overrides[pathname] || {}
  const elementOverrides = pageOverrides.elements || {}
  const navElementOverrides = overrides[NAV_STORAGE_KEY]?.elements || {}
  const pageStyleOverrides = pageOverrides.page || {}

  const getElementOverride = useCallback((elementId) => {
    if (isNavElementId(elementId)) return navElementOverrides[elementId] || null
    return elementOverrides[elementId] || null
  }, [elementOverrides, navElementOverrides])

  const getPageOverride = useCallback(() => pageStyleOverrides, [pageStyleOverrides])

  const applyElementUpdate = useCallback((elementId, patch) => {
    const meta = getElementMeta(pathname, elementId)
    if (!meta) return false

    const storeKey = overrideStorageKey(elementId, pathname)
    const bucket = storeKey === NAV_STORAGE_KEY ? navElementOverrides : elementOverrides
    const next = { ...bucket[elementId] }
    if (patch.text != null) next.text = String(patch.text)
    Object.assign(next, pickStyles(patch.style || patch))

    setOverrides(prev => ({
      ...prev,
      [storeKey]: {
        ...prev[storeKey],
        page: prev[storeKey]?.page || {},
        elements: { ...prev[storeKey]?.elements, [elementId]: next },
      },
    }))
    setLastFlashId(elementId)
    setTimeout(() => setLastFlashId(cur => (cur === elementId ? null : cur)), 1200)
    return true
  }, [pathname, elementOverrides, navElementOverrides])

  const applyPageUpdate = useCallback((patch) => {
    const style = pickStyles(patch.style || patch)
    if (!Object.keys(style).length) return false
    setOverrides(prev => ({
      ...prev,
      [pathname]: {
        ...prev[pathname],
        elements: prev[pathname]?.elements || {},
        page: { ...prev[pathname]?.page, ...style },
      },
    }))
    return true
  }, [pathname])

  const restoreOverrides = useCallback((snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') return
    setOverrides(snapshot)
  }, [])

  const buildContextForApi = useCallback((extra = {}) => {
    const elements = listEditableElements(pathname).map(el => {
      const ov = (el.global || isNavElementId(el.id) ? navElementOverrides : elementOverrides)[el.id] || {}
      return {
        id: el.id,
        label: el.label,
        kind: el.kind,
        defaultText: el.defaultText,
        currentText: ov.text ?? el.defaultText ?? null,
        currentStyle: pickStyles(ov),
      }
    })

    const active = activeElementId ? elements.find(e => e.id === activeElementId) : null

    return {
      route: pathname,
      page: { id: pageMeta.id, label: pageMeta.label, file: pageMeta.file || null },
      activeElement: active,
      pickMode,
      areaPickMode,
      areaIntent,
      selectedArea: selectedArea ? {
        elementId: selectedArea.elementId,
        label: selectedArea.label,
        kind: selectedArea.kind,
        file: selectedArea.file,
        visibleText: selectedArea.visibleText,
        tagName: selectedArea.tagName,
        selectorHint: selectedArea.selectorHint,
        markedRect: selectedArea.markedRect || selectedArea.rect || null,
        domDetail: selectedArea.domDetail || null,
      } : null,
      pendingSourceInstruction,
      editableElements: elements,
      pageStyle: pageStyleOverrides,
      ...extra,
    }
  }, [pathname, pageMeta, activeElementId, pickMode, areaPickMode, areaIntent, selectedArea, pendingSourceInstruction, elementOverrides, navElementOverrides, pageStyleOverrides])

  const value = {
    pathname,
    pageMeta,
    activeElementId,
    setActiveElementId,
    pickMode,
    setPickMode: enablePickMode,
    areaPickMode,
    areaIntent,
    setAreaIntent,
    setAreaPickMode: enableAreaPickMode,
    selectedArea,
    setSelectedArea,
    clearSelectedArea,
    pendingSourceInstruction,
    setPendingSourceInstruction,
    getElementOverride,
    getPageOverride,
    applyElementUpdate,
    applyPageUpdate,
    restoreOverrides,
    buildContextForApi,
    lastFlashId,
  }

  return (
    <PageEditorContext.Provider value={value}>
      {children}
    </PageEditorContext.Provider>
  )
}

export function usePageEditor() {
  const ctx = useContext(PageEditorContext)
  if (!ctx) throw new Error('usePageEditor must be used within PageEditorProvider')
  return ctx
}