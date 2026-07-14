import {
  getLocalLlmConfig,
  getLocalProviderDisplayName,
  isLocalChatProvider,
  LOCAL_PROVIDER_IDS,
  resolveActiveLocalModel,
} from './localLlm.js'

export const CHAT_SYSTEM = `You are a helpful assistant inside AI Influencer Studio — a browser app for designing and generating AI influencer content (photos, videos, brand deals).

You help users with:
- Creating and refining influencer personas, backstories, and visual prompts
- Navigating the app (Influencers, Create, Photo Studio, Video Studio, Settings)
- Content ideas, captions, and creative direction
- Explaining how Higgsfield image/video generation works in this app

Keep answers concise, practical, and friendly. Respond in the same language the user writes in.`

const OPENAI_COMPAT = (url, model) => ({
  url,
  model,
  buildBody: (messages, system = CHAT_SYSTEM) => ({
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: 1024,
  }),
  auth: (key) => ({ Authorization: `Bearer ${key}` }),
  parseResponse: (data) => data.choices?.[0]?.message?.content,
})

const CLOUD_PROVIDERS = {
  openai: OPENAI_COMPAT('https://api.openai.com/v1/chat/completions', 'gpt-4o-mini'),
  grok: OPENAI_COMPAT('https://api.x.ai/v1/chat/completions', 'grok-3-mini'),
  perplexity: OPENAI_COMPAT('https://api.perplexity.ai/chat/completions', 'sonar'),
  deepseek: OPENAI_COMPAT('https://api.deepseek.com/chat/completions', 'deepseek-chat'),
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-haiku-4-5-20251001',
    buildBody: (messages, system = CHAT_SYSTEM) => ({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages,
    }),
    auth: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    parseResponse: (data) => data.content?.find(c => c.type === 'text')?.text,
  },
}

export const CHAT_PROVIDER_IDS = [...LOCAL_PROVIDER_IDS, ...Object.keys(CLOUD_PROVIDERS)]

export function isValidChatProvider(id) {
  return isLocalChatProvider(id) || id in CLOUD_PROVIDERS
}

export function providerNeedsApiKey(id) {
  return !isLocalChatProvider(id)
}

function huggingfaceChatModel() {
  return process.env.HUGGINGFACE_CHAT_MODEL || process.env.HF_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct'
}

function getProviderRuntimeConfig(provider) {
  if (isLocalChatProvider(provider)) {
    const local = getLocalLlmConfig(provider)
    if (!local) throw new Error(`Kohalik provider ${provider} pole seadistatud`)
    return {
      url: local.chatUrl,
      model: local.model,
      buildBody: (messages, system = CHAT_SYSTEM) => ({
        model: local.model,
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: 1024,
        temperature: 0.6,
        stream: false,
      }),
      auth: (key) => {
        const token = key || local.apiKey
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
      parseResponse: (data) => data.choices?.[0]?.message?.content,
    }
  }
  if (provider === 'huggingface') {
    return OPENAI_COMPAT('https://router.huggingface.co/v1/chat/completions', huggingfaceChatModel())
  }
  return CLOUD_PROVIDERS[provider]
}

const PROVIDER_LABELS = {
  ollama: 'Ollama (tasuta)',
  lmstudio: 'LM Studio (tasuta)',
  hermes: 'Hermes Agent (tasuta)',
  openclaw: 'OpenClaw (tasuta)',
  openai: 'OpenAI',
  grok: 'Grok (xAI)',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
  claude: 'Claude',
  huggingface: 'Hugging Face',
}

const BILLING_HINTS = {
  openai: 'https://platform.openai.com/account/billing',
  grok: 'https://console.x.ai/',
  perplexity: 'https://www.perplexity.ai/settings/api',
  deepseek: 'https://platform.deepseek.com/top_up',
  claude: 'https://console.anthropic.com/settings/billing',
  huggingface: 'https://huggingface.co/settings/billing',
}

function quotaBillingMessage(label, provider) {
  const url = BILLING_HINTS[provider] || ''
  const envNames = {
    openai: 'OPENAI_API_KEY',
    grok: 'XAI_API_KEY',
    perplexity: 'PERPLEXITY_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    claude: 'ANTHROPIC_API_KEY',
    huggingface: 'HUGGINGFACE_API_KEY või HF_TOKEN',
  }[provider] || 'API võti'

  if (provider === 'openai') {
    return `${label}: OpenAI kvoot täis või arveldus puudub. Uus võti samas kontos ei aita ilma billinguta: ${url} — või lisa töötav võti Seadetes / .env.local (${envNames}).`
  }
  if (provider === 'perplexity') {
    return `${label}: API krediit puudub või kvoot täis (see EI ole OpenAI). Osta API krediit: ${url} — võti peab algama pplx- ja olema .env.local failis ${envNames} (chat: „Kasuta dev env võtit“ ON + npm run dev restart).`
  }
  return `${label}: kvoot täis või arveldus puudub. Kontrolli billingut: ${url} — võti: ${envNames} (.env.local) või Seaded.`
}

function upstreamError(data, status, provider) {
  const raw = data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || data?.message
  const label = PROVIDER_LABELS[provider] || provider

  if (typeof raw === 'string' && raw) {
    const msg = raw.trim()

    if (/exceeded your current quota|insufficient_quota|billing hard limit|credit balance|out of credits|quota exceeded/i.test(msg)
      || (status === 429 && /quota|rate/i.test(msg))
      || (status === 402)) {
      if (provider === 'deepseek' && /insufficient\s+balance/i.test(msg)) {
        // handled below
      } else {
        return `${quotaBillingMessage(label, provider)} (API: ${msg.slice(0, 120)})`
      }
    }

    if (/insufficient\s+balance/i.test(msg) || status === 402) {
      if (provider === 'deepseek') {
        return `${label}: kontol pole raha (402 Insufficient Balance). Täienda DeepSeek saldot: https://platform.deepseek.com/top_up — see ei ole appi viga.`
      }
      return `${label}: API konto saldo on tühi (${msg}). Täienda krediiti selle provideri armatuurlaual — võti võib olla õige, aga raha on otsas.`
    }

    if (isLocalChatProvider(provider) && /ECONNREFUSED|fetch failed|connection/i.test(msg)) {
      const cfg = getLocalLlmConfig(provider)
      const name = getLocalProviderDisplayName(provider)
      const envHint = cfg?.envVars?.model || 'MODEL'
      return `${label}: ${name} ei tööta (${cfg?.baseUrl}). Käivita teenus ja kontrolli .env.local (${envHint}).`
    }

    if (isLocalChatProvider(provider) && (status === 401 || /unauthorized|forbidden/i.test(msg))) {
      const cfg = getLocalLlmConfig(provider)
      const keyVar = cfg?.envVars?.apiKey || 'API võti'
      return `${label}: kohalik auth puudub või vale. Lisa .env.local → ${keyVar} ja taaskäivita npm run dev.`
    }

    if (/invalid.*api.*key|incorrect api key|authentication fails|invalid x-api-key|unauthorized/i.test(msg) || status === 401) {
      const prefixHint = {
        openai: 'sk-… (OpenAI võti, MITTE DeepSeek)',
        grok: 'xai-…',
        perplexity: 'pplx-…',
        deepseek: 'sk-… (DeepSeek võti platform.deepseek.com-ist)',
        claude: 'sk-ant-…',
        huggingface: 'hf_…',
      }[provider]
      return `${label}: vale või aegunud API võti. Seadetes → ${label} → lisa ÕIGE võti${prefixHint ? ` (${prefixHint})` : ''}. OpenAI ja DeepSeek võtmed algavad mõlemad sk-ga — ära aja neid sassi!`
    }

    if (msg.includes('invalid x-api-key') && provider !== 'claude') {
      return `${label}: võti läks valele API-le. Taaskäivita dev server (npm run dev) ja veendu, et võti on Seadetes õige provideri all.`
    }

    return `${label}: ${msg}`
  }

  return `${label}: API viga (HTTP ${status})`
}

async function upstreamChat(config, provider, apiKey, body) {
  const headers = {
    'content-type': 'application/json',
    ...config.auth(apiKey),
  }
  const upstream = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await upstream.json().catch(() => ({}))
  if (!upstream.ok) throw new Error(upstreamError(data, upstream.status, provider))
  const text = config.parseResponse(data)?.trim()
  if (!text) throw new Error('Tühi vastus serverist')
  return { text }
}

export async function callChatProvider(provider, apiKey, messages) {
  if (isLocalChatProvider(provider)) await resolveActiveLocalModel(provider)
  const config = getProviderRuntimeConfig(provider)
  if (!config) throw new Error(`Tundmatu provider: ${provider}`)
  return upstreamChat(config, provider, apiKey || 'local', config.buildBody(messages, CHAT_SYSTEM))
}

export async function callChatWithSystem(provider, apiKey, messages, system) {
  if (isLocalChatProvider(provider)) await resolveActiveLocalModel(provider)
  const config = getProviderRuntimeConfig(provider)
  if (!config) throw new Error(`Tundmatu provider: ${provider}`)
  return upstreamChat(config, provider, apiKey || 'local', config.buildBody(messages, system))
}