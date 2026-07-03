const COMP = [
  { id: '1', name: 'PrintMagic Pro', initials: 'PM' },
  { id: '2', name: 'DTFworld',       initials: 'DW' },
  { id: '3', name: 'PrintZone',      initials: 'PZ' },
  { id: '4', name: 'ThreadBeast',    initials: 'TB' },
  { id: '5', name: 'VividPrints',    initials: 'VP' },
]

const TYPE_COLORS = {
  Pain:           { hex: '#EF4444', bg: 'fee2e2', fg: 'b91c1c' },
  Benefit:        { hex: '#22C55E', bg: 'dcfce7', fg: '15803d' },
  Curiosity:      { hex: '#8B5CF6', bg: 'ede9fe', fg: '6d28d9' },
  Urgency:        { hex: '#F97316', bg: 'ffedd5', fg: 'c2410c' },
  'How To':       { hex: '#14B8A6', bg: 'ccfbf1', fg: '0f766e' },
  'Social Proof': { hex: '#6366F1', bg: 'e0e7ff', fg: '3730a3' },
  Trust:          { hex: '#3B82F6', bg: 'dbeafe', fg: '1e40af' },
}

const TEXTS = {
  Pain: [
    'Tired of slow print turnaround times?',
    'Fed up with high minimum order requirements?',
    'Struggling with inconsistent print quality?',
    'Wasting money on failed custom prints?',
    'Still waiting 2 weeks for your custom prints?',
  ],
  Benefit: [
    'Get vibrant colors that last 100+ washes',
    'Zero minimums — order just one piece',
    'Same-day shipping when you order before 2PM',
    'Professional-grade DTF for every budget',
  ],
  Curiosity: [
    'What if you could print any design in under 24 hours?',
    "Here's why 10,000+ brands switched to DTF transfers",
    'The secret behind viral custom merch drops',
  ],
  Urgency: [
    'Sale ends midnight — 40% off all transfers',
    'Only 48 hours left on our bulk pricing',
    'Flash sale: $0.39/sheet for next 2 hours',
  ],
  'How To': [
    'How to create gang sheets that maximize yield',
    'How to get bulk pricing without bulk minimums',
  ],
  'Social Proof': [
    'Trusted by 50,000+ brands worldwide',
    '★★★★★ — 4.9/5 from 12,000 reviews',
  ],
  Trust: [
    '100% money-back guarantee on every order',
  ],
}

const DESCS = {
  Pain:           'Addresses a specific frustration the target audience faces, creating emotional resonance before presenting a solution.',
  Benefit:        'Leads with a compelling outcome or advantage, immediately communicating value to potential customers.',
  Curiosity:      'Opens with a question or surprising statement that compels the audience to keep watching or reading to get the answer.',
  Urgency:        'Creates a sense of time pressure or scarcity to drive immediate action and reduce purchase hesitation.',
  'How To':       'Promises practical, actionable knowledge that solves a problem, positioning the brand as a helpful expert.',
  'Social Proof': 'Leverages numbers, reviews, or endorsements to build trust through the wisdom or behavior of others.',
  Trust:          'Emphasizes guarantees, certifications, or reliability signals to reduce risk perception and build confidence.',
}

const OFFER_CYCLE   = ['Discount 40%', 'Free Shipping', 'Bundle Deal', null, 'Limited Time', null, 'BOGO', null]
const ANGLES_POOL   = [
  ['Price', 'Quality'],
  ['Speed', 'Convenience'],
  ['Quality', 'Trust'],
  ['Price', 'Speed'],
  ['Convenience', 'Innovation'],
]

// 20 hooks: [type, textIndex]
const SEQUENCE = [
  ['Pain', 0], ['Benefit', 0], ['Pain', 1], ['Curiosity', 0], ['Urgency', 0],
  ['Benefit', 1], ['Pain', 2], ['How To', 0], ['Pain', 3], ['Social Proof', 0],
  ['Curiosity', 1], ['Urgency', 1], ['Benefit', 2], ['Pain', 4], ['How To', 1],
  ['Social Proof', 1], ['Curiosity', 2], ['Urgency', 2], ['Benefit', 3], ['Trust', 0],
]

const MENTIONS_LIST   = [342, 298, 267, 243, 219, 198, 182, 167, 154, 143, 132, 121, 109, 98, 87, 76, 65, 54, 43, 32]
const CONFIDENCE_LIST = [87, 82, 79, 91, 85, 74, 78, 71, 83, 88, 65, 76, 69, 92, 73, 81, 67, 77, 70, 84]
const TRENDING_LIST   = [12.4, -3.2, 34.2, 8.7, -12.1, 5.3, 19.8, -7.4, 2.1, 15.6, -1.8, 6.9, -4.5, 22.3, -9.1, 3.8, 11.2, -2.7, 7.6, -5.9]

export const hooksTable = SEQUENCE.map(([type, ti], i) => {
  const text     = TEXTS[type][ti] ?? TEXTS[type][0]
  const tc       = TYPE_COLORS[type]
  const cStart   = i % COMP.length
  const compAll  = [...COMP.slice(cStart), ...COMP.slice(0, cStart)]
  const compN    = 1 + (i % 3)
  const extra    = i % 2
  const competitors  = compAll.slice(0, compN)
  const exampleAds   = Array.from({ length: 3 }, (_, j) =>
    `https://placehold.co/80x80/${tc.bg}/${tc.fg}?text=${encodeURIComponent(type[0])}${j + 1}`
  )
  return {
    id:               String(i + 1),
    rank:             i + 1,
    text,
    description:      DESCS[type],
    type,
    offer_type:       OFFER_CYCLE[i % OFFER_CYCLE.length],
    mentions:         MENTIONS_LIST[i],
    avg_confidence:   CONFIDENCE_LIST[i],
    trending:         TRENDING_LIST[i],
    competitors,
    extra_competitors: extra,
    example_ads:      exampleAds,
    first_seen:       new Date(2026, 1, 1 + i * 8).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    related_angles:   ANGLES_POOL[i % ANGLES_POOL.length],
  }
})

export const hooksSummary = {
  total_unique:         147,
  total_mentions:       2843,
  mentions_trend:       12.4,
  top_hook_type:        'Pain',
  top_hook_type_pct:    28,
  top_performing_hook:  { text: 'Fed up with high minimum order requirements?', avg_score: 91 },
  trending_hook:        { text: 'What if you could print any design in under 24 hours?', pct: 34.2 },
}

export const hooksTypeDist = [
  { name: 'Pain',         value: 812, pct: 28.5 },
  { name: 'Benefit',      value: 625, pct: 22.0 },
  { name: 'Curiosity',    value: 483, pct: 17.0 },
  { name: 'Urgency',      value: 370, pct: 13.0 },
  { name: 'How To',       value: 256, pct:  9.0 },
  { name: 'Social Proof', value: 199, pct:  7.0 },
  { name: 'Trust',        value:  98, pct:  3.5 },
]

export const hooksPerformance = [
  { type: 'Urgency',      avg_score: 85, color: '#F97316' },
  { type: 'Pain',         avg_score: 82, color: '#EF4444' },
  { type: 'Social Proof', avg_score: 78, color: '#6366F1' },
  { type: 'Benefit',      avg_score: 75, color: '#22C55E' },
  { type: 'Trust',        avg_score: 74, color: '#3B82F6' },
  { type: 'How To',       avg_score: 71, color: '#14B8A6' },
  { type: 'Curiosity',    avg_score: 68, color: '#8B5CF6' },
]

const TREND_DATES = ['May 2', 'May 3', 'May 4', 'May 5', 'May 6', 'May 7', 'May 8']
export const hooksTrend = TREND_DATES.map((date, i) => ({
  date,
  Pain:      Math.round(42 + Math.sin(i * 0.8)       * 6 + i * 0.5),
  Benefit:   Math.round(34 + Math.sin(i * 0.6 + 1)   * 5 + i * 0.3),
  Curiosity: Math.round(27 + Math.sin(i * 1.0 + 2)   * 4 + i * 0.4),
  Urgency:   Math.round(19 + Math.sin(i * 0.9 + 0.5) * 3 + i * 0.2),
}))

// legacy alias used by useLibraries
export const hooksList = hooksTable
