export const brief = {
  id: '1',
  title: 'Q2 Pain-Point Campaign Brief',
  hook_type: 'Pain',
  angle: 'Price',
  offer_type: 'Discount',
  platform: 'Facebook',
  target_audience: 'E-commerce store owners 25-45',
  key_messages: ['40% cost reduction', 'No contract', 'Setup in 5 mins'],
  suggested_copy: 'Tired of paying too much? Switch today and save 40%.',
  status: 'active',
  created_at: '2026-05-03T08:00:00Z',
}

const make = (i) => ({
  ...brief,
  id: String(i),
  title: `Campaign Brief #${i}`,
  status: i % 3 === 0 ? 'draft' : 'active',
  created_at: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
})

export const briefsList = Array.from({ length: 6 }, (_, i) => make(i + 1))
export const generateResult = { ...brief, id: '99', title: 'AI-Generated Brief' }
