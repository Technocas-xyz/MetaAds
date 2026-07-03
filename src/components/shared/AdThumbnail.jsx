/**
 * Ad creative thumbnail with lazy loading, fallback placeholder, and optional AdPreviewModal trigger.
 * Pass `ad` to get the full preview modal on click; or pass `onClick` for a custom handler.
 *
 * @example
 * // Auto-managed preview modal
 * <AdThumbnail src={ad.thumbnail_url} type="video" size="md" ad={ad} />
 *
 * // Custom click handler (e.g. navigate)
 * <AdThumbnail src={ad.image_url} size="sm" onClick={() => navigate(`/ads/${ad.id}`)} />
 *
 * // Static display, no interaction
 * <AdThumbnail src={ad.image_url} size="xs" />
 */
import { useState } from 'react'
import { Play, Image as ImageIcon, Video } from 'lucide-react'
import { cn } from '../../lib/utils'
import AdPreviewModal from './AdPreviewModal'

const SIZE_MAP = {
  xs: { w: 'w-10',  h: 'h-10',  icon: 10 },
  sm: { w: 'w-16',  h: 'h-12',  icon: 14 },
  md: { w: 'w-24',  h: 'h-16',  icon: 18 },
  lg: { w: 'w-32',  h: 'h-24',  icon: 22 },
  xl: { w: 'w-40',  h: 'h-28',  icon: 26 },
}

function Placeholder({ size, type, className }) {
  const { w, h, icon } = SIZE_MAP[size] ?? SIZE_MAP.md
  const Icon = type === 'video' ? Video : ImageIcon
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-gray-100',
        w, h, className
      )}
      aria-hidden="true"
    >
      <Icon size={icon} className="text-gray-400" />
    </div>
  )
}

export default function AdThumbnail({
  src,
  alt        = '',
  type       = 'image',
  size       = 'md',
  playOverlay = true,
  ad,
  onClick,
  className,
}) {
  const [imgError, setImgError]     = useState(false)
  const [modalOpen, setModalOpen]   = useState(false)

  const { w, h } = SIZE_MAP[size] ?? SIZE_MAP.md
  const isVideo = type === 'video'
  const hasModal = !!ad && !onClick

  const handleClick = onClick ?? (hasModal ? () => setModalOpen(true) : undefined)
  const isClickable = !!handleClick

  if (!src || imgError) {
    return (
      <>
        {isClickable ? (
          <button
            type="button"
            onClick={handleClick}
            aria-label="View ad"
            className={cn('rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500', className)}
          >
            <Placeholder size={size} type={type} />
          </button>
        ) : (
          <Placeholder size={size} type={type} className={className} />
        )}
        {hasModal && (
          <AdPreviewModal
            ad={ad}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    )
  }

  const img = (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-gray-100',
        w, h,
        isClickable && 'cursor-pointer',
        isClickable && 'group',
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setImgError(true)}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
      />

      {/* Video play overlay */}
      {isVideo && playOverlay && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            isClickable
              ? 'bg-black/20 opacity-100 group-hover:bg-black/40'
              : 'bg-black/20'
          )}
          aria-hidden="true"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 shadow">
            <Play size={12} className="ml-0.5 text-gray-800" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Hover overlay for image type */}
      {!isVideo && isClickable && (
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" aria-hidden="true" />
      )}
    </div>
  )

  return (
    <>
      {isClickable ? (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Preview ad creative"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {img}
        </button>
      ) : (
        img
      )}

      {hasModal && (
        <AdPreviewModal
          ad={ad}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
