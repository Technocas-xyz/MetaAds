import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listBriefs, getBrief, generateBrief } from '../../api/briefs'

export const briefKeys = {
  all:    () => ['briefs'],
  list:   () => ['briefs', 'list'],
  detail: (id) => ['briefs', 'detail', id],
}

export function useBriefs() {
  return useQuery({ queryKey: briefKeys.list(), queryFn: listBriefs })
}

export function useBrief(id) {
  return useQuery({
    queryKey: briefKeys.detail(id),
    queryFn:  () => getBrief(id),
    enabled:  !!id,
  })
}

export function useGenerateBrief(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => generateBrief(body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: briefKeys.all() }),
    ...options,
  })
}
