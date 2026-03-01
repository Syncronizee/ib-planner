export const FOCUS_AREA_PROGRESS_TYPES = ['weakness', 'confidence'] as const

export type FocusAreaProgressType = (typeof FOCUS_AREA_PROGRESS_TYPES)[number]

export function normalizeFocusAreaProgressType(
  value: unknown,
  focusAreaId?: unknown
): FocusAreaProgressType {
  const rawType = typeof value === 'string' ? value.trim().toLowerCase() : ''

  if (rawType === 'weakness' || rawType === 'confidence') {
    return rawType
  }

  if (rawType === 'practice') {
    return 'confidence'
  }

  const rawId = typeof focusAreaId === 'string' ? focusAreaId : ''

  if (rawId.startsWith('syllabus-')) {
    return 'confidence'
  }

  return 'weakness'
}
