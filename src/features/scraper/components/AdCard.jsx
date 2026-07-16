import { useState } from 'react'
import { ExternalLink, Play, Image, Sparkles, Globe, DollarSign } from 'lucide-react'
import Badge from '../../../components/ui/Badge'
import EstSpend from '../../../components/ui/EstSpend'

/**
 * Get the best available image URL for an ad, with fallback chain.
 */
function getVisualSources(ad) {
  const sources = []
  if (ad.screenshot_url) sources.push(ad.screenshot_url)
  if (ad.media_url) sources.push(ad.media_url)
  if (ad.video_poster_url) sources.push(ad.video_poster_url)
  return sources
}

export default function AdCard({ ad, onAnalyze }) {
  const isNew = ad.days_running <= 7 && ad.days_running > 0
  const isLongRunning = ad.days_running >= 90
  const hasAnalysis = !!(ad.hook_type || ad.angle || ad.offer)

  // Image fallback: try each source in priority order
  const sources = getVisualSources(ad)
  const [srcIndex, setSrcIndex] = useState(0)
  const currentSrc = sources[srcIndex] || null

  const handleImageError = () => {
    // Try next fallback
    if (srcIndex < sources.length - 1) {
      setSrcIndex(srcIndex + 1)
    } else {
      // All failed — hide image (will show placeholder)
      setSrcIndex(-1)
    }
  }

  const showImage = currentSrc && srcIndex >= 0

  return (
    <div className="flex flex-col rounded-lg border border-border-default bg-white text-[11px] shadow-sm transition-shadow hover:shadow-md">
      {/* Status bar */}
      <div className="flex items-center gap-1.5 border-b border-border-default px-3 py-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${ad.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
        {isNew && <Badge color="green" size="xs">NEW</Badge>}
        {isLongRunning && <Badge color="purple" size="xs">90d+</Badge>}
        {ad.has_multiple_versions && <Badge color="blue" size="xs">MULTI</Badge>}
        <span className="ml-auto text-[10px] text-text-secondary">
          {ad.days_running > 0 ? `${ad.days_running}d` : '—'}
        </span>
      </div>

      {/* Advertiser */}
      <div className="flex items-center gap-1.5 px-3 py-1">
        <span className="truncate text-[10px] font-semibold text-text-primary">
          {ad.advertiser_name || 'Sponsored'}
        </span>
        {ad.domain && (
          <span className="ml-auto flex items-center gap-0.5 text-[9px] text-text-secondary">
            <Globe size={8} />
            {ad.domain}
          </span>
        )}
      </div>

      {/* Hook */}
      {ad.hook && (
        <div className="px-3 pb-1">
          <p className="line-clamp-2 text-[11px] font-medium leading-tight text-text-primary">
            {ad.hook}
          </p>
        </div>
      )}

      {/* Creative — shows image with play overlay for video, or placeholder if nothing */}
      <div className="relative max-h-[240px] overflow-hidden bg-gray-50">
        {showImage ? (
          <>
            <img
              src={currentSrc}
              alt=""
              className="h-full max-h-[240px] w-full object-cover"
              loading="lazy"
              onError={handleImageError}
            />
            {/* Play button overlay for video ads */}
            {ad.is_video && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                  <Play size={18} className="text-white" fill="white" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-24 items-center justify-center">
            <Image size={20} className="text-gray-300" />
          </div>
        )}
      </div>

      {/* CTA row */}
      {ad.cta && (
        <div className="flex items-center justify-between border-t border-border-default px-3 py-1">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold">
            {ad.cta}
          </span>
        </div>
      )}

      {/* AI Analysis badges */}
      {hasAnalysis && (
        <div className="border-t border-border-default px-3 py-1.5">
          <div className="flex flex-wrap gap-1">
            {ad.hook_type && <Badge color="blue" size="xs">{ad.hook_type}</Badge>}
            {ad.angle && <Badge color="purple" size="xs">{ad.angle}</Badge>}
            {ad.offer && <Badge color="amber" size="xs">{ad.offer}</Badge>}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-border-default px-3 py-1.5">
        <div className="min-w-0">
          {ad.ad_library_id && (
            <p className="truncate text-[9px] text-text-secondary">ID: {ad.ad_library_id}</p>
          )}
          <div className="flex items-center gap-2">
            <p className="text-[9px] text-text-secondary">{ad.start_date}</p>
            {ad.days_running > 0 && <EstSpend daysRunning={ad.days_running} compact />}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {!hasAnalysis && (
            <button
              onClick={() => onAnalyze(ad.id)}
              className="rounded p-0.5 text-text-secondary hover:text-purple-600"
              title="Analyze"
            >
              <Sparkles size={12} />
            </button>
          )}
          {ad.ad_url && (
            <a
              href={ad.ad_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-0.5 text-text-secondary hover:text-blue-600"
              title="View on Meta"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
