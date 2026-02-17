import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Assessment, Subject, Task } from '../shared-types'

export const SYNC_TABLES = [
  'subjects',
  'tasks',
  'assessments',
  'grade_history',
  'timetable_entries',
  'study_resources',
  'syllabus_topics',
  'weakness_tags',
  'error_logs',
  'notes',
  'note_images',
  'energy_checkins',
  'weekly_plans',
  'study_sessions',
  'scheduled_study_sessions',
  'school_events',
  'cas_experiences',
  'cas_reflections',
  'cas_experience_outcomes',
  'tok_essays',
  'tok_exhibitions',
  'tok_exhibition_objects',
  'tok_knowledge_questions',
  'tok_notes',
  'tok_prompts',
] as const

export type SyncTable = (typeof SYNC_TABLES)[number]

type Primitive = string | number | boolean | null
export type QueryValue = Primitive | Record<string, unknown> | unknown[]
export type RowRecord = Record<string, QueryValue>

export type ListOptions = {
  where?: Record<string, Primitive>
  orderBy?: string
  ascending?: boolean
  limit?: number
  includeDeleted?: boolean
}

const JSON_COLUMNS: Record<SyncTable, string[]> = {
  subjects: [],
  tasks: [],
  assessments: [],
  grade_history: [],
  timetable_entries: [],
  study_resources: [],
  syllabus_topics: [],
  weakness_tags: [],
  error_logs: [],
  notes: ['content', 'drawing_data'],
  note_images: [],
  energy_checkins: [],
  weekly_plans: [],
  study_sessions: [],
  scheduled_study_sessions: [],
  school_events: [],
  cas_experiences: [],
  cas_reflections: [],
  cas_experience_outcomes: [],
  tok_essays: [],
  tok_exhibitions: [],
  tok_exhibition_objects: [],
  tok_knowledge_questions: ['aok', 'wok'],
  tok_notes: [],
  tok_prompts: [],
}

const BOOLEAN_COLUMNS: Record<SyncTable, string[]> = {
  subjects: [],
  tasks: ['is_completed'],
  assessments: ['is_completed'],
  grade_history: [],
  timetable_entries: [],
  study_resources: [],
  syllabus_topics: ['is_completed'],
  weakness_tags: ['is_resolved'],
  error_logs: ['is_resolved'],
  notes: ['has_drawing'],
  note_images: [],
  energy_checkins: [],
  weekly_plans: ['hardest_task_completed', 'weakest_subject_completed'],
  study_sessions: [],
  scheduled_study_sessions: [],
  school_events: ['all_day'],
  cas_experiences: ['is_creativity', 'is_activity', 'is_service', 'is_cas_project'],
  cas_reflections: [],
  cas_experience_outcomes: [],
  tok_essays: [],
  tok_exhibitions: [],
  tok_exhibition_objects: [],
  tok_knowledge_questions: [],
  tok_notes: [],
  tok_prompts: ['is_default'],
}

function isSyncTable(table: string): table is SyncTable {
  return (SYNC_TABLES as readonly string[]).includes(table)
}

const TABLE_ALIASES: Record<string, SyncTable> = {
  tok_essay: 'tok_essays',
  tok_exhibition: 'tok_exhibitions',
  tok_exhibition_object: 'tok_exhibition_objects',
  tok_knowledge_question: 'tok_knowledge_questions',
  tok_note: 'tok_notes',
  tok_prompt: 'tok_prompts',
  cas_experience: 'cas_experiences',
  cas_reflection: 'cas_reflections',
  cas_experience_outcome: 'cas_experience_outcomes',
}

function nowIso() {
  return new Date().toISOString()
}

function sanitizeOrderBy(orderBy: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(orderBy)) {
    throw new Error(`Unsafe orderBy value: ${orderBy}`)
  }

  return orderBy
}

function sanitizeIdentifier(name: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`)
  }

  return name
}

function serializeValue(value: QueryValue): Primitive {
  if (value === null) {
    return null
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return value
}

function deserializeRow<T>(table: SyncTable, row: Record<string, unknown>): T {
  const parsed = { ...row }

  for (const column of JSON_COLUMNS[table]) {
    const value = parsed[column]
    if (typeof value === 'string' && value.length > 0) {
      try {
        parsed[column] = JSON.parse(value)
      } catch {
        parsed[column] = value
      }
    }
  }

  for (const column of BOOLEAN_COLUMNS[table]) {
    const value = parsed[column]
    if (typeof value === 'number') {
      parsed[column] = value === 1
    }
  }

  return parsed as T
}

function buildWhere(where: Record<string, Primitive>) {
  const keys = Object.keys(where)
  const params: Primitive[] = []

  if (keys.length === 0) {
    return { clause: '', params }
  }

  const parts = keys.map((key) => {
    const safeKey = sanitizeIdentifier(key)
    const value = where[key]

    if (value === null) {
      return `${safeKey} IS NULL`
    }

    params.push(value)
    return `${safeKey} = ?`
  })

  return { clause: `WHERE ${parts.join(' AND ')}`, params }
}

export class LocalDatabaseService {
  constructor(private readonly db: Database.Database) {}

  private ensureTable(table: string): asserts table is SyncTable {
    if (!isSyncTable(table)) {
      throw new Error(`Unsupported table: ${table}`)
    }
  }

  private resolveTable(table: string): SyncTable {
    if (isSyncTable(table)) {
      return table
    }

    const alias = TABLE_ALIASES[table]
    if (alias) {
      return alias
    }

    throw new Error(`Unsupported table: ${table}`)
  }

  list<T = RowRecord>(table: SyncTable, options: ListOptions = {}): T[] {
    const whereInput = options.where ?? {}
    const where = { ...whereInput }

    if (!options.includeDeleted) {
      where.deleted_at = null
    }

    const { clause, params } = buildWhere(where)
    const orderBy = options.orderBy ? sanitizeOrderBy(options.orderBy) : 'updated_at'
    const direction = options.ascending ? 'ASC' : 'DESC'
    const limitClause = options.limit ? `LIMIT ${Math.max(options.limit, 1)}` : ''

    const sql = `SELECT * FROM ${table} ${clause} ORDER BY ${orderBy} ${direction} ${limitClause}`
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[]

    return rows.map((row) => deserializeRow<T>(table, row))
  }

  listByUser<T = RowRecord>(table: SyncTable, userId: string, options: Omit<ListOptions, 'where'> = {}): T[] {
    return this.list<T>(table, {
      ...options,
      where: { user_id: userId },
    })
  }

  getById<T = RowRecord>(table: SyncTable, id: string, userId?: string, includeDeleted = false): T | null {
    const base = userId
      ? this.db
          .prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'} LIMIT 1`)
          .get(id, userId)
      : this.db
          .prepare(`SELECT * FROM ${table} WHERE id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'} LIMIT 1`)
          .get(id)

    if (!base) {
      return null
    }

    return deserializeRow<T>(table, base as Record<string, unknown>)
  }

  createRecord<T = RowRecord>(table: SyncTable, data: RowRecord): T {
    const timestamp = nowIso()
    const id = (typeof data.id === 'string' && data.id.length > 0) ? data.id : randomUUID()

    const payload: RowRecord = {
      ...data,
      id,
      remote_id: typeof data.remote_id === 'string' ? data.remote_id : null,
      created_at: typeof data.created_at === 'string' ? data.created_at : timestamp,
      updated_at: timestamp,
      synced_at: null,
      is_dirty: 1,
      deleted_at: null,
    }

    const columns = Object.keys(payload)
    const placeholders = columns.map(() => '?').join(', ')
    const values = columns.map((column) => serializeValue(payload[column]))

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    this.db.prepare(sql).run(...values)

    const record = this.getById<T>(table, id, typeof payload.user_id === 'string' ? payload.user_id : undefined, true)
    if (!record) {
      throw new Error(`Failed to create record in ${table}`)
    }

    return record
  }

  updateRecord<T = RowRecord>(table: SyncTable, id: string, userId: string, patch: RowRecord): T {
    const current = this.getById<RowRecord>(table, id, userId, true)

    if (!current) {
      throw new Error(`Record ${id} was not found in ${table}`)
    }

    const timestamp = nowIso()
    const payload: RowRecord = {
      ...patch,
      updated_at: timestamp,
      is_dirty: 1,
      synced_at: null,
    }

    const columns = Object.keys(payload)
    if (columns.length === 0) {
      const same = this.getById<T>(table, id, userId, true)
      if (!same) {
        throw new Error(`Failed to re-read record ${id} in ${table}`)
      }

      return same
    }

    const assignments = columns.map((column) => `${column} = ?`).join(', ')
    const values = columns.map((column) => serializeValue(payload[column]))

    this.db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ? AND user_id = ?`).run(...values, id, userId)

    const updated = this.getById<T>(table, id, userId, true)
    if (!updated) {
      throw new Error(`Failed to update record ${id} in ${table}`)
    }

    return updated
  }

  softDeleteRecord(table: SyncTable, id: string, userId: string) {
    const timestamp = nowIso()

    this.db
      .prepare(
        `UPDATE ${table}
         SET deleted_at = ?,
             updated_at = ?,
             is_dirty = 1,
             synced_at = NULL
         WHERE id = ? AND user_id = ?`
      )
      .run(timestamp, timestamp, id, userId)
  }

  hardDeleteRecord(table: SyncTable, id: string, userId?: string) {
    if (userId) {
      this.db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`).run(id, userId)
      return
    }

    this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
  }

  getDirtyRecords<T = RowRecord>(table: SyncTable, userId: string, limit = 200): T[] {
    const rows = this.db
      .prepare(
        `SELECT *
         FROM ${table}
         WHERE user_id = ?
           AND is_dirty = 1
         ORDER BY updated_at ASC
         LIMIT ?`
      )
      .all(userId, Math.max(limit, 1)) as Record<string, unknown>[]

    return rows.map((row) => deserializeRow<T>(table, row))
  }

  markRecordSynced(table: SyncTable, id: string, remoteId?: string | null) {
    const timestamp = nowIso()

    if (remoteId) {
      this.db
        .prepare(
          `UPDATE ${table}
           SET remote_id = ?,
               synced_at = ?,
               is_dirty = 0
           WHERE id = ?`
        )
        .run(remoteId, timestamp, id)
      return
    }

    this.db
      .prepare(
        `UPDATE ${table}
         SET synced_at = ?,
             is_dirty = 0
         WHERE id = ?`
      )
      .run(timestamp, id)
  }

  upsertRemoteRecord<T = RowRecord>(table: SyncTable, record: RowRecord): T {
    const id = typeof record.id === 'string' ? record.id : randomUUID()
    const timestamp = nowIso()

    const payload: RowRecord = {
      ...record,
      id,
      remote_id: typeof record.id === 'string' ? record.id : (typeof record.remote_id === 'string' ? record.remote_id : null),
      is_dirty: 0,
      synced_at: timestamp,
      deleted_at: record.deleted_at ?? null,
      updated_at: typeof record.updated_at === 'string' ? record.updated_at : timestamp,
      created_at: typeof record.created_at === 'string' ? record.created_at : timestamp,
    }

    const columns = Object.keys(payload)
    const placeholders = columns.map(() => '?').join(', ')
    const updates = columns
      .filter((column) => column !== 'id')
      .map((column) => `${column} = excluded.${column}`)
      .join(', ')

    const values = columns.map((column) => serializeValue(payload[column]))

    this.db
      .prepare(
        `INSERT INTO ${table} (${columns.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updates}`
      )
      .run(...values)

    const read = this.getById<T>(table, id, typeof payload.user_id === 'string' ? payload.user_id : undefined, true)
    if (!read) {
      throw new Error(`Failed to upsert remote record ${id} in ${table}`)
    }

    return read
  }

  getPendingChangesCount(userId: string) {
    let total = 0

    for (const table of SYNC_TABLES) {
      const row = this.db
        .prepare(`SELECT COUNT(*) as count FROM ${table} WHERE user_id = ? AND is_dirty = 1`)
        .get(userId) as { count: number }

      total += row.count
    }

    return total
  }

  getLastSyncAt(userId: string): string | null {
    const row = this.db.prepare('SELECT last_sync_at FROM _sync_state WHERE user_id = ? LIMIT 1').get(userId) as {
      last_sync_at: string | null
    } | undefined

    return row?.last_sync_at ?? null
  }

  setLastSyncAt(userId: string, timestamp: string) {
    this.db
      .prepare(
        `INSERT INTO _sync_state (user_id, last_sync_at, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           last_sync_at = excluded.last_sync_at,
           updated_at = excluded.updated_at`
      )
      .run(userId, timestamp, timestamp)
  }

  runInTransaction<T>(work: () => T) {
    return this.db.transaction(work)()
  }

  // Typed wrappers for core entities used broadly by dashboard views.
  getSubjects(userId: string) {
    return this.listByUser<Subject>('subjects', userId, {
      orderBy: 'created_at',
      ascending: true,
    })
  }

  getSubjectById(id: string, userId: string) {
    return this.getById<Subject>('subjects', id, userId)
  }

  createSubject(userId: string, data: Partial<Subject>) {
    return this.createRecord<Subject>('subjects', {
      user_id: userId,
      name: data.name ?? 'Untitled Subject',
      level: data.level ?? 'SL',
      color: data.color ?? 'slate',
      confidence: data.confidence ?? 3,
      current_grade: data.current_grade ?? null,
      predicted_grade: data.predicted_grade ?? null,
      target_grade: data.target_grade ?? null,
      teacher_name: data.teacher_name ?? null,
      teacher_email: data.teacher_email ?? null,
      notes: data.notes ?? null,
    })
  }

  updateSubject(id: string, userId: string, patch: Partial<Subject>) {
    return this.updateRecord<Subject>('subjects', id, userId, patch as RowRecord)
  }

  deleteSubject(id: string, userId: string) {
    this.softDeleteRecord('subjects', id, userId)
  }

  getTasks(userId: string) {
    return this.listByUser<Task>('tasks', userId)
  }

  getTasksBySubject(userId: string, subjectId: string) {
    return this.list<Task>('tasks', {
      where: {
        user_id: userId,
        subject_id: subjectId,
      },
    })
  }

  createTask(userId: string, data: Partial<Task>) {
    return this.createRecord<Task>('tasks', {
      user_id: userId,
      subject_id: data.subject_id ?? null,
      title: data.title ?? 'Untitled Task',
      description: data.description ?? null,
      due_date: data.due_date ?? null,
      priority: data.priority ?? 'medium',
      category: data.category ?? 'other',
      is_completed: data.is_completed ?? false,
      linked_assessment_id: data.linked_assessment_id ?? null,
      completed_at: data.completed_at ?? null,
      energy_level: data.energy_level ?? null,
    })
  }

  updateTask(id: string, userId: string, patch: Partial<Task>) {
    return this.updateRecord<Task>('tasks', id, userId, patch as RowRecord)
  }

  deleteTask(id: string, userId: string) {
    this.softDeleteRecord('tasks', id, userId)
  }

  getAssessments(userId: string) {
    return this.listByUser<Assessment>('assessments', userId)
  }

  getAssessmentsBySubject(userId: string, subjectId: string) {
    return this.list<Assessment>('assessments', {
      where: {
        user_id: userId,
        subject_id: subjectId,
      },
    })
  }

  createAssessment(userId: string, data: Partial<Assessment>) {
    return this.createRecord<Assessment>('assessments', {
      user_id: userId,
      subject_id: data.subject_id ?? null,
      title: data.title ?? 'Untitled Assessment',
      type: data.type ?? 'other',
      score: data.score ?? null,
      max_score: data.max_score ?? null,
      percentage: data.percentage ?? null,
      weight: data.weight ?? null,
      date: data.date ?? null,
      notes: data.notes ?? null,
      is_completed: data.is_completed ?? false,
      linked_task_id: data.linked_task_id ?? null,
    })
  }

  updateAssessment(id: string, userId: string, patch: Partial<Assessment>) {
    return this.updateRecord<Assessment>('assessments', id, userId, patch as RowRecord)
  }

  deleteAssessment(id: string, userId: string) {
    this.softDeleteRecord('assessments', id, userId)
  }

  queryTable(
    table: string,
    options: {
      filters?: Record<string, Primitive>
      orderBy?: string
      ascending?: boolean
      includeDeleted?: boolean
      limit?: number
      userId?: string
    } = {}
  ) {
    const resolvedTable = this.resolveTable(table)
    const filters = { ...(options.filters ?? {}) }

    if (options.userId && !Object.prototype.hasOwnProperty.call(filters, 'user_id')) {
      filters.user_id = options.userId
    }

    return this.list<RowRecord>(resolvedTable, {
      where: filters,
      orderBy: options.orderBy,
      ascending: options.ascending,
      includeDeleted: options.includeDeleted,
      limit: options.limit,
    })
  }

  createTableRecord(table: string, userId: string, data: RowRecord) {
    const resolvedTable = this.resolveTable(table)
    const payload: RowRecord = { ...data }

    if (typeof payload.user_id !== 'string') {
      payload.user_id = userId
    }

    return this.createRecord<RowRecord>(resolvedTable, payload)
  }

  updateTableRecords(
    table: string,
    userId: string,
    filters: Record<string, Primitive>,
    patch: RowRecord
  ) {
    const resolvedTable = this.resolveTable(table)
    const whereFilters = { ...(filters ?? {}) }

    if (!Object.prototype.hasOwnProperty.call(whereFilters, 'user_id')) {
      whereFilters.user_id = userId
    }

    const rows = this.list<RowRecord>(resolvedTable, {
      where: whereFilters,
      includeDeleted: true,
      orderBy: 'updated_at',
      ascending: false,
      limit: 1000,
    })

    return rows.map((row) => this.updateRecord<RowRecord>(resolvedTable, String(row.id), userId, patch))
  }

  deleteTableRecords(table: string, userId: string, filters: Record<string, Primitive>) {
    const resolvedTable = this.resolveTable(table)
    const whereFilters = { ...(filters ?? {}) }

    if (!Object.prototype.hasOwnProperty.call(whereFilters, 'user_id')) {
      whereFilters.user_id = userId
    }

    const rows = this.list<RowRecord>(resolvedTable, {
      where: whereFilters,
      includeDeleted: true,
      orderBy: 'updated_at',
      ascending: false,
      limit: 1000,
    })

    for (const row of rows) {
      this.softDeleteRecord(resolvedTable, String(row.id), userId)
    }

    return rows.length
  }

  invoke(method: string, args: unknown[]) {
    const self = this as Record<string, unknown>
    const candidate = self[method]

    if (typeof candidate !== 'function') {
      throw new Error(`Unknown database method: ${method}`)
    }

    return (candidate as (...callArgs: unknown[]) => unknown).apply(this, args)
  }

  ensureSyncTable(table: string): table is SyncTable {
    this.ensureTable(table)
    return true
  }
}
