/**
 * Platform icon with brand colours. Uses simple SVG shapes — no external brand assets.
 *
 * @example
 * <PlatformIcon platform="Facebook" />
 * <PlatformIcon platform="TikTok"  size={20} />
 * <PlatformIcon platform="Instagram" size={16} showLabel />
 */
import { Globe2 } from 'lucide-react'
import { cn } from '../../lib/utils'

// ── Platform SVG definitions ──────────────────────────────────────────────────

function FacebookSVG({ size }) {
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M15.5 8H13.5C13.2 8 13 8.2 13 8.5V10H15.5L15.2 12.5H13V19H10.5V12.5H9V10H10.5V8.5C10.5 6.6 11.7 5.5 13.4 5.5H15.5V8Z"
        fill="white"
      />
    </svg>
  )
}

function InstagramSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#F9CE34" />
          <stop offset="30%"  stopColor="#EE2A7B" />
          <stop offset="100%" stopColor="#6228D7" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="7" y="7" width="10" height="10" rx="3" stroke="white" strokeWidth="1.6" fill="none" />
      <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.6" fill="none" />
      <circle cx="16.5" cy="7.5" r="1" fill="white" />
    </svg>
  )
}

function TikTokSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#010101" />
      <path
        d="M16.5 5.5C16.7 6.9 17.5 7.9 18.8 8.1V10.3C17.8 10.4 16.9 10 16 9.4V14.5C16 17 14 19 11.5 19S7 17 7 14.5 9 10 11.5 10c.2 0 .5 0 .7.1v2.3c-.2-.1-.5-.1-.7-.1-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5V5.5h2.5Z"
        fill="white"
      />
    </svg>
  )
}

function YouTubeSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path d="M19.8 8.5s-.2-1.4-.8-2c-.7-.8-1.6-.8-2-.8C15.3 5.5 12 5.5 12 5.5s-3.3 0-5 .2c-.4 0-1.3.1-2 .8-.6.6-.8 2-.8 2S4 10.1 4 11.8v1.5c0 1.7.2 3.3.2 3.3s.2 1.4.8 2c.7.7 1.7.7 2.1.8C8.5 19.5 12 19.5 12 19.5s3.3 0 5-.2c.4-.1 1.3-.1 2-.8.6-.6.8-2 .8-2s.2-1.6.2-3.3v-1.5C20 10.1 19.8 8.5 19.8 8.5zM10.5 15V9.5l5.5 2.8-5.5 2.7z" fill="white" />
    </svg>
  )
}

const PLATFORM_COMPONENTS = {
  Facebook:  FacebookSVG,
  Instagram: InstagramSVG,
  TikTok:    TikTokSVG,
  YouTube:   YouTubeSVG,
}

export default function PlatformIcon({
  platform,
  size      = 20,
  showLabel = false,
  className,
}) {
  const Component = PLATFORM_COMPONENTS[platform]

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {Component ? (
        <Component size={size} />
      ) : (
        <span
          className="inline-flex items-center justify-center rounded bg-gray-100"
          style={{ width: size, height: size }}
        >
          <Globe2 size={size * 0.65} className="text-gray-500" />
        </span>
      )}
      {showLabel && (
        <span className="text-sm text-text-primary">{platform ?? 'Other'}</span>
      )}
    </span>
  )
}
