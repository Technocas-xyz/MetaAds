const COMP = [
  { id: '1', name: 'PrintMagic Pro', tier: 1, region: 'US', logo_url: null },
  { id: '2', name: 'DTFworld',       tier: 2, region: 'UK', logo_url: null },
  { id: '3', name: 'PrintZone',      tier: 1, region: 'US', logo_url: null },
  { id: '4', name: 'ThreadBeast',    tier: 2, region: 'AU', logo_url: null },
  { id: '5', name: 'VividPrints',    tier: 3, region: 'CA', logo_url: null },
]
const PLATFORMS  = ['Facebook', 'Instagram', 'TikTok', 'Facebook', 'Facebook']
const HOOK_TYPES = ['Pain', 'Benefit', 'Curiosity', 'Urgency', 'Trust', 'Price', 'How To', 'Social Proof']
const ANGLES     = ['Price', 'Quality', 'Speed', 'Convenience', 'Innovation', 'Trust']
const ANGLE_SUBS = { Price: 'Best Value', Quality: 'Premium Grade', Speed: 'Fast Delivery', Convenience: 'No Minimum', Innovation: 'AI-Powered', Trust: 'Guaranteed' }
const OFFERS     = ['Discount 40%', 'Free Shipping', 'Bundle Deal', 'BOGO', 'Limited Time', null, null, null]
const HEADLINES  = [
  '40% Off Custom Prints — Today Only',
  'Premium DTF Transfers — Ships in 24h',
  'Print Anything, Ship Everywhere',
  'Your Design, Our Quality Promise',
  'Beat Every Deadline with Express Printing',
  'Save Big on Bulk Orders This Month',
  'Premium Prints at Wholesale Prices',
  'The #1 DTF Transfer Supplier Online',
  'Fast, Affordable, Perfect Every Time',
  'Transform Your Brand with Pro Prints',
  'Unlimited Colors, Zero Minimums',
  'Bulk DTF Transfers from $0.49/sheet',
  'Custom Gang Sheets — 48h Turnaround',
  'White Ink DTF Transfers for Dark Fabrics',
  'Eco-Friendly Inks, Vibrant Results',
]
const COPIES = [
  'Tired of paying premium prices for custom printing? Our DTF transfers start at $0.49 per sheet with no minimum order. Free shipping on orders over $50.',
  'Looking for quality custom prints that last? We use UV-resistant inks to keep your designs vibrant wash after wash. Order today and see the difference.',
  'Need custom printing for your business? We offer the most competitive rates with no hidden fees. Get started with as little as 1 unit.',
  'Introducing our express service — order before 2pm and receive your prints the next business day. Perfect for last-minute orders and urgent deadlines.',
  'Our eco-friendly process uses water-based inks safe for all fabrics. GOTS certified materials available on request for all orders.',
]
const CTAS = ['Shop Now', 'Learn More', 'Get Started', 'Order Today', 'Claim Deal']

const make = (i) => {
  const comp     = COMP[i % COMP.length]
  const platform = PLATFORMS[i % PLATFORMS.length]
  const hookType = HOOK_TYPES[i % HOOK_TYPES.length]
  const angle    = ANGLES[i % ANGLES.length]
  const offer    = OFFERS[i % OFFERS.length]
  const score    = 25 + (i * 13) % 72
  const days     = 3 + (i * 7) % 90

  const capturedAt   = new Date('2026-05-08'); capturedAt.setDate(capturedAt.getDate() - (i * 2) % 60)
  const runningSince = new Date('2026-05-08'); runningSince.setDate(runningSince.getDate() - days)

  const headline     = HEADLINES[i % HEADLINES.length]
  const primaryText  = COPIES[i % COPIES.length]
  const cta          = CTAS[i % CTAS.length]
  const domainBase   = comp.name.toLowerCase().replace(/\s/g, '')
  const landingUrl   = `https://${domainBase}.com/promo`
  const adUrl        = `https://${domainBase}.com/ads/${i + 1}`
  const lastSeen     = new Date('2026-05-08'); lastSeen.setDate(lastSeen.getDate() - (i % 5))

  const fieldConf = (base) => Math.max(20, Math.min(98, base + (i * 7) % 20 - 10))

  return {
    id:                 String(i + 1),
    platform,
    hook_type:          hookType,
    hook_text:          `${hookType} hook — ad #${i + 1}`,
    angle,
    angle_detail:       ANGLE_SUBS[angle],
    offer_type:         offer,
    confidence_score:   score,
    status:             ['pending', 'approved', 'approved', 'approved', 'flagged'][i % 5],
    competitor:         { ...comp },
    headline,
    primary_text:       primaryText,
    cta,
    ad_url:             adUrl,
    landing_url:        landingUrl,
    is_video:           platform === 'TikTok' || i % 4 === 0,
    media_url:          `https://placehold.co/640x800/e2e8f0/94a3b8?text=Ad+${i + 1}`,
    variants:           1 + (i * 3) % 8,
    running_since_days: days,
    running_since_date: runningSince.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    captured_at:        capturedAt.toISOString(),
    last_seen:          lastSeen.toISOString(),
    notes:              i % 4 === 0 ? 'High-performing creative — worth monitoring closely.' : null,
    ai_insights: {
      hook:            { value: primaryText.split('?')[0].trim().slice(0, 55) + (primaryText.includes('?') ? '?' : ''), confidence: fieldConf(88) },
      hook_type:       { value: hookType,                                   confidence: fieldConf(92) },
      angle:           { value: angle,                                       confidence: fieldConf(85) },
      offer_type:      { value: offer ?? '—',                               confidence: offer ? fieldConf(78) : 38 },
      offer_value:     { value: offer ? (offer.includes('%') ? offer.split(' ')[0] : 'Varies') : '—', confidence: offer ? fieldConf(72) : 35 },
      creative_format: { value: platform === 'TikTok' ? 'Short Video' : (i % 4 === 0 ? 'Video' : 'Static Image'), confidence: fieldConf(95) },
      product_line:    { value: 'DTF Transfers',                            confidence: fieldConf(90) },
      audience_type:   { value: ['Small Business Owners', 'Print-on-Demand Sellers', 'Apparel Brands', 'E-commerce Merchants'][i % 4], confidence: fieldConf(65) },
      usp_detected:    { value: ['No Minimum Order', 'Fast Turnaround', 'Eco-Friendly Inks', 'Lowest Price Guarantee'][i % 4], confidence: fieldConf(80) },
      overall:         score,
    },
    evidence: {
      primary_text: `"${primaryText.slice(0, 65)}…" — ${hookType.toLowerCase()} hook detected from opening line`,
      headline:     `"${headline}" — ${angle.toLowerCase()} angle signal from price/offer mention`,
      cta:          `"${cta}" — ${hookType === 'Urgency' ? 'urgency trigger' : 'direct-response action driver'}`,
      landing_page: `${landingUrl} — /promo path indicates discount landing page structure`,
      visual:       platform === 'TikTok'
        ? 'Motion graphics with price overlay and brand watermark detected'
        : 'Bold price callout with product image dominant in upper-third of creative',
    },
    ai_notes: `This ad uses a ${hookType.toLowerCase()} hook to engage ${comp.name}'s target audience, leading with a ${angle.toLowerCase()}-focused value proposition. ${offer ? `The ${offer} offer creates a strong incentive for conversion. ` : ''}The creative format (${platform === 'TikTok' ? 'short video' : 'static image'}) aligns with typical high-performing ${platform} ad patterns. Confidence is ${score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low'} — ${score >= 70 ? 'all signals clearly present in the raw content.' : score >= 40 ? 'some signals inferred; manual review recommended.' : 'insufficient signals — manual review required.'}`,
    analysis: i % 3 === 0 ? {
      summary:          'Strong hook with a clear price-based offer.',
      suggested_angle:  'Price',
      suggested_hook:   'Urgency',
    } : null,
  }
}

export const ad       = make(0)
export const adsList  = {
  data: Array.from({ length: 25 }, (_, i) => make(i)),
  meta: { total: 25, page: 1, per_page: 10, total_pages: 3 },
}

export const adsSummary = {
  total:           1248,
  analyzed:        856,
  analyzed_pct:    68.6,
  pending:         292,
  pending_pct:     23.4,
  low_confidence:  67,
  low_conf_pct:    5.4,
  this_week:       124,
}

export const analysisResult    = { id: '1', status: 'analyzed', analysis: ad.analysis }
export const bulkAnalysisResult = { queued: 5 }
