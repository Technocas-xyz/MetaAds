/**
 * Compact chip showing competitor logo (or initials), name, tier pill and external URL link.
 * Designed for table cells and inline lists.
 *
 * @example
 * <CompetitorChip
 *   name="BrandX"
 *   domain="brandx.com"
 *   logo="/logos/brandx.png"
 *   tier={1}
 * />
 */
import { ExternalLink } from 'lucide-react'
import { cn } from '../../lib/utils'

const TIER_STYLE = {
  1: 'bg-red-100   text-red-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-gray-100  text-gray-600',
}
const TIER_LABEL = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' }

function Initials({ name, size = 28 }) {
  const letters = name
    ?.split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') ?? '?'

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary-100 text-[10px] font-bold text-primary-700"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {letters}
    </span>
  )
}

export default function CompetitorChip({
  name,
  domain,
  logo,
  tier,
  onClick,
  className,
}) {
  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
    >
      {/* Logo / initials */}
      {logo ? (
        <img
          src={logo}
          alt=""
          loading="lazy"
          className="h-7 w-7 shrink-0 rounded-md object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      ) : (
        <Initials name={name} />
      )}

      {/* Name */}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'truncate text-sm font-medium text-text-primary',
          onClick && 'hover:text-primary-600 hover:underline'
        )}
      >
        {name}
      </button>

      {/* Tier */}
      {tier && (
        <span className={cn('shrink-0 rounded-full px-1.5 py-0 text-[10px] font-semibold', TIER_STYLE[tier] ?? TIER_STYLE[3])}>
          {TIER_LABEL[tier] ?? `T${tier}`}
        </span>
      )}

      {/* External link */}
      {domain && (
        <a
          href={`https://${domain.replace(/^https?:\/\//, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${name}`}
          className="shrink-0 text-text-tertiary hover:text-primary-600"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}
