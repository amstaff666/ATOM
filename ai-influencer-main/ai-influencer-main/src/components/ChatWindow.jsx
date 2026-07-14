import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/theme'
import {
  CHAT_PROVIDERS,
  getSavedChatProvider,
  saveChatProvider,
  hasChatApiKey,
  getChatProviderLabel,
  getChatKeyHint,
  isLocalChatProvider,
  fetchLocalLlmStatus,
  sendCommandRequest,
  sendSourceEditRequest,
  sendInsertSourceRequest,
  sendAreaAssistRequest,
} from '../utils/chatApi'
import { parseLocalCommand, isPickModeToggle, isAreaPickModeToggle } from '../utils/localCommands'
import { prefersEnvApiKey, setPrefersEnvApiKey } from '../utils/apiKeys'
import {
  INSERT_OPTIONS,
  INSERT_TYPES,
  parseInsertCommand,
  matchInsertIntent,
} from '../utils/insertBlocks'
import { executeAppCommands } from '../utils/commandExecutor'
import {
  getUndoStack,
  recordCommandUndo,
  recordSourceFileUndo,
  performUndo,
} from '../utils/chatUndo'
import { generateId, useInfluencers } from '../store'
import { usePageEditor } from '../context/pageEditor'
import { getElementMeta } from '../utils/pageRegistry'
import { listLocalMedia, uploadLocalMedia, mediaAccept } from '../utils/localMedia'
import { isAreaQuestion } from '../utils/areaInspector'

const AREA_QUICK_ASKS = [
  { label: 'Kuidas see töötab?', text: 'Kuidas see märgitud ala töötab selles rakenduses?' },
  { label: 'Kuidas paremaks?', text: 'Kuidas seda ala UX ja disaini poolest paremaks teha?' },
  { label: 'Paranda browseris', text: 'Paranda see ala kohe browseris — tee eelvaade ja ütle mis lähtefailis muuta', intent: 'preview_fix' },
]

const WELCOME = {
  role: 'assistant',
  content: 'Muuda, küsi ja lisa elemente.\n\n• **Tasuta chat** — Ollama, LM Studio, Hermes Agent, OpenClaw\n• **Vali & küsi** → märgi ala → küsi kuidas töötab / kuidas paremaks\n• **Muuda** → märgi ala → kirjuta muudatus (salvestab faili)\n\nKiirkäsud (/tume, /mine create) töötavad alati. Pilve-mudelid vajavad API võtit Seadetes.',
}

function CommandResultChips({ results, isDark }) {
  if (!results?.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
      {results.map((r, i) => (
        <div
          key={`${r.type}-${i}`}
          style={{
            fontSize: 11.5,
            lineHeight: 1.45,
            padding: '6px 9px',
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
            background: r.success
              ? (isDark ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.10)')
              : (isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)'),
            border: `1px solid ${r.success ? 'rgba(52,199,89,0.28)' : 'rgba(255,59,48,0.25)'}`,
            color: r.success ? '#34C759' : '#FF3B30',
          }}
        >
          {r.success ? '✓' : '✗'} {r.message}
        </div>
      ))}
    </div>
  )
}

function MessageBubble({ role, content, commandResults, isDark }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '88%',
        padding: '10px 13px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        fontSize: 13.5,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: isUser
          ? 'linear-gradient(135deg,#EC4899,#8B5CF6)'
          : (isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)'),
        color: isUser ? '#fff' : 'var(--text-primary)',
        border: isUser ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'var(--border-subtle)'}`,
      }}>
        {content}
        {!isUser && <CommandResultChips results={commandResults} isDark={isDark} />}
      </div>
    </div>
  )
}

export default function ChatWindow() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark, theme, setTheme } = useTheme()
  const [influencers, setInfluencers] = useInfluencers()
  const pageEditor = usePageEditor()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ ...WELCOME, id: 'welcome' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState(getSavedChatProvider)
  const [hasKey, setHasKey] = useState(() => hasChatApiKey(getSavedChatProvider(), null))
  const [localLlmStatus, setLocalLlmStatus] = useState(null)
  const [pendingInsert, setPendingInsert] = useState(null)
  const [insertContent, setInsertContent] = useState('')
  const [mediaLibrary, setMediaLibrary] = useState([])
  const [mediaUploading, setMediaUploading] = useState(false)
  const [undoStack, setUndoStack] = useState(() => getUndoStack())
  const [undoOpen, setUndoOpen] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const insertInputRef = useRef(null)
  const mediaFileRef = useRef(null)

  const refreshUndoStack = useCallback(() => {
    setUndoStack(getUndoStack())
  }, [])

  const runCommands = useCallback(async (commands) => {
    recordCommandUndo(commands, { influencers, theme })
    const results = await executeAppCommands(commands, {
      navigate,
      setTheme,
      theme,
      influencers,
      setInfluencers,
      pageEditor,
    })
    refreshUndoStack()
    return results
  }, [navigate, setTheme, theme, influencers, setInfluencers, pageEditor, refreshUndoStack])

  async function handleUndo() {
    if (loading || !undoStack.length) return
    setError(null)
    setLoading(true)
    try {
      const { label } = await performUndo({ pageEditor, setInfluencers, setTheme })
      refreshUndoStack()
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `↩ Võetud tagasi: **${label}**`,
      }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function refreshKeyState(status = localLlmStatus) {
    setHasKey(hasChatApiKey(provider, status))
  }

  useEffect(() => {
    if (open) {
      refreshKeyState()
      refreshUndoStack()
      inputRef.current?.focus()
    }
  }, [open, provider, refreshUndoStack])

  useEffect(() => {
    if (!open) return
    fetchLocalLlmStatus().then(data => {
      if (!data) return
      setLocalLlmStatus(data)
      setProvider(current => {
        if (!isLocalChatProvider(current)) return current
        const row = data.providers?.find(p => p.provider === current)
        if (!row?.ok && data.defaultProvider && data.defaultProvider !== current) {
          saveChatProvider(data.defaultProvider)
          return data.defaultProvider
        }
        return current
      })
      refreshKeyState(data)
    })
  }, [open])

  useEffect(() => {
    setHasKey(hasChatApiKey(provider, localLlmStatus))
  }, [provider, localLlmStatus])

  useEffect(() => {
    function onStorage(e) {
      if (!e.key || e.key.endsWith('_api_key')) refreshKeyState()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', () => refreshKeyState())
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', refreshKeyState)
    }
  }, [provider, localLlmStatus])

  function handleProviderChange(next) {
    setProvider(next)
    saveChatProvider(next)
    setHasKey(hasChatApiKey(next, localLlmStatus))
    setError(null)
  }

  function toggleEnvKey() {
    const on = !prefersEnvApiKey(provider)
    setPrefersEnvApiKey(provider, on)
    setHasKey(hasChatApiKey(provider, localLlmStatus))
    setError(null)
  }

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading, open])

  const refreshMediaLibrary = useCallback(async (type) => {
    if (type !== 'image' && type !== 'video') return
    try {
      const files = await listLocalMedia(type)
      setMediaLibrary(files)
    } catch {
      setMediaLibrary([])
    }
  }, [])

  useEffect(() => {
    if (pendingInsert === 'image' || pendingInsert === 'video') {
      refreshMediaLibrary(pendingInsert)
    } else {
      setMediaLibrary([])
    }
  }, [pendingInsert, refreshMediaLibrary])

  async function handleMediaFilePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !pendingInsert) return

    setMediaUploading(true)
    setError(null)
    try {
      const saved = await uploadLocalMedia(file, pendingInsert)
      setInsertContent(saved.url)
      await refreshMediaLibrary(pendingInsert)
    } catch (err) {
      setError(err.message)
    } finally {
      setMediaUploading(false)
    }
  }

  function openMediaFilePicker() {
    mediaFileRef.current?.click()
  }

  function buildInsertSelection() {
    if (pageEditor.selectedArea) return pageEditor.selectedArea
    const file = pageEditor.pageMeta?.file
    if (!file) return null
    return {
      route: location.pathname,
      elementId: pageEditor.activeElementId,
      label: pageEditor.activeElementId
        ? (getElementMeta(location.pathname, pageEditor.activeElementId)?.label || 'element')
        : 'Lehe sisu',
      file,
      visibleText: '',
      markedRect: null,
    }
  }

  async function runInsert(insertType, content = '', opts = {}) {
    if (!hasChatApiKey(provider)) {
      setError(isLocalChatProvider(provider)
        ? 'Kohalik mudel offline — käivita Ollama või LM Studio.'
        : `${getChatProviderLabel(provider)} võti puudub — lisa Seadetes.`)
      return
    }

    const selection = buildInsertSelection()
    if (!selection?.file) {
      setError('Sellel lehel pole lähtefaili — märgi ala või mine teisele lehele.')
      return
    }

    const t = INSERT_TYPES[insertType]
    if (t?.needsUrl && !content.trim()) {
      setPendingInsert(insertType)
      setInsertContent(t.defaultContent || '')
      setTimeout(() => insertInputRef.current?.focus(), 50)
      return
    }

    setError(null)
    setLoading(true)
    const label = t?.label || insertType
    if (!opts.skipUserLog) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'user',
        content: content ? `${label}: ${content}` : label,
      }])
    }

    try {
      const context = pageEditor.buildContextForApi({
        theme,
        influencers: influencers.map(i => ({ id: i.id, name: i.name, niche: i.niche })),
      })
      const { reply, file, appliedCount } = await sendInsertSourceRequest(
        provider,
        insertType,
        content,
        selection,
        context,
      )
      recordSourceFileUndo(`Lisa element → ${file}`)
      refreshUndoStack()
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: reply,
        commandResults: [{
          type: 'insert_source',
          success: true,
          message: `✓ ${label} lisatud → ${file} (${appliedCount} muudatust)`,
        }],
      }])
      setPendingInsert(null)
      setInsertContent('')
      pageEditor.clearSelectedArea()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleInsertClick(insertType) {
    const t = INSERT_TYPES[insertType]
    if (t?.needsContent || t?.needsUrl) {
      setPendingInsert(insertType)
      setInsertContent(t.defaultContent || '')
      setTimeout(() => insertInputRef.current?.focus(), 50)
      return
    }
    runInsert(insertType)
  }

  function confirmPendingInsert() {
    if (!pendingInsert) return
    runInsert(pendingInsert, insertContent.trim())
  }

  async function runAreaAssist(question, opts = {}) {
    if (!hasChatApiKey(provider)) {
      setError(isLocalChatProvider(provider)
        ? 'Kohalik mudel offline — käivita Ollama või LM Studio.'
        : `${getChatProviderLabel(provider)} võti puudub — lisa Seadetes.`)
      return
    }
    const selection = pageEditor.selectedArea
    if (!selection) {
      setError('Märgi esmalt ala — klõpsa **Vali & küsi** või **Muuda**.')
      return
    }

    setError(null)
    setLoading(true)
    if (!opts.skipUserLog) {
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: question }])
    }

    try {
      const history = [...messages, { role: 'user', content: question }]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }))
      const last = history[history.length - 1]
      const apiMessages = last?.content === question ? history.slice(-6) : [...history.slice(-5), { role: 'user', content: question }]

      const context = pageEditor.buildContextForApi({
        theme,
        influencers: influencers.map(i => ({ id: i.id, name: i.name, niche: i.niche })),
      })

      const {
        reply, commands, sourceInstruction, suggestions, playwright,
      } = await sendAreaAssistRequest(provider, apiMessages, selection, context, {
        intent: opts.intent || 'ask',
        usePlaywright: opts.usePlaywright !== false,
      })

      const commandResults = commands.length ? await runCommands(commands) : []
      if (sourceInstruction) {
        pageEditor.setPendingSourceInstruction(sourceInstruction)
      }

      let fullReply = reply
      if (suggestions?.length) {
        fullReply += `\n\n💡 Soovitused:\n${suggestions.map(s => `• ${s}`).join('\n')}`
      }
      if (playwright?.found) {
        fullReply += `\n\n🎭 Playwright kinnitas elemendi (${playwright.tag || 'element'}${playwright.editableId ? `, ${playwright.editableId}` : ''}).`
      } else if (playwright?.reason) {
        fullReply += `\n\n🎭 Playwright: ${playwright.reason}`
      }
      if (commandResults.some(r => r.success)) {
        fullReply += '\n\n✨ Eelvaade rakendatud sinu brauseris — vaata lehte!'
      }
      if (sourceInstruction) {
        fullReply += '\n\n📁 Klõpsa **Salvesta faili**, et muudatus jäädavaks teha.'
      }

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: fullReply,
        commandResults,
      }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function savePendingSourceToFile() {
    const instruction = pageEditor.pendingSourceInstruction
    const selection = pageEditor.selectedArea
    if (!instruction || !selection) return

    setLoading(true)
    setError(null)
    try {
      const context = pageEditor.buildContextForApi({ theme, influencers: influencers.map(i => ({ id: i.id, name: i.name, niche: i.niche })) })
      const { reply, file, appliedCount } = await sendSourceEditRequest(provider, instruction, selection, context)
      recordSourceFileUndo(`Salvesta faili → ${file}`)
      refreshUndoStack()
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: reply,
        commandResults: [{
          type: 'edit_source',
          success: true,
          message: `✓ Salvestatud faili ${file} (${appliedCount} muudatust)`,
        }],
      }])
      pageEditor.setPendingSourceInstruction(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function processCommandResponse(reply, commands) {
    const commandResults = commands.length ? await runCommands(commands) : []
    let finalReply = reply

    const listResult = commandResults.find(r => r.type === 'list_influencers' && r.success && r.message.includes('\n'))
    if (listResult) finalReply = listResult.message

    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: finalReply,
      commandResults,
    }])
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    setError(null)
    setInput('')

    const userMsg = { id: generateId(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      if (isPickModeToggle(text)) {
        const on = !pageEditor.pickMode
        pageEditor.setPickMode(on)
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: on
            ? `Elementide valimine ON — kliki lehel elementi (${pageEditor.pageMeta.label}).`
            : 'Elementide valimine OFF.',
        }])
        return
      }

      if (isAreaPickModeToggle(text)) {
        const on = !pageEditor.areaPickMode
        pageEditor.setAreaPickMode(on, 'edit')
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: on
            ? 'Muuda-režiim ON — lohista ala, siis kirjuta muudatus (salvestab faili).'
            : 'Ala valimine OFF.',
        }])
        return
      }

      if (/^\/vali$/i.test(text)) {
        const on = !pageEditor.areaPickMode
        pageEditor.setAreaPickMode(on, 'ask')
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: on
            ? 'Küsi-režiim ON — lohista ala, siis küsi kuidas see töötab või kuidas paremaks teha. Playwright aitab kontrollida.'
            : 'Ala valimine OFF.',
        }])
        return
      }

      const local = parseLocalCommand(text)
      if (local) {
        await processCommandResponse(local.reply, local.commands)
        return
      }

      const slashInsert = parseInsertCommand(text)
      if (slashInsert) {
        await runInsert(slashInsert.type, slashInsert.content, { skipUserLog: true })
        return
      }

      const intentInsert = matchInsertIntent(text)
      if (intentInsert && (pageEditor.selectedArea || pageEditor.activeElementId || pageEditor.pageMeta?.file)) {
        await runInsert(intentInsert.type, intentInsert.content, { skipUserLog: true })
        return
      }

      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }))

      const context = pageEditor.buildContextForApi({
        theme,
        influencers: influencers.map(i => ({ id: i.id, name: i.name, niche: i.niche })),
      })

      if (pageEditor.selectedArea) {
        const useAsk = pageEditor.areaIntent === 'ask'
          || isAreaQuestion(text)
          || /eelvaade|browseris|paranda|töötab|paremaks|soovit/i.test(text)

        if (useAsk) {
          const intent = /paranda|browseris|eelvaade/i.test(text) ? 'preview_fix' : 'ask'
          await runAreaAssist(text, { skipUserLog: true, intent })
          return
        }

        const { reply, file, appliedCount } = await sendSourceEditRequest(
          provider,
          text,
          pageEditor.selectedArea,
          context,
        )
        recordSourceFileUndo(`Muuda ala → ${file}`)
        refreshUndoStack()
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: reply,
          commandResults: [{
            type: 'edit_source',
            success: true,
            message: `✓ Fail ${file} uuendatud (${appliedCount} muudatust). Vite laadib lehe uuesti.`,
          }],
        }])
        pageEditor.clearSelectedArea()
        return
      }

      const { reply, commands } = await sendCommandRequest(provider, history, context)
      await processCommandResponse(reply, commands)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function clearChat() {
    setMessages([{ ...WELCOME, id: 'welcome' }])
    setError(null)
  }

  const panelBg = isDark ? 'var(--surface)' : 'var(--bg-secondary)'
  const panelBorder = isDark ? 'rgba(255,255,255,0.10)' : 'var(--border)'

  return (
    <>
      <button
        data-chat-ui
        type="button"
        onClick={() => setOpen(v => !v)}
        title={open ? 'Sulge käsuliides' : 'Ava käsuliides'}
        aria-label={open ? 'Sulge käsuliides' : 'Ava käsuliides'}
        style={{
          position: 'fixed', bottom: 24, left: 24, zIndex: 210,
          width: 52, height: 52, borderRadius: 26,
          background: open
            ? (isDark ? 'rgba(255,255,255,0.10)' : 'var(--bg-tertiary)')
            : 'linear-gradient(135deg,#EC4899,#8B5CF6)',
          border: open
            ? `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'var(--border)'}`
            : 'none',
          color: open ? 'var(--text-primary)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(139,92,246,0.35)',
          cursor: 'pointer',
          transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        )}
      </button>

      {open && (
        <div
          data-chat-ui
          role="dialog"
          aria-label="Käsuliides"
          style={{
            position: 'fixed', bottom: 88, left: 24, zIndex: 209,
            width: 400, maxWidth: 'calc(100vw - 48px)',
            height: 540, maxHeight: 'calc(100vh - 120px)',
            display: 'flex', flexDirection: 'column',
            background: panelBg,
            border: `1px solid ${panelBorder}`,
            borderRadius: 16,
            boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.65)' : 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${panelBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px' }}>Käsuliides</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {pageEditor.pageMeta.label} · {location.pathname}
              </div>
              <div style={{ fontSize: 10, color: pageEditor.activeElementId ? '#A78BFA' : 'var(--text-tertiary)', marginTop: 2 }}>
                {pageEditor.activeElementId
                  ? `Aktiivne: ${getElementMeta(location.pathname, pageEditor.activeElementId)?.label || pageEditor.activeElementId}`
                  : 'Aktiivset elementi pole — /kliki'}
              </div>
              {pageEditor.selectedArea && (
                <div style={{ fontSize: 10, color: '#FF3B30', marginTop: 2, lineHeight: 1.4 }}>
                  🔴 {pageEditor.areaIntent === 'ask' ? 'Küsimise ala' : 'Muudetav ala'}: {pageEditor.selectedArea.label}
                  {pageEditor.selectedArea.visibleText ? ` · "${pageEditor.selectedArea.visibleText.slice(0, 40)}${pageEditor.selectedArea.visibleText.length > 40 ? '…' : ''}"` : ''}
                  {pageEditor.selectedArea.markedRect ? ` · ${Math.round(pageEditor.selectedArea.markedRect.width)}×${Math.round(pageEditor.selectedArea.markedRect.height)}px` : ''}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const on = !(pageEditor.areaPickMode && pageEditor.areaIntent === 'ask')
                    pageEditor.setAreaPickMode(on, 'ask')
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: pageEditor.areaPickMode && pageEditor.areaIntent === 'ask'
                      ? 'rgba(96,165,250,0.18)' : (isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)'),
                    border: `1px solid ${pageEditor.areaPickMode && pageEditor.areaIntent === 'ask' ? '#60A5FA' : panelBorder}`,
                    color: pageEditor.areaPickMode && pageEditor.areaIntent === 'ask' ? '#60A5FA' : 'var(--text-secondary)',
                  }}
                >
                  {pageEditor.areaPickMode && pageEditor.areaIntent === 'ask' ? 'Vali ON' : 'Vali & küsi'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const on = !(pageEditor.areaPickMode && pageEditor.areaIntent === 'edit')
                    pageEditor.setAreaPickMode(on, 'edit')
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: pageEditor.areaPickMode && pageEditor.areaIntent === 'edit'
                      ? 'rgba(236,72,153,0.18)' : (isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)'),
                    border: `1px solid ${pageEditor.areaPickMode && pageEditor.areaIntent === 'edit' ? '#EC4899' : panelBorder}`,
                    color: pageEditor.areaPickMode && pageEditor.areaIntent === 'edit' ? '#EC4899' : 'var(--text-secondary)',
                  }}
                >
                  {pageEditor.areaPickMode && pageEditor.areaIntent === 'edit' ? 'Muuda ON' : 'Muuda'}
                </button>
                <button
                  type="button"
                  onClick={() => pageEditor.setPickMode(!pageEditor.pickMode)}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: pageEditor.pickMode ? 'rgba(167,139,250,0.18)' : (isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)'),
                    border: `1px solid ${pageEditor.pickMode ? '#A78BFA' : panelBorder}`,
                    color: pageEditor.pickMode ? '#A78BFA' : 'var(--text-secondary)',
                  }}
                >
                  {pageEditor.pickMode ? 'Valimine ON' : 'Vali element'}
                </button>
                {pageEditor.selectedArea && (
                  <button
                    type="button"
                    onClick={() => pageEditor.clearSelectedArea()}
                    style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)',
                      border: `1px solid ${panelBorder}`,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Tühista ala
                  </button>
                )}
                {pageEditor.pendingSourceInstruction && (
                  <button
                    type="button"
                    onClick={savePendingSourceToFile}
                    disabled={loading}
                    style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: 'rgba(52,199,89,0.18)',
                      border: '1px solid #34C759',
                      color: '#34C759',
                    }}
                  >
                    Salvesta faili
                  </button>
                )}
              </div>
              {pageEditor.selectedArea && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {AREA_QUICK_ASKS.map(q => (
                    <button
                      key={q.label}
                      type="button"
                      disabled={loading}
                      onClick={() => runAreaAssist(q.text, { intent: q.intent || 'ask' })}
                      style={{
                        padding: '3px 8px', borderRadius: 7, fontSize: 10, fontWeight: 600,
                        background: isDark ? 'rgba(96,165,250,0.10)' : 'rgba(96,165,250,0.08)',
                        border: '1px solid rgba(96,165,250,0.28)',
                        color: '#60A5FA',
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 5, fontWeight: 600 }}>
                  Lisa element
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {INSERT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={loading || !pageEditor.pageMeta?.file}
                      onClick={() => handleInsertClick(opt.id)}
                      title={!pageEditor.pageMeta?.file ? 'Sellel lehel pole lähtefaili' : opt.label}
                      style={{
                        padding: '4px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                        background: pendingInsert === opt.id
                          ? 'rgba(52,199,89,0.15)'
                          : (isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)'),
                        border: `1px solid ${pendingInsert === opt.id ? '#34C759' : panelBorder}`,
                        color: pendingInsert === opt.id ? '#34C759' : 'var(--text-secondary)',
                        opacity: pageEditor.pageMeta?.file ? 1 : 0.45,
                        cursor: loading || !pageEditor.pageMeta?.file ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {opt.emoji} {opt.label.replace('Lisa ', '')}
                    </button>
                  ))}
                </div>
              </div>
              <select
                value={provider}
                onChange={e => handleProviderChange(e.target.value)}
                style={{
                  marginTop: 6, width: '100%', maxWidth: 220,
                  padding: '5px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg)',
                  border: `1px solid ${panelBorder}`,
                  color: 'var(--text-primary)',
                }}
              >
                <optgroup label="Tasuta (kohalik)">
                  {CHAT_PROVIDERS.filter(p => p.group === 'local').map(p => {
                    const row = localLlmStatus?.providers?.find(r => r.provider === p.id)
                    const suffix = row ? (row.ok ? ' ✓' : ' ✗') : ''
                    return (
                      <option key={p.id} value={p.id}>{p.label}{suffix}</option>
                    )
                  })}
                </optgroup>
                <optgroup label="Pilv (API võti)">
                  {CHAT_PROVIDERS.filter(p => p.group === 'cloud').map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
              </select>
              {!isLocalChatProvider(provider) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prefersEnvApiKey(provider)}
                    onChange={toggleEnvKey}
                  />
                  Kasuta dev serveri env võtit (nt OPENAI_API_KEY)
                </label>
              )}
              {hasKey ? (
                <div style={{ fontSize: 10, color: isLocalChatProvider(provider) ? '#60A5FA' : '#34C759', marginTop: 4 }}>
                  {getChatProviderLabel(provider)} · {getChatKeyHint(provider, localLlmStatus)}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {isLocalChatProvider(provider)
                    ? 'Käivita Ollama, LM Studio, Hermes (hermes gateway) või OpenClaw (openclaw gateway)'
                    : `Lisa võti Seadetes → ${getChatProviderLabel(provider)} või lülita env sisse`}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={loading || !undoStack.length}
                  title={undoStack.length ? `Võta tagasi: ${undoStack[0]?.label}` : 'Undo ajalugu tühi'}
                  style={{
                    fontSize: 12, fontWeight: 700,
                    color: undoStack.length ? '#F59E0B' : 'var(--text-tertiary)',
                    padding: '5px 10px', borderRadius: 8,
                    background: undoStack.length
                      ? (isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.10)')
                      : (isDark ? 'rgba(255,255,255,0.04)' : 'var(--bg-tertiary)'),
                    border: `1px solid ${undoStack.length ? 'rgba(245,158,11,0.35)' : panelBorder}`,
                    opacity: loading || !undoStack.length ? 0.5 : 1,
                    cursor: loading || !undoStack.length ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↩ UNDO{undoStack.length ? ` (${undoStack.length})` : ''}
                </button>
                {undoStack.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUndoOpen(v => !v)}
                    title="Viimased muudatused"
                    style={{
                      position: 'absolute', right: -4, top: -4,
                      width: 16, height: 16, borderRadius: 8, fontSize: 9, fontWeight: 800,
                      background: '#F59E0B', color: '#fff', border: 'none',
                      lineHeight: '16px', padding: 0, cursor: 'pointer',
                    }}
                  >
                    …
                  </button>
                )}
                {undoOpen && undoStack.length > 0 && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 220,
                    minWidth: 220, maxWidth: 280,
                    background: isDark ? 'rgba(28,28,30,0.98)' : 'var(--bg-secondary)',
                    border: `1px solid ${panelBorder}`,
                    borderRadius: 10, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : 'var(--shadow-lg)',
                    padding: '6px 0', overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '6px 12px 4px', fontSize: 9, fontWeight: 700,
                      color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px',
                    }}>
                      Viimased {undoStack.length} (kliki UNDO)
                    </div>
                    {undoStack.map((entry, i) => (
                      <div
                        key={entry.id}
                        style={{
                          padding: '7px 12px', fontSize: 11, lineHeight: 1.4,
                          color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                          borderTop: i > 0 ? `1px solid ${panelBorder}` : 'none',
                          background: i === 0 ? (isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)') : 'transparent',
                        }}
                      >
                        {i === 0 ? '→ ' : `${i + 1}. `}{entry.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearChat}
                title="Tühjenda"
                style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                  padding: '5px 10px', borderRadius: 8,
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)',
                  border: `1px solid ${panelBorder}`,
                }}
              >
                Tühjenda
              </button>
            </div>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
            {messages.map(m => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                commandResults={m.commandResults}
                isDark={isDark}
              />
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 5, padding: '4px 4px 10px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: `cs-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {!hasKey && (
            <div style={{
              margin: '0 12px 8px', padding: '10px 12px', borderRadius: 10,
              background: isDark ? 'rgba(255,193,7,0.10)' : 'rgba(255,193,7,0.12)',
              border: '1px solid rgba(255,193,7,0.25)',
              fontSize: 12, lineHeight: 1.5, color: isDark ? 'rgba(255,220,120,0.95)' : '#8B6914',
            }}>
              {isLocalChatProvider(provider)
                ? 'Kohalik chat on tasuta (Ollama/LM Studio/Hermes/OpenClaw). Kiirkäsud töötavad ilma mudelita. '
                : `Pilve-käsud vajavad ${getChatProviderLabel(provider)} API võtit. `}
              Kiirkäsud (/tume, /mine create) töötavad alati.{' '}
              <Link to="/settings" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>
                Seaded →
              </Link>
            </div>
          )}

          {error && (
            <div style={{
              margin: '0 12px 8px', padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,59,48,0.10)', border: '1px solid rgba(255,59,48,0.22)',
              fontSize: 12, color: '#FF3B30',
            }}>
              {error}
            </div>
          )}

          <div style={{ padding: '10px 12px 12px', borderTop: `1px solid ${panelBorder}`, flexShrink: 0 }}>
            <input
              ref={mediaFileRef}
              type="file"
              accept={pendingInsert ? mediaAccept(pendingInsert) : undefined}
              style={{ display: 'none' }}
              onChange={handleMediaFilePick}
            />
            {pendingInsert && INSERT_TYPES[pendingInsert] && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    ref={insertInputRef}
                    value={insertContent}
                    onChange={e => setInsertContent(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmPendingInsert() } }}
                    placeholder={INSERT_TYPES[pendingInsert].contentPlaceholder}
                    disabled={loading || mediaUploading}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12,
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'var(--bg)',
                      border: `1px solid ${panelBorder}`,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={confirmPendingInsert}
                    disabled={loading || mediaUploading || (INSERT_TYPES[pendingInsert].needsUrl && !insertContent.trim())}
                    style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: 'linear-gradient(135deg,#34C759,#30B350)',
                      color: '#fff', border: 'none',
                      opacity: loading || mediaUploading ? 0.6 : 1,
                    }}
                  >
                    Lisa
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingInsert(null); setInsertContent(''); setMediaLibrary([]) }}
                    style={{
                      padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)',
                      border: `1px solid ${panelBorder}`,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {(pendingInsert === 'image' || pendingInsert === 'video') && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      <button
                        type="button"
                        onClick={openMediaFilePicker}
                        disabled={loading || mediaUploading}
                        style={{
                          padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: isDark ? 'rgba(255,255,255,0.08)' : 'var(--bg-tertiary)',
                          border: `1px solid ${panelBorder}`,
                          color: 'var(--text-primary)',
                          opacity: mediaUploading ? 0.6 : 1,
                        }}
                      >
                        {mediaUploading ? 'Laen üles…' : '💻 Vali arvutist'}
                      </button>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                        Salvestatakse <code style={{ fontSize: 9 }}>public/uploads/</code> — jääb alles
                      </span>
                    </div>

                    {insertContent && (pendingInsert === 'image' ? (
                      <img
                        src={insertContent}
                        alt=""
                        style={{ maxHeight: 56, maxWidth: '100%', borderRadius: 8, marginBottom: 6, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ fontSize: 10, color: '#34C759', marginBottom: 6, wordBreak: 'break-all' }}>
                        ✓ {insertContent}
                      </div>
                    ))}

                    {mediaLibrary.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600 }}>
                          Sinu failid ({mediaLibrary.length})
                        </div>
                        <div style={{
                          display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
                          maxWidth: '100%',
                        }}>
                          {mediaLibrary.map(f => (
                            <button
                              key={f.url}
                              type="button"
                              title={f.name}
                              onClick={() => setInsertContent(f.url)}
                              style={{
                                flexShrink: 0, width: 52, height: 52, borderRadius: 8, padding: 0,
                                overflow: 'hidden', border: insertContent === f.url
                                  ? '2px solid #34C759'
                                  : `1px solid ${panelBorder}`,
                                background: isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)',
                                cursor: 'pointer',
                              }}
                            >
                              {pendingInsert === 'image' ? (
                                <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{
                                  width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: 18,
                                }}>▶</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  pageEditor.selectedArea
                    ? (pageEditor.areaIntent === 'ask'
                      ? 'Küsi märgitud ala kohta… (nt kuidas see töötab?)'
                      : 'Kirjelda muudatus märgitud alale…')
                    : 'Käsk… (/vali, /muuda, /abi)'
                }
                rows={2}
                disabled={loading}
                style={{
                  flex: 1, resize: 'none', padding: '10px 12px',
                  borderRadius: 10, fontSize: 13.5, lineHeight: 1.45,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'var(--bg)',
                  border: `1px solid ${panelBorder}`,
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim() || (!hasKey && !parseLocalCommand(input.trim()))}
                style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                  background: (loading || !input.trim() || (!hasKey && !parseLocalCommand(input.trim())))
                    ? (isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-tertiary)')
                    : 'linear-gradient(135deg,#EC4899,#8B5CF6)',
                  color: (loading || !input.trim() || (!hasKey && !parseLocalCommand(input.trim()))) ? 'var(--text-tertiary)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: (loading || !input.trim() || (!hasKey && !parseLocalCommand(input.trim()))) ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}