import { callChatWithSystem } from './chatProviders.js'
import { sanitizeCommandsList } from './appCommands.js'
import { inspectAreaWithPlaywright } from './playwrightAreaAgent.js'

function buildAreaAdvisorPrompt({ context, selection, domDetail, playwrightReport, intent }) {
  const sa = selection || {}
  const pw = playwrightReport?.found ? playwrightReport.detail : null

  return `You are the in-app area advisor for AI Influencer Studio (React + Vite).

User marked a region on the page and asks about it OR wants live preview fixes.

APP ARCHITECTURE (explain when asked "how does this work"):
- Pages in src/pages/*.jsx use <Editable id="page.element" defaultText="…" /> for chat-editable text.
- pageRegistry.js maps element ids to labels and source files.
- Chat "Muuda" mode writes JSX source files via LLM (/api/edit-source).
- Chat can apply instant browser preview via update_element commands (localStorage overrides).
- Playwright (dev) inspects the same page at localhost:5173 for independent DOM verification.

MARKED AREA:
- route: ${sa.route || context?.route || '/'}
- elementId: ${sa.elementId || 'unknown'}
- label: ${sa.label || ''}
- visibleText: "${sa.visibleText || ''}"
- source file: ${sa.file || context?.page?.file || 'unknown'}
- tag: ${sa.tagName || ''}
- markedRect: ${JSON.stringify(sa.markedRect || sa.rect || null)}
- selector: ${sa.selectorHint || ''}

BROWSER DOM (user's live page):
${JSON.stringify(domDetail || {}, null, 2)}

PLAYWRIGHT INSPECT (headless browser):
${pw ? JSON.stringify(pw, null, 2) : (playwrightReport?.available === false ? playwrightReport.reason : 'not available')}

Intent: ${intent || 'ask'}
- ask: explain what this is, how it works, how to improve UX/design/code
- preview_fix: suggest immediate preview commands AND optional permanent sourceInstruction

Response JSON ONLY:
{
  "reply": "clear answer in user's language (Estonian if user writes Estonian)",
  "previewCommands": [{"type":"update_element","params":{"elementId":"…","text":"…","style":{}}}],
  "sourceInstruction": "optional instruction string for permanent JSX file edit (null if not needed)",
  "suggestions": ["short bullet tips"]
}

Rules:
- previewCommands: max 3, only update_element/update_page, use elementId from marked area when possible
- For "how to improve" give concrete UI/code suggestions
- For preview_fix apply sensible visible improvements user asked for
- sourceInstruction: describe JSX change for src file when change should persist
- If elementId unknown, still answer but previewCommands may be empty
- No markdown fences`
}

function parseAdvisorResponse(text, context = {}) {
  let raw = text.trim()
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Advisor ei tagastanud JSON-i')
  const parsed = JSON.parse(raw.slice(start, end + 1))
  if (!parsed?.reply) throw new Error('Puudub reply')

  const commands = sanitizeCommandsList(parsed.previewCommands, context)

  return {
    reply: String(parsed.reply).trim(),
    commands,
    sourceInstruction: parsed.sourceInstruction || null,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
  }
}

export async function assistMarkedArea({
  provider,
  apiKey,
  messages,
  context,
  selection,
  domDetail,
  intent = 'ask',
  usePlaywright = true,
}) {
  let playwrightReport = null
  if (usePlaywright && selection) {
    try {
      playwrightReport = await inspectAreaWithPlaywright({
        route: selection.route || context?.route,
        selection,
      })
    } catch (e) {
      playwrightReport = { available: false, reason: e.message }
    }
  }

  const system = buildAreaAdvisorPrompt({ context, selection, domDetail, playwrightReport, intent })
  const { text } = await callChatWithSystem(provider, apiKey, messages, system)
  const result = parseAdvisorResponse(text, context)

  return {
    ...result,
    playwright: playwrightReport?.found
      ? { found: true, tag: playwrightReport.detail?.tag, editableId: playwrightReport.detail?.editableId }
      : { found: false, reason: playwrightReport?.reason || playwrightReport?.message },
  }
}