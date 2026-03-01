import { startOfWeek, format, differenceInDays } from 'date-fns'
import type { Subject, WeaknessTag, FocusArea } from '@/lib/types'

const MAX_PER_WEEK = 6
const MAX_PER_SUBJECT = 3

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  return differenceInDays(new Date(), new Date(dateStr))
}

function urgencyForWeakness(weakness: WeaknessTag, subject: Subject): 'high' | 'medium' | 'low' {
  const confidence = subject.confidence ?? 3
  const addressCount = weakness.address_count ?? 0
  if (confidence <= 2 || addressCount === 0) return 'high'
  if (confidence === 3) return 'medium'
  return 'low'
}

/**
 * Picks the most urgent weakness from a list:
 * 1. Never addressed (address_count = 0) first
 * 2. Then by oldest last_addressed_at
 * 3. Then by oldest created_at
 */
function pickMostUrgent(weaknesses: WeaknessTag[]): WeaknessTag {
  return [...weaknesses].sort((a, b) => {
    const aCount = a.address_count ?? 0
    const bCount = b.address_count ?? 0
    if (aCount === 0 && bCount !== 0) return -1
    if (bCount === 0 && aCount !== 0) return 1
    const aDays = daysSince(a.last_addressed_at)
    const bDays = daysSince(b.last_addressed_at)
    if (aDays !== bDays) return bDays - aDays // older = higher priority
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })[0]
}

function makeArea(weakness: WeaknessTag, subject: Subject, addressedIds: Set<string>): FocusArea {
  const urgency = urgencyForWeakness(weakness, subject)
  const typeLabel = weakness.weakness_type === 'content' ? 'Content gap' : 'Logic gap'
  const daysSinceAddressed = daysSince(weakness.last_addressed_at)
  const reasonParts = [typeLabel]
  if (daysSinceAddressed < 999) {
    reasonParts.push(`Last addressed ${daysSinceAddressed}d ago`)
  } else {
    reasonParts.push('Not yet addressed')
  }

  const id = `weakness-${weakness.id}`
  return {
    id,
    title: weakness.tag,
    subject,
    reason: reasonParts.join(' • '),
    urgency,
    source: 'weakness',
    action: { label: 'Study', type: 'study', weaknessId: weakness.id },
    addressed: addressedIds.has(id),
  }
}

/**
 * Distributes up to 6 focus areas across subjects:
 * - Pass 1: 1 weakness per subject (sorted by confidence, lowest first)
 * - Pass 2: Extra slots to lowest-confidence subjects (max 3 per subject)
 *
 * Subjects with no unresolved weaknesses are skipped; their slots go to others.
 */
export function calculateFocusAreas(
  {
    subjects,
    weaknesses,
  }: {
    subjects: Subject[]
    weaknesses: WeaknessTag[]
    // Other props accepted but not used in this distribution model
    assessments?: unknown[]
    tasks?: unknown[]
    energyLevel?: unknown
  },
  addressedIds: Set<string> = new Set()
): FocusArea[] {
  const unresolvedWeaknesses = weaknesses.filter(w => !w.is_resolved)

  // Group weaknesses by subject_id, mutable copies
  const weaknessBySubject = new Map<string, WeaknessTag[]>()
  for (const w of unresolvedWeaknesses) {
    const arr = weaknessBySubject.get(w.subject_id) ?? []
    arr.push(w)
    weaknessBySubject.set(w.subject_id, arr)
  }

  // Sort subjects by confidence ascending (weakest first)
  const sortedSubjects = [...subjects].sort((a, b) => (a.confidence ?? 3) - (b.confidence ?? 3))

  const areas: FocusArea[] = []
  const perSubjectCount = new Map<string, number>()

  // Pass 1: allocate TARGET_PER_SUBJECT (1) weakness per subject
  for (const subject of sortedSubjects) {
    if (areas.length >= MAX_PER_WEEK) break
    const pool = weaknessBySubject.get(subject.id)
    if (!pool || pool.length === 0) continue

    const picked = pickMostUrgent(pool)
    areas.push(makeArea(picked, subject, addressedIds))
    perSubjectCount.set(subject.id, 1)
    // Remove picked from pool
    weaknessBySubject.set(subject.id, pool.filter(w => w.id !== picked.id))
  }

  // Pass 2: fill remaining slots (lowest-confidence subjects first, max MAX_PER_SUBJECT each)
  let madeProgress = true
  while (areas.length < MAX_PER_WEEK && madeProgress) {
    madeProgress = false
    for (const subject of sortedSubjects) {
      if (areas.length >= MAX_PER_WEEK) break
      const count = perSubjectCount.get(subject.id) ?? 0
      if (count >= MAX_PER_SUBJECT) continue
      const pool = weaknessBySubject.get(subject.id)
      if (!pool || pool.length === 0) continue

      const picked = pickMostUrgent(pool)
      areas.push(makeArea(picked, subject, addressedIds))
      perSubjectCount.set(subject.id, count + 1)
      weaknessBySubject.set(subject.id, pool.filter(w => w.id !== picked.id))
      madeProgress = true
    }
  }

  // Also include resolved weaknesses that were addressed this week — show as ticked-off
  const areaIds = new Set(areas.map(a => a.id))
  for (const w of weaknesses.filter(w => w.is_resolved)) {
    const id = `weakness-${w.id}`
    if (addressedIds.has(id) && !areaIds.has(id)) {
      const subject = subjects.find(s => s.id === w.subject_id)
      if (subject) areas.push(makeArea(w, subject, addressedIds))
    }
  }

  return areas
}

export function getWeekStart(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function getLocalFocusAreaProgressKey(weekStart: string): string {
  return `focus-area-progress:${weekStart}`
}

export function readLocalFocusAreaProgress(weekStart: string): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(getLocalFocusAreaProgressKey(weekStart))
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

export function writeLocalFocusAreaProgress(weekStart: string, ids: Iterable<string>) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      getLocalFocusAreaProgressKey(weekStart),
      JSON.stringify(Array.from(new Set(ids)))
    )
  } catch {
    // Best-effort local persistence.
  }
}
