// Utility functions for managing API keys across different AI providers

export const API_KEY_CONFIG = {
  openai: { key: 'openai_api_key', label: 'OpenAI', prefix: 'sk-', prefixes: ['sk-'] },
  grok: { key: 'grok_api_key', label: 'Grok (xAI)', prefix: 'xai-' },
  qwen: { key: 'qwen_api_key', label: 'Qwen/Alibaba', prefix: 'sk-' },
  deepseek: { key: 'deepseek_api_key', label: 'DeepSeek', prefix: 'sk-' },
  gemini: { key: 'gemini_api_key', label: 'Google Gemini', prefix: 'AIza' },
  stability: { key: 'stability_api_key', label: 'Stability AI', prefix: 'sk-' },
  replicate: { key: 'replicate_api_key', label: 'Replicate', prefix: 'r8_' },
  huggingface: { key: 'huggingface_api_key', label: 'Hugging Face', prefix: 'hf_' },
  together: { key: 'together_api_key', label: 'Together AI', prefix: 'tgp_' },
  fireworks: { key: 'fireworks_api_key', label: 'Fireworks AI', prefix: 'fw_' },
  groq: { key: 'groq_api_key', label: 'Groq', prefix: 'gsk_' },
  nvidia: { key: 'nvidia_api_key', label: 'NVIDIA NIM', prefix: 'nvapi-' },
  ollama: { key: 'ollama_url', label: 'Ollama', prefix: 'http', isUrl: true },
  perplexity: { key: 'perplexity_api_key', label: 'Perplexity', prefix: 'pplx-' },
  midjourney: { key: 'midjourney_api_key', label: 'Midjourney', prefix: 'mj_' },
  leonardo: { key: 'leonardo_api_key', label: 'Leonardo AI', prefix: 'lr_' },
  claude: { key: 'claude_api_key', label: 'Claude AI', prefix: 'sk-ant-' },
}

function useEnvKeyFlag(provider) {
  try {
    return localStorage.getItem(`${provider}_use_env`) === '1'
  } catch {
    return false
  }
}

export function prefersEnvApiKey(provider) {
  return useEnvKeyFlag(provider)
}

export function setPrefersEnvApiKey(provider, on) {
  try {
    if (on) localStorage.setItem(`${provider}_use_env`, '1')
    else localStorage.removeItem(`${provider}_use_env`)
    return true
  } catch {
    return false
  }
}

export function getApiKey(provider) {
  const config = API_KEY_CONFIG[provider]
  if (!config) return null
  if (useEnvKeyFlag(provider)) return null
  const raw = localStorage.getItem(config.key)
  return raw ? raw.trim() : null
}

export function hasApiKey(provider) {
  if (useEnvKeyFlag(provider)) return true
  return !!getApiKey(provider)
}

export function setApiKey(provider, key) {
  const config = API_KEY_CONFIG[provider]
  if (!config) return false
  try {
    localStorage.setItem(config.key, key)
    return true
  } catch (e) {
    console.error('Failed to save API key:', e)
    return false
  }
}

export function removeApiKey(provider) {
  const config = API_KEY_CONFIG[provider]
  if (!config) return false
  try {
    localStorage.removeItem(config.key)
    return true
  } catch (e) {
    console.error('Failed to remove API key:', e)
    return false
  }
}

export function getAvailableProviders() {
  const available = []
  Object.keys(API_KEY_CONFIG).forEach(provider => {
    if (hasApiKey(provider)) {
      available.push(provider)
    }
  })
  return available
}

export function validateApiKey(provider, key) {
  const config = API_KEY_CONFIG[provider]
  if (!config) return false
  if (!key || key.trim().length === 0) return false
  if (config.isUrl) return /^https?:\/\/.+/.test(key)
  if (config.prefixes) return config.prefixes.some(p => key.startsWith(p))
  if (!key.startsWith(config.prefix)) return false
  return true
}