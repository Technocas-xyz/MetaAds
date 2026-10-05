import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import { getMetaSession, saveMetaSession, deleteMetaSession, testMetaSession } from '../../../api/scraper'

function TestResult({ result }) {
  if (!result) return null
  const paginates = result.cards_after_scroll > result.first_page_cards && !result.rate_limited
  const rows = [
    { ok: result.logged_in, text: result.logged_in ? 'Facebook accepted the login' : 'Facebook did not accept the login' },
    {
      ok: paginates,
      text: paginates
        ? `Loaded ${result.cards_after_scroll} ads past the first page (${result.first_page_cards})`
        : `Stuck at ${result.cards_after_scroll} ads${result.rate_limited ? ' — still rate limited' : ''}`,
    },
  ]
  if (result.checkpoint) rows.push({ ok: false, text: 'Facebook is asking for a security check on this account' })

  return (
    <ul className="space-y-1.5 rounded-lg border border-border-default bg-bg-app p-3 text-xs animate-in fade-in-0 slide-in-from-top-1">
      {rows.map((r) => (
        <li key={r.text} className="flex items-start gap-2">
          {r.ok
            ? <CheckCircle2 size={14} className="mt-px shrink-0 text-success-600" />
            : <XCircle size={14} className="mt-px shrink-0 text-danger-600" />}
          <span className="text-text-primary">{r.text}</span>
        </li>
      ))}
      {result.reported_total != null && (
        <li className="pl-[22px] text-text-tertiary">Meta reports ~{result.reported_total} results for the test advertiser</li>
      )}
    </ul>
  )
}

export default function MetaSessionControl() {
  const [session, setSession] = useState(null)
  const [open, setOpen] = useState(false)
  const [cookies, setCookies] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    getMetaSession().then(setSession).catch(() => {})
  }, [])

  if (!session) return null
  const connected = session.logged_in

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await testMetaSession())
      setSession(await getMetaSession())
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Test failed')
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      setSession(await saveMetaSession(cookies))
      setCookies('')
      toast.success('Meta login saved')
      runTest()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save the session')
    }
    setSaving(false)
  }

  const handleDisconnect = async () => {
    try {
      setSession(await deleteMetaSession())
      setTestResult(null)
      toast.success('Meta login removed')
    } catch {
      toast.error('Could not remove the session')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition ${
          connected ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
        }`}
      >
        {connected ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {connected ? 'Meta login connected' : session.expired ? 'Meta login expired' : 'Meta login not connected'}
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Meta login for the scraper"
        description="Without a login Meta only shows about 30 ads per advertiser. A logged-in session lets the scraper load them all."
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              {session.cookie_count > 0 && (
                <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-danger-600">
                  Remove login
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {connected && (
                <Button variant="outline" size="sm" onClick={runTest} loading={testing}>
                  Test login
                </Button>
              )}
              <Button size="sm" onClick={handleSave} loading={saving} disabled={!cookies.trim()}>
                Save login
              </Button>
            </div>
          </div>
        }
      >
        <Modal.Body className="space-y-4 text-sm">
          <div className="rounded-lg border border-warning-100 bg-warning-50 p-3 text-xs text-warning-700">
            Use a separate Facebook account made for this. Never your main account or one that manages your ad
            account or Business Manager — Meta can lock accounts it sees being automated.
          </div>

          <ol className="list-decimal space-y-1 pl-5 text-xs text-text-secondary">
            <li>In Chrome, install the <span className="font-medium text-text-primary">Cookie-Editor</span> extension.</li>
            <li>Log in to <span className="font-medium text-text-primary">facebook.com</span> with the scraper account and open the Ad Library once.</li>
            <li>Click Cookie-Editor → <span className="font-medium text-text-primary">Export → JSON</span>.</li>
            <li>Paste it below and save. Don&apos;t log out of that Facebook tab afterwards — logging out ends this session.</li>
          </ol>

          <textarea
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder='[{"name": "c_user", "value": "…", "domain": ".facebook.com", …}]'
            className="w-full rounded-lg border border-border-default bg-white p-3 font-mono text-xs outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />

          {session.cookie_count > 0 && (
            <p className="text-xs text-text-tertiary">
              Stored: {session.cookie_count} cookies
              {session.updated_at && <> · saved {new Date(session.updated_at).toLocaleString()}</>}
              {session.expires_at && <> · login valid until {new Date(session.expires_at).toLocaleDateString()}</>}
            </p>
          )}

          {testing && (
            <p className="flex items-center gap-2 text-xs text-text-secondary">
              <Loader2 size={13} className="animate-spin" /> Opening the Ad Library with this login (about 30 seconds)…
            </p>
          )}
          <TestResult result={testResult} />
        </Modal.Body>
      </Modal>
    </>
  )
}
