const USERS = [
  { id: '1', name: 'Alex Johnson', initials: 'AJ', color: '#6366F1' },
  { id: '2', name: 'Sarah Chen',   initials: 'SC', color: '#EC4899' },
  { id: '3', name: 'Mike Torres',  initials: 'MT', color: '#F59E0B' },
  { id: '4', name: 'Lisa Park',    initials: 'LP', color: '#22C55E' },
]

const PLATFORMS   = ['Facebook', 'Instagram', 'TikTok', 'Facebook', 'Facebook']
const HOOK_TYPES  = ['Pain', 'Benefit', 'Curiosity', 'Urgency', 'How To', 'Social Proof', 'Trust']
const ANGLES      = ['Price', 'Quality', 'Speed', 'Convenience', 'Innovation', 'Trust']
const OFFERS      = ['Discount 40%', 'Free Shipping', 'Bundle Deal', 'BOGO', null, null]
const FORMATS     = ['Static Image', 'Video', 'Short Video', 'Carousel', 'Static Image']
const REGIONS     = ['US', 'UK', 'AU', 'CA', 'US']

const REASONS = {
  low_confidence: [
    'Confidence score below threshold',
    'Multiple low-confidence signals detected',
    'Insufficient data for reliable extraction',
    'Hook and angle signals conflict',
  ],
  missing_info: [
    'Hook type could not be extracted from content',
    'Angle could not be determined from available signals',
    'Offer type field is empty — content lacks offer signals',
    'Product line detection failed for this creative',
  ],
  flagged_by_rule: [
    'Rule: Confidence < 50%',
    'Rule: Missing required field (hook_type)',
    'Rule: Competitor tier 1 — manual check required',
    'Rule: Video creative without audio transcript',
  ],
}

const COMP_POOL = [
  { id: 'c1', name: 'PrintMagic Pro',  tier: 1, region: 'US' },
  { id: 'c2', name: 'DTFworld',        tier: 2, region: 'UK' },
  { id: 'c3', name: 'PrintZone',       tier: 1, region: 'US' },
  { id: 'c4', name: 'ThreadBeast',     tier: 2, region: 'AU' },
  { id: 'c5', name: 'VividPrints',     tier: 3, region: 'CA' },
  { id: 'c6', name: 'InkMaster',       tier: 2, region: 'US' },
  { id: 'c7', name: 'TransferKing',    tier: 3, region: 'UK' },
  { id: 'c8', name: 'DTFExpress',      tier: 1, region: 'AU' },
]

const AUDIENCE_TYPES = ['Small Business Owners', 'Print-on-Demand Sellers', 'Retail Brands', 'Hobbyists', 'Event Organizers']
const USP_VALUES     = [
  'No minimums, fast turnaround',
  'Wholesale pricing with bulk discounts',
  'Same-day shipping on all orders',
  'Eco-friendly inks, vibrant colors',
  'Free design support included',
]

function makeInsights(i) {
  const hookType = HOOK_TYPES[i % HOOK_TYPES.length]
  const angle    = ANGLES[i % ANGLES.length]
  const offer    = OFFERS[i % OFFERS.length]
  const format   = FORMATS[i % FORMATS.length]
  const conf     = (base) => Math.max(20, Math.min(98, base + (i * 7) % 20 - 10))
  return {
    hook:            { value: `${hookType} hook — clear opening signal`, confidence: conf(82) },
    hook_type:       { value: hookType,           confidence: conf(88) },
    angle:           { value: angle,              confidence: conf(79) },
    offer_type:      { value: offer ?? '—',       confidence: offer ? conf(74) : 32 },
    offer_value:     { value: offer ? '$40 off first order' : '—', confidence: offer ? conf(68) : 28 },
    creative_format: { value: format,             confidence: conf(91) },
    product_line:    { value: 'DTF Transfers',    confidence: conf(87) },
    audience_type:   { value: AUDIENCE_TYPES[i % AUDIENCE_TYPES.length], confidence: conf(71) },
    usp_detected:    { value: USP_VALUES[i % USP_VALUES.length],          confidence: conf(85) },
    overall:         Math.max(20, Math.min(98, 30 + (i * 13) % 55)),
  }
}

const CTАС = ['Shop Now', 'Learn More', 'Get Started', 'Order Today', 'See Pricing']

function makeRow(id, comp, platform, reason, confidence, priority, assignedIdx, addedOffset, insightIdx) {
  const reasonDetail = REASONS[reason][(insightIdx) % REASONS[reason].length]
  const assigned     = assignedIdx != null ? USERS[assignedIdx % USERS.length] : null
  const addedAt      = new Date('2026-05-08T09:00:00Z')
  addedAt.setHours(addedAt.getHours() - addedOffset)
  const lastSeen     = new Date(addedAt.getTime() + 14 * 24 * 3600 * 1000)
  const numId        = Number(id)
  return {
    id,
    ad: {
      id,
      thumbnail:      `https://placehold.co/120x120/e2e8f0/94a3b8?text=Ad+${id}`,
      media_url:      `https://placehold.co/800x600/e2e8f0/94a3b8?text=Ad+Creative+${id}`,
      platform,
      is_video:       platform === 'TikTok',
      headline:       `Custom Print Offer — ${comp.name}`,
      primary_text:   `High-quality DTF transfers from ${comp.name}. No minimums, fast turnaround — order today and get your prints delivered in 48 hours.`,
      cta:            CTАС[numId % CTАС.length],
      ad_url:         '#',
      landing_page:   '#',
      ad_library_id:  `FB-${10000000 + numId * 13}`,
      first_seen:     addedAt.toISOString(),
      last_seen:      lastSeen.toISOString(),
      duration:       '14 days',
    },
    competitor:      comp,
    ai_insights:     makeInsights(numId),
    evidence: {
      primary_text:  `"High-quality DTF transfers from ${comp.name}. No minimums, fast turnaround."`,
      headline:      `"Custom Print Offer — ${comp.name}"`,
      cta:           `"${CTАС[numId % CTАС.length]}"`,
      landing_page:  '"Custom printing with competitive pricing and fast turnaround times."',
      visual:        '"Product showcase featuring DTF transfer sheets with pricing overlay."',
    },
    ai_notes: `The AI identified a ${HOOK_TYPES[numId % HOOK_TYPES.length].toLowerCase()}-point hook based on the opening phrase in the primary text. The angle was extracted from the value proposition in the headline and landing page copy. Confidence is ${confidence < 50 ? 'below threshold due to conflicting signals between the visual and text elements' : 'within acceptable range but warrants manual verification'}.`,
    reason,
    reason_label:    reason === 'low_confidence' ? 'Low Confidence Score'
                   : reason === 'missing_info'   ? 'Missing Information'
                   :                               'Flagged by Rule',
    reason_detail:   `${reasonDetail} (${confidence}%)`,
    confidence_score: confidence,
    priority,
    assigned_to:     assigned,
    added_at:        addedAt.toISOString(),
    status:          'pending',
  }
}

// ── Single-item enrichment for ManualReviewPage ───────────────────────────────
function enrichItem(item, allItems) {
  const idx = allItems.findIndex(r => r.id === item.id)
  return {
    ...item,
    position: idx + 1,
    total:    allItems.length,
    prev_id:  idx > 0                 ? allItems[idx - 1].id : null,
    next_id:  idx < allItems.length - 1 ? allItems[idx + 1].id : null,
  }
}

export function getReviewItemById(id) {
  const item = ALL_ITEMS.find(r => r.id === String(id))
  return item ? enrichItem(item, ALL_ITEMS) : null
}

// ── Exact 4 rows from Image 12 ────────────────────────────────────────────────
const EXACT_FOUR = [
  makeRow('1',  { id: 'e1', name: 'UberPrints',      tier: 1, region: 'US' }, 'Facebook',  'low_confidence',  48, 'High',   0, 2,  1),
  makeRow('2',  { id: 'e2', name: 'Ninja Transfers',  tier: 2, region: 'UK' }, 'Instagram', 'missing_info',    62, 'Medium', 1, 5,  2),
  makeRow('3',  { id: 'e3', name: 'DTF Station',      tier: 3, region: 'AU' }, 'TikTok',    'flagged_by_rule', 41, 'High',   null, 8, 3),
  makeRow('4',  { id: 'e4', name: 'Supacolor',        tier: 1, region: 'AU' }, 'Facebook',  'missing_info',    63, 'Low',    2, 12, 4),
]

// ── Generate remaining 63 rows ────────────────────────────────────────────────
// Distribution: 37 low_confidence + 16 missing_info + 10 flagged = 63
const REASON_SEQ = [
  ...Array(37).fill('low_confidence'),
  ...Array(16).fill('missing_info'),
  ...Array(10).fill('flagged_by_rule'),
]
const PRIORITIES = ['High', 'High', 'Medium', 'Medium', 'Medium', 'Low', 'Low']

const GENERATED = Array.from({ length: 63 }, (_, i) => {
  const idx      = i + 5
  const reason   = REASON_SEQ[i]
  const comp     = COMP_POOL[i % COMP_POOL.length]
  const platform = PLATFORMS[i % PLATFORMS.length]
  const conf     = reason === 'low_confidence' ? 25 + (i * 7) % 30
                 : reason === 'missing_info'   ? 45 + (i * 5) % 25
                 :                               28 + (i * 9) % 22
  const priority = PRIORITIES[i % PRIORITIES.length]
  // 5 assigned to user id='1' (Alex Johnson) at spread intervals
  const assignedIdx = [4, 14, 24, 34, 44].includes(i) ? 0
                    : i % 4 === 0 ? (i % USERS.length)
                    : null
  return makeRow(
    String(idx),
    comp,
    platform,
    reason,
    conf,
    priority,
    assignedIdx,
    14 + i * 3,
    i + 5,
  )
})

const ALL_ITEMS = [...EXACT_FOUR, ...GENERATED]

export const reviewQueue = {
  data: ALL_ITEMS,
  meta: { total: 67, page: 1, per_page: 10, total_pages: 7 },
}

export const reviewQueueSummary = {
  total:            67,
  low_confidence:   { count: 38, pct: 56.7 },
  missing_info:     { count: 18, pct: 26.9 },
  flagged:          { count: 11, pct: 16.4 },
  assigned_to_me:   5,
}

export const approveResult  = { id: '1', status: 'approved' }
export const updateResult   = { id: '1', status: 'updated' }
