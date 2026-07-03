import { useMutation, useQueryClient } from '@tanstack/react-query'
import { analyzeAd, bulkAnalyze } from '../../api/ai'
import { adsKeys } from './useAds'

export function useAnalyzeAd(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => analyzeAd(id),
    onSuccess:  (_data, id) => qc.invalidateQueries({ queryKey: adsKeys.detail(id) }),
    ...options,
  })
}

export function useBulkAnalyze(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => bulkAnalyze(body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: adsKeys.all() }),
    ...options,
  })
}
