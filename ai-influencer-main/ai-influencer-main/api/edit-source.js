import { rateLimit, clientIp } from '../lib/rateLimit.js'
import { isValidChatProvider, providerNeedsApiKey } from '../lib/chatProviders.js'
import { editSourceFile, insertSourceElement, resolveSourceFile } from '../lib/sourceEditor.js'
import { resolveApiKey, envKeyHint } from '../lib/envApiKeys.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })

  if (process.env.VERCEL) {
    return res.status(501).json({
      error: { message: 'Lähtefaili muutmine töötab ainult kohalikus dev-keskkonnas (npm run dev).' },
    })
  }

  const rl = rateLimit(clientIp(req.headers))
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: { message: 'Liiga palju päringuid — oota hetk.' } })
  }

  const {
    provider = 'ollama',
    apiKey: bodyKey,
    instruction,
    selection,
    context,
    mode,
    insertType,
    snippet,
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
  if (!instruction?.trim()) {
    return res.status(400).json({ error: { message: 'instruction on kohustuslik' } })
  }

  const route = selection?.route || context?.route || '/'
  const elementId = selection?.elementId || context?.activeElement?.id || null
  const file = selection?.file
    || resolveSourceFile(route, elementId, selection)
    || context?.page?.file

  if (!file) {
    return res.status(400).json({ error: { message: 'Selle ala jaoks pole lähtefaili kaardistatud.' } })
  }

  try {
    const sel = { ...selection, route, elementId }
    const result = mode === 'insert'
      ? await insertSourceElement({
          provider,
          apiKey,
          file,
          instruction: instruction.trim(),
          selection: sel,
          snippet: snippet || '',
        })
      : await editSourceFile({
          provider,
          apiKey,
          file,
          instruction: instruction.trim(),
          selection: sel,
        })
    return res.status(200).json({ ...result, provider })
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } })
  }
}