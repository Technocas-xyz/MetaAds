import { useQuery } from '@tanstack/react-query'
import { getCompetitorInsights, getAllCompetitorInsights, getOverallInsights, getCompetitorAnalyzedAds } from '../../api/insights'

export const insightKeys = {
  all: () => ['insights'],
  competitor: (id) => ['insights', 'competitor', id],
  allCompetitors: () => ['insights', 'competitors'],
  overall: () => ['insights', 'overall'],
  competitorAds: (id, params) => ['insights', 'competitor-ads', id, params ?? {}],
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

export function useCompetitorAnalyzedAds(id, params) {
  return useQuery({
    queryKey: insightKeys.competitorAds(id, params),
    queryFn: () => getCompetitorAnalyzedAds(id, params),
    enabled: !!id,
  })
}
