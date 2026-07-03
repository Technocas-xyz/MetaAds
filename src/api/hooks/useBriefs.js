import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../client'

export const briefKeys = {
  all:    () => ['briefs'],
  list:   () => ['briefs', 'list'],
  detail: (id) => ['briefs', 'detail', id],
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useBriefs() {
  return useQuery({
    queryKey: briefKeys.list(),
    queryFn:  () => client.get('/briefs').then((r) => r.data),
  })
}

export function useBrief(id) {
  return useQuery({
    queryKey: briefKeys.detail(id),
    queryFn:  () => client.get(`/briefs/${id}`).then((r) => r.data),
    enabled:  !!id,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useGenerateBrief(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => client.post('/briefs/generate', body).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: briefKeys.all() }),
    ...options,
  })
}
