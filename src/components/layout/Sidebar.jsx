import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users2,
  BookImage,
  Brain,
  Anchor,
  Compass,
  Gift,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
  FileText,
  Megaphone,
  RefreshCcw,
  ScrollText,
  Target,
  Inbox,
  AlertTriangle,
  Settings,
  Users,
  Activity,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Radar,
  Trash2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import useUIStore from '../../store/useUIStore'

// ── Design tokens (sidebar-specific) ────────────────────────────────────────
const SIDEBAR_W  = 'w-60'       // 240px
const SIDEBAR_W_C = 'w-[72px]'  // 72px collapsed

// ── Nav data ─────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'DASHBOARD',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    items: [
      { label: 'Competitors',   to: '/competitors',          icon: Users2 },
      { label: 'Ad Scraper',    to: '/scraper/competitors',  icon: Radar },
      { label: 'My Ads',        to: '/my-ads',               icon: Zap },
      { label: 'Removed Ads',   to: '/removed-ads',          icon: Trash2 },
      { label: 'AI Recommendation', to: '/ai-recommendation', icon: Sparkles },
      { label: 'Ads Library',   to: '/ads',                  icon: BookImage },
      { label: 'AI Analysis',   to: '/ai-analysis',          icon: Brain },
      { label: 'Hook Library',  to: '/hooks',                icon: Anchor },
      { label: 'Angle Library', to: '/angles',               icon: Compass },
      { label: 'Offer Library', to: '/offers',               icon: Gift },
    ],
  },
  {
    id: 'workflows',
    label: 'WORKFLOWS',
    items: [
      { label: 'AI Creative Recommendations', to: '/recommendations', icon: Sparkles },
      { label: 'Creative Review & QA',        to: '/creative-review', icon: ClipboardCheck },
      { label: 'Performance Intelligence',    to: '/performance',     icon: TrendingUp },
      { label: 'Creative Briefs',             to: '/briefs',          icon: FileText },
      { label: 'Campaigns',                   to: '/campaigns',                   icon: Megaphone },
    ],
  },
  {
    id: 'learning',
    label: 'LEARNING & OPTIMIZATION',
    items: [
      { label: 'Learning Loop',       to: '/learning-loop',       icon: RefreshCcw },
      { label: 'Insight Log',         to: '/insight-log',         icon: ScrollText },
      { label: 'Prediction Accuracy', to: '/prediction-accuracy', icon: Target },
    ],
  },
  {
    id: 'review',
    label: 'REVIEW & QA',
    items: [
      { label: 'Review Queue',   to: '/review',         icon: Inbox,         badge: 15, badgeColor: 'bg-danger-500' },
      { label: 'Low Confidence', to: '/low-confidence', icon: AlertTriangle, badge: 8,  badgeColor: 'bg-warning-500' },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    items: [
      { label: 'Settings',      to: '/settings',      icon: Settings },
      { label: 'Users',         to: '/users',         icon: Users },
      { label: 'Activity Logs', to: '/activity-logs', icon: Activity },
    ],
  },
]

const CREDITS_USED  = 7200
const CREDITS_TOTAL = 10000
const CREDITS_PCT   = Math.round((CREDITS_USED / CREDITS_TOTAL) * 100)

// ── Logo ─────────────────────────────────────────────────────────────────────
function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="droplet-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="droplet-inner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* Outer droplet */}
      <path
        d="M18 3C18 3 7 13.8 7 21C7 27.627 11.925 32 18 32C24.075 32 29 27.627 29 21C29 13.8 18 3 18 3Z"
        fill="url(#droplet-gradient)"
      />
      {/* Inner highlight */}
      <path
        d="M18 24C16.343 24 15 22.657 15 21C15 19.2 16.8 17 18 15C19.2 17 21 19.2 21 21C21 22.657 19.657 24 18 24Z"
        fill="url(#droplet-inner)"
      />
    </svg>
  )
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ item, collapsed }) {
  const { label, to, icon: Icon, badge, badgeColor = 'bg-danger-500' } = item

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-lg text-sm font-medium outline-none',
          'transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-sidebar',
          collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
          isActive
            ? 'bg-primary-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className="shrink-0" aria-hidden="true" />

          {!collapsed && <span className="flex-1 truncate leading-none">{label}</span>}

          {/* Badge */}
          {badge != null && (
            collapsed ? (
              <span
                className={cn('absolute right-1 top-1 size-2 rounded-full', badgeColor)}
                aria-label={`${badge} items`}
              />
            ) : (
              <span
                className={cn(
                  'ml-auto min-w-[1.25rem] rounded-full px-1.5 py-px text-center text-[10px] font-bold leading-none',
                  isActive ? 'bg-white/25 text-white' : cn(badgeColor, 'text-white')
                )}
              >
                {badge}
              </span>
            )
          )}

          {/* Hover tooltip (collapsed only) */}
          {collapsed && (
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg',
                'bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl',
                'opacity-0 transition-opacity group-hover:opacity-100'
              )}
            >
              {label}
              {badge != null && (
                <span className={cn('ml-1.5 rounded-full px-1.5 py-px text-[10px] font-bold', badgeColor)}>
                  {badge}
                </span>
              )}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

// ── NavGroup ──────────────────────────────────────────────────────────────────
function NavGroup({ group, collapsed }) {
  return (
    <div>
      {collapsed ? (
        <div className="my-2 border-t border-white/8" />
      ) : (
        <p className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 first:mt-2">
          {group.label}
        </p>
      )}
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </div>
    </div>
  )
}

// ── AI Credits widget ─────────────────────────────────────────────────────────
function CreditsWidget({ collapsed }) {
  if (collapsed) {
    return (
      <div
        className="flex justify-center py-3"
        title={`AI Credits: ${CREDITS_USED.toLocaleString()} / ${CREDITS_TOTAL.toLocaleString()} used`}
      >
        <Zap size={18} className="text-warning-500" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="mx-2 mb-2 rounded-xl bg-white/6 p-3.5 ring-1 ring-white/10">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-warning-500" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-slate-200">AI Credits</span>
        </div>
        <span className="text-[10px] text-slate-500">{CREDITS_PCT}%</span>
      </div>

      {/* Track */}
      <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          role="progressbar"
          aria-valuenow={CREDITS_USED}
          aria-valuemin={0}
          aria-valuemax={CREDITS_TOTAL}
          aria-label="AI Credits used"
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-primary-500 transition-all duration-700"
          style={{ width: `${CREDITS_PCT}%` }}
        />
      </div>

      <p className="mb-3 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-200">{CREDITS_USED.toLocaleString()}</span>
        {' / '}
        {CREDITS_TOTAL.toLocaleString()} used
      </p>

      <button className="w-full rounded-btn border border-primary-500/60 py-1.5 text-[11px] font-semibold text-primary-400 outline-none transition-colors hover:bg-primary-600 hover:border-primary-600 hover:text-white focus-visible:ring-2 focus-visible:ring-primary-500">
        Upgrade Plan
      </button>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ mobile = false, onClose }) {
  const { sidebarCollapsed, toggleCollapse } = useUIStore()
  const collapsed = mobile ? false : sidebarCollapsed

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-bg-sidebar transition-all duration-200',
        !mobile && 'fixed inset-y-0 left-0 z-30',
        !mobile && (collapsed ? SIDEBAR_W_C : SIDEBAR_W)
      )}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-white/8',
          collapsed && !mobile ? 'justify-center px-0' : 'gap-2.5 px-4'
        )}
      >
        <LogoMark size={34} />
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">Decoinks</p>
            <p className="truncate text-[10px] leading-tight text-slate-400">AI Ads Supervisor</p>
          </div>
        )}

        {/* Close button on mobile */}
        {mobile && onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 outline-none hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Scrollable nav ── */}
      <nav
        aria-label="Main navigation"
        className="scrollbar-hide flex-1 overflow-y-auto px-2 py-1"
      >
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.id} group={group} collapsed={collapsed} />
        ))}
      </nav>

      {/* ── Credits widget ── */}
      <div className="shrink-0 border-t border-white/8 pt-3">
        <CreditsWidget collapsed={collapsed} />
      </div>

      {/* ── Collapse toggle (desktop only) ── */}
      {!mobile && (
        <div className={cn('shrink-0 border-t border-white/8 p-2', collapsed && 'flex justify-center')}>
          <button
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center gap-2 rounded-lg py-2 text-slate-400 outline-none',
              'transition-colors hover:bg-slate-800 hover:text-white',
              'focus-visible:ring-2 focus-visible:ring-primary-500',
              collapsed ? 'justify-center px-2' : 'w-full px-3'
            )}
          >
            {collapsed ? (
              <ChevronRight size={16} aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft size={16} aria-hidden="true" />
                <span className="text-xs font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  )
}
