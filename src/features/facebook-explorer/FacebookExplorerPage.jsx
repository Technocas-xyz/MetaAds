import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle, RefreshCcw, ChevronDown, ChevronRight, Loader2, Database } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import AdDetailTabs from './components/AdDetailTabs'
import { getFbStatus, getFbFields, getFbAds } from '../../api/facebook'
import { cn } from '../../lib/utils'

export default function FacebookExplorerPage() {
  const [expandedAd, setExpandedAd] = useState(null)
  const [afterCursor, setAfterCursor] = useState(null)
  const [allAds, setAllAds] = useState([])

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['fb-status'],
    queryFn: getFbStatus,
  })
  const { data: fields } = useQuery({
    queryKey: ['fb-fields'],
    queryFn: getFbFields,
  })
  const { data: adsResult, isLoading: adsLoading, refetch: refetchAds } = useQuery({
    queryKey: ['fb-ads', afterCursor],
    queryFn: () => getFbAds({ limit: 25, after: afterCursor || undefined }),
    enabled: !!status?.token_present && !!status?.account_id_set,
    onSuccess: (data) => {
      if (data?.ok && data.data) {
        if (afterCursor) setAllAds((prev) => [...prev, ...data.data])
        else setAllAds(data.data)
      }
    },
  })

  const ads = afterCursor ? allAds : (adsResult?.data || [])
  const [showFields, setShowFields] = useState(false)

  const handleLoadMore = () => {
    if (adsResult?.paging?.after) {
      setAfterCursor(adsResult.paging.after)
    }
  }

  const handleRefresh = () => {
    setAfterCursor(null)
    setAllAds([])
    refetchAds()
    refetchStatus()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facebook API Explorer"
        subtitle="Raw Facebook Marketing API data for the Decoinks account — nothing stored yet"
        rightSlot={
          <Button variant="outline" size="md" icon={RefreshCcw} onClick={handleRefresh}>
            Refresh
          </Button>
        }
      />

      <p className="text-[10px] text-text-tertiary italic">
        This page shows raw Facebook API data for the Decoinks account. Nothing here is stored yet — we are inspecting what's available.
      </p>

      {/* Status Card */}
      <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Connection Status</h3>
        {statusLoading ? (
          <div className="flex items-center gap-2 text-xs text-text-secondary"><Loader2 size={14} className="animate-spin" /> Checking...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="flex items-center gap-2">
              {status?.token_present ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-red-500" />}
              <span>Token: {status?.token_present ? 'Present' : 'Missing'}</span>
            </div>
            <div className="flex items-center gap-2">
              {status?.account_id_set ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-red-500" />}
              <span>Account: {status?.account_id_preview || 'Not set'}</span>
            </div>
            <div>
              <span className="text-text-tertiary">API Version:</span> <span className="font-medium">{status?.api_version}</span>
            </div>
            <div>
              {status?.connection_test?.ok ? (
                <span className="text-green-600 font-medium">✓ Connected as {status.connection_test.user_name}</span>
              ) : (
                <span className="text-red-500">{status?.connection_test?.error || 'Not tested'}</span>
              )}
            </div>
          </div>
        )}
        {/* Ad Accounts */}
        {status?.ad_accounts?.ok && status.ad_accounts.accounts?.length > 0 && (
          <div className="mt-3 border-t border-border-default pt-3">
            <p className="text-[10px] font-semibold text-text-secondary mb-1">Available Ad Accounts:</p>
            <div className="space-y-1">
              {status.ad_accounts.accounts.map((acc) => (
                <div key={acc.id} className="text-[10px] text-text-primary">
                  <span className="font-mono">{acc.id}</span> — {acc.name || acc.business_name || 'Unnamed'} ({acc.currency})
                </div>
              ))}
            </div>
          </div>
        )}
        {status?.connection_test && !status.connection_test.ok && (
          <div className="mt-3 p-2 rounded bg-red-50 text-xs text-red-700">
            Error: {status.connection_test.error}
            {status.connection_test.code && <span className="ml-2">(code: {status.connection_test.code})</span>}
          </div>
        )}
      </div>

      {/* Fields Section */}
      <div className="rounded-card border border-border-default bg-white shadow-card">
        <button
          onClick={() => setShowFields(!showFields)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-text-primary hover:bg-gray-50"
        >
          Fields Requested
          {showFields ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {showFields && fields && (
          <div className="border-t border-border-default px-5 py-4 space-y-3">
            {Object.entries(fields.groups || {}).map(([group, fieldList]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1">{group}</p>
                <div className="flex flex-wrap gap-1">
                  {fieldList.map((f, i) => (
                    <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-[9px] font-mono text-text-primary">{f}</span>
                  ))}
                </div>
              </div>
            ))}
            {adsResult?.dropped_fields?.length > 0 && (
              <div className="mt-3 p-2 rounded bg-amber-50">
                <p className="text-[10px] font-semibold text-amber-700">Dropped Fields (permission errors):</p>
                {adsResult.dropped_fields.map((d, i) => (
                  <p key={i} className="text-[9px] text-amber-600">{d.reason}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ads List */}
      <div className="rounded-card border border-border-default bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3.5">
          <h3 className="text-sm font-semibold text-text-primary">Ads ({ads.length})</h3>
          {adsLoading && <Loader2 size={14} className="animate-spin text-text-tertiary" />}
        </div>

        {!status?.token_present || !status?.account_id_set ? (
          <div className="px-5 py-10 text-center text-xs text-text-secondary">
            Configure FB_ACCESS_TOKEN and FB_AD_ACCOUNT_ID in .env to load ads.
          </div>
        ) : adsResult && !adsResult.ok ? (
          <div className="px-5 py-6 text-center">
            <p className="text-xs text-red-600">{adsResult.error}</p>
            {adsResult.code && <p className="text-[10px] text-text-tertiary">Code: {adsResult.code}</p>}
          </div>
        ) : ads.length === 0 && !adsLoading ? (
          <div className="px-5 py-10 text-center text-xs text-text-secondary">No ads found</div>
        ) : (
          <div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="px-4 py-2 text-left font-medium text-text-secondary">Name</th>
                    <th className="px-4 py-2 text-left font-medium text-text-secondary">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-text-secondary">Campaign</th>
                    <th className="px-4 py-2 text-right font-medium text-text-secondary">Impressions</th>
                    <th className="px-4 py-2 text-right font-medium text-text-secondary">Spend</th>
                    <th className="px-4 py-2 text-center font-medium text-text-secondary">Expand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {ads.map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 max-w-[200px] truncate font-medium">{ad.name || ad.id}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                          ad.effective_status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                          ad.effective_status === 'PAUSED' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {ad.effective_status || ad.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary truncate max-w-[150px]">{ad.campaign?.name || '—'}</td>
                      <td className="px-4 py-2.5 text-right">{ad._insights?.impressions || '—'}</td>
                      <td className="px-4 py-2.5 text-right">{ad._insights?.spend ? `$${ad._insights.spend}` : (ad._insights_error ? <span className="text-red-500 text-[9px]" title={ad._insights_error}>⚠ Error</span> : '—')}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => setExpandedAd(expandedAd === ad.id ? null : ad.id)}
                          className="rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-gray-100"
                        >
                          {expandedAd === ad.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Ad Detail Tabs */}
            {expandedAd && (() => {
              const ad = ads.find((a) => a.id === expandedAd)
              if (!ad) return null
              return <AdDetailTabs ad={ad} />
            })()}

            {/* Load more */}
            {adsResult?.paging?.after && (
              <div className="border-t border-border-default px-5 py-3 text-center">
                <button
                  onClick={handleLoadMore}
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  Load more ads...
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
