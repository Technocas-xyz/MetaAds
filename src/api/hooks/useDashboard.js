import { useQuery } from '@tanstack/react-query'
import client from '../client'

export const dashboardKeys = {
  summary: () => ['dashboard', 'summary'],
  hooks:   () => ['dashboard', 'hooks'],
  angles:  () => ['dashboard', 'angles'],
  offers:  () => ['dashboard', 'offers'],
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn:  () => client.get('/dashboard/summary').then((r) => r.data),
  })
}

export function useDashboardHooks() {
  return useQuery({
    queryKey: dashboardKeys.hooks(),
    queryFn:  () => client.get('/dashboard/hooks').then((r) => r.data),
  })
}

export function useDashboardAngles() {
  return useQuery({
    queryKey: dashboardKeys.angles(),
    queryFn:  () => client.get('/dashboard/angles').then((r) => r.data),
  })
}

export function useDashboardOffers() {
  return useQuery({
    queryKey: dashboardKeys.offers(),
    queryFn:  () => client.get('/dashboard/offers').then((r) => r.data),
  })
}
