import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './ipc/channels'
import type { SessionUser, StoredAuthSession, SyncStatus } from './shared-types'

type SyncStatusCallback = (status: SyncStatus) => void
type OnlineStatusCallback = (online: boolean) => void
type GenericCallback<T> = (payload: T) => void
type Unsubscribe = () => void

function subscribe<T>(channel: string, callback: GenericCallback<T>): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload)
  ipcRenderer.on(channel, listener)

  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const electronApi = {
  isElectron: true as const,

  db: {
    getSubjects: (userId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.GET_SUBJECTS, userId),
    getSubjectById: (id: string, userId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.GET_SUBJECT_BY_ID, id, userId),
    createSubject: (userId: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.CREATE_SUBJECT, userId, data),
    updateSubject: (id: string, userId: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.UPDATE_SUBJECT, id, userId, data),
    deleteSubject: (id: string, userId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.DELETE_SUBJECT, id, userId),

    getTasks: (userId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.GET_TASKS, userId),
    getTasksBySubject: (userId: string, subjectId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.GET_TASKS_BY_SUBJECT, userId, subjectId),
    createTask: (userId: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.CREATE_TASK, userId, data),
    updateTask: (id: string, userId: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.UPDATE_TASK, id, userId, data),
    deleteTask: (id: string, userId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.DELETE_TASK, id, userId),

    getAssessments: (userId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.GET_ASSESSMENTS, userId),
    getAssessmentsBySubject: (userId: string, subjectId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.GET_ASSESSMENTS_BY_SUBJECT, userId, subjectId),
    createAssessment: (userId: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.CREATE_ASSESSMENT, userId, data),
    updateAssessment: (id: string, userId: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.UPDATE_ASSESSMENT, id, userId, data),
    deleteAssessment: (id: string, userId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.DELETE_ASSESSMENT, id, userId),

    queryTable: (
      table: string,
      options?: {
        filters?: Record<string, string | number | boolean | null>
        orderBy?: string
        ascending?: boolean
        includeDeleted?: boolean
        limit?: number
        userId?: string
      }
    ) => ipcRenderer.invoke(IPC_CHANNELS.DB.QUERY_TABLE, table, options),
    createTableRecord: (table: string, userId: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.CREATE_TABLE_RECORD, table, userId, data),
    updateTableRecords: (
      table: string,
      userId: string,
      filters: Record<string, string | number | boolean | null>,
      patch: Record<string, unknown>
    ) => ipcRenderer.invoke(IPC_CHANNELS.DB.UPDATE_TABLE_RECORDS, table, userId, filters, patch),
    deleteTableRecords: (
      table: string,
      userId: string,
      filters: Record<string, string | number | boolean | null>
    ) => ipcRenderer.invoke(IPC_CHANNELS.DB.DELETE_TABLE_RECORDS, table, userId, filters),
    invoke: <T>(method: string, args: unknown[] = []) =>
      ipcRenderer.invoke(IPC_CHANNELS.DB.INVOKE, method, args) as Promise<T>,
  },

  sync: {
    start: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC.START) as Promise<SyncStatus>,
    status: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC.STATUS) as Promise<SyncStatus>,
    getPendingCount: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC.GET_PENDING_COUNT) as Promise<number>,
    getLastSynced: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC.GET_LAST_SYNCED) as Promise<string | null>,
    setOnlineState: (online: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.SET_ONLINE_STATE, online) as Promise<void>,
    onProgress: (callback: SyncStatusCallback) => subscribe(IPC_CHANNELS.SYNC.ON_SYNC_PROGRESS, callback),
    onComplete: (callback: SyncStatusCallback) => subscribe(IPC_CHANNELS.SYNC.ON_SYNC_COMPLETE, callback),
    onError: (callback: SyncStatusCallback) => subscribe(IPC_CHANNELS.SYNC.ON_SYNC_ERROR, callback),
    onStatusChange: (callback: SyncStatusCallback) => subscribe(IPC_CHANNELS.SYNC.ON_STATUS_CHANGE, callback),
  },

  auth: {
    getToken: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_TOKEN) as Promise<string | null>,
    setToken: (session: StoredAuthSession) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.SET_TOKEN, session) as Promise<void>,
    clearToken: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.CLEAR_TOKEN) as Promise<void>,
    getUser: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_USER) as Promise<SessionUser | null>,
    storeSession: (session: StoredAuthSession) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.STORE_SESSION, session) as Promise<void>,
    clearSession: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.CLEAR_SESSION) as Promise<void>,
    getLastUser: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_LAST_USER) as Promise<SessionUser | null>,
  },

  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION) as Promise<string>,
    getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_PLATFORM) as Promise<NodeJS.Platform>,
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.APP.OPEN_EXTERNAL, url) as Promise<void>,
    checkUpdate: () =>
      ipcRenderer.invoke(IPC_CHANNELS.APP.CHECK_UPDATE) as Promise<{
        supported: boolean
        checking?: boolean
        updateAvailable?: boolean
        downloaded?: boolean
        currentVersion?: string
        latestVersion?: string | null
        message?: string
        error?: string | null
      }>,
    applyUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP.APPLY_UPDATE) as Promise<boolean>,
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP.QUIT) as Promise<void>,
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.APP.MINIMIZE) as Promise<void>,
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.APP.MAXIMIZE) as Promise<void>,
  },

  platform: {
    isOnline: () => ipcRenderer.invoke(IPC_CHANNELS.PLATFORM.IS_ONLINE) as Promise<boolean>,
    getPath: (name: Parameters<Electron.App['getPath']>[0]) =>
      ipcRenderer.invoke(IPC_CHANNELS.PLATFORM.GET_PATH, name) as Promise<string>,
    onOnlineChange: (callback: OnlineStatusCallback) => {
      const detachIpc = subscribe<boolean>(IPC_CHANNELS.PLATFORM.ON_ONLINE_CHANGE, callback)
      const onlineHandler = () => callback(true)
      const offlineHandler = () => callback(false)

      window.addEventListener('online', onlineHandler)
      window.addEventListener('offline', offlineHandler)

      return () => {
        detachIpc()
        window.removeEventListener('online', onlineHandler)
        window.removeEventListener('offline', offlineHandler)
      }
    },
  },
} as const

const legacyApi = {
  getAppVersion: electronApi.app.getVersion,
  getPlatform: electronApi.app.getPlatform,
  openExternal: electronApi.app.openExternal,
  dbInvoke: electronApi.db.invoke,
  getSyncStatus: electronApi.sync.status,
  runSync: electronApi.sync.start,
  setOnlineState: electronApi.sync.setOnlineState,
  storeAuthSession: electronApi.auth.storeSession,
  clearAuthSession: electronApi.auth.clearSession,
  getLastAuthUser: electronApi.auth.getLastUser,
  onOnlineStatusChange: (callback: OnlineStatusCallback) => electronApi.platform.onOnlineChange(callback),
}

contextBridge.exposeInMainWorld('electronAPI', {
  ...electronApi,
  ...legacyApi,
})
