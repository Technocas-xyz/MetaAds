import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../client'

export const settingsKeys = {
  all: () => ['settings'],
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all(),
    queryFn:  () => client.get('/settings').then((r) => r.data),
  })
}

export function useUpdateSettings(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => client.put('/settings', body).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: settingsKeys.all() }),
    ...options,
  })
}
