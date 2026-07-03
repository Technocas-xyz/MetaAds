import { useQuery } from '@tanstack/react-query'
import { getCompetitorInsights, getAllCompetitorInsights, getOverallInsights } from '../../api/insights'

export const insightKeys = {
  all: () => ['insights'],
  competitor: (id) => ['insights', 'competitor', id],
  allCompetitors: () => ['insights', 'competitors'],
  overall: () => ['insights', 'overall'],
}

export function useCompetitorInsights(id) {
  return useQuery({
    queryKey: insightKeys.competitor(id),
    queryFn: () => getCompetitorInsights(id),
    enabled: !!id,
  })
}

export function useAllCompetitorInsights() {
  return useQuery({
    queryKey: insightKeys.allCompetitors(),
    queryFn: getAllCompetitorInsights,
  })
}

export function useOverallInsights() {
  return useQuery({
    queryKey: insightKeys.overall(),
    queryFn: getOverallInsights,
  })
}
