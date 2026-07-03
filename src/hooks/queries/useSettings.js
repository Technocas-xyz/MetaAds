import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings } from '../../api/settings'

export const settingsKeys = {
  all: () => ['settings'],
}

export function useSettings() {
  return useQuery({ queryKey: settingsKeys.all(), queryFn: getSettings })
}

export function useUpdateSettings(options) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => updateSettings(body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: settingsKeys.all() }),
    ...options,
  })
}
