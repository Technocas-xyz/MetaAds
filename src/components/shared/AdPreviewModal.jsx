/**
 * Canonical shared modal for previewing a full ad creative with metadata side panel.
 * Replaces/complements the local version in features/ads-library.
 *
 * @example
 * <AdPreviewModal
 *   ad={selectedAd}
 *   open={previewOpen}
 *   onClose={() => setPreviewOpen(false)}
 *   onAnalyze={(ad) => navigate(`/ai-analysis?ad=${ad.id}`)}
 *   onReview={(ad)  => navigate(`/review/${ad.id}`)}
 * />
 */
import * as Dialog from '@radix-ui/react-dialog'
import {
  X, Play, ExternalLink, Brain, Send, Calendar,
  Globe2, FileText, Link2, Image,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import Button from '../ui/Button'
import ConfidenceBadge from './ConfidenceBadge'
import HookTypeBadge from './HookTypeBadge'
import AngleBadge from './AngleBadge'
import PlatformIcon from './PlatformIcon'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function MetaRow({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export default function AdPreviewModal({
  ad,
  open,
  onClose,
  onAnalyze,
  onReview,
  className,
}) {
  if (!ad) return null

  const isVideo = ad.type === 'video' || ad.format?.toLowerCase().includes('video')

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)] max-w-4xl max-h-[92vh]',
            'flex flex-col overflow-hidden',
            'rounded-card border border-border-default bg-white shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border-default px-5 py-4">
            <div className="flex items-center gap-2">
              {ad.platform && <PlatformIcon platform={ad.platform} size={18} />}
              <Dialog.Title className="text-base font-semibold text-text-primary">
                {ad.name ?? 'Ad Preview'}
              </Dialog.Title>
              {ad.confidence_score !== undefined && (
                <ConfidenceBadge score={ad.confidence_score} size="xs" />
              )}
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close preview"
                className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Creative panel */}
            <div className="flex flex-1 items-center justify-center bg-gray-950 p-4">
              {ad.thumbnail_url || ad.image_url ? (
                <div className="relative max-h-full max-w-full overflow-hidden rounded-lg">
                  <img
                    src={ad.thumbnail_url ?? ad.image_url}
                    alt={ad.name ?? 'Ad creative'}
                    className="max-h-[60vh] object-contain"
                  />
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Play size={24} className="ml-1 text-white" fill="white" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-xl border border-white/10 text-white/40">
                  <Image size={36} />
                  <p className="text-sm">No preview</p>
                </div>
              )}
            </div>

            {/* Meta side panel */}
            <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border-default">
              <div className="space-y-4 p-5">
                {/* Headline */}
                {ad.headline && (
                  <MetaRow icon={FileText} label="Headline">
                    <p className="text-sm font-medium text-text-primary">{ad.headline}</p>
                  </MetaRow>
                )}

                {/* Body copy */}
                {ad.body && (
                  <MetaRow icon={FileText} label="Body Copy">
                    <p className="text-xs leading-relaxed text-text-secondary">{ad.body}</p>
                  </MetaRow>
                )}

                {/* CTA */}
                {ad.cta && (
                  <MetaRow label="CTA">
                    <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-primary">
                      {ad.cta}
                    </span>
                  </MetaRow>
                )}

                {/* Landing URL */}
                {ad.landing_url && (
                  <MetaRow icon={Link2} label="Landing URL">
                    <a
                      href={ad.landing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <span className="truncate">{ad.landing_url.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={10} className="shrink-0" />
                    </a>
                  </MetaRow>
                )}

                {/* Hook / Angle */}
                {(ad.hook_type || ad.angle) && (
                  <div className="space-y-2">
                    {ad.hook_type && (
                      <MetaRow label="Hook Type">
                        <HookTypeBadge type={ad.hook_type} />
                      </MetaRow>
                    )}
                    {ad.angle && (
                      <MetaRow label="Angle">
                        <AngleBadge type={ad.angle} />
                      </MetaRow>
                    )}
                  </div>
                )}

                {/* Captured date */}
                {ad.first_seen && (
                  <MetaRow icon={Calendar} label="First Seen">
                    <p className="text-xs text-text-secondary">{fmtDate(ad.first_seen)}</p>
                  </MetaRow>
                )}

                {/* Platform */}
                {ad.platform && (
                  <MetaRow icon={Globe2} label="Platform">
                    <PlatformIcon platform={ad.platform} size={16} showLabel />
                  </MetaRow>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-border-default px-5 py-3">
            <p className="text-xs text-text-tertiary">
              {ad.id ? `Ad #${ad.id}` : ''}
              {ad.format ? ` · ${ad.format}` : ''}
            </p>
            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <Button variant="outline" size="sm">Close</Button>
              </Dialog.Close>
              {onReview && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Send}
                  onClick={() => { onReview(ad); onClose?.() }}
                >
                  Send to Review
                </Button>
              )}
              {onAnalyze && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Brain}
                  onClick={() => { onAnalyze(ad); onClose?.() }}
                >
                  Analyze
                </Button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
