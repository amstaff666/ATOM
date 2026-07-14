import { defineConfig, loadEnv } from 'vite'

// Load .env / .env.local into process.env for dev API middleware (OPENAI_API_KEY jne)
const devEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')
for (const [k, v] of Object.entries(devEnv)) {
  if (v && !process.env[k]) process.env[k] = v
}
import react from '@vitejs/plugin-react'
import { callChatProvider, isValidChatProvider, providerNeedsApiKey } from './lib/chatProviders.js'
import { probeAllLocalLlms } from './lib/localLlm.js'
import { interpretCommands } from './lib/commandInterpreter.js'
import { editSourceFile, insertSourceElement, resolveSourceFile } from './lib/sourceEditor.js'
import { saveUploadedMedia, listUploadedMedia } from './lib/localMediaStorage.js'
import { assistMarkedArea } from './lib/areaAdvisor.js'
import { popSourceUndo } from './lib/sourceUndo.js'
import { listEditableElements } from './src/utils/pageRegistry.js'
import { resolveApiKey, envKeyHint, envKeyStatus } from './lib/envApiKeys.js'
import { CHAT_PROVIDER_IDS } from './lib/chatProviders.js'

// Local dev search proxy — mirrors api/search.js for Vercel production
const searchPlugin = {
  name: 'search-proxy',
  configureServer(server) {
    server.middlewares.use('/api/search', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

      const q = new URLSearchParams(req.url.split('?')[1] || '').get('q')
      if (!q) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing q' })); return }

      try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        })
        const xml = await r.text()
        const items = []
        for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
          const block = match[1]
          const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || '').trim()
          const desc = (block.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1] || block.match(/<description>(.*?)<\/description>/)?.[1] || '')
            .replace(/<[^>]+>/g, '').trim().slice(0, 300)
          const date = (block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '').trim()
          if (title) items.push({ title, description: desc, date })
          if (items.length >= 8) break
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ items }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message, items: [] }))
      }
    })
  },
}

// Local dev image proxy — mirrors api/img-proxy.js for Vercel production
const imgProxyPlugin = {
  name: 'img-proxy',
  configureServer(server) {
    server.middlewares.use('/api/img-proxy', async (req, res) => {
      const qs = new URLSearchParams(req.url.split('?')[1] || '')
      const url = qs.get('url')
      const name = qs.get('name') || 'image.jpg'
      if (!url) { res.writeHead(400); res.end('Missing url'); return }
      try {
        const r = await fetch(decodeURIComponent(url))
        const ct = r.headers.get('content-type') || 'image/jpeg'
        const buf = await r.arrayBuffer()
        res.writeHead(r.status, {
          'Content-Type': ct,
          'Content-Disposition': `attachment; filename="${decodeURIComponent(name)}"`,
          'Access-Control-Allow-Origin': '*',
        })
        res.end(Buffer.from(buf))
      } catch (e) {
        res.writeHead(500); res.end('Proxy error: ' + e.message)
      }
    })
  },
}

// Local dev Claude proxy — mirrors api/claude.js for Vercel production
const claudePlugin = {
  name: 'claude-proxy',
  configureServer(server) {
    server.middlewares.use('/api/claude', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, anthropic-beta')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
      const apiKey = req.headers['x-api-key']
      if (!apiKey) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'Missing x-api-key' } })); return }
      const chunks = []
      req.on('data', c => chunks.push(c))
      await new Promise(r => req.on('end', r))
      const body = Buffer.concat(chunks).toString()
      try {
        const upstreamHeaders = {
          'x-api-key': apiKey,
          'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
          'content-type': 'application/json',
        }
        if (req.headers['anthropic-beta']) upstreamHeaders['anthropic-beta'] = req.headers['anthropic-beta']
        const upstream = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: upstreamHeaders, body })
        const data = await upstream.json()
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(data))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: e.message } }))
      }
    })
  },
}

// Local dev chat proxy — mirrors api/chat.js for Vercel production
const chatPlugin = {
  name: 'chat-proxy',
  configureServer(server) {
    server.middlewares.use('/api/chat', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
      const chunks = []
      req.on('data', c => chunks.push(c))
      await new Promise(r => req.on('end', r))
      const body = Buffer.concat(chunks).toString()
      try {
        const parsed = JSON.parse(body || '{}')
        const { provider = 'ollama', messages, apiKey: bodyKey, preferEnv } = parsed
        const apiKey = resolveApiKey(provider, bodyKey, req.headers['x-api-key'], !!preferEnv)
        if (!apiKey && providerNeedsApiKey(provider)) {
          const hint = envKeyHint(provider)
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: hint ? `API võti puudub. Sea ${hint} või Lisa Seadetes.` : 'API võti puudub.' } }))
          return
        }
        if (!isValidChatProvider(provider)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: `Tundmatu provider: ${provider}` } }))
          return
        }
        if (!Array.isArray(messages) || messages.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'messages massiiv on kohustuslik' } }))
          return
        }
        const { text } = await callChatProvider(provider, apiKey, messages)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ text, provider }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: e.message } }))
      }
    })
  },
}

// Local dev commands proxy — mirrors api/commands.js for Vercel production
const commandsPlugin = {
  name: 'commands-proxy',
  configureServer(server) {
    server.middlewares.use('/api/commands', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
      const chunks = []
      req.on('data', c => chunks.push(c))
      await new Promise(r => req.on('end', r))
      const body = Buffer.concat(chunks).toString()
      try {
        const parsed = JSON.parse(body || '{}')
        const { provider = 'ollama', messages, apiKey: bodyKey, context, preferEnv } = parsed
        const apiKey = resolveApiKey(provider, bodyKey, req.headers['x-api-key'], !!preferEnv)
        if (!apiKey && providerNeedsApiKey(provider)) {
          const hint = envKeyHint(provider)
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: hint ? `API võti puudub. Sea ${hint}.` : 'API võti puudub.' } }))
          return
        }
        if (!isValidChatProvider(provider)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: `Tundmatu provider: ${provider}` } }))
          return
        }
        if (!Array.isArray(messages) || messages.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'messages massiiv on kohustuslik' } }))
          return
        }
        const result = await interpretCommands(provider, apiKey, messages, context || {})
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ...result, provider }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: e.message } }))
      }
    })
  },
}

// Local dev source editor — mirrors api/edit-source.js (dev-only file writes)
const editSourcePlugin = {
  name: 'edit-source',
  configureServer(server) {
    server.middlewares.use('/api/edit-source', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
      const chunks = []
      req.on('data', c => chunks.push(c))
      await new Promise(r => req.on('end', r))
      const body = Buffer.concat(chunks).toString()
      try {
        const parsed = JSON.parse(body || '{}')
        const { provider = 'ollama', apiKey: bodyKey, instruction, selection, context, mode, snippet, preferEnv } = parsed
        const apiKey = resolveApiKey(provider, bodyKey, req.headers['x-api-key'], !!preferEnv)
        if (!apiKey && providerNeedsApiKey(provider)) {
          const hint = envKeyHint(provider)
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: hint ? `API võti puudub. Sea ${hint}.` : 'API võti puudub.' } }))
          return
        }
        if (!isValidChatProvider(provider)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: `Tundmatu provider: ${provider}` } }))
          return
        }
        if (!instruction?.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'instruction on kohustuslik' } }))
          return
        }
        const route = selection?.route || context?.route || '/'
        const elementId = selection?.elementId || context?.activeElement?.id || null
        const file = selection?.file || resolveSourceFile(route, elementId, selection) || context?.page?.file
        if (!file) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'Selle ala jaoks pole lähtefaili kaardistatud.' } }))
          return
        }
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
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ...result, provider }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: e.message } }))
      }
    })
  },
}

// Local dev media upload — mirrors api/upload-media.js (saves to public/uploads/)
const uploadMediaPlugin = {
  name: 'upload-media',
  configureServer(server) {
    server.middlewares.use('/api/upload-media', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

      if (req.method === 'GET') {
        try {
          const qs = new URLSearchParams(req.url.split('?')[1] || '')
          const type = qs.get('type') === 'video' ? 'video' : 'image'
          const files = await listUploadedMedia(type)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ files }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: e.message } }))
        }
        return
      }

      if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
      const chunks = []
      req.on('data', c => chunks.push(c))
      await new Promise(r => req.on('end', r))
      const body = Buffer.concat(chunks).toString()
      try {
        const parsed = JSON.parse(body || '{}')
        const saved = await saveUploadedMedia({
          type: parsed.type,
          filename: parsed.filename,
          mimeType: parsed.mimeType,
          dataBase64: parsed.data,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(saved))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: e.message } }))
      }
    })
  },
}

// Area advisor + Playwright inspect — mirrors api/area-assist.js
const areaAssistPlugin = {
  name: 'area-assist',
  configureServer(server) {
    server.middlewares.use('/api/area-assist', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
      const chunks = []
      req.on('data', c => chunks.push(c))
      await new Promise(r => req.on('end', r))
      const body = Buffer.concat(chunks).toString()
      try {
        const parsed = JSON.parse(body || '{}')
        const {
          provider = 'ollama', apiKey: bodyKey, messages, context, selection, domDetail,
          intent, usePlaywright = true, preferEnv,
        } = parsed
        const apiKey = resolveApiKey(provider, bodyKey, req.headers['x-api-key'], !!preferEnv)
        if (!apiKey && providerNeedsApiKey(provider)) {
          const hint = envKeyHint(provider)
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: hint ? `API võti puudub. Sea ${hint}.` : 'API võti puudub.' } }))
          return
        }
        if (!isValidChatProvider(provider)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: `Tundmatu provider: ${provider}` } }))
          return
        }
        if (!selection) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'Märgitud ala puudub.' } }))
          return
        }
        const result = await assistMarkedArea({
          provider,
          apiKey,
          messages,
          context: context || {},
          selection,
          domDetail,
          intent: intent || 'ask',
          usePlaywright,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ...result, provider }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: e.message } }))
      }
    })
  },
}

// Luuna Mark — dev registry for CLI / PowerShell
const devRegistryPlugin = {
  name: 'luuna-mark-registry',
  configureServer(server) {
    server.middlewares.use('/api/dev/registry', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
        return
      }
      const qs = new URLSearchParams(req.url.split('?')[1] || '')
      const route = qs.get('route') || '/'
      const elements = listEditableElements(route).map(el => ({
        id: el.id,
        label: el.label,
        kind: el.kind,
        defaultText: el.defaultText ?? null,
        file: el.file ?? null,
        global: !!el.global,
      }))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ brand: 'Luuna Mark', route, elements }))
    })

    server.middlewares.use('/api/dev/env-status', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
        return
      }
      const providers = CHAT_PROVIDER_IDS.map(id => envKeyStatus(id))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ brand: 'Luuna Mark', providers, envFile: '.env.local' }))
    })

    server.middlewares.use('/api/undo-source', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
        return
      }
      try {
        const result = await popSourceUndo()
        if (!result) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'Lähtefaili undo ajalugu on tühi' } }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: e.message } }))
      }
    })

    server.middlewares.use('/api/dev/local-llm', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
        return
      }
      const status = await probeAllLocalLlms()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ brand: 'Luuna Mark', ...status }))
    })
  },
}

export default defineConfig({
  plugins: [react(), searchPlugin, imgProxyPlugin, claudePlugin, chatPlugin, commandsPlugin, editSourcePlugin, uploadMediaPlugin, areaAssistPlugin, devRegistryPlugin],
  server: {
    proxy: {
      '/api/hf': {
        target: 'https://mcp.higgsfield.ai',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/hf/, ''),
      },
    },
  },
})
