import type { SupabaseClient } from '@supabase/supabase-js'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime, isManualOfflineMode } from '@/lib/electron/offline'

type QueryError = {
  message: string
  code?: string
  details?: string
  hint?: string
}

type QueryResult<T = unknown> = {
  data: T | null
  error: QueryError | null
}

type Filter = {
  column: string
  value: unknown
}

type OrderRule = {
  column: string
  options?: {
    ascending?: boolean
    nullsFirst?: boolean
  }
}

type InFilter = {
  column: string
  values: unknown[]
}

type MutationAction = 'insert' | 'update' | 'delete' | null
type ChainableQuery = PromiseLike<QueryResult<unknown>> & {
  select: (columns?: string) => ChainableQuery
  insert: (values: unknown) => ChainableQuery
  update: (values: unknown) => ChainableQuery
  delete: () => ChainableQuery
  eq: (column: string, value: unknown) => ChainableQuery
  in: (column: string, values: unknown[]) => ChainableQuery
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => ChainableQuery
  limit: (count: number) => ChainableQuery
  single: () => ChainableQuery
}

const LOCAL_TABLE_ALIASES: Record<string, string> = {
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

function toLocalTableName(table: string) {
  return LOCAL_TABLE_ALIASES[table] ?? table
}

function toPrimitive(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  return JSON.stringify(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

class OfflineAwareQueryBuilder implements PromiseLike<QueryResult<unknown>> {
  private mutationAction: MutationAction = null
  private payload: unknown = null
  private selectColumns = '*'
  private selectAfterMutation = false
  private singleRequested = false
  private filters: Filter[] = []
  private inFilters: InFilter[] = []
  private orders: OrderRule[] = []
  private limitCount: number | null = null
  private executionPromise: Promise<QueryResult<unknown>> | null = null

  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly table: string
  ) {}

  select(columns = '*') {
    this.selectColumns = columns

    if (this.mutationAction) {
      this.selectAfterMutation = true
    }

    return this
  }

  insert(values: unknown) {
    this.mutationAction = 'insert'
    this.payload = values
    return this
  }

  update(values: unknown) {
    this.mutationAction = 'update'
    this.payload = values
    return this
  }

  delete() {
    this.mutationAction = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.inFilters.push({ column, values })
    return this
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ column, options })
    return this
  }

  limit(count: number) {
    this.limitCount = Number.isFinite(count) ? count : null
    return this
  }

  single() {
    this.singleRequested = true
    return this
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined)
  }

  private execute() {
    if (!this.executionPromise) {
      this.executionPromise = this.run()
    }

    return this.executionPromise
  }

  private async run(): Promise<QueryResult<unknown>> {
    if (!this.mutationAction) {
      return this.runRemoteQuery()
    }

    if (!isElectronRuntime()) {
      return this.runRemoteQuery()
    }

    const offlineMode = await isManualOfflineMode()
    if (!offlineMode) {
      return this.runRemoteQuery()
    }

    return this.runLocalMutation()
  }

  private async runRemoteQuery(): Promise<QueryResult<unknown>> {
    let query: ChainableQuery

    if (this.mutationAction === 'insert') {
      query = this.supabaseClient.from(this.table).insert(this.payload) as unknown as ChainableQuery
      if (this.selectAfterMutation) {
        query = query.select(this.selectColumns)
      }
    } else if (this.mutationAction === 'update') {
      query = this.supabaseClient.from(this.table).update(this.payload) as unknown as ChainableQuery
      if (this.selectAfterMutation) {
        query = query.select(this.selectColumns)
      }
    } else if (this.mutationAction === 'delete') {
      query = this.supabaseClient.from(this.table).delete() as unknown as ChainableQuery
      if (this.selectAfterMutation) {
        query = query.select(this.selectColumns)
      }
    } else {
      query = this.supabaseClient.from(this.table).select(this.selectColumns) as unknown as ChainableQuery
    }

    for (const filter of this.filters) {
      query = query.eq(filter.column, filter.value)
    }

    for (const filter of this.inFilters) {
      query = query.in(filter.column, filter.values)
    }

    for (const order of this.orders) {
      query = query.order(order.column, order.options)
    }

    if (this.limitCount !== null && this.limitCount >= 0) {
      query = query.limit(this.limitCount)
    }

    if (this.singleRequested) {
      query = query.single()
    }

    return Promise.resolve(query)
  }

  private async runLocalMutation(): Promise<QueryResult<unknown>> {
    const userId = await getDesktopUserId()
    if (!userId) {
      return {
        data: null,
        error: {
          message: 'No local user session available for offline mutation',
          code: 'OFFLINE_NO_USER',
        },
      }
    }

    const table = toLocalTableName(this.table)

    try {
      if (this.mutationAction === 'insert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
        const createdRows: Record<string, unknown>[] = []

        for (const row of rows) {
          const payload = isRecord(row) ? { ...row } : {}
          if (typeof payload.user_id !== 'string') {
            payload.user_id = userId
          }

          const created = await invokeDesktopDb<Record<string, unknown>>('createTableRecord', [
            table,
            userId,
            payload,
          ])
          createdRows.push(created)
        }

        return this.formatMutationResult(createdRows, Array.isArray(this.payload))
      }

      if (this.mutationAction === 'update') {
        const patch = isRecord(this.payload) ? this.payload : {}
        let updatedRows: Record<string, unknown>[] = []

        if (this.inFilters.length > 0) {
          const rows = await this.getRowsForLocalMutation(table, userId)
          for (const row of rows) {
            const idValue = row.id
            if (typeof idValue !== 'string') {
              continue
            }

            const nextRows = await invokeDesktopDb<Record<string, unknown>[]>('updateTableRecords', [
              table,
              userId,
              { id: idValue },
              patch,
            ])
            updatedRows = updatedRows.concat(nextRows)
          }
        } else {
          updatedRows = await invokeDesktopDb<Record<string, unknown>[]>('updateTableRecords', [
            table,
            userId,
            this.getFilterRecord(),
            patch,
          ])
        }

        return this.formatMutationResult(updatedRows, true)
      }

      if (this.mutationAction === 'delete') {
        if (this.inFilters.length > 0) {
          const rows = await this.getRowsForLocalMutation(table, userId)

          for (const row of rows) {
            const idValue = row.id
            if (typeof idValue !== 'string') {
              continue
            }

            await invokeDesktopDb<number>('deleteTableRecords', [
              table,
              userId,
              { id: idValue },
            ])
          }
        } else {
          await invokeDesktopDb<number>('deleteTableRecords', [
            table,
            userId,
            this.getFilterRecord(),
          ])
        }

        return {
          data: null,
          error: null,
        }
      }

      return {
        data: null,
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Offline mutation failed',
          code: 'OFFLINE_MUTATION_FAILED',
        },
      }
    }
  }

  private getFilterRecord() {
    const record: Record<string, string | number | boolean | null> = {}

    for (const filter of this.filters) {
      record[filter.column] = toPrimitive(filter.value)
    }

    return record
  }

  private async getRowsForLocalMutation(table: string, userId: string) {
    const baseRows = await invokeDesktopDb<Record<string, unknown>[]>('queryTable', [
      table,
      {
        userId,
        filters: this.getFilterRecord(),
        includeDeleted: true,
      },
    ])

    if (this.inFilters.length === 0) {
      return baseRows
    }

    return baseRows.filter((row) =>
      this.inFilters.every(({ column, values }) =>
        values.some((value) => row[column] === value)
      )
    )
  }

  private formatMutationResult(rows: Record<string, unknown>[], wasArray: boolean): QueryResult<unknown> {
    if (!this.selectAfterMutation) {
      return {
        data: null,
        error: null,
      }
    }

    if (this.singleRequested) {
      if (rows.length === 0) {
        return {
          data: null,
          error: {
            message: 'No rows returned',
            code: 'PGRST116',
          },
        }
      }

      return {
        data: rows[0],
        error: null,
      }
    }

    return {
      data: wasArray ? rows : (rows[0] ?? null),
      error: null,
    }
  }
}

export function createOfflineAwareSupabaseClient<T extends SupabaseClient>(client: T): T {
  if (!isElectronRuntime()) {
    return client
  }

  return new Proxy(client as unknown as Record<string, unknown>, {
    get(target, property, receiver) {
      if (property === 'from') {
        return (table: string) => new OfflineAwareQueryBuilder(client, table)
      }

      const value = Reflect.get(target, property, receiver)
      if (typeof value === 'function') {
        return value.bind(target)
      }

      return value
    },
  }) as T
}
