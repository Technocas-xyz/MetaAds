export const user = {
  id: '1',
  name: 'Alice Martin',
  email: 'alice@decoinks.com',
  role: 'admin',
  avatar_url: null,
  created_at: '2026-01-15T00:00:00Z',
  last_active_at: '2026-05-08T09:30:00Z',
}

const make = (i) => ({
  ...user,
  id: String(i),
  name: `Team Member ${i}`,
  email: `member${i}@decoinks.com`,
  role: i === 1 ? 'admin' : 'analyst',
})

export const usersList = Array.from({ length: 5 }, (_, i) => make(i + 1))
