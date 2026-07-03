const SEED = [
  { name: 'PrintMagic Pro',    domain: 'printmagicpro.com',    niches: ['Custom Printing', 'DTF Transfers'], tier: 'High',   status: 'Active'   },
  { name: 'DTFworld',          domain: 'dtfworld.com',          niches: ['DTF Transfers'],                   tier: 'High',   status: 'Active'   },
  { name: 'PrintZone',         domain: 'printzone.co',          niches: ['Custom Printing', 'Apparel'],      tier: 'Medium', status: 'Active'   },
  { name: 'ThreadBeast',       domain: 'threadbeast.com',       niches: ['Print on Demand', 'Fashion'],      tier: 'Medium', status: 'Active'   },
  { name: 'VividPrints',       domain: 'vividprints.com',       niches: ['Custom Printing'],                 tier: 'Low',    status: 'Paused'   },
  { name: 'EasyDTF',           domain: 'easydtf.com',           niches: ['DTF Transfers'],                   tier: 'High',   status: 'Active'   },
  { name: 'ShirtLab',          domain: 'shirtlab.co',           niches: ['Print on Demand', 'Custom Printing'], tier: 'Medium', status: 'Active' },
  { name: 'ColorWave',         domain: 'colorwave.com',         niches: ['Custom Printing', 'DTF Transfers'], tier: 'Low',   status: 'Inactive' },
  { name: 'PressProfs',        domain: 'pressproofs.com',       niches: ['Commercial Printing'],             tier: 'Medium', status: 'Active'   },
  { name: 'InkLogic',          domain: 'inklogic.io',           niches: ['DTF Transfers', 'Apparel'],        tier: 'High',   status: 'Active'   },
  { name: 'FlexPrint',         domain: 'flexprintsupply.com',   niches: ['Custom Printing'],                 tier: 'Low',    status: 'Paused'   },
  { name: 'ThreadCity',        domain: 'threadcity.com',        niches: ['Apparel', 'Fashion'],              tier: 'Medium', status: 'Active'   },
  { name: 'QuickInk',          domain: 'quickink.com',          niches: ['DTF Transfers'],                   tier: 'High',   status: 'Active'   },
  { name: 'MojoPress',         domain: 'mojopress.com',         niches: ['Print on Demand', 'Custom Printing'], tier: 'Low', status: 'Active'  },
]

const make = (i) => {
  const s = SEED[i]
  const total    = 400 + i * 280
  const existing = Math.round(total * (0.62 + (i % 5) * 0.02))
  const removed  = total - existing
  const dur      = +(10.2 + i * 0.4).toFixed(1)
  return {
    id:            String(i + 1),
    name:          s.name,
    domain:        s.domain,
    logo_url:      null,
    niches:        s.niches,
    priority_tier: s.tier,
    status:        s.status,
    stats: {
      total_ads:            total,
      total_ads_trend:      +(10 + i * 1.5).toFixed(1),
      total_ads_trend_up:   true,
      existing_ads:         existing,
      existing_ads_pct:     +(existing / total * 100).toFixed(1),
      existing_ads_trend:   +(5 + i * 0.7).toFixed(1),
      removed_ads:          removed,
      removed_ads_pct:      +(removed / total * 100).toFixed(1),
      avg_duration:         dur,
      avg_duration_prev:    +(dur - 0.8).toFixed(1),
      running_7_plus:       Math.round(existing * 0.49),
      running_7_plus_pct:   49,
      winning_ads:          Math.round(existing * 0.25),
      winning_ads_pct:      25,
      variants:             8 + i * 3,
      last_activity:        `2026-05-${String(Math.max(1, 8 - (i % 8))).padStart(2, '0')}T${String(10 + (i % 10)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00Z`,
    },
  }
}

export const competitor      = make(0)
export const competitorsList = Array.from({ length: SEED.length }, (_, i) => make(i))

export const competitorsSummary = {
  total_ads_analyzed: 12842,
  total_ads_trend:    18.6,
  existing_ads:       8756,
  existing_ads_pct:   68.2,
  removed_ads:        4086,
  removed_ads_pct:    31.8,
  running_7_plus:     6342,
  running_7_plus_pct: 49.4,
  winning_ads:        2153,
  winning_ads_pct:    24.6,
  avg_duration:       14.6,
}
