import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReviewQueueSummary,
  listReviewQueue,
  approveReview,
  updateReview,
  bulkApprove,
  bulkRerunAI,
  bulkReassign,
  submitToReview,
  getReviewItem,
} from '../../api/review'
import { adsKeys } from './useAds'

export const reviewKeys = {
  all:     ()        => ['review-queue'],
  summary: ()        => ['review-queue', 'summary'],
  list:    (filters) => ['review-queue', 'list', filters ?? {}],
  item:    (id)      => ['review-queue', 'item', id],
}

export function useReviewQueueSummary() {
  return useQuery({
    queryKey: reviewKeys.summary(),
    queryFn:  getReviewQueueSummary,
  })
}

export function useReviewQueue(filters) {
  return useQuery({
    queryKey: reviewKeys.list(filters),
    queryFn:  () => listReviewQueue(filters),
  })
}

export function useApproveReview(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => approveReview(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all() })
      qc.invalidateQueries({ queryKey: adsKeys.all() })
    },
    ...options,
  })
}

export function useUpdateReview(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => updateReview(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all() })
      qc.invalidateQueries({ queryKey: adsKeys.all() })
    },
    ...options,
  })
}

export function useBulkApprove(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids) => bulkApprove(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all() }),
    ...options,
  })
}

export function useBulkRerunAI(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids) => bulkRerunAI(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all() }),
    ...options,
  })
}

export function useBulkReassign(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, userId }) => bulkReassign(ids, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all() }),
    ...options,
  })
}

export function useSubmitToReview(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => submitToReview(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all() }),
    ...options,
  })
}

export function useReviewItem(id) {
  return useQuery({
    queryKey: reviewKeys.item(id),
    queryFn:  () => getReviewItem(id),
    enabled:  !!id,
  })
}
