import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCompetitors, getCompetitor, createCompetitor, getCompetitorsSummary } from '../../api/competitors'

export const competitorKeys = {
  all:     () => ['competitors'],
  list:    (params) => ['competitors', 'list', params ?? {}],
  detail:  (id) => ['competitors', 'detail', id],
  summary: (params) => ['competitors', 'summary', params ?? {}],
}

export function useCompetitors(params) {
  return useQuery({
    queryKey: competitorKeys.list(params),
    queryFn:  () => listCompetitors(params),
    placeholderData: (prev) => prev,
  })
}

export function useCompetitor(id) {
  return useQuery({
    queryKey: competitorKeys.detail(id),
    queryFn:  () => getCompetitor(id),
    enabled:  !!id,
  })
}

export function useCompetitorsSummary(params) {
  return useQuery({
    queryKey: competitorKeys.summary(params),
    queryFn:  () => getCompetitorsSummary(params),
    placeholderData: (prev) => prev,  // keep numbers on screen while the threshold changes
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
