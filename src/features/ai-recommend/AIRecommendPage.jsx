import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles, Play, Square, Copy, Clock, AlertCircle, CheckCircle2, Loader2, RotateCcw, History,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { getEngines, getContext, generateComparison, getRunStatus, cancelRun, getHistory, getHistoryDetail } from '../../api/aiRecommend'
import { cn } from '../../lib/utils'

const ENGINE_COLORS = {
  openai: 'border-green-300 bg-green-50',
  anthropic: 'border-orange-300 bg-orange-50',
  groq: 'border-blue-300 bg-blue-50',
  xai: 'border-purple-300 bg-purple-50',
}

export default function AIRecommendPage() {
  const [selectedEngines, setSelectedEngines] = useState(() => {
    const saved = localStorage.getItem('ai-rec-engines')
    return saved ? JSON.parse(saved) : ['groq', 'xai']
  })
  const [prompt, setPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [currentRunId, setCurrentRunId] = useState(null)
  const [results, setResults] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const { data: engines } = useQuery({ queryKey: ['ai-engines'], queryFn: getEngines })
  const { data: context } = useQuery({ queryKey: ['ai-context'], queryFn: getContext })
  const { data: history } = useQuery({ queryKey: ['ai-history'], queryFn: getHistory, enabled: showHistory })

  // Set default prompt from context
  useEffect(() => {
    if (context?.default_prompt && !prompt) {
      setPrompt(context.default_prompt)
    }
  }, [context]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save engine selection
  useEffect(() => {
    localStorage.setItem('ai-rec-engines', JSON.stringify(selectedEngines))
  }, [selectedEngines])

  const toggleEngine = (id) => {
    setSelectedEngines((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    if (!prompt || selectedEngines.length === 0) return
    setRunning(true)
    setResults(null)
    try {
      const res = await generateComparison({ engines: selectedEngines, prompt })
      setCurrentRunId(res.id)
      // Poll for results
      const interval = setInterval(async () => {
        try {
          const status = await getRunStatus(res.id)
          if (status.status !== 'running') {
            clearInterval(interval)
            setRunning(false)
            setResults(status.results)
            setCurrentRunId(null)
            if (status.status === 'completed') toast.success('Comparison complete')
            else if (status.status === 'cancelled') toast('Run cancelled', { icon: '⏹️' })
            else if (status.status === 'partially_completed') toast('Partially completed (some engines cancelled/failed)', { icon: '⚠️' })
          }
        } catch {
          clearInterval(interval)
          setRunning(false)
        }
      }, 2000)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Generation failed')
      setRunning(false)
    }
  }

  const handleStop = async () => {
    if (!currentRunId) { setRunning(false); return }
    try {
      await cancelRun(currentRunId)
      toast('Cancelling... Completed results will be preserved.\nNote: requests already sent to a provider may still incur cost.', { icon: '⏹️', duration: 5000 })
    } catch {
      toast.error('Could not cancel')
    }
  }

  const handleReset = () => {
    if (context?.default_prompt) setPrompt(context.default_prompt)
  }

  const handleLoadHistory = async (id) => {
    try {
      const detail = await getHistoryDetail(id)
      setResults(detail.results)
      setPrompt(detail.prompt)
      setShowHistory(false)
    } catch { toast.error('Could not load history') }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const configuredCount = engines?.filter((e) => e.configured).length || 0
  const selectedConfigured = selectedEngines.filter((id) => engines?.find((e) => e.id === id && e.configured))
  const promptTokenEstimate = Math.round((prompt?.length || 0) / 4)

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Ads Recommendation"
        subtitle="Compare ad recommendations across multiple AI engines side by side"
        rightSlot={
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-xs font-medium text-text-secondary hover:bg-gray-50"
          >
            <History size={14} />
            History
          </button>
        }
      />

      {/* Engine selector */}
      <div className="rounded-card border border-border-default bg-white p-4 shadow-card">
        <h3 className="text-xs font-semibold text-text-secondary mb-3">Select AI Engines</h3>
        <div className="flex flex-wrap gap-3">
          {engines?.map((engine) => (
            <button
              key={engine.id}
              onClick={() => engine.configured && toggleEngine(engine.id)}
              disabled={!engine.configured}
              className={cn(
                'rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition',
                engine.configured && selectedEngines.includes(engine.id)
                  ? `${ENGINE_COLORS[engine.id]} border-current`
                  : engine.configured
                    ? 'border-border-default bg-white hover:bg-gray-50 text-text-primary'
                    : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed',
              )}
            >
              <span className="flex items-center gap-2">
                {selectedEngines.includes(engine.id) && engine.configured && (
                  <CheckCircle2 size={14} className="text-green-600" />
                )}
                {engine.name}
                {!engine.configured && (
                  <span className="text-[10px] text-red-400 ml-1">(Not configured)</span>
                )}
                {engine.configured && engine.model && (
                  <span className="text-[10px] text-text-tertiary">{engine.model}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt area */}
      <div className="rounded-card border border-border-default bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-secondary">Prompt</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-tertiary">~{promptTokenEstimate} tokens</span>
            <button onClick={handleReset} className="text-[10px] text-primary-600 hover:underline flex items-center gap-1">
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={12}
          className="w-full rounded-lg border border-border-default bg-gray-50 p-3 text-sm text-text-primary font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Enter your prompt..."
        />

        {/* Presets */}
        {context?.presets && (
          <div className="flex gap-2 mt-3">
            {context.presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrompt(context.default_prompt)}
                className="rounded-full border border-border-default px-3 py-1 text-[10px] font-medium text-text-secondary hover:bg-gray-50"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Generate button + cost notice */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-secondary">
          <AlertCircle size={12} className="inline mr-1 text-amber-500" />
          This will run the prompt on <strong>{selectedConfigured.length}</strong> engine{selectedConfigured.length !== 1 ? 's' : ''} ({selectedConfigured.length} paid API call{selectedConfigured.length !== 1 ? 's' : ''})
        </div>
        <div className="flex gap-2">
          {running && (
            <Button variant="outline" size="md" icon={Square} onClick={handleStop}>
              Stop
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            icon={running ? Loader2 : Sparkles}
            onClick={handleGenerate}
            disabled={running || selectedConfigured.length === 0 || !prompt}
            className={running ? '[&_svg]:animate-spin' : ''}
          >
            {running ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>

      {/* Results — side by side */}
      {results && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {results.map((r) => (
            <div
              key={r.engine}
              className={cn(
                'rounded-card border-2 bg-white shadow-card overflow-hidden',
                r.error ? 'border-red-200' : ENGINE_COLORS[r.engine] || 'border-border-default'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5 bg-gray-50/50">
                <div>
                  <span className="text-sm font-semibold text-text-primary">{r.name}</span>
                  {r.model && <span className="text-[10px] text-text-tertiary ml-2">{r.model}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {r.duration > 0 && (
                    <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
                      <Clock size={9} /> {r.duration}s
                    </span>
                  )}
                  {r.output && (
                    <button onClick={() => copyToClipboard(r.output)} className="rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-gray-100">
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {r.error ? (
                  <div className="flex items-start gap-2 text-red-600">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <p className="text-xs">{r.error}</p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-xs leading-relaxed text-text-primary whitespace-pre-wrap">
                    {r.output}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History panel */}
      {showHistory && history && (
        <div className="rounded-card border border-border-default bg-white p-4 shadow-card">
          <h3 className="text-xs font-semibold text-text-secondary mb-3">Recent Comparisons</h3>
          {history.length === 0 ? (
            <p className="text-xs text-text-tertiary">No history yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleLoadHistory(h.id)}
                  className="w-full text-left rounded-lg border border-border-default p-3 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary truncate">{h.prompt_preview}</span>
                    <span className="text-[10px] text-text-tertiary">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-secondary">{h.engines.join(', ')}</span>
                    <span className="text-[10px] text-green-600">{h.success_count}/{h.results_count} succeeded</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
