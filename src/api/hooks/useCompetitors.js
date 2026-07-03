import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../client'

export const competitorKeys = {
  all:    () => ['competitors'],
  list:   () => ['competitors', 'list'],
  detail: (id) => ['competitors', 'detail', id],
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCompetitors() {
  return useQuery({
    queryKey: competitorKeys.list(),
    queryFn:  () => client.get('/competitors').then((r) => r.data),
  })
}

export function useCompetitor(id) {
  return useQuery({
    queryKey: competitorKeys.detail(id),
    queryFn:  () => client.get(`/competitors/${id}`).then((r) => r.data),
    enabled:  !!id,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCompetitor(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => client.post('/competitors', body).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: competitorKeys.all() }),
    ...options,
  })
}
