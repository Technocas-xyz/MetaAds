import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../client'

export const reviewKeys = {
  all:  () => ['review'],
  list: (filters) => ['review', 'list', filters],
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useReviewQueue(filters = {}) {
  return useQuery({
    queryKey: reviewKeys.list(filters),
    queryFn:  () =>
      client.get('/review-queue', { params: filters }).then((r) => r.data),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useApproveReview(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      client.post(`/review/${id}/approve`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all() }),
    ...options,
  })
}

export function useUpdateReview(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      client.post(`/review/${id}/update`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all() }),
    ...options,
  })
}
