import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../client'

export const campaignKeys = {
  all:  () => ['campaigns'],
  list: () => ['campaigns', 'list'],
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCampaigns() {
  return useQuery({
    queryKey: campaignKeys.list(),
    queryFn:  () => client.get('/campaigns').then((r) => r.data),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCampaign(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => client.post('/campaigns', body).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: campaignKeys.all() }),
    ...options,
  })
}
