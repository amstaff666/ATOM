import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { startHiggsfieldOAuthPopup, disconnectHF, isHFConnected } from '../utils/higgsfieldAuth'
import { useTheme } from '../context/theme'
import Editable from '../components/Editable'
import { usePageEditor } from '../context/pageEditor'
import { fetchLocalLlmStatus, CHAT_PROVIDERS, getChatKeyHint, getLocalProviderState } from '../utils/chatApi'

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  )
}

const API_KEYS = {
  openai: { key: 'openai_api_key', label: 'OpenAI GPT', provider: 'OpenAI', prefix: 'sk-' },
  grok: { key: 'grok_api_key', label: 'Grok (xAI)', provider: 'xAI', prefix: 'xai-' },
  qwen: { key: 'qwen_api_key', label: 'Qwen/Alibaba', provider: 'Alibaba Cloud', prefix: 'sk-' },
  deepseek: { key: 'deepseek_api_key', label: 'DeepSeek', provider: 'DeepSeek', prefix: 'sk-' },
  gemini: { key: 'gemini_api_key', label: 'Google Gemini', provider: 'Google', prefix: 'AIza' },
  stability: { key: 'stability_api_key', label: 'Stability AI', provider: 'Stability', prefix: 'sk-' },
  replicate: { key: 'replicate_api_key', label: 'Replicate', provider: 'Replicate', prefix: 'r8_' },
  huggingface: { key: 'huggingface_api_key', label: 'Hugging Face', provider: 'Hugging Face', prefix: 'hf_' },
  together: { key: 'together_api_key', label: 'Together AI', provider: 'Together', prefix: 'tgp_' },
  fireworks: { key: 'fireworks_api_key', label: 'Fireworks AI', provider: 'Fireworks', prefix: 'fw_' },
  groq: { key: 'groq_api_key', label: 'Groq', provider: 'Groq', prefix: 'gsk_' },
  nvidia: { key: 'nvidia_api_key', label: 'NVIDIA NIM', provider: 'NVIDIA', prefix: 'nvapi-' },
  ollama: { key: 'ollama_url', label: 'Ollama', provider: 'Local', prefix: 'http', isUrl: true },
  perplexity: { key: 'perplexity_api_key', label: 'Perplexity', provider: 'Perplexity', prefix: 'pplx-' },
  midjourney: { key: 'midjourney_api_key', label: 'Midjourney', provider: 'Midjourney', prefix: 'mj_' },
  leonardo: { key: 'leonardo_api_key', label: 'Leonardo AI', provider: 'Leonardo', prefix: 'lr_' },
  claude: { key: 'claude_api_key', label: 'Claude AI', provider: 'Anthropic', prefix: 'sk-ant-' },
}

export default function Settings() {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const { getPageOverride } = usePageEditor()
  const pageStyle = getPageOverride()
  const [hfConnected, setHfConnected] = useState(isHFConnected)
  const [hfLoading, setHfLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState({})
  const [apiKeys, setApiKeys] = useState(() => {
    const keys = {}
    Object.entries(API_KEYS).forEach(([id, config]) => {
      keys[id] = localStorage.getItem(config.key) || ''
    })
    return keys
  })
  const [inputs, setInputs] = useState({})
  const [showInputs, setShowInputs] = useState({})
  const [localLlmStatus, setLocalLlmStatus] = useState(null)
  const [localLlmLoading, setLocalLlmLoading] = useState(false)

  const refreshLocalLlmStatus = useCallback(async () => {
    setLocalLlmLoading(true)
    try {
      const data = await fetchLocalLlmStatus()
      setLocalLlmStatus(data)
    } finally {
      setLocalLlmLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshLocalLlmStatus()
  }, [refreshLocalLlmStatus])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('connected') === '1') {
      setHfConnected(true)
    }
  }, [location.search])

  async function connectHiggsfield() {
    setHfLoading(true)
    try {
      await startHiggsfieldOAuthPopup()
      setHfConnected(true)
    } catch (e) {
      if (e.message !== 'cancelled') alert('Failed to connect Higgsfield: ' + e.message)
    } finally {
      setHfLoading(false)
    }
  }

  function disconnectHighgsfield() {
    if (!confirm('Disconnect your Higgsfield account?')) return
    disconnectHF()
    setHfConnected(false)
  }

  function saveApiKey(id) {
    const config = API_KEYS[id]
    const value = (inputs[id] || '').trim()
    if (!value) return
    localStorage.setItem(config.key, value)
    setApiKeys(prev => ({ ...prev, [id]: value }))
    setInputs(prev => ({ ...prev, [id]: '' }))
    setShowInputs(prev => ({ ...prev, [id]: false }))
  }

  function removeApiKey(id) {
    const config = API_KEYS[id]
    localStorage.removeItem(config.key)
    setApiKeys(prev => ({ ...prev, [id]: '' }))
    setShowInputs(prev => ({ ...prev, [id]: false }))
  }

  function toggleSection(id) {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: pageStyle.background || pageStyle.backgroundColor || 'var(--bg)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <Editable as="h1" id="settings.title" defaultText="Settings" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 28 }} />

        <Section title="Appearance">
          <div style={{ display: 'flex', gap: 10 }}>
            {(['light', 'dark']).map(val => {
              const on = theme === val
              return (
                <button key={val} onClick={e => { if (!on) toggle(e.clientX, e.clientY) }} style={{
                  flex: 1, padding: '14px 12px', borderRadius: 12, cursor: on ? 'default' : 'pointer',
                  border: `1.5px solid ${on ? '#8B5CF6' : 'var(--border)'}`,
                  background: on ? 'rgba(139,92,246,0.09)' : 'var(--bg)',
                  color: on ? '#8B5CF6' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  boxShadow: on ? '0 0 0 1px #8B5CF655' : 'none',
                }}>
                  {val === 'light' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Higgsfield">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Connect your Higgsfield account to generate influencer images directly in the app. Images use your own Higgsfield credits.
          </p>
          {hfConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#34C759' }}>Higgsfield connected</span>
              </div>
              <button onClick={disconnectHighgsfield} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, color: '#FF3B30', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', fontWeight: 500 }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectHiggsfield}
              disabled={hfLoading}
              style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#1D1D1F', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, opacity: hfLoading ? 0.6 : 1 }}
            >
              {hfLoading ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                  Connecting…
                </>
              ) : (
                'Connect Higgsfield'
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </button>
          )}
        </Section>

        <Section title="Tasuta kohalik chat">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
            Chat ja builder kasutavad vaikimisi kohalikke mudeleid — pilve API võtit pole vaja. Seadista <code style={{ fontSize: 12 }}>.env.local</code> ja taaskäivita <code>npm run dev</code>.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Teenuste olek
            </div>
            <button
              type="button"
              onClick={refreshLocalLlmStatus}
              disabled={localLlmLoading}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', opacity: localLlmLoading ? 0.6 : 1,
              }}
            >
              {localLlmLoading ? 'Kontrollin…' : 'Värskenda'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {CHAT_PROVIDERS.filter(p => p.group === 'local').map(p => {
              const state = getLocalProviderState(p.id, localLlmStatus)
              const hint = getChatKeyHint(p.id, localLlmStatus)
              const badge = {
                online: { label: 'ONLINE', color: '#34C759', border: 'rgba(52,199,89,0.28)', bg: 'rgba(52,199,89,0.06)' },
                needs_auth: { label: 'VAJAB TOKENIT', color: '#FF9F0A', border: 'rgba(255,159,10,0.28)', bg: 'rgba(255,159,10,0.06)' },
                needs_setup: { label: 'VAJAB SEADISTUST', color: '#FF9F0A', border: 'rgba(255,159,10,0.28)', bg: 'rgba(255,159,10,0.06)' },
                offline: { label: 'OFFLINE', color: '#FF3B30', border: 'var(--border)', bg: 'var(--bg)' },
                unknown: { label: '—', color: 'var(--text-faint)', border: 'var(--border)', bg: 'var(--bg)' },
              }[state]
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    border: `1px solid ${badge.border}`,
                    background: badge.bg,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: !localLlmStatus ? 'var(--border)' : badge.color,
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                        {!localLlmStatus ? 'Kontrolli dev serverit (npm run dev)' : hint}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    color: !localLlmStatus ? 'var(--text-faint)' : badge.color,
                  }}>
                    {!localLlmStatus ? '—' : badge.label}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{
            padding: '12px 14px', borderRadius: 10, fontSize: 12, lineHeight: 1.65,
            background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.22)',
            color: 'var(--text-secondary)', fontFamily: 'monospace',
          }}>
            OLLAMA_BASE_URL=http://127.0.0.1:11434<br />
            OLLAMA_MODEL=minimax-m3:cloud<br />
            LMSTUDIO_BASE_URL=http://127.0.0.1:1234  (mitte vana telefoni IP)<br />
            LMSTUDIO_MODEL=&lt;laetud-mudel&gt;<br />
            LMSTUDIO_API_KEY=&lt;lm-studio-api-token&gt;<br />
            HERMES_BASE_URL=http://127.0.0.1:8642<br />
            HERMES_API_KEY=&lt;API_SERVER_KEY&gt;<br />
            OPENCLAW_BASE_URL=http://127.0.0.1:18789<br />
            OPENCLAW_GATEWAY_TOKEN=&lt;gateway-token&gt;<br />
            HUGGINGFACE_API_KEY=hf_… (chat + pildid)<br />
            HUGGINGFACE_CHAT_MODEL=Qwen/Qwen2.5-7B-Instruct
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 10, lineHeight: 1.5 }}>
            Ollama: <code>ollama serve</code>. LM Studio: Local Server ON. Hermes: <code>hermes gateway</code> + <code>API_SERVER_ENABLED=true</code>. OpenClaw: <code>openclaw gateway</code> + luba <code>gateway.http.endpoints.chatCompletions</code>.
          </p>
        </Section>

        <Section title="Pilve API võtmed (valikuline)">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            OpenAI, Grok jne vajavad eraldi API võtit (mitte Plus/Pro tellimust). Lisa võti siia või <code>.env.local</code> + chatis „Kasuta dev serveri env võtit“. Ilma võtmeta kasuta Ollama/LM Studio.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(API_KEYS).filter(([id]) => id !== 'ollama').map(([id, config]) => {
              const hasKey = !!apiKeys[id]
              const isExpanded = expandedSections[id]
              const showingInput = showInputs[id]

              return (
                <div key={id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--bg)',
                }}>
                  <div
                    onClick={() => toggleSection(id)}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: hasKey ? '#34C759' : 'var(--border)',
                      }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {config.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                          {config.provider}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {hasKey && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          ···{apiKeys[id].slice(-4)}
                        </span>
                      )}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-faint)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                      {hasKey && !showingInput ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759' }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#34C759' }}>Connected</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => setShowInputs(prev => ({ ...prev, [id]: true }))}
                              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontWeight: 500 }}
                            >
                              Change
                            </button>
                            <button
                              onClick={() => removeApiKey(id)}
                              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, color: '#FF3B30', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', fontWeight: 500 }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : showingInput ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <input
                            autoFocus
                            type={config.isUrl ? 'text' : 'password'}
                            value={inputs[id] || apiKeys[id] || ''}
                            onChange={e => setInputs(prev => ({ ...prev, [id]: e.target.value }))}
                            placeholder={config.isUrl ? 'http://localhost:11434' : `${config.prefix}...`}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveApiKey(id)
                            }}
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'monospace' }}
                          />
                          <button
                            onClick={() => saveApiKey(id)}
                            style={{ padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#1D1D1F', color: '#fff', border: 'none', cursor: 'pointer' }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowInputs(prev => ({ ...prev, [id]: true }))}
                          style={{ marginTop: 12, padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#1D1D1F', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                          Add API Key
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      </div>
    </div>
  )
}