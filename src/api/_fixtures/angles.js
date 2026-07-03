const COMP = [
  { id: '1', name: 'PrintMagic Pro', initials: 'PM' },
  { id: '2', name: 'DTFworld',       initials: 'DW' },
  { id: '3', name: 'PrintZone',      initials: 'PZ' },
  { id: '4', name: 'ThreadBeast',    initials: 'TB' },
  { id: '5', name: 'VividPrints',    initials: 'VP' },
]

export const ANGLE_HEX = {
  Price:                '#F59E0B',
  Quality:              '#8B5CF6',
  Speed:                '#3B82F6',
  Benefit:              '#22C55E',
  'Trust/Social Proof': '#6366F1',
  Convenience:          '#14B8A6',
  Innovation:           '#EC4899',
  Other:                '#94A3B8',
}

const DESCS = {
  Price:                'Positions the product as the most cost-effective option, leading with savings, discounts, or price comparisons to drive purchase decisions.',
  Quality:              'Emphasises superior craftsmanship, materials, or output standards, appealing to customers who prioritise excellence over cost.',
  Speed:                'Highlights fast turnaround, delivery, or results as the primary reason to choose this brand over slower alternatives.',
  Benefit:              'Leads with specific positive outcomes the customer will experience, making the value proposition immediately tangible.',
  'Trust/Social Proof': 'Builds credibility through reviews, testimonials, certifications, or customer counts to reduce perceived purchase risk.',
  Convenience:          'Removes friction by stressing ease of use, no minimums, simplified ordering, or hassle-free processes.',
  Innovation:           'Positions the brand as cutting-edge, showcasing unique technology, processes, or capabilities competitors lack.',
}

const HOOK_TYPES = ['Pain', 'Benefit', 'Curiosity', 'Urgency', 'How To', 'Social Proof', 'Trust']

const OFFER_CYCLE = ['Discount 40%', 'Free Shipping', 'Bundle Deal', null, 'Limited Time', null, 'BOGO', null]

const ANGLES_POOL = [
  ['Price', 'Quality'],
  ['Speed', 'Convenience'],
  ['Quality', 'Trust'],
  ['Price', 'Speed'],
  ['Convenience', 'Innovation'],
]

// Exact top-7 rows from the spec screenshot
const TOP_ROWS = [
  { name: 'Price',                subtitle: 'Best Value',       mentions: 452, avg_confidence: 71, trending:  14.2 },
  { name: 'Quality',              subtitle: 'Premium Grade',    mentions: 368, avg_confidence: 82, trending:  -2.1 },
  { name: 'Speed',                subtitle: 'Express Delivery', mentions: 244, avg_confidence: 79, trending:  22.8 },
  { name: 'Benefit',              subtitle: 'Outcome-Led',      mentions: 214, avg_confidence: 74, trending:   5.4 },
  { name: 'Trust/Social Proof',   subtitle: 'Credibility',      mentions: 198, avg_confidence: 76, trending:  -4.7 },
  { name: 'Convenience',          subtitle: 'No Friction',      mentions: 156, avg_confidence: 68, trending:   8.9 },
  { name: 'Innovation',           subtitle: 'Cutting-Edge',     mentions:  98, avg_confidence: 72, trending:  11.3 },
]

// Additional sub-variant rows to reach a realistic total for pagination
const EXTRA_ROWS = [
  { name: 'Price',                subtitle: 'Wholesale Rates',    mentions:  87, avg_confidence: 69, trending:   9.1 },
  { name: 'Quality',              subtitle: 'Long-Lasting',       mentions:  76, avg_confidence: 80, trending:  -1.8 },
  { name: 'Speed',                subtitle: 'Same-Day Dispatch',  mentions:  65, avg_confidence: 77, trending:  16.4 },
  { name: 'Price',                subtitle: 'Value Stacking',     mentions:  58, avg_confidence: 67, trending:   3.7 },
  { name: 'Benefit',              subtitle: 'Business Growth',    mentions:  52, avg_confidence: 73, trending:   7.2 },
  { name: 'Quality',              subtitle: 'Eco-Friendly',       mentions:  47, avg_confidence: 78, trending:  -3.4 },
  { name: 'Convenience',          subtitle: 'No Minimum Order',   mentions:  43, avg_confidence: 66, trending:  12.1 },
  { name: 'Trust/Social Proof',   subtitle: '5-Star Reviews',     mentions:  39, avg_confidence: 74, trending:  -0.9 },
  { name: 'Innovation',           subtitle: 'AI-Powered',         mentions:  34, avg_confidence: 70, trending:  18.6 },
  { name: 'Speed',                subtitle: '24-Hour Production', mentions:  31, avg_confidence: 75, trending:   4.5 },
  { name: 'Price',                subtitle: 'Bulk Savings',       mentions:  28, avg_confidence: 65, trending:   6.8 },
  { name: 'Benefit',              subtitle: 'Time Saving',        mentions:  24, avg_confidence: 71, trending:  -2.6 },
  { name: 'Quality',              subtitle: 'Vibrant Colors',     mentions:  21, avg_confidence: 76, trending:   1.4 },
]

function buildRow(base, i) {
  const cStart       = i % COMP.length
  const compAll      = [...COMP.slice(cStart), ...COMP.slice(0, cStart)]
  const compN        = 1 + (i % 3)
  const extra        = i % 2
  const competitors  = compAll.slice(0, compN)
  const tc           = ANGLE_HEX[base.name] ?? '#94A3B8'
  const bgHex        = tc.replace('#', '')
  const exampleAds   = Array.from({ length: 4 }, (_, j) =>
    `https://placehold.co/80x80/${bgHex}/ffffff?text=${encodeURIComponent(base.name[0])}${j + 1}`
  )
  return {
    id:               String(i + 1),
    rank:             i + 1,
    name:             base.name,
    subtitle:         base.subtitle,
    description:      DESCS[base.name] ?? `Positioning based on ${base.name.toLowerCase()} differentiation.`,
    mentions:         base.mentions,
    avg_confidence:   base.avg_confidence,
    trending:         base.trending,
    competitors,
    extra_competitors: extra,
    example_ads:      exampleAds,
    first_seen:       new Date(2026, 1, 1 + i * 11).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    related_hooks:    HOOK_TYPES.slice(i % HOOK_TYPES.length, (i % HOOK_TYPES.length) + 2),
    offer_type:       OFFER_CYCLE[i % OFFER_CYCLE.length],
  }
}

export const anglesTable = [
  ...TOP_ROWS.map((r, i)  => buildRow(r, i)),
  ...EXTRA_ROWS.map((r, i) => buildRow(r, TOP_ROWS.length + i)),
]

export const anglesSummary = {
  total_unique:          124,
  total_mentions:        1842,
  mentions_trend:        8.3,
  top_angle:             'Price',
  top_angle_pct:         24.5,
  top_performing_angle:  { name: 'Quality',  avg_score: 82 },
  trending_angle:        { name: 'Speed',     pct: 22.8 },
}

export const anglesTypeDist = [
  { name: 'Price',                value: 452, pct: 24.5 },
  { name: 'Quality',              value: 368, pct: 20.0 },
  { name: 'Speed',                value: 244, pct: 13.2 },
  { name: 'Benefit',              value: 214, pct: 11.6 },
  { name: 'Trust/Social Proof',   value: 198, pct: 10.7 },
  { name: 'Convenience',          value: 156, pct:  8.5 },
  { name: 'Other',                value: 210, pct: 11.4 },
]

export const anglesPerformance = [
  { name: 'Quality',            avg_score: 82, color: '#8B5CF6' },
  { name: 'Speed',              avg_score: 79, color: '#3B82F6' },
  { name: 'Trust',              avg_score: 76, color: '#6366F1' },
  { name: 'Benefit',            avg_score: 74, color: '#22C55E' },
  { name: 'Price',              avg_score: 71, color: '#F59E0B' },
  { name: 'Convenience',        avg_score: 68, color: '#14B8A6' },
]

const TREND_DATES = ['May 2', 'May 3', 'May 4', 'May 5', 'May 6', 'May 7', 'May 8']
export const anglesTrend = TREND_DATES.map((date, i) => ({
  date,
  Price:   Math.round(62 + Math.sin(i * 0.7)       * 7 + i * 0.4),
  Quality: Math.round(51 + Math.sin(i * 0.5 + 1)   * 6 + i * 0.3),
  Speed:   Math.round(34 + Math.sin(i * 1.1 + 2)   * 5 + i * 0.5),
  Benefit: Math.round(29 + Math.sin(i * 0.8 + 0.5) * 4 + i * 0.2),
}))

// legacy alias
export const anglesList = anglesTable
