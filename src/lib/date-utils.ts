import { isValid, parseISO } from 'date-fns'

export function normalizeTimestampLikeString(value: string) {
  const trimmed = value.trim()
  return trimmed.replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}):\d{2}$/,
    '$1'
  )
}

export function parseDateSafe(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalizedValue = normalizeTimestampLikeString(value)
  const parsed = parseISO(normalizedValue)
  if (isValid(parsed)) {
    return parsed
  }

  const fallback = new Date(normalizedValue)
  return isValid(fallback) ? fallback : null
}
