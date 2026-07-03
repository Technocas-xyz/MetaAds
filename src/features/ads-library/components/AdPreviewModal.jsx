import * as Dialog from '@radix-ui/react-dialog'
import { X, ExternalLink, Play, Brain, Send, Download } from 'lucide-react'
import HookTypeBadge from '../../../components/ui/HookTypeBadge'
import ConfidenceBadge from '../../../components/ui/ConfidenceBadge'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { cn } from '../../../lib/utils'

const PLATFORM_DOT = {
  Facebook:  'bg-blue-500',
  Instagram: 'bg-pink-500',
  TikTok:    'bg-black',
  YouTube:   'bg-red-500',
}

const TIER_COLOR = { 1: 'red', 2: 'amber', 3: 'slate' }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function MetaItem({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-tertiary">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}

export default function AdPreviewModal({ ad, open, onClose, onAnalyze, onReview }) {
  if (!ad) return null

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-hidden',
            'rounded-card border border-border-default bg-white shadow-xl',
            'flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
            <Dialog.Title className="text-base font-semibold text-text-primary">
              Ad Preview
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col gap-0 overflow-hidden sm:flex-row">
            {/* Media panel */}
            <div className="flex flex-shrink-0 items-center justify-center bg-gray-100 sm:w-64 sm:min-h-full">
              <div className="relative h-64 w-48 overflow-hidden rounded-lg sm:h-full sm:w-full sm:rounded-none">
                <img
                  src={ad.media_url}
                  alt={ad.headline}
                  className="h-full w-full object-cover"
                />
                {ad.is_video && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md">
                      <Play size={20} className="fill-primary-600 text-primary-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Details panel */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="space-y-5 p-5">

                {/* Headline */}
                <div>
                  <p className="text-lg font-semibold leading-snug text-text-primary">{ad.headline}</p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{ad.primary_text}</p>
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap items-center gap-2">
                  <HookTypeBadge type={ad.hook_type} />
                  <ConfidenceBadge score={ad.confidence_score} />
                  {ad.offer_type && <Badge color="indigo">{ad.offer_type}</Badge>}
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <MetaItem label="Competitor">
                    <div className="flex items-center gap-1.5">
                      <Badge color={TIER_COLOR[ad.competitor.tier] ?? 'gray'}>T{ad.competitor.tier}</Badge>
                      <span className="text-sm text-text-primary">{ad.competitor.name}</span>
                    </div>
                  </MetaItem>

                  <MetaItem label="Platform">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', PLATFORM_DOT[ad.platform] ?? 'bg-gray-400')} />
                      <span className="text-sm text-text-primary">{ad.platform}</span>
                    </div>
                  </MetaItem>

                  <MetaItem label="Angle">
                    <p className="text-sm text-text-primary">{ad.angle}</p>
                    {ad.angle_detail && <p className="text-xs text-text-tertiary">{ad.angle_detail}</p>}
                  </MetaItem>

                  <MetaItem label="Running Since">
                    <p className="text-sm text-text-primary">{ad.running_since_days} days</p>
                    <p className="text-xs text-text-tertiary">{ad.running_since_date}</p>
                  </MetaItem>

                  <MetaItem label="Captured">
                    <p className="text-sm text-text-primary">{fmtDate(ad.captured_at)}</p>
                  </MetaItem>

                  <MetaItem label="Variants">
                    <p className="text-sm text-text-primary">{ad.variants}</p>
                  </MetaItem>
                </div>

                {/* CTA / Landing URL */}
                {(ad.cta || ad.landing_url) && (
                  <div className="rounded-lg border border-border-default bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      {ad.cta && (
                        <span className="rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white">
                          {ad.cta}
                        </span>
                      )}
                      {ad.landing_url && (
                        <a
                          href={ad.landing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 truncate text-xs text-primary-600 hover:underline"
                        >
                          <ExternalLink size={11} className="flex-shrink-0" />
                          <span className="truncate">{ad.landing_url}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* AI analysis summary if present */}
                {ad.analysis && (
                  <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
                    <p className="text-xs font-medium text-primary-700">AI Analysis</p>
                    <p className="mt-1 text-sm text-primary-900">{ad.analysis.summary}</p>
                    <div className="mt-2 flex gap-3 text-xs text-primary-700">
                      <span>Suggested angle: <strong>{ad.analysis.suggested_angle}</strong></span>
                      <span>Suggested hook: <strong>{ad.analysis.suggested_hook}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-border-default px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={() => window.open(ad.media_url, '_blank')}
            >
              Download
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Brain}
                onClick={() => { onAnalyze?.(ad.id); onClose() }}
              >
                Analyze
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={() => { onReview?.(ad.id); onClose() }}
              >
                Send to Review
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
