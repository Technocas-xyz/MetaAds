import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCampaigns, createCampaign } from '../../api/campaigns'

export const campaignKeys = {
  all:  () => ['campaigns'],
  list: () => ['campaigns', 'list'],
}

export function useCampaigns() {
  return useQuery({ queryKey: campaignKeys.list(), queryFn: listCampaigns })
}

export function useCreateCampaign(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => createCampaign(body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: campaignKeys.all() }),
    ...options,
  })
}
