import { rateLimit, clientIp } from '../lib/rateLimit.js'
import { isValidChatProvider, providerNeedsApiKey } from '../lib/chatProviders.js'
import { assistMarkedArea } from '../lib/areaAdvisor.js'
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
    return res.status(429).json({ error: { message: 'Liiga palju päringuid.' } })
  }

  const {
    provider = 'ollama',
    apiKey: bodyKey,
    messages,
    context,
    selection,
    domDetail,
    intent,
    usePlaywright = true,
    preferEnv,
  } = req.body || {}

  const apiKey = resolveApiKey(provider, bodyKey, req.headers['x-api-key'], !!preferEnv)
  if (!apiKey && providerNeedsApiKey(provider)) {
    const hint = envKeyHint(provider)
    return res.status(400).json({
      error: { message: hint ? `API võti puudub. Sea dev serveris ${hint}.` : 'API võti puudub.' },
    })
  }
  if (!isValidChatProvider(provider)) {
    return res.status(400).json({ error: { message: `Tundmatu provider: ${provider}` } })
  }
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: { message: 'messages on kohustuslik' } })
  }
  if (!selection) {
    return res.status(400).json({ error: { message: 'Märgitud ala puudub — lohista esmalt ala.' } })
  }

  try {
    const result = await assistMarkedArea({
      provider,
      apiKey,
      messages,
      context: context || {},
      selection,
      domDetail,
      intent: intent || 'ask',
      usePlaywright: process.env.VERCEL ? false : usePlaywright,
    })
    return res.status(200).json({ ...result, provider })
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } })
  }
}