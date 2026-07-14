import { getApiKey, hasApiKey, prefersEnvApiKey, API_KEY_CONFIG } from './apiKeys'
import { buildInsertSnippet, buildInsertInstruction } from './insertBlocks.js'

const CHAT_ENDPOINT = '/api/chat'
const COMMANDS_ENDPOINT = '/api/commands'
const EDIT_SOURCE_ENDPOINT = '/api/edit-source'
const AREA_ASSIST_ENDPOINT = '/api/area-assist'
const PROVIDER_STORAGE_KEY = 'chat_provider'

const LOCAL_CHAT_IDS = new Set(['ollama', 'lmstudio', 'hermes', 'openclaw'])

export function isLocalChatProvider(provider) {
  return LOCAL_CHAT_IDS.has(provider)
}

export const CHAT_PROVIDERS = [
  { id: 'ollama', label: 'Ollama (tasuta)', group: 'local' },
  { id: 'lmstudio', label: 'LM Studio (tasuta)', group: 'local' },
  { id: 'hermes', label: 'Hermes Agent (tasuta)', group: 'local' },
  { id: 'openclaw', label: 'OpenClaw (tasuta)', group: 'local' },
  { id: 'openai', label: 'OpenAI', group: 'cloud' },
  { id: 'grok', label: 'Grok', group: 'cloud' },
  { id: 'perplexity', label: 'Perplexity', group: 'cloud' },
  { id: 'deepseek', label: 'DeepSeek', group: 'cloud' },
  { id: 'claude', label: 'Claude', group: 'cloud' },
  { id: 'huggingface', label: 'Hugging Face', group: 'cloud' },
]

export function getSavedChatProvider() {
  const saved = localStorage.getItem(PROVIDER_STORAGE_KEY)
  if (saved && CHAT_PROVIDERS.some(p => p.id === saved)) {
    if (isLocalChatProvider(saved) || hasChatApiKey(saved)) return saved
  }
  return getDefaultChatProvider()
}

export function saveChatProvider(provider) {
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider)
}

export function getDefaultChatProvider() {
  return 'ollama'
}

export function getLocalProviderRow(provider, localStatus) {
  return localStatus?.providers?.find(p => p.provider === provider) || null
}

/** online | needs_auth | needs_setup | offline | unknown */
export function getLocalProviderState(provider, localStatus) {
  const row = getLocalProviderRow(provider, localStatus)
  if (!row) return 'unknown'
  if (row.ok) return 'online'
  if (row.needsAuth) return 'needs_auth'
  if (row.needsSetup) return 'needs_setup'
  if (row.reachable) return 'needs_auth'
  return 'offline'
}

export function isLocalProviderOnline(provider, localStatus) {
  if (!isLocalChatProvider(provider)) return true
  if (!localStatus?.providers) return null
  return getLocalProviderState(provider, localStatus) === 'online'
}

export function hasChatApiKey(provider, localStatus = null) {
  if (isLocalChatProvider(provider)) {
    const online = isLocalProviderOnline(provider, localStatus)
    return online === null ? true : online
  }
  if (prefersEnvApiKey(provider)) return true
  return hasApiKey(provider)
}

export async function fetchLocalLlmStatus() {
  try {
    const res = await fetch('/api/dev/local-llm')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function getChatProviderLabel(provider) {
  return CHAT_PROVIDERS.find(p => p.id === provider)?.label || provider
}

export function getChatKeyHint(provider, localStatus) {
  if (isLocalChatProvider(provider)) {
    const row = getLocalProviderRow(provider, localStatus)
    if (row?.ok) {
      if (row.modelMismatch && row.configuredModel) {
        return `kohalik · ${row.model} ✓ (env: ${row.configuredModel})`
      }
      return `kohalik · ${row.model} ✓`
    }
    if (row?.statusDetail) return `kohalik · ${row.statusDetail}`
    const authVar = {
      lmstudio: 'LMSTUDIO_API_KEY',
      hermes: 'HERMES_API_KEY',
      openclaw: 'OPENCLAW_GATEWAY_TOKEN',
    }[provider]
    if (row?.needsAuth) return `kohalik · ${row.baseUrl} · lisa ${authVar || 'token'} (.env.local + restart)`
    if (row?.needsSetup) return `kohalik · ${row.baseUrl} · luba chatCompletions OpenClaw configis`
    if (row?.reachable) return `kohalik · ${row.baseUrl} · teenus vastab, aga chat API pole valmis`
    if (row) return `kohalik · ${row.baseUrl || row.model} (offline)`
    return 'kohalik · tasuta'
  }
  if (prefersEnvApiKey(provider)) return '(dev server env)'
  const key = getApiKey(provider)
  if (!key) return null
  return `···${key.slice(-4)}`
}

function parseChatError(data, status) {
  if (data?.error?.message) return data.error.message
  if (typeof data?.error === 'string') return data.error
  if (data?.message) return data.message
  return `Viga ${status}`
}

export async function sendChatMessage(provider, messages) {
  const apiKey = getApiKey(provider)
  if (!isLocalChatProvider(provider) && !apiKey && !prefersEnvApiKey(provider)) {
    throw new Error(`${getChatProviderLabel(provider)} API võti puudub. Lisa Seadetes, lülita env sisse või vali Ollama/LM Studio.`)
  }

  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      messages,
      apiKey,
      preferEnv: prefersEnvApiKey(provider),
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(parseChatError(data, res.status))
  }

  if (data.error) {
    throw new Error(parseChatError(data, res.status))
  }

  const text = data.text?.trim()
  if (!text) throw new Error('Tühi vastus serverist')

  return text
}

export async function sendCommandRequest(provider, messages, context) {
  const apiKey = getApiKey(provider)
  if (!isLocalChatProvider(provider) && !apiKey && !prefersEnvApiKey(provider)) {
    throw new Error(`${getChatProviderLabel(provider)} API võti puudub. Lisa Seadetes, lülita env sisse või vali Ollama/LM Studio.`)
  }

  const res = await fetch(COMMANDS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      messages,
      apiKey,
      context,
      preferEnv: prefersEnvApiKey(provider),
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(parseChatError(data, res.status))
  }
  if (data.error) {
    throw new Error(parseChatError(data, res.status))
  }

  return {
    reply: data.reply?.trim() || 'Käsk töödeldud.',
    commands: Array.isArray(data.commands) ? data.commands : [],
  }
}

export async function sendSourceEditRequest(provider, instruction, selection, context, extra = {}) {
  const apiKey = getApiKey(provider)
  if (!isLocalChatProvider(provider) && !apiKey && !prefersEnvApiKey(provider)) {
    throw new Error(`${getChatProviderLabel(provider)} API võti puudub. Lisa Seadetes, lülita env sisse või vali Ollama/LM Studio.`)
  }

  const res = await fetch(EDIT_SOURCE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      apiKey,
      instruction,
      selection,
      context,
      preferEnv: prefersEnvApiKey(provider),
      ...extra,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(parseChatError(data, res.status))
  }
  if (data.error) {
    throw new Error(parseChatError(data, res.status))
  }

  return {
    reply: data.reply?.trim() || 'Lähtefail uuendatud.',
    file: data.file,
    appliedCount: data.appliedCount || 0,
    mode: data.mode || extra.mode || 'edit',
  }
}

export async function sendAreaAssistRequest(provider, messages, selection, context, options = {}) {
  const apiKey = getApiKey(provider)
  if (!isLocalChatProvider(provider) && !apiKey && !prefersEnvApiKey(provider)) {
    throw new Error(`${getChatProviderLabel(provider)} API võti puudub. Lisa Seadetes, lülita env sisse või vali Ollama/LM Studio.`)
  }

  const res = await fetch(AREA_ASSIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      apiKey,
      messages,
      selection,
      context,
      domDetail: selection?.domDetail,
      intent: options.intent || 'ask',
      usePlaywright: options.usePlaywright !== false,
      preferEnv: prefersEnvApiKey(provider),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseChatError(data, res.status))
  if (data.error) throw new Error(parseChatError(data, res.status))

  return {
    reply: data.reply?.trim() || 'Vastus saadud.',
    commands: Array.isArray(data.commands) ? data.commands : [],
    sourceInstruction: data.sourceInstruction || null,
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    playwright: data.playwright || null,
  }
}

export async function sendInsertSourceRequest(provider, insertType, content, selection, context) {
  const snippet = buildInsertSnippet(insertType, {
    pageId: context?.page?.id,
    route: selection?.route || context?.route,
    content,
  })
  const instruction = buildInsertInstruction(insertType, { content, snippet, selection })
  return sendSourceEditRequest(provider, instruction, selection, context, {
    mode: 'insert',
    insertType,
    snippet,
  })
}