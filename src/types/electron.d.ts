import type { SessionUser, StoredAuthSession, SyncStatus } from '@/lib/db/types'
import type { Assessment, Subject, Task } from '@/lib/types'

export {}

type PrimitiveFilter = string | number | boolean | null
type TableFilters = Record<string, PrimitiveFilter>
type Unsubscribe = () => void

declare global {
  interface Window {
    process?: {
      type?: string
    }
    electronAPI?: {
      isElectron: true
      db: {
        getSubjects: (userId: string) => Promise<Subject[]>
        getSubjectById: (id: string, userId: string) => Promise<Subject | null>
        createSubject: (userId: string, data: Partial<Subject>) => Promise<Subject>
        updateSubject: (id: string, userId: string, data: Partial<Subject>) => Promise<Subject>
        deleteSubject: (id: string, userId: string) => Promise<void>

        getTasks: (userId: string) => Promise<Task[]>
        getTasksBySubject: (userId: string, subjectId: string) => Promise<Task[]>
        createTask: (userId: string, data: Partial<Task>) => Promise<Task>
        updateTask: (id: string, userId: string, data: Partial<Task>) => Promise<Task>
        deleteTask: (id: string, userId: string) => Promise<void>

        getAssessments: (userId: string) => Promise<Assessment[]>
        getAssessmentsBySubject: (userId: string, subjectId: string) => Promise<Assessment[]>
        createAssessment: (userId: string, data: Partial<Assessment>) => Promise<Assessment>
        updateAssessment: (id: string, userId: string, data: Partial<Assessment>) => Promise<Assessment>
        deleteAssessment: (id: string, userId: string) => Promise<void>

        queryTable: (
          table: string,
          options?: {
            filters?: TableFilters
            orderBy?: string
            ascending?: boolean
            includeDeleted?: boolean
            limit?: number
            userId?: string
          }
        ) => Promise<Record<string, unknown>[]>
        createTableRecord: (table: string, userId: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
        updateTableRecords: (
          table: string,
          userId: string,
          filters: TableFilters,
          patch: Record<string, unknown>
        ) => Promise<Record<string, unknown>[]>
        deleteTableRecords: (table: string, userId: string, filters: TableFilters) => Promise<number>
        invoke: <T>(method: string, args?: unknown[]) => Promise<T>
      }
      sync: {
        start: () => Promise<SyncStatus>
        status: () => Promise<SyncStatus>
        getPendingCount: () => Promise<number>
        getLastSynced: () => Promise<string | null>
        setOnlineState: (online: boolean) => Promise<void>
        onProgress: (callback: (status: SyncStatus) => void) => Unsubscribe
        onComplete: (callback: (status: SyncStatus) => void) => Unsubscribe
        onError: (callback: (status: SyncStatus) => void) => Unsubscribe
        onStatusChange: (callback: (status: SyncStatus) => void) => Unsubscribe
      }
      auth: {
        getToken: () => Promise<string | null>
        setToken: (session: StoredAuthSession) => Promise<void>
        clearToken: () => Promise<void>
        getUser: () => Promise<SessionUser | null>
        storeSession: (session: StoredAuthSession) => Promise<void>
        clearSession: () => Promise<void>
        getLastUser: () => Promise<SessionUser | null>
      }
      app: {
        getVersion: () => Promise<string>
        getPlatform: () => Promise<NodeJS.Platform>
        openExternal: (url: string) => Promise<void>
        checkUpdate: () => Promise<{ supported: boolean }>
        quit: () => Promise<void>
        minimize: () => Promise<void>
        maximize: () => Promise<void>
      }
      platform: {
        isOnline: () => Promise<boolean>
        onOnlineChange: (callback: (online: boolean) => void) => Unsubscribe
        getPath: (name: string) => Promise<string>
      }

      // Backward-compatible methods used by existing renderer code paths.
      getAppVersion: () => Promise<string>
      getPlatform: () => Promise<NodeJS.Platform>
      openExternal: (url: string) => Promise<void>
      dbInvoke: <T>(method: string, args?: unknown[]) => Promise<T>
      getSyncStatus: () => Promise<SyncStatus>
      runSync: () => Promise<SyncStatus>
      setOnlineState: (online: boolean) => Promise<void>
      storeAuthSession: (session: StoredAuthSession) => Promise<void>
      clearAuthSession: () => Promise<void>
      getLastAuthUser: () => Promise<SessionUser | null>
      onOnlineStatusChange: (callback: (online: boolean) => void) => Unsubscribe
    }
  }
}
