import { useQuery } from '@tanstack/react-query'
import {
  getAISummary,
  getPerformanceTimeline,
  getTopAnglesDonut,
  getConfidenceDist,
  getWinningAds,
} from '../../api/aiAnalysis'

const keys = {
  summary:   ()       => ['ai-analysis', 'summary'],
  timeline:  (params) => ['ai-analysis', 'timeline', params ?? {}],
  angles:    ()       => ['ai-analysis', 'angles'],
  confDist:  ()       => ['ai-analysis', 'conf-dist'],
  winning:   (params) => ['ai-analysis', 'winning', params ?? {}],
}

export const useAISummary           = ()       => useQuery({ queryKey: keys.summary(),        queryFn: getAISummary })
export const usePerformanceTimeline = (params) => useQuery({ queryKey: keys.timeline(params), queryFn: () => getPerformanceTimeline(params) })
export const useTopAnglesDonut      = ()       => useQuery({ queryKey: keys.angles(),         queryFn: getTopAnglesDonut })
export const useConfidenceDist      = ()       => useQuery({ queryKey: keys.confDist(),       queryFn: getConfidenceDist })
export const useWinningAds          = (params) => useQuery({ queryKey: keys.winning(params),  queryFn: () => getWinningAds(params) })
