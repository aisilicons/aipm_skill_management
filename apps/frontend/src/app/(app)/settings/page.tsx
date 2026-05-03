'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle, XCircle, Loader2, Eye, EyeOff,
  ExternalLink, Zap, Plus, Trash2, Star
} from 'lucide-react'

interface Provider { id: string; name: string; recommended: boolean; free_tier: boolean; models: string[]; link: string; base_url?: string }
interface ApiKey { id: number; provider: string; nickname: string; model: string; base_url: string; is_active: number; key_masked: string; key_set: number; created_at: string }
interface Active { id: number | null; provider: string; model: string; nickname: string; key_masked: string; key_set: boolean }

export default function SettingsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [provider, setProvider] = useState('anthropic')
  const [nickname, setNickname] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle'|'testing'|'ok'|'error'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [saved, setSaved] = useState(false)

  const { data } = useQuery<{ keys: ApiKey[]; active: Active; available_providers: Provider[] }>({
    queryKey: ['providers'],
    queryFn: () => fetch('/api/settings/providers').then(r => r.json()),
  })

  const providers: Provider[] = data?.available_providers || []
  const keys: ApiKey[] = data?.keys || []
  const active = data?.active
  const currentProvider = providers.find(p => p.id === provider)

  const addMut = useMutation({
    mutationFn: (body: object) =>
      fetch('/api/settings/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providers'] })
      setSaved(true); setShowAdd(false); setApiKey(''); setNickname('')
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/settings/keys/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  })

  const activateMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/settings/keys/${id}/activate`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  })

  const testConnection = async () => {
    setTestStatus('testing'); setTestMsg('')
    const bu = baseUrl || currentProvider?.base_url || ''
    const r = await fetch('/api/settings/keys/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey, model, base_url: bu }),
    })
    const d = await r.json()
    if (d.status === 'connected') { setTestStatus('ok'); setTestMsg('Connected successfully') }
    else { setTestStatus('error'); setTestMsg(d.message || 'Connection failed') }
  }

  const handleSave = () => {
    if (!apiKey) { alert('Please enter an API key'); return }
    const bu = baseUrl || currentProvider?.base_url || ''
    const nick = nickname || `${currentProvider?.name || provider} Key`
    addMut.mutate({ provider, nickname: nick, api_key: apiKey, model: model || (currentProvider?.models[0] || ''), base_url: bu, set_active: true })
  }

  const PROVIDER_COLORS: Record<string, string> = {
    anthropic: 'text-orange-400', groq: 'text-green-400',
    google: 'text-blue-400', openai: 'text-teal-400', ollama: 'text-purple-400'
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">Manage AI provider keys</p>
      </div>

      <div className="p-6 max-w-2xl space-y-5">

        {/* Active key banner */}
        {active && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${active.key_set ? 'border-green-800 bg-green-900/20' : 'border-yellow-800 bg-yellow-900/20'}`}>
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${active.key_set ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {active.key_set ? 'Active:' : 'No key configured —'}
                {' '}
                <span className={PROVIDER_COLORS[active.provider] || 'text-white'}>
                  {active.nickname || active.provider}
                </span>
                {active.model && <span className="text-gray-400 font-normal ml-1 text-xs">/ {active.model}</span>}
              </p>
              {active.key_set
                ? <p className="text-xs text-gray-500 font-mono mt-0.5">{active.key_masked}</p>
                : <p className="text-xs text-yellow-400 mt-0.5">Add a key below to get started</p>}
            </div>
            {active.key_set && <Zap className="w-4 h-4 text-green-400 shrink-0" />}
          </div>
        )}

        {/* Saved keys list */}
        {keys.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">Saved Keys</h2>
            <div className="space-y-2">
              {keys.map(k => (
                <div key={k.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${k.is_active ? 'border-green-700 bg-green-900/10' : 'border-gray-800 bg-gray-900'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${PROVIDER_COLORS[k.provider] || 'text-white'}`}>
                        {k.nickname}
                      </span>
                      {k.is_active === 1 && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {k.key_masked} {k.model && `· ${k.model}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {k.is_active !== 1 && (
                      <button
                        onClick={() => activateMut.mutate(k.id)}
                        disabled={activateMut.isPending}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                      >
                        <Star className="w-3 h-3" /> Use
                      </button>
                    )}
                    <button
                      onClick={() => deleteMut.mutate(k.id)}
                      disabled={deleteMut.isPending}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new key */}
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 w-full p-3.5 border border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-gray-500 hover:text-white transition text-sm">
            <Plus className="w-4 h-4" /> Add a new API key
          </button>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Add New Key</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white text-xs">Cancel</button>
            </div>

            {/* Provider */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Provider</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {providers.map(p => (
                  <button key={p.id} onClick={() => { setProvider(p.id); setModel(p.models[0] || ''); setBaseUrl(p.base_url || '') }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition ${provider === p.id ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                    {p.recommended && <span className="text-yellow-400">★</span>}
                    {p.name}
                    {p.free_tier && <span className="text-green-400 text-xs">free</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nickname (optional)</label>
              <input value={nickname} onChange={e => setNickname(e.target.value)}
                placeholder={`e.g. My ${currentProvider?.name || 'Provider'} Key`}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-400">API Key</label>
                {currentProvider && (
                  <a href={currentProvider.link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    Get key <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder="Paste your API key here"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 pr-9 focus:outline-none focus:border-gray-500" />
                  <button onClick={() => setShowKey(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={testConnection} disabled={!apiKey || testStatus === 'testing'}
                  className="px-3 py-2 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700 disabled:opacity-40 transition whitespace-nowrap">
                  {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                </button>
              </div>
              {testStatus === 'ok' && <p className="flex items-center gap-1 text-xs text-green-400 mt-1"><CheckCircle className="w-3 h-3" />{testMsg}</p>}
              {testStatus === 'error' && <p className="flex items-center gap-1 text-xs text-red-400 mt-1"><XCircle className="w-3 h-3" />{testMsg}</p>}
            </div>

            {/* Model */}
            {currentProvider && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Model</label>
                <select value={model} onChange={e => setModel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                  {currentProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            <button onClick={handleSave} disabled={addMut.isPending || !apiKey}
              className="w-full py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-40 transition">
              {saved ? '✓ Saved and activated' : addMut.isPending ? 'Saving...' : 'Save & Activate'}
            </button>
          </div>
        )}

        {/* Workspace */}
        <WorkspaceInfo />
      </div>
    </div>
  )
}

function WorkspaceInfo() {
  const { data } = useQuery({ queryKey: ['workspace'], queryFn: () => fetch('/api/settings/workspace').then(r => r.json()) })
  if (!data) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3">Workspace</h3>
      <div className="space-y-2 text-sm">
        {([
          ['Path', <span key="p" className="font-mono text-xs text-gray-300 truncate">{data.path}</span>] as [string, React.ReactNode],
          ['Status', <span key="s" className={data.initialized ? 'text-green-400' : 'text-yellow-400'}>{data.initialized ? 'Initialized' : 'Not initialized'}</span>] as [string, React.ReactNode],
          ['Projects', <span key="c">{data.project_count}</span>] as [string, React.ReactNode],
          ...(data.active_project ? [['Active', <span key="a" className="text-blue-400 text-xs">{data.active_project}</span>] as [string, React.ReactNode]] : []),
        ]).map(([label, val]) => (
          <div key={String(label)} className="flex justify-between items-center gap-4">
            <span className="text-gray-500">{label}</span>
            <div className="text-right">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
