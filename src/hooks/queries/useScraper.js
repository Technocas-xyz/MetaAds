import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listScraperCompetitors,
  getScraperCompetitor,
  getCompetitorAds,
  triggerScrape,
  triggerScrapeAll,
  triggerAnalyzeAll,
  analyzeAd,
  listRecentRuns,
} from '../../api/scraper'

export const scraperKeys = {
  all: () => ['scraper'],
  competitors: () => ['scraper', 'competitors'],
  competitor: (id) => ['scraper', 'competitors', id],
  competitorAds: (id, params) => ['scraper', 'competitors', id, 'ads', params],
  runs: () => ['scraper', 'runs'],
}

export function useScraperCompetitors() {
  return useQuery({
    queryKey: scraperKeys.competitors(),
    queryFn: listScraperCompetitors,
  })
}

export function useScraperCompetitor(id) {
  return useQuery({
    queryKey: scraperKeys.competitor(id),
    queryFn: () => getScraperCompetitor(id),
    enabled: !!id,
    retry: 2,
  })
}

export function useCompetitorAds(id, params = {}) {
  return useQuery({
    queryKey: scraperKeys.competitorAds(id, params),
    queryFn: () => getCompetitorAds(id, params),
    enabled: !!id,
  })
}

export function useTriggerScrape() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (competitorId) => triggerScrape(competitorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scraperKeys.all() })
    },
  })
}

export function useAnalyzeAd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (adId) => analyzeAd(adId),
    onSuccess: (_, adId) => {
      qc.invalidateQueries({ queryKey: scraperKeys.all() })
    },
  })
}

export function useRecentRuns() {
  return useQuery({
    queryKey: scraperKeys.runs(),
    queryFn: listRecentRuns,
  })
}

export function useTriggerScrapeAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => triggerScrapeAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scraperKeys.all() })
    },
  })
}

export function useTriggerAnalyzeAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => triggerAnalyzeAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scraperKeys.all() })
    },
  })
}
