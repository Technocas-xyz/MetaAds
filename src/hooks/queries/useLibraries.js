import { useQuery } from '@tanstack/react-query'
import { listHooks, getHooksSummary, getHooksTypeDist, getHooksPerf, getHooksTrend, getHooksList } from '../../api/hooks'
import { listAngles, getAnglesSummary, getAnglesTypeDist, getAnglesPerf, getAnglesTrend, getAnglesList } from '../../api/angles'
import { listOffers, getOffersSummary, getOffersTypeDist, getOffersPerf, getOffersTrend, getOffersList } from '../../api/offers'

export const libraryKeys = {
  hooks:  () => ['library', 'hooks'],
  angles: () => ['library', 'angles'],
  offers: () => ['library', 'offers'],
}

export function useHookLibrary(params) {
  return useQuery({
    queryKey: libraryKeys.hooks(),
    queryFn:  () => listHooks(params),
  })
}

export function useAngleLibrary(params) {
  return useQuery({
    queryKey: libraryKeys.angles(),
    queryFn:  () => listAngles(params),
  })
}

export function useOfferLibrary(params) {
  return useQuery({
    queryKey: libraryKeys.offers(),
    queryFn:  () => listOffers(params),
  })
}

// ── Hook Library detail queries ───────────────────────────────────────────────
export const hooksQueryKeys = {
  summary:  ()  => ['hooks', 'summary'],
  typeDist: ()  => ['hooks', 'type-dist'],
  perf:     ()  => ['hooks', 'perf'],
  trend:    (p) => ['hooks', 'trend', p ?? {}],
  list:     (p) => ['hooks', 'list',  p ?? {}],
}

export const useHooksSummary  = ()       => useQuery({ queryKey: hooksQueryKeys.summary(),      queryFn: getHooksSummary })
export const useHooksTypeDist = ()       => useQuery({ queryKey: hooksQueryKeys.typeDist(),     queryFn: getHooksTypeDist })
export const useHooksPerf     = ()       => useQuery({ queryKey: hooksQueryKeys.perf(),         queryFn: getHooksPerf })
export const useHooksTrend    = (params) => useQuery({ queryKey: hooksQueryKeys.trend(params),  queryFn: () => getHooksTrend(params) })
export const useHooksTable    = (params) => useQuery({ queryKey: hooksQueryKeys.list(params),   queryFn: () => getHooksList(params) })

// ── Angle Library detail queries ──────────────────────────────────────────────
export const anglesQueryKeys = {
  summary:  ()  => ['angles', 'summary'],
  typeDist: ()  => ['angles', 'type-dist'],
  perf:     ()  => ['angles', 'perf'],
  trend:    (p) => ['angles', 'trend', p ?? {}],
  list:     (p) => ['angles', 'list',  p ?? {}],
}

export const useAnglesSummary  = ()       => useQuery({ queryKey: anglesQueryKeys.summary(),      queryFn: getAnglesSummary })
export const useAnglesTypeDist = ()       => useQuery({ queryKey: anglesQueryKeys.typeDist(),     queryFn: getAnglesTypeDist })
export const useAnglesPerf     = ()       => useQuery({ queryKey: anglesQueryKeys.perf(),         queryFn: getAnglesPerf })
export const useAnglesTrend    = (params) => useQuery({ queryKey: anglesQueryKeys.trend(params),  queryFn: () => getAnglesTrend(params) })
export const useAnglesTable    = (params) => useQuery({ queryKey: anglesQueryKeys.list(params),   queryFn: () => getAnglesList(params) })

// ── Offer Library detail queries ──────────────────────────────────────────────
export const offersQueryKeys = {
  summary:  ()  => ['offers', 'summary'],
  typeDist: ()  => ['offers', 'type-dist'],
  perf:     ()  => ['offers', 'perf'],
  trend:    (p) => ['offers', 'trend', p ?? {}],
  list:     (p) => ['offers', 'list',  p ?? {}],
}

export const useOffersSummary  = ()       => useQuery({ queryKey: offersQueryKeys.summary(),      queryFn: getOffersSummary })
export const useOffersTypeDist = ()       => useQuery({ queryKey: offersQueryKeys.typeDist(),     queryFn: getOffersTypeDist })
export const useOffersPerf     = ()       => useQuery({ queryKey: offersQueryKeys.perf(),         queryFn: getOffersPerf })
export const useOffersTrend    = (params) => useQuery({ queryKey: offersQueryKeys.trend(params),  queryFn: () => getOffersTrend(params) })
export const useOffersTable    = (params) => useQuery({ queryKey: offersQueryKeys.list(params),   queryFn: () => getOffersList(params) })
