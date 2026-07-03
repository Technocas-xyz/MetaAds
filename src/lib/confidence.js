import { CONFIDENCE_LEVELS } from './constants'

export function getConfidenceLevel(score) {
  if (score >= CONFIDENCE_LEVELS.HIGH)   return 'High'
  if (score >= CONFIDENCE_LEVELS.MEDIUM) return 'Medium'
  return 'Low'
}

export function getConfidenceColor(level) {
  switch (level) {
    case 'High':   return 'text-emerald-600'
    case 'Medium': return 'text-amber-500'
    case 'Low':    return 'text-red-500'
    default:       return 'text-gray-400'
  }
}

export function getConfidenceBadgeColor(level) {
  switch (level) {
    case 'High':   return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'Medium': return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'Low':    return 'bg-red-50 text-red-700 ring-red-200'
    default:       return 'bg-gray-50 text-gray-500 ring-gray-200'
  }
}
