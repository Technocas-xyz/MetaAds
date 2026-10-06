import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Download, Users2, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../../../components/ui/Button'
import { downloadCSV, todayStamp } from '../../../lib/csv'
import { cn } from '../../../lib/utils'

const ITEM = cn(
  'flex cursor-pointer select-none items-start gap-2.5 rounded-lg px-3 py-2 text-sm outline-none',
  'text-text-primary transition-colors hover:bg-gray-50 focus:bg-gray-50',
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'
)

const COMPETITOR_COLUMNS = [
  { label: 'Competitor',              value: (c) => c.name },
  { label: 'Ads',                     value: (c) => c.total_ads },
  { label: 'Analyzed',                value: (c) => c.analyzed },
  { label: 'Top hook',                value: (c) => c.top_hook },
  { label: 'Top angle',               value: (c) => c.top_angle },
  { label: 'Top offer',               value: (c) => c.top_offer },
  { label: 'Longest running (days)',  value: (c) => c.longest_running_days },
  { label: 'Winners 90d+',            value: (c) => c.long_runners_count },
]

const WINNING_COLUMNS = [
  { label: 'Rank',              value: (a) => a.rank },
  { label: 'Competitor',        value: (a) => a.competitor?.name },
  { label: 'Library ID',        value: (a) => a.ad_library_id },
  { label: 'Headline',          value: (a) => a.headline },
  { label: 'Primary text',      value: (a) => a.primary_text },
  { label: 'Hook type',         value: (a) => a.hook_type },
  { label: 'Hook',              value: (a) => a.hook_text },
  { label: 'Angle',             value: (a) => a.angle },
  { label: 'Offer',             value: (a) => a.offer_type },
  { label: 'CTA',               value: (a) => a.cta },
  { label: 'Days running',      value: (a) => a.running_since_days },
  { label: 'Running since',     value: (a) => a.running_since_date },
  { label: 'AI confidence (%)', value: (a) => (a.hook_type ? Math.round(a.confidence_score) : '') },
  { label: 'Video',             value: (a) => (a.is_video ? 'yes' : 'no') },
  { label: 'Meta link',         value: (a) => a.ad_url },
  { label: 'Landing page',      value: (a) => a.landing_url },
]

/** Export what the AI Analysis page shows, as CSV. */
export default function ExportMenu({ competitors, winningAds }) {
  const exportCompetitors = () => {
    const rows = [...(competitors ?? [])].sort((a, b) => b.analyzed - a.analyzed)
    downloadCSV(`ai-analysis-competitors-${todayStamp()}.csv`, COMPETITOR_COLUMNS, rows)
    toast.success(`Exported ${rows.length} competitors`)
  }

  const exportWinning = () => {
    downloadCSV(`ai-analysis-winning-ads-${todayStamp()}.csv`, WINNING_COLUMNS, winningAds ?? [])
    toast.success(`Exported ${winningAds?.length ?? 0} winning ads`)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" icon={Download}>Export Report</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className={cn(
            'z-50 w-72 rounded-xl border border-border-default bg-white p-1 shadow-card-hover',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
          )}
        >
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Download CSV
          </DropdownMenu.Label>
          <DropdownMenu.Item className={ITEM} disabled={!competitors?.length} onSelect={exportCompetitors}>
            <Users2 size={15} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden="true" />
            <span>
              <span className="block font-medium">Per-competitor analysis</span>
              <span className="block text-xs text-text-tertiary">
                {competitors?.length ?? 0} competitors · top hook, angle, offer, longest run
              </span>
            </span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={ITEM} disabled={!winningAds?.length} onSelect={exportWinning}>
            <Trophy size={15} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden="true" />
            <span>
              <span className="block font-medium">Winning ads</span>
              <span className="block text-xs text-text-tertiary">
                {winningAds?.length ?? 0} ads · copy, analysis, days running, links
              </span>
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
