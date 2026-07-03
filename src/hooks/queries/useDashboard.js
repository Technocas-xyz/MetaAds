import { useQuery } from '@tanstack/react-query'
import {
  getDashboardSummary,
  getDashboardHooks,
  getDashboardAngles,
  getDashboardOffers,
} from '../../api/dashboard'

export const dashboardKeys = {
  summary: () => ['dashboard', 'summary'],
  hooks:   () => ['dashboard', 'hooks'],
  angles:  () => ['dashboard', 'angles'],
  offers:  () => ['dashboard', 'offers'],
}

export function useDashboardSummary() {
  return useQuery({ queryKey: dashboardKeys.summary(), queryFn: getDashboardSummary })
}

export function useDashboardHooks() {
  return useQuery({ queryKey: dashboardKeys.hooks(), queryFn: getDashboardHooks })
}

export function useDashboardAngles() {
  return useQuery({ queryKey: dashboardKeys.angles(), queryFn: getDashboardAngles })
}

export function useDashboardOffers() {
  return useQuery({ queryKey: dashboardKeys.offers(), queryFn: getDashboardOffers })
}
