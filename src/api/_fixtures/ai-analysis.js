import { adsList } from './ads'

// ── KPI Summary ────────────────────────────────────────────────────────────────
export const aiSummary = {
  total_analyzed:    856,
  winning_ads:       423,
  winning_ads_trend: 18.2,
  avg_confidence:    74.2,
  avg_conf_trend:    3.1,
  engagement_rate:   3.8,
  engagement_trend:  0.4,
  roas_est:          2.4,
  roas_trend:        0.3,
}

// ── Performance over time (14 days) ───────────────────────────────────────────
const DATES = [
  'Apr 25','Apr 26','Apr 27','Apr 28','Apr 29','Apr 30',
  'May 1','May 2','May 3','May 4','May 5','May 6','May 7','May 8',
]
export const performanceTimeline = DATES.map((date, i) => ({
  date,
  winning_ads:     Math.round(28 + i * 1.3 + Math.sin(i * 0.9) * 4),
  engagement_rate: +Math.max(1.8, 3.1 + Math.sin(i * 0.7) * 0.7 + i * 0.04).toFixed(1),
  roas:            +Math.max(1.2, 2.0 + Math.sin(i * 0.5) * 0.4 + i * 0.025).toFixed(2),
}))

// ── Top angles for donut ───────────────────────────────────────────────────────
export const topAnglesDonut = [
  { name: 'Price/Discount',    value: 2842, pct: 22.1 },
  { name: 'Quality',           value: 2429, pct: 18.9 },
  { name: 'Speed/Convenience', value: 1991, pct: 15.5 },
  { name: 'Social Proof',      value: 1760, pct: 13.7 },
  { name: 'How To/Tutorial',   value: 1246, pct: 9.7  },
  { name: 'Benefits',          value: 1104, pct: 8.6  },
  { name: 'Other',             value: 1470, pct: 11.5 },
]

// ── Confidence score distribution (5 buckets) ─────────────────────────────────
export const confidenceDist = [
  { range: '0–20',   label: 'Very Low', count: 42,  color: '#EF4444' },
  { range: '21–40',  label: 'Low',      count: 118, color: '#F97316' },
  { range: '41–60',  label: 'Medium',   count: 196, color: '#F59E0B' },
  { range: '61–80',  label: 'High',     count: 312, color: '#22C55E' },
  { range: '81–100', label: 'Very High',count: 188, color: '#10B981' },
]

// ── Top winning ads ────────────────────────────────────────────────────────────
const EST_ROAS        = [3.8, 3.2, 2.9, 2.7, 2.5, 2.3, 2.1, 1.9, 1.8, 1.6]
const EST_ENGAGEMENT  = [5.2, 4.8, 4.3, 3.9, 3.7, 3.4, 3.1, 2.9, 2.7, 2.4]

export const winningAds = adsList.data
  .filter((a) => a.status === 'approved')
  .slice(0, 10)
  .map((ad, i) => ({
    ...ad,
    rank:            i + 1,
    est_roas:        EST_ROAS[i] ?? 1.5,
    est_engagement:  EST_ENGAGEMENT[i] ?? 2.0,
  }))
