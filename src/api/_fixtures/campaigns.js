export const campaign = {
  id: '1',
  name: 'Q2 Discount Push',
  platform: 'Facebook',
  status: 'active',
  budget: 5000,
  spend: 2340,
  impressions: 128000,
  clicks: 4200,
  conversions: 187,
  roas: 3.4,
  brief_id: '1',
  created_at: '2026-05-01T00:00:00Z',
}

const make = (i) => ({
  ...campaign,
  id: String(i),
  name: `Campaign ${i}`,
  status: ['active', 'paused', 'draft'][i % 3],
  spend: 1000 + i * 340,
  roas: 1.5 + (i * 0.4),
})

export const campaignsList = Array.from({ length: 8 }, (_, i) => make(i + 1))
export const createResult = { ...campaign, id: '99', name: 'New Campaign' }
