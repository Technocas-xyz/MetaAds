import { useQuery } from '@tanstack/react-query'
import client from '../client'

export const libraryKeys = {
  hooks:  () => ['libraries', 'hooks'],
  angles: () => ['libraries', 'angles'],
  offers: () => ['libraries', 'offers'],
}

export function useHooks() {
  return useQuery({
    queryKey: libraryKeys.hooks(),
    queryFn:  () => client.get('/hooks').then((r) => r.data),
  })
}

export function useAngles() {
  return useQuery({
    queryKey: libraryKeys.angles(),
    queryFn:  () => client.get('/angles').then((r) => r.data),
  })
}

export function useOffers() {
  return useQuery({
    queryKey: libraryKeys.offers(),
    queryFn:  () => client.get('/offers').then((r) => r.data),
  })
}
