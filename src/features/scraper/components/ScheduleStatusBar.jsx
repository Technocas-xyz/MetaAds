import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, XCircle, Loader2, Power } from 'lucide-react'
import { getScheduleStatus, toggleSchedule } from '../../../api/scraper'
import toast from 'react-hot-toast'

export default function ScheduleStatusBar() {
  const [status, setStatus] = useState(null)
  const [toggling, setToggling] = useState(false)

  const fetchStatus = async () => {
    try {
      const s = await getScheduleStatus()
      setStatus(s)
    } catch {}
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const handleToggle = async () => {
    setToggling(true)
    try {
      const res = await toggleSchedule(!status.enabled)
      setStatus((s) => ({ ...s, enabled: res.enabled }))
      toast.success(res.enabled ? 'Daily scrape enabled' : 'Daily scrape disabled')
    } catch {
      toast.error('Failed to toggle schedule')
    }
    setToggling(false)
  }

  if (!status) return null

  const nextRun = status.next_run ? new Date(status.next_run).toLocaleString() : '—'

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-border-default bg-white px-4 py-2.5 shadow-sm text-xs">
      {/* Schedule toggle */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition ${
          status.enabled
            ? 'bg-green-50 text-green-700 hover:bg-green-100'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        <Power size={11} />
        {status.enabled ? 'Auto-scrape ON' : 'Auto-scrape OFF'}
      </button>

      <div className="h-4 w-px bg-border-default" />

      {/* Today's status */}
      {status.is_running ? (
        <span className="flex items-center gap-1.5 text-blue-600">
          <Loader2 size={12} className="animate-spin" />
          Daily scrape running...
          {status.current_run?.current && (
            <span className="text-text-tertiary">({status.current_run.current})</span>
          )}
        </span>
      ) : status.today_ran ? (
        <span className="flex items-center gap-1.5 text-green-600">
          <CheckCircle2 size={12} />
          Today's scrape completed
          {status.last_run?.finished_at && (
            <span className="text-text-tertiary">
              at {new Date(status.last_run.finished_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-text-secondary">
          <XCircle size={12} className="text-amber-500" />
          Not run yet today
        </span>
      )}

      <div className="h-4 w-px bg-border-default" />

      {/* Next run */}
      <span className="flex items-center gap-1.5 text-text-tertiary">
        <Clock size={11} />
        Next: {status.enabled ? nextRun : 'disabled'}
      </span>

      {/* Last run summary */}
      {status.last_run && !status.is_running && (
        <>
          <div className="h-4 w-px bg-border-default" />
          <span className="text-text-tertiary">
            Last: {status.last_run.completed}/{status.last_run.total} scraped
            {status.last_run.failed > 0 && <span className="text-red-500"> ({status.last_run.failed} failed)</span>}
          </span>
        </>
      )}
    </div>
  )
}
