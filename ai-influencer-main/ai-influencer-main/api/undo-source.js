import { popSourceUndo } from '../lib/sourceUndo.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  try {
    const result = await popSourceUndo()
    if (!result) {
      return res.status(404).json({ error: { message: 'Lähtefaili undo ajalugu on tühi' } })
    }
    return res.status(200).json(result)
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } })
  }
}