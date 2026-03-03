import { isValid, parseISO } from 'date-fns'

export function parseDateSafe(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  if (isValid(parsed)) {
    return parsed
  }

  const fallback = new Date(value)
  return isValid(fallback) ? fallback : null
}
