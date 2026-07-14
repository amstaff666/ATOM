/** Dev/server env API keys — fallback when browser localStorage key is empty or "use env" is on */

import { getLocalLlmConfig, isLocalChatProvider } from './localLlm.js'

const ENV_BY_PROVIDER = {
  openai: ['OPENAI_API_KEY'],
  grok: ['XAI_API_KEY', 'GROK_API_KEY'],
  perplexity: ['PERPLEXITY_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  claude: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
  huggingface: ['HUGGINGFACE_API_KEY', 'HF_TOKEN', 'HUGGINGFACE_TOKEN'],
}

export function getEnvApiKey(provider) {
  const names = ENV_BY_PROVIDER[provider]
  if (!names) return null
  for (const name of names) {
    const v = process.env[name]?.trim()
    if (v) return v
  }
  return null
}

/** preferEnv: chat „Kasuta dev env võtit“ — .env.local enne brauseri võtit */
export function resolveApiKey(provider, bodyKey, headerKey, preferEnv = false) {
  if (isLocalChatProvider(provider)) {
    const cfg = getLocalLlmConfig(provider)
    if (cfg?.apiKey) return cfg.apiKey
  }
  if (preferEnv) {
    const fromEnv = getEnvApiKey(provider)
    if (fromEnv) return fromEnv
  }
  const explicit = (bodyKey || headerKey || '').trim()
  if (explicit) return explicit
  return getEnvApiKey(provider) || ''
}

export function maskKey(key) {
  if (!key || key.length < 8) return key ? '···' : '(puudub)'
  return `···${key.slice(-4)}`
}

export function envKeyStatus(provider) {
  if (isLocalChatProvider(provider)) {
    const cfg = getLocalLlmConfig(provider)
    const vars = [cfg?.envVars?.baseUrl, cfg?.envVars?.model].filter(Boolean)
    if (cfg?.envVars?.apiKey) vars.push(cfg.envVars.apiKey)
    return {
      provider,
      loaded: !cfg?.requiresAuth || !!cfg?.apiKey,
      local: true,
      free: true,
      hint: cfg?.requiresAuth && !cfg?.apiKey
        ? `${cfg?.model || 'mudel'} (vajab tokenit)`
        : (cfg?.model || 'mudel'),
      baseUrl: cfg?.baseUrl,
      vars,
    }
  }
  const key = getEnvApiKey(provider)
  return {
    provider,
    loaded: !!key,
    hint: maskKey(key),
    vars: ENV_BY_PROVIDER[provider] || [],
  }
}

export function envKeyHint(provider) {
  const names = ENV_BY_PROVIDER[provider]
  return names?.join(' või ') || null
}