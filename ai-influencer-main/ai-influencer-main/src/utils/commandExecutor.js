import { generateId } from '../store'
import { getElementMeta } from './pageRegistry'

function findInfluencer(influencers, name) {
  const q = name.trim().toLowerCase()
  return influencers.find(i => i.name?.toLowerCase() === q)
}

function emptyInfluencer({ name, backstory = '', niche = 'Lifestyle', gender = 'Female' }) {
  return {
    id: generateId(),
    name: name.trim(),
    gender,
    type: 'Influencer',
    createdAt: Date.now(),
    mainImage: '',
    characterSheetImage: '',
    closeUpImage1: '',
    closeUpImage2: '',
    prompt: '',
    age: '21',
    backstory,
    introExtrovert: 50,
    niche,
    nicheCustom: '',
    audience: '',
    hobbies: '',
    clothingStyle: '',
    dreamBrands: '',
    voice: '',
    contentPillars: [],
    palette: ['#EC4899', '#8B5CF6', '#F472B6', '#C084FC'],
    videoUrls: [],
    scripts: [],
    homeImages: [],
    brandDealImages: [],
    wardrobeSlots: [],
    physicalDesc: '',
  }
}

export async function executeAppCommands(commands, deps) {
  const results = []
  for (const cmd of commands) {
    results.push(await executeOne(cmd, deps))
  }
  return results
}

async function executeOne(cmd, deps) {
  const {
    navigate, setTheme, theme, influencers, setInfluencers,
    pageEditor,
  } = deps
  const type = cmd?.type
  const params = cmd?.params || {}

  try {
    switch (type) {
      case 'navigate': {
        const path = params.path
        if (!path) return fail(type, 'Puudub sihttee')
        navigate(path, params.state ? { state: params.state } : undefined)
        return ok(type, `Navigeeritud → ${path}`)
      }
      case 'set_theme': {
        const next = params.theme === 'light' ? 'light' : 'dark'
        if (theme === next) return ok(type, `Teema juba ${next}`)
        setTheme(next)
        return ok(type, `Teema muudetud → ${next}`)
      }
      case 'select_element': {
        if (!pageEditor) return fail(type, 'Lehe redaktor pole saadaval')
        const meta = getElementMeta(pageEditor.pathname, params.elementId)
        if (!meta) return fail(type, `Element "${params.elementId}" ei ole registreeritud`)
        pageEditor.setActiveElementId(params.elementId)
        return ok(type, `Valitud element: ${meta.label} (${params.elementId})`)
      }
      case 'update_element': {
        if (!pageEditor) return fail(type, 'Lehe redaktor pole saadaval')
        const meta = getElementMeta(pageEditor.pathname, params.elementId)
        if (!meta) return fail(type, `Element "${params.elementId}" ei ole registreeritud`)
        const patch = { ...params.style, text: params.text }
        const applied = pageEditor.applyElementUpdate(params.elementId, patch)
        if (!applied) return fail(type, 'Elemendi uuendamine ebaõnnestus')
        pageEditor.setActiveElementId(params.elementId)
        const parts = []
        if (params.text != null) parts.push(`tekst="${params.text}"`)
        if (params.style) parts.push(`stiil: ${Object.keys(params.style).join(', ')}`)
        return ok(type, `✓ ${meta.label} uuendatud${parts.length ? ` (${parts.join('; ')})` : ''}`)
      }
      case 'update_page': {
        if (!pageEditor) return fail(type, 'Lehe redaktor pole saadaval')
        const applied = pageEditor.applyPageUpdate(params)
        if (!applied) return fail(type, 'Lehe stiili uuendamine ebaõnnestus')
        return ok(type, `✓ Lehe "${pageEditor.pageMeta.label}" stiil uuendatud (${Object.keys(params.style).join(', ')})`)
      }
      case 'create_influencer': {
        if (!params.name?.trim()) return fail(type, 'Influenceri nimi puudub')
        if (findInfluencer(influencers, params.name)) {
          return fail(type, `Influencer "${params.name}" on juba olemas`)
        }
        const inf = emptyInfluencer({
          name: params.name,
          backstory: params.backstory || '',
          niche: params.niche || 'Lifestyle',
          gender: params.gender === 'Male' ? 'Male' : 'Female',
        })
        setInfluencers(prev => [...prev, inf])
        return ok(type, `Loodud influencer "${inf.name}"`, { influencerId: inf.id, influencerName: inf.name })
      }
      case 'update_influencer': {
        const target = findInfluencer(influencers, params.name)
        if (!target) return fail(type, `Influencerit "${params.name}" ei leitud`)
        const patch = {}
        if (params.backstory != null) patch.backstory = params.backstory
        if (params.niche != null) patch.niche = params.niche
        if (params.physicalDesc != null) patch.physicalDesc = params.physicalDesc
        if (params.audience != null) patch.audience = params.audience
        if (!Object.keys(patch).length) return fail(type, 'Uuendamiseks pole välju')
        setInfluencers(prev => prev.map(i => i.id === target.id ? { ...i, ...patch } : i))
        return ok(type, `Uuendatud "${target.name}"`, { influencerId: target.id, fields: Object.keys(patch) })
      }
      case 'delete_influencer': {
        const target = findInfluencer(influencers, params.name)
        if (!target) return fail(type, `Influencerit "${params.name}" ei leitud`)
        setInfluencers(prev => prev.filter(i => i.id !== target.id))
        return ok(type, `Kustutatud "${target.name}"`)
      }
      case 'list_influencers': {
        if (!influencers.length) return ok(type, 'Influencereid pole veel.')
        const list = influencers.map(i => `• ${i.name} (${i.niche || '—'})`).join('\n')
        return ok(type, `Influencerid:\n${list}`, { count: influencers.length })
      }
      case 'clear_area': {
        if (!pageEditor) return fail(type, 'Lehe redaktor pole saadaval')
        pageEditor.clearSelectedArea?.()
        return ok(type, 'Valitud ala tühistatud')
      }
      default:
        return fail(type || 'unknown', 'Tundmatu käsk')
    }
  } catch (e) {
    return fail(type, e.message)
  }
}

function ok(type, message, data) {
  return { type, success: true, message, ...data }
}

function fail(type, message) {
  return { type, success: false, message }
}