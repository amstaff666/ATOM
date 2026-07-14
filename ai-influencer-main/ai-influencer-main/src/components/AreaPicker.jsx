import { useEffect, useRef, useState, useCallback } from 'react'
import { usePageEditor } from '../context/pageEditor'
import { normalizeSelectionRect, resolveAreaInRect } from '../utils/areaResolver'
import { enrichSelectionWithDom } from '../utils/areaInspector'
import { getPageMeta } from '../utils/pageRegistry'

const MIN_DRAG = 4

const MARK_STYLE = {
  border: '2px solid rgba(255, 59, 48, 0.9)',
  background: 'rgba(255, 59, 48, 0.28)',
  boxShadow: '0 0 0 1px rgba(255, 59, 48, 0.15), inset 0 0 24px rgba(255, 59, 48, 0.12)',
}

export default function AreaPicker() {
  const { areaPickMode, areaIntent, setAreaPickMode, setSelectedArea, selectedArea, pathname } = usePageEditor()
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false })
  const [dragRect, setDragRect] = useState(null)
  const dragRef = useRef(null)
  const overlayRef = useRef(null)

  const finishDrag = useCallback((start, end) => {
    const markedRect = normalizeSelectionRect(start, end)
    const hit = markedRect.width < MIN_DRAG && markedRect.height < MIN_DRAG
      ? resolveAreaInRect({
          left: markedRect.left - 2,
          top: markedRect.top - 2,
          right: markedRect.right + 2,
          bottom: markedRect.bottom + 2,
        }, pathname)
      : resolveAreaInRect(markedRect, pathname)

    const base = hit ? { ...hit, markedRect } : {
      route: pathname,
      elementId: null,
      label: 'Valitud ala',
      kind: 'region',
      file: getPageMeta(pathname).file || null,
      visibleText: '',
      tagName: 'region',
      rect: markedRect,
      markedRect,
      selectorHint: null,
    }
    setSelectedArea(enrichSelectionWithDom(base, pathname))
  }, [pathname, setSelectedArea])

  useEffect(() => {
    if (!areaPickMode) {
      dragRef.current = null
      setDragRect(null)
      setCursor(c => ({ ...c, visible: false }))
      document.body.style.cursor = ''
      return undefined
    }

    document.body.style.cursor = 'none'

    function onKey(e) {
      if (e.key === 'Escape') {
        dragRef.current = null
        setDragRect(null)
        setAreaPickMode(false)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.cursor = ''
    }
  }, [areaPickMode, setAreaPickMode])

  function onPointerDown(e) {
    if (!areaPickMode || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    overlayRef.current?.setPointerCapture(e.pointerId)
    const start = { x: e.clientX, y: e.clientY }
    dragRef.current = { active: true, start, current: start }
    setDragRect(normalizeSelectionRect(start, start))
    setCursor({ x: e.clientX, y: e.clientY, visible: true })
  }

  function onPointerMove(e) {
    if (!areaPickMode) return
    setCursor({ x: e.clientX, y: e.clientY, visible: true })
    const d = dragRef.current
    if (!d?.active) return
    const current = { x: e.clientX, y: e.clientY }
    dragRef.current = { ...d, current }
    setDragRect(normalizeSelectionRect(d.start, current))
  }

  function onPointerUp(e) {
    if (!areaPickMode) return
    const d = dragRef.current
    overlayRef.current?.releasePointerCapture(e.pointerId)
    if (!d?.active) return
    e.preventDefault()
    finishDrag(d.start, { x: e.clientX, y: e.clientY })
    dragRef.current = null
    setDragRect(null)
    setAreaPickMode(false)
  }

  const marked = selectedArea?.markedRect || selectedArea?.rect
  const showMarked = !areaPickMode && marked && (marked.width > 0 || marked.height > 0)

  if (!areaPickMode && !showMarked) return null

  return (
    <>
      {areaPickMode && cursor.visible && (
        <div
          data-area-picker
          aria-hidden
          style={{
            position: 'fixed',
            left: cursor.x,
            top: cursor.y,
            width: 32,
            height: 32,
            marginLeft: -16,
            marginTop: -16,
            borderRadius: '50%',
            border: '2px solid #FF3B30',
            boxShadow: '0 0 0 3px rgba(255,59,48,0.2), 0 0 20px rgba(255,59,48,0.35)',
            pointerEvents: 'none',
            zIndex: 10001,
          }}
        />
      )}

      {areaPickMode && (
        <div
          ref={overlayRef}
          data-area-picker
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            cursor: 'none',
            touchAction: 'none',
            background: 'rgba(0,0,0,0.06)',
          }}
        >
          <div
            data-area-picker
            style={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 16px',
              borderRadius: 10,
              background: 'rgba(20,20,30,0.94)',
              border: '1px solid rgba(255,59,48,0.4)',
              color: '#FFB4B0',
              fontSize: 12,
              fontWeight: 600,
              pointerEvents: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {areaIntent === 'ask'
              ? 'Vali ala küsimiseks — lohista punane ala · Esc = tühista'
              : 'Vali ala muutmiseks — lohista punane ala · Esc = tühista'}
          </div>
        </div>
      )}

      {areaPickMode && dragRect && (
        <div
          data-area-picker
          style={{
            position: 'fixed',
            left: dragRect.left,
            top: dragRect.top,
            width: Math.max(dragRect.width, 2),
            height: Math.max(dragRect.height, 2),
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 10002,
            ...MARK_STYLE,
          }}
        />
      )}

      {showMarked && (
        <div
          data-area-picker
          style={{
            position: 'fixed',
            left: marked.left,
            top: marked.top,
            width: Math.max(marked.width, 4),
            height: Math.max(marked.height, 4),
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 9995,
            ...MARK_STYLE,
          }}
        />
      )}
    </>
  )
}