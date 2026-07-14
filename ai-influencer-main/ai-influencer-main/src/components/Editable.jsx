import { usePageEditor } from '../context/pageEditor'
import { STYLE_KEYS } from '../utils/pageRegistry'

function styleFromOverride(ov) {
  if (!ov) return {}
  const s = {}
  for (const k of STYLE_KEYS) {
    if (ov[k] != null) s[k] = ov[k]
  }
  return s
}

export default function Editable({
  id,
  as: Tag = 'span',
  defaultText,
  style,
  className,
  children,
  onClick,
  ...rest
}) {
  const {
    getElementOverride,
    activeElementId,
    pickMode,
    setActiveElementId,
    lastFlashId,
  } = usePageEditor()

  const ov = getElementOverride(id)
  const text = ov?.text ?? defaultText
  const isActive = activeElementId === id
  const isFlashing = lastFlashId === id

  const content = text != null ? text : children

  function handleClick(e) {
    if (pickMode) {
      e.stopPropagation()
      e.preventDefault()
      setActiveElementId(id)
      return
    }
    onClick?.(e)
  }

  return (
    <Tag
      data-editable-id={id}
      className={className}
      onClick={handleClick}
      style={{
        ...style,
        ...styleFromOverride(ov),
        outline: isFlashing
          ? '2px solid #34C759'
          : isActive
          ? '2px solid #A78BFA'
          : pickMode
          ? '1px dashed rgba(167,139,250,0.45)'
          : undefined,
        outlineOffset: isActive || isFlashing || pickMode ? 3 : undefined,
        cursor: pickMode ? 'pointer' : style?.cursor,
        transition: 'outline 0.15s, box-shadow 0.15s',
        boxShadow: isFlashing ? '0 0 0 4px rgba(52,199,89,0.25)' : undefined,
      }}
      {...rest}
    >
      {content}
    </Tag>
  )
}