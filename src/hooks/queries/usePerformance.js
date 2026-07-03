import { useQuery } from '@tanstack/react-query'
import { listCreativePerformance } from '../../api/performance'

export const perfKeys = {
  all:       ()        => ['performance'],
  creatives: (filters) => ['performance', 'creatives', filters ?? {}],
}

export function useCreativePerformance(filters) {
  return useQuery({
    queryKey: perfKeys.creatives(filters),
    queryFn:  () => listCreativePerformance(filters),
  })
}
