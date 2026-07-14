/** Kohalikud tasuta LLM-id — Ollama, LM Studio, Hermes Agent, OpenClaw */

export const LOCAL_PROVIDER_IDS = ['ollama', 'lmstudio', 'hermes', 'openclaw']

/** Viimane probe/chat lahendatud mudel (configured → active) */
const activeModelCache = new Map()

const LOCAL_SPECS = {
  ollama: {
    label: 'Ollama (kohalik)',
    baseUrlEnv: 'OLLAMA_BASE_URL',
    defaultBaseUrl: 'http://127.0.0.1:11434',
    modelEnv: ['OLLAMA_MODEL', 'OLLAMA_CHAT_MODEL'],
    defaultModel: 'llama3.2',
    apiKeyEnv: [],
    probePath: '/api/tags',
    listModels: data => (data.models || []).map(m => m.name).slice(0, 8),
  },
  lmstudio: {
    label: 'LM Studio (kohalik)',
    baseUrlEnv: 'LMSTUDIO_BASE_URL',
    defaultBaseUrl: 'http://127.0.0.1:1234',
    modelEnv: ['LMSTUDIO_MODEL', 'LMSTUDIO_CHAT_MODEL'],
    defaultModel: 'local-model',
    apiKeyEnv: ['LMSTUDIO_API_KEY', 'LM_API_TOKEN', 'LMSTUDIO_API_TOKEN'],
    probePath: '/v1/models',
    listModels: data => (data.data || []).map(m => m.id).slice(0, 8),
  },
  hermes: {
    label: 'Hermes Agent (kohalik)',
    baseUrlEnv: 'HERMES_BASE_URL',
    defaultBaseUrl: 'http://127.0.0.1:8642',
    modelEnv: ['HERMES_MODEL', 'HERMES_CHAT_MODEL', 'API_SERVER_MODEL_NAME'],
    defaultModel: 'hermes-agent',
    apiKeyEnv: ['HERMES_API_KEY', 'API_SERVER_KEY'],
    probePath: '/v1/models',
    healthPath: '/health',
    listModels: data => (data.data || []).map(m => m.id).slice(0, 8),
  },
  openclaw: {
    label: 'OpenClaw (kohalik)',
    baseUrlEnv: 'OPENCLAW_BASE_URL',
    defaultBaseUrl: 'http://127.0.0.1:18789',
    modelEnv: ['OPENCLAW_MODEL', 'OPENCLAW_CHAT_MODEL'],
    defaultModel: 'openclaw/default',
    apiKeyEnv: ['OPENCLAW_GATEWAY_TOKEN', 'OPENCLAW_API_KEY', 'OPENCLAW_GATEWAY_PASSWORD'],
    probePath: '/v1/models',
    listModels: data => (data.data || []).map(m => m.id).slice(0, 8),
  },
}

export const LOCAL_PROVIDER_LABELS = Object.fromEntries(
  Object.entries(LOCAL_SPECS).map(([id, s]) => [id, s.label]),
)

export function isLocalChatProvider(provider) {
  return LOCAL_PROVIDER_IDS.includes(provider)
}

function firstEnv(names) {
  for (const name of names) {
    const v = process.env[name]?.trim()
    if (v) return v
  }
  return null
}

function configuredModel(spec) {
  return firstEnv(spec.modelEnv) || spec.defaultModel
}

function cachedActiveModel(provider, configured) {
  const row = activeModelCache.get(provider)
  if (row?.configured === configured && row?.model) return row.model
  return configured
}

export function setActiveModelCache(provider, configured, model) {
  activeModelCache.set(provider, { configured, model, at: Date.now() })
}

/** Vali chat-mudel: env → täpne tag → pilvemudel (:cloud) → esimene paigaldatud */
export function pickActiveModel(configured, installed = []) {
  const cfg = (configured || '').trim()
  if (!installed.length) return cfg
  if (installed.includes(cfg)) return cfg
  const base = cfg.split(':')[0]
  const partial = installed.find(m => m === cfg || m.startsWith(`${base}:`) || m.split(':')[0] === base)
  if (partial) return partial
  if (cfg.includes(':cloud')) {
    const cloud = installed.find(m => m.includes(':cloud') && m.split(':')[0] === base)
    if (cloud) return cloud
  }
  const anyCloud = installed.find(m => m.endsWith(':cloud'))
  if (anyCloud) return anyCloud
  return installed[0]
}

async function verifyOllamaModel(baseUrl, name) {
  if (!name?.trim()) return false
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/show`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return false
    const data = await res.json().catch(() => ({}))
    return !!(data.capabilities?.length || data.details || data.model_info)
  } catch {
    return false
  }
}

export async function resolveActiveLocalModel(provider) {
  const spec = LOCAL_SPECS[provider]
  if (!spec) return null
  const cfg = getLocalLlmConfig(provider)
  const configured = configuredModel(spec)
  const cached = activeModelCache.get(provider)
  if (cached?.configured === configured && cached?.model && Date.now() - cached.at < 60_000) {
    return cached.model
  }
  const probe = await probeLocalLlm(provider)
  return probe.model || configured
}

export function getLocalLlmConfig(provider) {
  const spec = LOCAL_SPECS[provider]
  if (!spec) return null

  const baseUrl = (process.env[spec.baseUrlEnv] || spec.defaultBaseUrl).replace(/\/$/, '')
  const configured = configuredModel(spec)
  const model = cachedActiveModel(provider, configured)
  const apiKey = firstEnv(spec.apiKeyEnv) || null

  return {
    provider,
    label: spec.label,
    baseUrl,
    model,
    configuredModel: configured,
    apiKey,
    requiresAuth: spec.apiKeyEnv.length > 0,
    chatUrl: `${baseUrl}/v1/chat/completions`,
    probeUrl: `${baseUrl}${spec.probePath}`,
    healthUrl: spec.healthPath ? `${baseUrl}${spec.healthPath}` : null,
    envVars: {
      baseUrl: spec.baseUrlEnv,
      model: spec.modelEnv[0],
      apiKey: spec.apiKeyEnv[0] || null,
    },
  }
}

export function getLocalProviderDisplayName(provider) {
  return LOCAL_SPECS[provider]?.label?.replace(/\s*\(kohalik\)\s*/i, '') || provider
}

async function probeWithAuth(cfg, provider) {
  const spec = LOCAL_SPECS[provider]
  const headers = {}
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`

  const tryFetch = async (url) => {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) })
    const contentType = res.headers.get('content-type') || ''
    const raw = await res.text()
    let data = {}
    try {
      data = raw ? JSON.parse(raw) : {}
    } catch {
      data = { message: raw.slice(0, 120), _nonJson: true }
    }
    if (!res.ok) return { ok: false, status: res.status, data, contentType }
    const jsonOk = contentType.includes('application/json') && !data._nonJson
    return { ok: jsonOk, status: res.status, data, contentType, nonJson: !jsonOk }
  }

  const authError = (data, status) => {
    const msg = data?.error?.message || data?.message || ''
    return status === 401 || status === 403
      || /api token is required|invalid_api_key|authorization/i.test(msg)
  }

  let result = await tryFetch(cfg.probeUrl)
  if (!result.ok && cfg.healthUrl) {
    const health = await tryFetch(cfg.healthUrl)
    if (health.ok) {
      return {
        provider,
        ok: true,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
        models: [cfg.model],
        free: true,
        auth: !!cfg.apiKey,
      }
    }
  }

  if (!result.ok) {
    const needsToken = authError(result.data, result.status) && !cfg.apiKey
    const reachable = needsToken
      || result.nonJson
      || (result.status > 0 && result.status < 500)
    const needsSetup = result.nonJson && provider === 'openclaw'
    return {
      provider,
      ok: false,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      configuredModel: cfg.configuredModel,
      status: result.status,
      needsAuth: needsToken,
      needsSetup,
      statusDetail: needsSetup
        ? 'Gateway töötab, aga chat API on välja lülitatud (gateway.http.endpoints.chatCompletions.enabled)'
        : (needsToken ? 'API token puudub .env.local failis' : null),
      reachable,
      free: true,
    }
  }

  const installed = spec.listModels(result.data)
  let activeModel = cfg.configuredModel

  if (provider === 'ollama') {
    const envOk = await verifyOllamaModel(cfg.baseUrl, cfg.configuredModel)
    if (!envOk) {
      activeModel = pickActiveModel(cfg.configuredModel, installed)
      if (!installed.includes(activeModel)) {
        const fallbackOk = await verifyOllamaModel(cfg.baseUrl, activeModel)
        if (!fallbackOk) activeModel = installed[0] || cfg.configuredModel
      }
    }
  } else if (!installed.includes(activeModel)) {
    activeModel = pickActiveModel(cfg.configuredModel, installed)
  }

  setActiveModelCache(provider, cfg.configuredModel, activeModel)

  return {
    provider,
    ok: true,
    baseUrl: cfg.baseUrl,
    model: activeModel,
    configuredModel: cfg.configuredModel,
    models: installed,
    modelMismatch: cfg.configuredModel !== activeModel,
    free: true,
    auth: !!cfg.apiKey,
  }
}

export async function probeLocalLlm(provider) {
  const cfg = getLocalLlmConfig(provider)
  if (!cfg) return { provider, ok: false, error: 'Tundmatu provider' }

  try {
    return await probeWithAuth(cfg, provider)
  } catch (e) {
    const refused = /ECONNREFUSED|fetch failed|connection/i.test(e.message || '')
    return {
      provider,
      ok: false,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      configuredModel: cfg.configuredModel,
      error: e.message,
      needsAuth: cfg.requiresAuth && !cfg.apiKey,
      statusDetail: refused
        ? (provider === 'hermes'
          ? 'Hermes gateway ei tööta — käivita: hermes gateway run (API_SERVER_ENABLED=true)'
          : provider === 'openclaw'
            ? 'OpenClaw gateway ei tööta — käivita: openclaw gateway start'
            : 'Teenus ei vasta — kontrolli, kas server on käivitatud')
        : null,
      reachable: false,
      free: true,
    }
  }
}

export async function probeAllLocalLlms() {
  const results = []
  for (const id of LOCAL_PROVIDER_IDS) {
    results.push(await probeLocalLlm(id))
  }
  const firstUp = results.find(r => r.ok)
  return { providers: results, defaultProvider: firstUp?.provider || 'ollama' }
}