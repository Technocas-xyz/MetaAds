import { useQuery } from '@tanstack/react-query'
import { listHooks, getHooksSummary, getHooksTypeDist, getHooksPerf, getHooksTrend, getHooksList, getHooksFilterOptions } from '../../api/hooks'
import { listAngles, getAnglesSummary, getAnglesTypeDist, getAnglesPerf, getAnglesTrend, getAnglesList, getAnglesFilterOptions } from '../../api/angles'
import { listOffers, getOffersSummary, getOffersTypeDist, getOffersPerf, getOffersTrend, getOffersList, getOffersFilterOptions } from '../../api/offers'

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
  options:  ()  => ['hooks', 'filter-options'],
  summary:  (p) => ['hooks', 'summary',   p ?? {}],
  typeDist: (p) => ['hooks', 'type-dist', p ?? {}],
  perf:     (p) => ['hooks', 'perf',      p ?? {}],
  trend:    (p) => ['hooks', 'trend',     p ?? {}],
  list:     (p) => ['hooks', 'list',      p ?? {}],
}

export const useHooksFilterOptions = ()  => useQuery({ queryKey: hooksQueryKeys.options(),       queryFn: getHooksFilterOptions })
export const useHooksSummary  = (params) => useQuery({ queryKey: hooksQueryKeys.summary(params),  queryFn: () => getHooksSummary(params) })
export const useHooksTypeDist = (params) => useQuery({ queryKey: hooksQueryKeys.typeDist(params), queryFn: () => getHooksTypeDist(params) })
export const useHooksPerf     = (params) => useQuery({ queryKey: hooksQueryKeys.perf(params),     queryFn: () => getHooksPerf(params) })
export const useHooksTrend    = (params) => useQuery({ queryKey: hooksQueryKeys.trend(params),    queryFn: () => getHooksTrend(params) })
export const useHooksTable    = (params) => useQuery({ queryKey: hooksQueryKeys.list(params),     queryFn: () => getHooksList(params) })

// ── Angle Library detail queries ──────────────────────────────────────────────
export const anglesQueryKeys = {
  options:  ()  => ['angles', 'filter-options'],
  summary:  (p) => ['angles', 'summary',   p ?? {}],
  typeDist: (p) => ['angles', 'type-dist', p ?? {}],
  perf:     (p) => ['angles', 'perf',      p ?? {}],
  trend:    (p) => ['angles', 'trend',     p ?? {}],
  list:     (p) => ['angles', 'list',      p ?? {}],
}

export const useAnglesFilterOptions = ()  => useQuery({ queryKey: anglesQueryKeys.options(),       queryFn: getAnglesFilterOptions })
export const useAnglesSummary  = (params) => useQuery({ queryKey: anglesQueryKeys.summary(params),  queryFn: () => getAnglesSummary(params) })
export const useAnglesTypeDist = (params) => useQuery({ queryKey: anglesQueryKeys.typeDist(params), queryFn: () => getAnglesTypeDist(params) })
export const useAnglesPerf     = (params) => useQuery({ queryKey: anglesQueryKeys.perf(params),     queryFn: () => getAnglesPerf(params) })
export const useAnglesTrend    = (params) => useQuery({ queryKey: anglesQueryKeys.trend(params),    queryFn: () => getAnglesTrend(params) })
export const useAnglesTable    = (params) => useQuery({ queryKey: anglesQueryKeys.list(params),     queryFn: () => getAnglesList(params) })

// ── Offer Library detail queries ──────────────────────────────────────────────
export const offersQueryKeys = {
  options:  ()  => ['offers', 'filter-options'],
  summary:  (p) => ['offers', 'summary',   p ?? {}],
  typeDist: (p) => ['offers', 'type-dist', p ?? {}],
  perf:     (p) => ['offers', 'perf',      p ?? {}],
  trend:    (p) => ['offers', 'trend',     p ?? {}],
  list:     (p) => ['offers', 'list',      p ?? {}],
}

export const useOffersFilterOptions = ()  => useQuery({ queryKey: offersQueryKeys.options(),       queryFn: getOffersFilterOptions })
export const useOffersSummary  = (params) => useQuery({ queryKey: offersQueryKeys.summary(params),  queryFn: () => getOffersSummary(params) })
export const useOffersTypeDist = (params) => useQuery({ queryKey: offersQueryKeys.typeDist(params), queryFn: () => getOffersTypeDist(params) })
export const useOffersPerf     = (params) => useQuery({ queryKey: offersQueryKeys.perf(params),     queryFn: () => getOffersPerf(params) })
export const useOffersTrend    = (params) => useQuery({ queryKey: offersQueryKeys.trend(params),    queryFn: () => getOffersTrend(params) })
export const useOffersTable    = (params) => useQuery({ queryKey: offersQueryKeys.list(params),     queryFn: () => getOffersList(params) })
