import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../client'

export const adsKeys = {
  all:    () => ['ads'],
  list:   (filters) => ['ads', 'list', filters],
  detail: (id) => ['ads', 'detail', id],
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useAdsList(filters = {}) {
  return useQuery({
    queryKey: adsKeys.list(filters),
    queryFn:  () =>
      client.get('/competitor-ads', { params: filters }).then((r) => r.data),
  })
}

export function useAd(id) {
  return useQuery({
    queryKey: adsKeys.detail(id),
    queryFn:  () => client.get(`/competitor-ads/${id}`).then((r) => r.data),
    enabled:  !!id,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateAd(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => client.post('/competitor-ads', body).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: adsKeys.all() }),
    ...options,
  })
}

export function useUpdateAd(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      client.put(`/competitor-ads/${id}`, body).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(id) })
      qc.invalidateQueries({ queryKey: adsKeys.all() })
    },
    ...options,
  })
}

export function useAnalyzeAd(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => client.post(`/ads/${id}/analyze`).then((r) => r.data),
    onSuccess:  (_data, id) =>
      qc.invalidateQueries({ queryKey: adsKeys.detail(id) }),
    ...options,
  })
}

export function useBulkAnalyzeAds(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => client.post('/ads/bulk-analyze', body).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: adsKeys.all() }),
    ...options,
  })
}
