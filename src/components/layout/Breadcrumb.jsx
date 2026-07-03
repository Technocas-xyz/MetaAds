import { Link, useLocation } from 'react-router-dom'
import { Home, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

// Maps path segment → human-readable label
const SEGMENT_LABELS = {
  dashboard:                   'Dashboard',
  competitors:                 'Competitors',
  ads:                         'Ads Library',
  'ads-library':               'Ads Library',
  'ai-analysis':               'AI Analysis',
  hooks:                       'Hook Library',
  'hook-library':              'Hook Library',
  angles:                      'Angle Library',
  'angle-library':             'Angle Library',
  offers:                      'Offer Library',
  'offer-library':             'Offer Library',
  recommendations:             'AI Creative Recommendations',
  'ai-creative-recommendations':'AI Creative Recommendations',
  'creative-review':           'Creative Review & QA',
  'creative-review-qa':        'Creative Review & QA',
  performance:                 'Performance Intelligence',
  creative:                    'Creative',
  'performance-intelligence':  'Performance Intelligence',
  briefs:                      'Creative Briefs',
  'creative-briefs':           'Creative Briefs',
  campaigns:                   'Campaigns',
  new:                         'Add New Ad',
  'learning-loop':             'Learning Loop',
  'insight-log':               'Insight Log',
  'prediction-accuracy':       'Prediction Accuracy',
  review:                      'Review Queue',
  'review-queue':              'Review Queue',
  'low-confidence':            'Low Confidence',
  settings:                    'Settings',
  users:                       'Users',
  'activity-logs':             'Activity Logs',
}

function toLabel(segment) {
  return SEGMENT_LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Renders:  Home › Section › Page
 * Pass `items` to override auto-detection, or let it derive from the URL.
 *
 * @param {{ label: string, to?: string }[]} [items]
 */
export default function Breadcrumb({ items }) {
  const { pathname } = useLocation()

  const crumbs = items ?? pathname
    .split('/')
    .filter(Boolean)
    .map((segment, i, arr) => ({
      label: toLabel(segment),
      to: i < arr.length - 1 ? `/${arr.slice(0, i + 1).join('/')}` : undefined,
    }))

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {/* Home icon */}
      <Link
        to="/dashboard"
        className={cn(
          'text-text-secondary outline-none transition-colors hover:text-text-primary',
          'focus-visible:ring-2 focus-visible:ring-primary-500 rounded'
        )}
        aria-label="Home"
      >
        <Home size={14} aria-hidden="true" />
      </Link>

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight size={13} className="text-text-tertiary" aria-hidden="true" />
            {isLast || !crumb.to ? (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={cn(
                  'font-medium',
                  isLast ? 'text-text-primary' : 'text-text-secondary'
                )}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className={cn(
                  'text-text-secondary outline-none transition-colors hover:text-text-primary',
                  'focus-visible:ring-2 focus-visible:ring-primary-500 rounded'
                )}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
