import fs from 'fs/promises'
import path from 'path'
import { callChatWithSystem } from './chatProviders.js'
import { pushSourceUndo } from './sourceUndo.js'
import { getElementMeta, getPageMeta, NAV_FILE } from '../src/utils/pageRegistry.js'

export function resolveSourceFile(route, elementId, selection) {
  if (selection?.isNav) return NAV_FILE
  if (selection?.file && String(selection.file).includes('Nav.jsx')) return selection.file
  if (elementId) {
    const el = getElementMeta(route, elementId)
    if (el?.file) return el.file
  }
  return getPageMeta(route).file || null
}

const ALLOWED_DIRS = ['src/pages', 'src/components']
const MAX_FILE_BYTES = 500_000

function assertAllowedFile(relPath) {
  const norm = relPath.replace(/\\/g, '/')
  if (!norm.endsWith('.jsx') && !norm.endsWith('.js')) {
    throw new Error('Lubatud on ainult .jsx/.js failid')
  }
  if (!ALLOWED_DIRS.some(d => norm.startsWith(d + '/'))) {
    throw new Error(`Fail ${norm} pole lubatud kaustas`)
  }
  if (norm.includes('..')) throw new Error('Vigane failitee')
  return norm
}

function buildSourceEditPrompt({ file, source, selection, instruction }) {
  const sel = selection || {}
  return `You edit React JSX source for AI Influencer Studio.

Target file: ${file}
Route: ${sel.route || '/'}
Element id: ${sel.elementId || '(unknown)'}
Visible text on page: "${sel.visibleText || ''}"
Tag: ${sel.tagName || 'div'}
User marked screen region (px): ${sel.markedRect ? `left=${Math.round(sel.markedRect.left)} top=${Math.round(sel.markedRect.top)} ${Math.round(sel.markedRect.width)}×${Math.round(sel.markedRect.height)}` : 'n/a'}
User instruction: ${instruction}

Return JSON ONLY:
{
  "reply": "short confirmation in user's language",
  "replacements": [
    { "old": "exact substring from SOURCE (copy verbatim)", "new": "replacement" }
  ]
}

Rules:
- "old" MUST appear exactly once in SOURCE below.
- Change ONLY what the user asked — usually the Editable with id="${sel.elementId || ''}" or matching defaultText/style.
- Nav/header elements live in src/components/Nav.jsx (ids: nav.brand, nav.link.*, nav.create).
- For text changes, update defaultText prop or child text in <Editable>.
- For style changes, update the style={{...}} object on that element.
- Max 4 replacements. No markdown fences.
- Keep valid JSX syntax.

SOURCE:
${source}`
}

function parseEditResponse(text) {
  let raw = text.trim()
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('LLM ei tagastanud JSON-i')
  const parsed = JSON.parse(raw.slice(start, end + 1))
  if (!parsed || typeof parsed.reply !== 'string') throw new Error('Puudub reply väli')
  const replacements = Array.isArray(parsed.replacements) ? parsed.replacements : []
  return { reply: parsed.reply.trim(), replacements }
}

function applyReplacements(source, replacements) {
  let next = source
  const applied = []
  for (const r of replacements) {
    if (!r?.old || typeof r.new !== 'string') continue
    const count = next.split(r.old).length - 1
    if (count !== 1) {
      throw new Error(`Asendus ei sobi (leitud ${count}×): ${r.old.slice(0, 60)}…`)
    }
    next = next.replace(r.old, r.new)
    applied.push({ old: r.old.slice(0, 80), new: r.new.slice(0, 80) })
  }
  if (!applied.length) throw new Error('Ühtegi muudatust ei rakendatud')
  return { content: next, applied }
}

function buildInsertPrompt({ file, source, selection, instruction, snippet }) {
  const sel = selection || {}
  return `You INSERT new JSX into a React page file for AI Influencer Studio.

Target file: ${file}
Route: ${sel.route || '/'}
Near element id: ${sel.elementId || '(unknown)'}
Visible text: "${sel.visibleText || ''}"
Marked region (px): ${sel.markedRect ? `${Math.round(sel.markedRect.width)}×${Math.round(sel.markedRect.height)}` : 'n/a'}

INSERT this exact snippet after the anchor element (sibling, same parent):
---
${snippet}
---

Task: ${instruction}

Return JSON ONLY:
{
  "reply": "short confirmation in user's language",
  "replacements": [
    { "old": "exact substring from SOURCE (anchor element JSX block)", "new": "anchor + newline + snippet" }
  ]
}

Rules:
- "old" MUST appear exactly once. Include enough of the anchor element's JSX to be unique (full <Editable ... /> or closing tag block).
- "new" = original "old" + newline + snippet (snippet copied verbatim).
- If Editable import missing, add: import Editable from '../components/Editable' (adjust relative path).
- Max 3 replacements. Valid JSX. No markdown fences.

SOURCE:
${source}`
}

export async function insertSourceElement({ provider, apiKey, file, instruction, selection, snippet }) {
  const rel = assertAllowedFile(file)
  const abs = path.join(process.cwd(), rel)
  const stat = await fs.stat(abs).catch(() => null)
  if (!stat?.isFile()) throw new Error(`Faili ei leitud: ${rel}`)
  if (stat.size > MAX_FILE_BYTES) throw new Error('Fail on liiga suur redigeerimiseks')

  let source = await fs.readFile(abs, 'utf8')
  const originalContent = source
  if (!source.includes("from '../components/Editable'") && !source.includes('from "../components/Editable"')) {
    const importLine = "import Editable from '../components/Editable'"
    const m = source.match(/^import .+$/m)
    if (m) {
      source = source.replace(m[0], `${m[0]}\n${importLine}`)
    } else {
      source = `${importLine}\n${source}`
    }
  }

  const system = buildInsertPrompt({ file: rel, source, selection, instruction, snippet })
  const { text } = await callChatWithSystem(provider, apiKey, [
    { role: 'user', content: instruction },
  ], system)

  const { reply, replacements } = parseEditResponse(text)
  const { content, applied } = applyReplacements(source, replacements)
  await pushSourceUndo({
    file: rel,
    previousContent: originalContent,
    label: `Lisa: ${instruction.trim().slice(0, 80)}`,
  })
  await fs.writeFile(abs, content, 'utf8')

  return {
    reply,
    file: rel,
    appliedCount: applied.length,
    applied,
    mode: 'insert',
  }
}

export async function editSourceFile({ provider, apiKey, file, instruction, selection }) {
  const rel = assertAllowedFile(file)
  const abs = path.join(process.cwd(), rel)
  const stat = await fs.stat(abs).catch(() => null)
  if (!stat?.isFile()) throw new Error(`Faili ei leitud: ${rel}`)
  if (stat.size > MAX_FILE_BYTES) throw new Error('Fail on liiga suur redigeerimiseks')

  const source = await fs.readFile(abs, 'utf8')
  const system = buildSourceEditPrompt({ file: rel, source, selection, instruction })
  const { text } = await callChatWithSystem(provider, apiKey, [
    { role: 'user', content: instruction },
  ], system)

  const { reply, replacements } = parseEditResponse(text)
  const { content, applied } = applyReplacements(source, replacements)
  await pushSourceUndo({
    file: rel,
    previousContent: source,
    label: `Muuda: ${instruction.trim().slice(0, 80)}`,
  })
  await fs.writeFile(abs, content, 'utf8')

  return {
    reply,
    file: rel,
    appliedCount: applied.length,
    applied,
  }
}