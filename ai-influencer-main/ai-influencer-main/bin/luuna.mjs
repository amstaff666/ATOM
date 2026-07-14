#!/usr/bin/env node
/**
 * Luuna Mark — mark the page, ship the code.
 * CLI for AI Influencer Studio dev engine (browser · PowerShell · IDE).
 */

const BRAND = 'Luuna Mark'
const VERSION = '0.1.0'
const DEFAULT_PORT = 5173

const HELP = `
${BRAND} v${VERSION}
Mark the page. Ship the code.

Usage:
  luuna <command> [options]
  npm run luuna -- <command>

Commands:
  help              Show this help
  doctor            Check dev server + API reachability
  registry list     List editable elements (requires dev server)
  element update    Update element override (coming soon)
  source edit       Edit JSX source via dev API (coming soon)
  mark              Open area-pick hints in browser (coming soon)

Examples:
  luuna doctor
  luuna registry list
  luuna registry list --route /influencers

Environment:
  LUUNA_MARK_URL    Dev server base URL (default: http://localhost:5173)
  LUUNA_MARK_PORT   Port if URL not set (default: 5173)

PowerShell module: scripts/LuunaMark.psm1
`

function baseUrl() {
  if (process.env.LUUNA_MARK_URL) return process.env.LUUNA_MARK_URL.replace(/\/$/, '')
  const port = process.env.LUUNA_MARK_PORT || DEFAULT_PORT
  return `http://localhost:${port}`
}

async function cmdDoctor() {
  const url = baseUrl()
  const lines = [`${BRAND} doctor`, `Target: ${url}`, '']

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    lines.push(res.ok ? `✓ Dev server OK (${res.status})` : `✗ Dev server responded ${res.status}`)
  } catch (e) {
    lines.push(`✗ Dev server unreachable: ${e.message}`)
    lines.push('  → Run: npm run dev')
  }

  try {
    const envRes = await fetch(`${url}/api/dev/env-status`, { signal: AbortSignal.timeout(5000) })
    if (envRes.ok) {
      const data = await envRes.json()
      lines.push('', 'Env võtmed (.env.local / process.env):')
      for (const p of data.providers || []) {
        if (p.local) {
          lines.push(`  ○ ${p.provider} (tasuta) ${p.hint} @ ${p.baseUrl || '?'}`)
          continue
        }
        lines.push(p.loaded
          ? `  ✓ ${p.provider} ${p.hint} ← ${(p.vars || []).join(' / ')}`
          : `  ✗ ${p.provider} (puudub) — lisa .env.local: ${(p.vars || [])[0] || '?'}`)
      }
    }
  } catch { /* optional */ }

  try {
    const localRes = await fetch(`${url}/api/dev/local-llm`, { signal: AbortSignal.timeout(6000) })
    if (localRes.ok) {
      const data = await localRes.json()
      lines.push('', 'Kohalik chat (Ollama / LM Studio / Hermes / OpenClaw):')
      for (const p of data.providers || []) {
        const authNote = p.needsAuth ? ' (server OK — lisa LMSTUDIO_API_KEY / HERMES_API_KEY .env.local)' : ''
        const offlineNote = p.reachable && !p.needsAuth ? ' (server vastab, aga mudel/probe ebaõnnestus)' : ''
        lines.push(p.ok
          ? `  ✓ ${p.provider} online · ${p.model} @ ${p.baseUrl}`
          : `  ✗ ${p.provider} offline · ${p.model} @ ${p.baseUrl}${authNote}${offlineNote}${p.error ? ` (${p.error})` : ''}`)
      }
      if (data.defaultProvider) {
        lines.push(`  → vaikimisi: ${data.defaultProvider}`)
      }
    }
  } catch { /* optional */ }

  for (const path of ['/api/commands', '/api/edit-source', '/api/area-assist']) {
    try {
      const res = await fetch(`${url}${path}`, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(3000),
      })
      lines.push(res.ok || res.status === 204 || res.status === 200
        ? `✓ ${path}`
        : `? ${path} (${res.status})`)
    } catch {
      lines.push(`✗ ${path} (unreachable)`)
    }
  }

  console.log(lines.join('\n'))
  process.exit(lines.some(l => l.startsWith('✗ Dev server')) ? 1 : 0)
}

async function cmdRegistryList(args) {
  const routeIdx = args.indexOf('--route')
  const route = routeIdx !== -1 ? args[routeIdx + 1] || '/' : '/'
  const url = baseUrl()

  let res
  try {
    res = await fetch(`${url}/api/dev/registry?route=${encodeURIComponent(route)}`, {
      signal: AbortSignal.timeout(8000),
    })
  } catch (e) {
    console.error(`${BRAND}: dev server not reachable (${url})`)
    console.error(e.message)
    console.error('Start with: npm run dev')
    process.exit(1)
  }

  if (res.status === 404) {
    console.log(`${BRAND}: registry API not wired yet — use in-app chat or wait for next update.`)
    console.log('Known nav ids: nav.brand, nav.link.*, nav.create, nav.theme, nav.settings')
    process.exit(0)
  }

  if (!res.ok) {
    console.error(`${BRAND}: registry failed (${res.status})`)
    process.exit(1)
  }

  const data = await res.json()
  const items = data.elements || []
  if (!items.length) {
    console.log(`No elements for route ${route}`)
    return
  }
  console.log(`${BRAND} registry — ${route}\n`)
  for (const el of items) {
    const g = el.global ? ' [global]' : ''
    console.log(`  ${el.id}${g}`)
    console.log(`    ${el.label} · ${el.kind} · ${el.defaultText ?? '—'}`)
  }
}

function cmdStub(name) {
  console.log(`${BRAND}: "${name}" coming in the next Luuna Mark release.`)
  console.log('Use in-app chat (Muuda / Vali & küsi) until then.')
}

async function main() {
  const [, , command, sub, ...rest] = process.argv

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP.trim())
    return
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log(`${BRAND} v${VERSION}`)
    return
  }

  if (command === 'doctor') {
    await cmdDoctor()
    return
  }

  if (command === 'registry' && sub === 'list') {
    await cmdRegistryList(rest)
    return
  }

  if (command === 'element') {
    cmdStub(`element ${sub || ''}`.trim())
    return
  }

  if (command === 'source') {
    cmdStub(`source ${sub || ''}`.trim())
    return
  }

  if (command === 'mark') {
    cmdStub('mark')
    return
  }

  console.error(`Unknown command: ${command}`)
  console.error('Run: luuna help')
  process.exit(1)
}

main().catch(e => {
  console.error(`${BRAND} error:`, e.message)
  process.exit(1)
})