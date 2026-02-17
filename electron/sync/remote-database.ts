import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SyncTable } from '../database/local-database'
import type { StoredAuthSession } from '../shared-types'

type RemoteRecord = Record<string, unknown>

const LOCAL_ONLY_FIELDS = new Set(['remote_id', 'synced_at', 'is_dirty', 'deleted_at'])

const TABLE_ALIASES: Partial<Record<SyncTable, string[]>> = {
  tok_essays: ['tok_essay'],
  tok_exhibitions: ['tok_exhibition'],
  tok_exhibition_objects: ['tok_exhibition_object'],
  tok_knowledge_questions: ['tok_knowledge_question'],
  tok_notes: ['tok_note'],
  tok_prompts: ['tok_prompt'],
  cas_experiences: ['cas_experience'],
  cas_reflections: ['cas_reflection'],
  cas_experience_outcomes: ['cas_experience_outcome'],
}

function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase env vars are missing for desktop sync')
  }

  return { url, anonKey }
}

function createAuthedClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = requireSupabaseEnv()

  return createClient(url, anonKey, {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

function sanitizeRow(row: RemoteRecord) {
  const payload: RemoteRecord = {}

  for (const [key, value] of Object.entries(row)) {
    if (LOCAL_ONLY_FIELDS.has(key)) {
      continue
    }

    if (value === undefined) {
      continue
    }

    payload[key] = value
  }

  return payload
}

function singularize(name: string) {
  if (name.endsWith('ies')) {
    return `${name.slice(0, -3)}y`
  }

  if (name.endsWith('ses')) {
    return name.slice(0, -2)
  }

  if (name.endsWith('s')) {
    return name.slice(0, -1)
  }

  return name
}

function isTableMissingError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as Record<string, unknown>
  if (candidate.code === 'PGRST205') {
    return true
  }

  const message = typeof candidate.message === 'string' ? candidate.message : ''
  return message.includes('PGRST205') || message.includes('Could not find the table')
}

function extractMissingColumnFromError(error: unknown, tableName: string) {
  if (!error || typeof error !== 'object') {
    return null
  }

  const candidate = error as Record<string, unknown>
  const code = typeof candidate.code === 'string' ? candidate.code : null
  const message = typeof candidate.message === 'string' ? candidate.message : null

  if (code !== 'PGRST204' || !message) {
    return null
  }

  const escapedTableName = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const exactPattern = new RegExp(`Could not find the '([^']+)' column of '${escapedTableName}' in the schema cache`)
  const fallbackPattern = /Could not find the '([^']+)' column/i

  const exact = message.match(exactPattern)
  if (exact?.[1]) {
    return exact[1]
  }

  const fallback = message.match(fallbackPattern)
  return fallback?.[1] ?? null
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export class RemoteSyncDatabase {
  private readonly resolvedTableNames = new Map<SyncTable, string>()

  async refreshSession(refreshToken: string): Promise<StoredAuthSession> {
    const { url, anonKey } = requireSupabaseEnv()
    const client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })

    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.session || !data.user) {
      throw error ?? new Error('Unable to refresh auth session')
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? null,
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    }
  }

  async fetchByUser(table: SyncTable, userId: string, accessToken: string) {
    const client = createAuthedClient(accessToken)

    return this.withTableResolution(table, async (remoteTable) => {
      const { data, error } = await client
        .from(remoteTable)
        .select('*')
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      return (data ?? []) as RemoteRecord[]
    })
  }

  async upsert(table: SyncTable, row: RemoteRecord, accessToken: string) {
    const client = createAuthedClient(accessToken)

    return this.withTableResolution(table, async (remoteTable) => {
      const payload = sanitizeRow(row)
      const removedColumns = new Set<string>()

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const { data, error } = await client
          .from(remoteTable)
          .upsert(payload, { onConflict: 'id' })
          .select('*')
          .single()

        if (!error) {
          return data as RemoteRecord
        }

        const missingColumn = extractMissingColumnFromError(error, remoteTable)
        if (
          missingColumn &&
          Object.prototype.hasOwnProperty.call(payload, missingColumn) &&
          !removedColumns.has(missingColumn)
        ) {
          delete payload[missingColumn]
          removedColumns.add(missingColumn)
          continue
        }

        throw error
      }

      throw new Error(`Exceeded retry budget while syncing table "${table}"`)
    })
  }

  async delete(table: SyncTable, id: string, userId: string, accessToken: string) {
    const client = createAuthedClient(accessToken)

    return this.withTableResolution(table, async (remoteTable) => {
      const { error } = await client.from(remoteTable).delete().eq('id', id).eq('user_id', userId)

      if (error) {
        throw error
      }
    })
  }

  private getTableCandidates(table: SyncTable) {
    const resolved = this.resolvedTableNames.get(table)
    const explicitAliases = TABLE_ALIASES[table] ?? []
    const singularAlias = singularize(table)

    return unique([
      resolved ?? '',
      table,
      ...explicitAliases,
      singularAlias,
    ])
  }

  private async withTableResolution<T>(table: SyncTable, operation: (remoteTable: string) => Promise<T>) {
    let lastMissingTableError: unknown = null

    for (const candidate of this.getTableCandidates(table)) {
      try {
        const result = await operation(candidate)
        this.resolvedTableNames.set(table, candidate)
        return result
      } catch (error) {
        if (isTableMissingError(error)) {
          lastMissingTableError = error
          continue
        }

        throw error
      }
    }

    if (lastMissingTableError) {
      throw lastMissingTableError
    }

    throw new Error(`Unable to resolve remote table for "${table}"`)
  }
}
