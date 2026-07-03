import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCompetitors, getCompetitor, createCompetitor, getCompetitorsSummary } from '../../api/competitors'

export const competitorKeys = {
  all:     () => ['competitors'],
  list:    () => ['competitors', 'list'],
  detail:  (id) => ['competitors', 'detail', id],
  summary: () => ['competitors', 'summary'],
}

export function useCompetitors() {
  return useQuery({
    queryKey: competitorKeys.list(),
    queryFn:  listCompetitors,
  })
}

export function useCompetitor(id) {
  return useQuery({
    queryKey: competitorKeys.detail(id),
    queryFn:  () => getCompetitor(id),
    enabled:  !!id,
  })
}

export function useCompetitorsSummary() {
  return useQuery({
    queryKey: competitorKeys.summary(),
    queryFn:  getCompetitorsSummary,
  })
}

export function useCreateCompetitor(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) => createCompetitor(formData),
    onSuccess:  () => qc.invalidateQueries({ queryKey: competitorKeys.all() }),
    ...options,
  })
}
