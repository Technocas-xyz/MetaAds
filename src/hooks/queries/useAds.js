import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listAds, getAd, createAd, updateAd, getAdsSummary } from '../../api/ads'

export const adsKeys = {
  all:     ()        => ['ads'],
  list:    (filters) => ['ads', 'list', filters ?? {}],
  detail:  (id)      => ['ads', 'detail', id],
  summary: ()        => ['ads', 'summary'],
}

export function useAds(filters) {
  return useQuery({
    queryKey: adsKeys.list(filters),
    queryFn:  () => listAds(filters),
  })
}

export function useAd(id) {
  return useQuery({
    queryKey: adsKeys.detail(id),
    queryFn:  () => getAd(id),
    enabled:  !!id,
  })
}

export function useCreateAd(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) => createAd(formData),
    onSuccess:  () => qc.invalidateQueries({ queryKey: adsKeys.all() }),
    ...options,
  })
}

export function useAdsSummary() {
  return useQuery({
    queryKey: adsKeys.summary(),
    queryFn:  getAdsSummary,
  })
}

export function useUpdateAd(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => updateAd(id, body),
    onSuccess:  (_data, { id }) => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(id) })
      qc.invalidateQueries({ queryKey: adsKeys.all() })
    },
    ...options,
  })
}
