export const HOOK_TYPES = [
  'Pain', 'Benefit', 'Curiosity', 'Urgency', 'Price',
  'Trust', 'How To', 'Social Proof', 'Other',
]

export const ANGLES = [
  'Price', 'Quality', 'Speed', 'Convenience',
  'Innovation', 'Trust', 'Sustainability', 'Other',
]

export const OFFER_TYPES = [
  'Discount', 'Bundle', 'Free Shipping', 'BOGO',
  'Limited Time', 'Guarantee', 'Other',
]

export const CONFIDENCE_LEVELS = { HIGH: 70, MEDIUM: 40, LOW: 0 }

/** Soft-pill class strings for hook type badges */
export const HOOK_TYPE_COLORS = {
  Pain:           'bg-red-50    text-red-700    ring-red-200',
  Benefit:        'bg-green-50  text-green-700  ring-green-200',
  Curiosity:      'bg-purple-50 text-purple-700 ring-purple-200',
  Urgency:        'bg-orange-50 text-orange-700 ring-orange-200',
  Trust:          'bg-blue-50   text-blue-700   ring-blue-200',
  Price:          'bg-amber-50  text-amber-700  ring-amber-200',
  'How To':       'bg-teal-50   text-teal-700   ring-teal-200',
  'Social Proof': 'bg-primary-50 text-primary-700 ring-primary-200',
  Other:          'bg-gray-50   text-gray-600   ring-gray-200',
}

/** Soft-pill class strings for angle badges */
export const ANGLE_COLORS = {
  Price:          'bg-amber-50  text-amber-700  ring-amber-200',
  Quality:        'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Speed:          'bg-sky-50    text-sky-700    ring-sky-200',
  Convenience:    'bg-violet-50 text-violet-700 ring-violet-200',
  Innovation:     'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  Trust:          'bg-blue-50   text-blue-700   ring-blue-200',
  Sustainability: 'bg-green-50  text-green-700  ring-green-200',
  Other:          'bg-gray-50   text-gray-600   ring-gray-200',
}

/** Soft-pill class strings for offer type badges */
export const OFFER_TYPE_COLORS = {
  Discount:       'bg-red-50    text-red-700    ring-red-200',
  Bundle:         'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Free Shipping':'bg-green-50  text-green-700  ring-green-200',
  BOGO:           'bg-orange-50 text-orange-700 ring-orange-200',
  'Limited Time': 'bg-amber-50  text-amber-700  ring-amber-200',
  Guarantee:      'bg-teal-50   text-teal-700   ring-teal-200',
  Other:          'bg-gray-50   text-gray-600   ring-gray-200',
}

export const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'Other']

export const AD_STATUSES = ['pending', 'approved', 'rejected', 'flagged']

export const REVIEW_REASONS = ['low_confidence', 'flagged', 'manual']
