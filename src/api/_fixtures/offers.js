const COMP = [
  { id: '1', name: 'PrintMagic Pro', initials: 'PM' },
  { id: '2', name: 'DTFworld',       initials: 'DW' },
  { id: '3', name: 'PrintZone',      initials: 'PZ' },
  { id: '4', name: 'ThreadBeast',    initials: 'TB' },
  { id: '5', name: 'VividPrints',    initials: 'VP' },
]

export const OFFER_HEX = {
  Discount:       '#EF4444',
  Bundle:         '#8B5CF6',
  'Free Shipping':'#3B82F6',
  BOGO:           '#F97316',
  'Limited Time': '#F59E0B',
  Guarantee:      '#22C55E',
  Other:          '#94A3B8',
}

const TEXTS = {
  Discount: [
    '40% Off Custom Prints — Today Only',
    'Save $20 on Orders Over $100',
    '25% Off Your First Order',
    'Bulk Discount: Up to 60% Off',
    'Flash Sale: $0.39/sheet for 24 Hours',
  ],
  Bundle: [
    'Buy Any 3, Get 1 Free',
    'Gang Sheet Bundle — Save 30%',
    'Starter Pack: 50 Sheets + Free Setup',
    'Pro Bundle: Design + Print Combo',
  ],
  'Free Shipping': [
    'Free Shipping on All Orders Over $50',
    'Free Express Delivery This Week',
    'Free Shipping — No Minimum Required',
  ],
  BOGO: [
    'Buy One Gang Sheet, Get One 50% Off',
    'BOGO: 2-for-1 on All Custom Transfers',
    'Double Your Order — Pay for One',
  ],
  'Limited Time': [
    '48-Hour Flash Sale — Ends Tonight',
    'Weekend Only: Prices Slashed',
    'Last Chance: Sale Ends Sunday',
  ],
  Guarantee: [
    '100% Satisfaction or Full Money Back',
    'Reprint Guarantee — No Questions Asked',
  ],
}

const DESCS = {
  Discount:       'A direct price reduction designed to lower the perceived barrier to purchase and incentivise immediate action.',
  Bundle:         'Groups multiple products or quantities together at a reduced combined price, increasing average order value.',
  'Free Shipping':'Removes the additional cost of delivery, one of the top reasons customers abandon carts at checkout.',
  BOGO:           'Buy-one-get-one mechanics reward repeat purchase intent while creating a strong perception of value.',
  'Limited Time': 'Scarcity and urgency mechanics that push prospects over the decision threshold before an offer window closes.',
  Guarantee:      'Risk-reversal promise that reduces purchase anxiety and builds trust by standing behind product quality.',
}

const HOOK_POOL = ['Pain', 'Urgency', 'Benefit', 'Curiosity', 'Social Proof', 'Trust', 'How To']
const COMP_CYCLE = [0, 2, 1, 3, 0, 4, 1, 2, 3, 4, 0, 1, 2, 3, 0, 4, 1, 2, 3, 0, 1, 4]

// 22 rows — top 6 types then sub-variants
const SEQUENCE = [
  ['Discount', 0],       ['Bundle', 0],         ['Free Shipping', 0],  ['BOGO', 0],
  ['Limited Time', 0],   ['Guarantee', 0],       ['Discount', 1],       ['Bundle', 1],
  ['Free Shipping', 1],  ['BOGO', 1],            ['Discount', 2],       ['Limited Time', 1],
  ['Bundle', 2],         ['Discount', 3],        ['BOGO', 2],           ['Free Shipping', 2],
  ['Guarantee', 1],      ['Discount', 4],        ['Bundle', 3],         ['Limited Time', 2],
  ['Discount', 0],       ['BOGO', 0],
]

const MENTIONS_LIST   = [412, 287, 245, 178, 156, 84, 97, 76, 68, 61, 54, 48, 43, 39, 35, 32, 29, 26, 22, 18, 15, 12]
const CONFIDENCE_LIST = [74, 82, 77, 79, 71, 88, 69, 85, 73, 76, 67, 70, 80, 65, 74, 72, 91, 63, 78, 68, 66, 75]
const TRENDING_LIST   = [8.4, -2.1, 5.7, 28.6, 12.3, -1.4, 3.9, -5.2, 17.1, 6.8, -3.7, 9.2, -1.8, 4.4, 22.5, -8.1, 2.6, 11.3, -4.9, 7.7, 1.2, -6.3]

function buildRow(type, ti, i) {
  const text    = TEXTS[type][ti % TEXTS[type].length]
  const hex     = OFFER_HEX[type] ?? '#94A3B8'
  const cStart  = COMP_CYCLE[i] ?? (i % COMP.length)
  const compAll = [...COMP.slice(cStart), ...COMP.slice(0, cStart)]
  const compN   = 1 + (i % 3)
  const extra   = i % 2
  return {
    id:               String(i + 1),
    rank:             i + 1,
    text,
    description:      DESCS[type],
    type,
    mentions:         MENTIONS_LIST[i],
    avg_confidence:   CONFIDENCE_LIST[i],
    trending:         TRENDING_LIST[i],
    competitors:      compAll.slice(0, compN),
    extra_competitors: extra,
    example_ads:      Array.from({ length: 4 }, (_, j) =>
      `https://placehold.co/80x80/${hex.replace('#', '')}/ffffff?text=${type[0]}${j + 1}`
    ),
    first_seen:       new Date(2026, 1, 1 + i * 9).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    related_hooks:    [HOOK_POOL[i % HOOK_POOL.length], HOOK_POOL[(i + 2) % HOOK_POOL.length]],
  }
}

export const offersTable = SEQUENCE.map(([type, ti], i) => buildRow(type, ti, i))

export const offersSummary = {
  total_unique:           89,
  total_mentions:         1624,
  mentions_trend:         9.7,
  top_offer_type:         'Discount',
  top_offer_type_pct:     38.4,
  discount_heavy_share:   38.4,
  trending_offer:         { text: 'BOGO: 2-for-1 on All Custom Transfers', type: 'BOGO', pct: 28.6 },
}

export const offersTypeDist = [
  { name: 'Discount',       value: 624, pct: 38.4 },
  { name: 'Bundle',         value: 287, pct: 17.7 },
  { name: 'Free Shipping',  value: 245, pct: 15.1 },
  { name: 'BOGO',           value: 178, pct: 11.0 },
  { name: 'Limited Time',   value: 156, pct:  9.6 },
  { name: 'Guarantee',      value:  84, pct:  5.2 },
  { name: 'Other',          value:  50, pct:  3.1 },
]

export const offersPerformance = [
  { type: 'Guarantee',     avg_score: 84, color: '#22C55E' },
  { type: 'Bundle',        avg_score: 79, color: '#8B5CF6' },
  { type: 'BOGO',          avg_score: 76, color: '#F97316' },
  { type: 'Limited Time',  avg_score: 73, color: '#F59E0B' },
  { type: 'Free Shipping', avg_score: 70, color: '#3B82F6' },
  { type: 'Discount',      avg_score: 67, color: '#EF4444' },
]

const TREND_DATES = ['May 2', 'May 3', 'May 4', 'May 5', 'May 6', 'May 7', 'May 8']
export const offersTrend = TREND_DATES.map((date, i) => ({
  date,
  Discount:       Math.round(56 + Math.sin(i * 0.7)       * 8 + i * 0.5),
  Bundle:         Math.round(38 + Math.sin(i * 0.5 + 1)   * 6 + i * 0.4),
  'Free Shipping':Math.round(32 + Math.sin(i * 1.1 + 2)   * 5 + i * 0.3),
  BOGO:           Math.round(22 + Math.sin(i * 0.9 + 0.5) * 4 + i * 0.6),
}))

// legacy alias
export const offersList = offersTable
