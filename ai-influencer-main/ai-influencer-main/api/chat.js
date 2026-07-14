import { rateLimit, clientIp } from '../lib/rateLimit.js'
import { callChatProvider, isValidChatProvider, providerNeedsApiKey } from '../lib/chatProviders.js'
import { resolveApiKey, envKeyHint } from '../lib/envApiKeys.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })

  const rl = rateLimit(clientIp(req.headers))
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: { message: 'Liiga palju päringuid — oota hetk ja proovi uuesti.' } })
  }

  const { provider = 'ollama', messages, apiKey: bodyKey, preferEnv } = req.body || {}
  const apiKey = resolveApiKey(provider, bodyKey, req.headers['x-api-key'], !!preferEnv)

  if (!apiKey && providerNeedsApiKey(provider)) {
    const hint = envKeyHint(provider)
    return res.status(400).json({
      error: {
        message: hint
          ? `API võti puudub. Lisa Seadetes või sea dev serveris ${hint}.`
          : 'API võti puudub. Lisa see Seadetes valitud provideri alla.',
      },
    })
  }
  if (!isValidChatProvider(provider)) {
    return res.status(400).json({ error: { message: `Tundmatu provider: ${provider}` } })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'messages massiiv on kohustuslik' } })
  }

  try {
    const { text } = await callChatProvider(provider, apiKey, messages)
    return res.status(200).json({ text, provider })
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } })
  }
}