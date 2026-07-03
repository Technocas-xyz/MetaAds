import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:3000'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authHandlers = [
  http.post(`${BASE}/api/auth/login`, async ({ request }) => {
    const body = await request.json()
    if (body.email === 'test@decoinks.com' && body.password === 'password123') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: { id: '1', name: 'Test User', email: body.email, role: 'Admin' },
      })
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }),
]

// ── Ads ───────────────────────────────────────────────────────────────────────

const MOCK_AD = {
  id: 'ad-1',
  competitor: { id: 'c1', name: 'PrintMagic Pro' },
  platforms: ['Facebook'],
  headline: 'Same-Day DTF Transfers',
  primary_text: 'Fast, quality prints from $0.49',
  confidence_score: 87,
  hook_type: 'Benefit',
  angle: 'Speed',
  status: 'active',
  created_at: '2026-05-01T10:00:00Z',
}

const MOCK_ADS_LIST = {
  data: [MOCK_AD, { ...MOCK_AD, id: 'ad-2', headline: 'Premium Prints' }],
  meta: { total: 2, page: 1, per_page: 25 },
}

export const adHandlers = [
  http.get(`${BASE}/competitor-ads`, () => HttpResponse.json(MOCK_ADS_LIST)),

  http.get(`${BASE}/competitor-ads/:id`, ({ params }) =>
    HttpResponse.json({ ...MOCK_AD, id: params.id })
  ),

  http.post(`${BASE}/competitor-ads`, async ({ request }) => {
    return HttpResponse.json({ ...MOCK_AD, id: 'ad-new' }, { status: 201 })
  }),

  http.put(`${BASE}/competitor-ads/:id`, async ({ request, params }) => {
    const body = await request.json()
    return HttpResponse.json({ ...MOCK_AD, ...body, id: params.id })
  }),

  http.get(`${BASE}/competitor-ads/summary`, () =>
    HttpResponse.json({ total: 2, active: 1, reviewed: 1 })
  ),
]

// ── Review ────────────────────────────────────────────────────────────────────

const MOCK_REVIEW_ITEM = {
  id: 'rev-1',
  ad_id: 'ad-1',
  status: 'pending',
  reason: 'low_confidence',
  confidence_score: 42,
  competitor: { id: 'c1', name: 'PrintMagic Pro' },
  platform: 'Facebook',
  headline: 'Same-Day DTF Transfers',
  primary_text: 'Fast, quality prints from $0.49',
  hook_type: 'Benefit',
  angle: 'Speed',
  created_at: '2026-05-01T10:00:00Z',
}

export const reviewHandlers = [
  http.get(`${BASE}/review-queue`, () =>
    HttpResponse.json({
      data: [MOCK_REVIEW_ITEM, { ...MOCK_REVIEW_ITEM, id: 'rev-2' }],
      meta: { total: 2, pending: 2 },
    })
  ),

  http.get(`${BASE}/review-queue/:id`, ({ params }) =>
    HttpResponse.json({ ...MOCK_REVIEW_ITEM, id: params.id })
  ),

  http.post(`${BASE}/review/:id/approve`, ({ params }) =>
    HttpResponse.json({ id: params.id, status: 'approved' })
  ),

  http.post(`${BASE}/review/:id/update`, async ({ request, params }) => {
    const body = await request.json()
    return HttpResponse.json({ ...MOCK_REVIEW_ITEM, ...body, id: params.id })
  }),

  http.get(`${BASE}/review-queue/summary`, () =>
    HttpResponse.json({ total: 5, pending: 3, approved: 2 })
  ),
]

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardHandlers = [
  http.get(`${BASE}/dashboard/summary`, () =>
    HttpResponse.json({
      total_ads: 142,
      avg_confidence: 73,
      pending_review: 12,
      active_competitors: 8,
    })
  ),
]

// ── Settings ──────────────────────────────────────────────────────────────────

export const settingsHandlers = [
  http.get(`${BASE}/api/settings`, () =>
    HttpResponse.json({ model: 'claude-3-5', temperature: 0.2 })
  ),

  http.patch(`${BASE}/api/settings`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ok: true, ...body })
  }),
]

// ── Competitors ───────────────────────────────────────────────────────────────

export const competitorHandlers = [
  http.get(`${BASE}/competitors`, () =>
    HttpResponse.json({
      data: [
        { id: 'c1', name: 'PrintMagic Pro', tier: 1 },
        { id: 'c2', name: 'DTFworld',       tier: 2 },
      ],
    })
  ),
]

// ── All handlers combined ─────────────────────────────────────────────────────

export const handlers = [
  ...authHandlers,
  ...adHandlers,
  ...reviewHandlers,
  ...dashboardHandlers,
  ...settingsHandlers,
  ...competitorHandlers,
]
