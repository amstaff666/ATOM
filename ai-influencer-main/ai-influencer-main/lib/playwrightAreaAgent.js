const DEV_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

const STYLE_PROPS = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'padding', 'margin', 'borderRadius', 'display']

export async function inspectAreaWithPlaywright({ route, selection }) {
  let chromium
  try {
    ({ chromium } = await import('playwright'))
  } catch {
    return { available: false, reason: 'Playwright pole installitud (npm install -D playwright)' }
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const url = `${DEV_URL}${route || '/'}`
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })

    const selector = selection?.selectorHint
      || (selection?.elementId ? `[data-editable-id="${selection.elementId}"]` : null)

    let target = null
    if (selector) {
      target = await page.locator(selector).first().elementHandle().catch(() => null)
    }

    if (!target && selection?.markedRect) {
      const { left, top, width, height } = selection.markedRect
      const cx = left + width / 2
      const cy = top + height / 2
      target = await page.evaluateHandle(({ x, y }) => {
        const stack = document.elementsFromPoint(x, y) || []
        return stack.find(el => !el.closest('[data-area-picker]')) || null
      }, { x: cx, y: cy }).catch(() => null)
    }

    if (!target) {
      return { available: true, url, found: false, message: 'Elementi Playwright ei leidnud' }
    }

    const detail = await target.evaluate((el, props) => {
      const cs = getComputedStyle(el)
      const styles = {}
      for (const p of props) styles[p] = cs[p]
      return {
        tag: el.tagName?.toLowerCase(),
        editableId: el.getAttribute('data-editable-id'),
        text: (el.innerText || '').trim().slice(0, 400),
        html: (el.outerHTML || '').slice(0, 2000),
        styles,
        box: el.getBoundingClientRect().toJSON(),
      }
    }, STYLE_PROPS)

    const screenshot = await page.screenshot({ type: 'jpeg', quality: 55, fullPage: false })
    return {
      available: true,
      url,
      found: true,
      detail,
      screenshotBase64: screenshot.toString('base64'),
    }
  } finally {
    await browser.close()
  }
}

export async function previewPatchWithPlaywright({ route, selection, patch }) {
  let chromium
  try {
    ({ chromium } = await import('playwright'))
  } catch {
    return { applied: false, reason: 'Playwright puudub' }
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.goto(`${DEV_URL}${route || '/'}`, { waitUntil: 'networkidle', timeout: 20000 })

    const selector = selection?.selectorHint
      || (selection?.elementId ? `[data-editable-id="${selection.elementId}"]` : null)
    if (!selector) return { applied: false, reason: 'Selector puudub' }

    const applied = await page.locator(selector).first().evaluate((el, p) => {
      if (p.text != null) el.textContent = p.text
      if (p.style) {
        for (const [k, v] of Object.entries(p.style)) {
          if (v != null) el.style[k] = v
        }
      }
      return true
    }, patch).catch(() => false)

    const afterShot = applied
      ? (await page.screenshot({ type: 'jpeg', quality: 50 })).toString('base64')
      : null

    return { applied: !!applied, screenshotBase64: afterShot }
  } finally {
    await browser.close()
  }
}