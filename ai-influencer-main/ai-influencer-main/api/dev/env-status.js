import { envKeyStatus } from '../../lib/envApiKeys.js'
import { CHAT_PROVIDER_IDS } from '../../lib/chatProviders.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: { message: 'Method not allowed' } })

  return res.status(200).json({
    brand: 'Luuna Mark',
    providers: CHAT_PROVIDER_IDS.map(id => envKeyStatus(id)),
    envFile: '.env.local',
  })
}