import { listEditableElements } from '../../src/utils/pageRegistry.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: { message: 'Method not allowed' } })

  const route = (req.query?.route || '/').split('?')[0] || '/'
  const elements = listEditableElements(route).map(el => ({
    id: el.id,
    label: el.label,
    kind: el.kind,
    defaultText: el.defaultText ?? null,
    file: el.file ?? null,
    global: !!el.global,
  }))

  return res.status(200).json({
    brand: 'Luuna Mark',
    route,
    elements,
  })
}