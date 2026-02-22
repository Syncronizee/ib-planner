import { app, BrowserWindow, dialog, ipcMain, net, session, shell } from 'electron'
import { fork, type ChildProcess } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { autoUpdater } from 'electron-updater'
import { closeDatabase, initializeDatabase } from './database/connection'
import { LocalDatabaseService, type RowRecord } from './database/local-database'
import { SyncManager } from './sync/sync-manager'
import { TokenStore } from './auth/token-store'
import { IPC_CHANNELS } from './ipc/channels'
import type { StoredAuthSession } from './shared-types'

const isDev = !app.isPackaged
const appHost = '127.0.0.1'
const appPort = Number(process.env.PORT || '3789')
const SAFE_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

const ALLOWED_DB_METHODS = new Set([
  'getSubjects',
  'getSubjectById',
  'createSubject',
  'updateSubject',
  'deleteSubject',
  'getTasks',
  'getTasksBySubject',
  'createTask',
  'updateTask',
  'deleteTask',
  'getAssessments',
  'getAssessmentsBySubject',
  'createAssessment',
  'updateAssessment',
  'deleteAssessment',
  'queryTable',
  'createTableRecord',
  'updateTableRecords',
  'deleteTableRecords',
])

let nextServerProcess: ChildProcess | null = null
let localDatabaseService: LocalDatabaseService | null = null
let syncManager: SyncManager | null = null
let tokenStore: TokenStore | null = null
let mainWindow: BrowserWindow | null = null
let manualOfflineMode = false
let requestBlockerInstalled = false
let networkWatchTimer: NodeJS.Timeout | null = null
let updateInitialized = false

type AppUpdateState = {
  supported: boolean
  checking: boolean
  updateAvailable: boolean
  downloaded: boolean
  currentVersion: string
  latestVersion: string | null
  message: string
  error: string | null
}

const appUpdateState: AppUpdateState = {
  supported: false,
  checking: false,
  updateAvailable: false,
  downloaded: false,
  currentVersion: app.getVersion(),
  latestVersion: null,
  message: 'Updates are only available in packaged builds.',
  error: null,
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ''}`
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function writeStartupLog(message: string, error?: unknown) {
  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] ${message}${error ? `\n${formatError(error)}` : ''}\n`

  try {
    const logsDir = app.isReady()
      ? app.getPath('logs')
      : path.join(app.getPath('home'), 'Library', 'Logs')
    const appLogsDir = path.join(logsDir, 'IB Planner')
    mkdirSync(appLogsDir, { recursive: true })
    appendFileSync(path.join(appLogsDir, 'main.log'), logLine, 'utf8')
  } catch {
    // Best-effort logging; ignore filesystem issues.
  }

  if (error) {
    console.error(message, error)
  } else {
    console.log(message)
  }
}

function showStartupErrorWindow(error: unknown) {
  const window = new BrowserWindow({
    width: 860,
    height: 560,
    minWidth: 700,
    minHeight: 420,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>IB Planner Startup Error</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 0; background: #0f1115; color: #e8ecf3; }
    .wrap { padding: 24px; }
    h1 { margin: 0 0 12px; font-size: 20px; }
    p { margin: 0 0 12px; color: #b8c1d1; }
    pre { background: #171a21; border: 1px solid #2c3340; border-radius: 10px; padding: 12px; overflow: auto; white-space: pre-wrap; }
    code { color: #8ad5ff; }
  </style></head><body><div class="wrap">
    <h1>IB Planner failed to start</h1>
    <p>Open <code>~/Library/Logs/IB Planner/main.log</code> and share the latest entries.</p>
    <pre>${formatError(error).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>
  </div></body></html>`

  void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}

function loadDesktopEnv() {
  const candidates = [
    path.resolve(__dirname, 'electron.env'),
    path.resolve(__dirname, '..', 'electron.env'),
    path.resolve(process.resourcesPath, 'app.asar', 'dist-electron', 'electron.env'),
    path.resolve(process.resourcesPath, 'app.asar.unpacked', 'dist-electron', 'electron.env'),
    path.resolve(process.resourcesPath, 'dist-electron', 'electron.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ]

  for (const file of candidates) {
    if (existsSync(file)) {
      loadEnv({ path: file, override: false })
    }
  }
}

function getProdAppUrl() {
  return `http://${appHost}:${appPort}`
}

function isSafeExternalUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    return SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

function isTrustedRendererUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    const prodOrigin = new URL(getProdAppUrl()).origin
    if (parsed.origin === prodOrigin) {
      return true
    }

    if (isDev) {
      const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000'
      return parsed.origin === new URL(devUrl).origin
    }

    return false
  } catch {
    return false
  }
}

async function waitForServerReady(url: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(1_500),
      })

      if (response.status > 0) {
        return true
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  return false
}

function getSupabaseOrigin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    return null
  }

  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

function installSupabaseRequestBlocker() {
  if (requestBlockerInstalled) {
    return
  }

  requestBlockerInstalled = true
  const supabaseOrigin = getSupabaseOrigin()

  if (!supabaseOrigin) {
    return
  }

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (manualOfflineMode && details.url.startsWith(supabaseOrigin)) {
      const method = details.method.toUpperCase()
      const isReadMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
      const isMutatingSupabaseApi =
        details.url.includes('/rest/v1/') ||
        details.url.includes('/storage/v1/') ||
        details.url.includes('/functions/v1/')

      if (!isReadMethod && isMutatingSupabaseApi) {
        callback({ cancel: true })
        return
      }
    }

    callback({})
  })
}

function resolveStandaloneServerPath() {
  const packagedCandidates = [
    path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
    path.join(process.resourcesPath, '.next', 'standalone', 'server.js'),
  ]
  const devCandidates = [path.join(__dirname, '..', '.next', 'standalone', 'server.js')]
  const candidates = app.isPackaged ? packagedCandidates : [...packagedCandidates, ...devCandidates]

  const resolved = candidates.find((candidate) => existsSync(candidate))
  if (resolved) {
    return resolved
  }

  return app.isPackaged ? packagedCandidates[0] : devCandidates[0]
}

function resolveStaticIndexPath() {
  const candidates = [
    path.join(__dirname, '..', 'out', 'index.html'),
    path.join(process.resourcesPath, 'out', 'index.html'),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

async function loadStaticFallback(window: BrowserWindow, originalError: unknown) {
  const fallbackIndexPath = resolveStaticIndexPath()

  if (existsSync(fallbackIndexPath)) {
    writeStartupLog('Loading static fallback page', { fallbackIndexPath, originalError })
    await window.loadFile(fallbackIndexPath)
    return
  }

  writeStartupLog('No static fallback found, loading startup error page', originalError)
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>IB Planner Startup Error</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 0; background: #0f1115; color: #e8ecf3; }
    .wrap { padding: 24px; }
    h1 { margin: 0 0 12px; font-size: 20px; }
    p { margin: 0 0 12px; color: #b8c1d1; }
    pre { background: #171a21; border: 1px solid #2c3340; border-radius: 10px; padding: 12px; overflow: auto; white-space: pre-wrap; }
    code { color: #8ad5ff; }
  </style></head><body><div class="wrap">
    <h1>IB Planner failed to load bundled content</h1>
    <p>Open <code>~/Library/Logs/IB Planner/main.log</code> and share the latest entries.</p>
    <pre>${formatError(originalError).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>
  </div></body></html>`

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}

function startNextServer() {
  if (nextServerProcess) {
    return
  }

  const standaloneServerPath = resolveStandaloneServerPath()
  if (!existsSync(standaloneServerPath)) {
    throw new Error(`Missing standalone server at ${standaloneServerPath}`)
  }

  nextServerProcess = fork(standaloneServerPath, {
    cwd: path.dirname(standaloneServerPath),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOSTNAME: appHost,
      PORT: String(appPort),
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'inherit',
  })
}

function broadcast<T>(channel: string, payload: T) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload)
    }
  }
}

function getUpdateState() {
  return { ...appUpdateState }
}

function setUpdateState(patch: Partial<AppUpdateState>) {
  Object.assign(appUpdateState, patch)
}

function initializeAutoUpdater() {
  if (updateInitialized || !app.isPackaged) {
    return
  }

  updateInitialized = true
  setUpdateState({
    supported: true,
    message: 'Checking for updates…',
    error: null,
  })

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({
      checking: true,
      message: 'Checking for updates…',
      error: null,
    })
  })

  autoUpdater.on('update-available', (info) => {
    setUpdateState({
      checking: false,
      updateAvailable: true,
      downloaded: false,
      latestVersion: info.version,
      message: `Update ${info.version} is downloading…`,
      error: null,
    })
  })

  autoUpdater.on('update-not-available', () => {
    setUpdateState({
      checking: false,
      updateAvailable: false,
      downloaded: false,
      latestVersion: null,
      message: 'You are on the latest version.',
      error: null,
    })
  })

  autoUpdater.on('update-downloaded', async (info) => {
    setUpdateState({
      checking: false,
      updateAvailable: true,
      downloaded: true,
      latestVersion: info.version,
      message: `Update ${info.version} is ready to install.`,
      error: null,
    })

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'Restart now to apply the update.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })

    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.on('error', (error) => {
    setUpdateState({
      checking: false,
      error: error.message,
      message: 'Update check failed.',
    })
    writeStartupLog('Auto-updater error', error)
  })

  void autoUpdater.checkForUpdates()
}

async function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow = window

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
    }
  })

  // Prevent untrusted renderer navigation and force external links to open in OS browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    if (isTrustedRendererUrl(navigationUrl)) {
      return
    }

    event.preventDefault()
    if (isSafeExternalUrl(navigationUrl)) {
      void shell.openExternal(navigationUrl)
    }
  })

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    writeStartupLog('Window failed to load content', { errorCode, errorDescription, validatedURL })
  })

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000'
    await window.loadURL(devUrl, { extraHeaders: 'x-electron-runtime: 1\n' })
    window.webContents.openDevTools({ mode: 'detach' })
    return
  }

  try {
    startNextServer()
    const prodUrl = getProdAppUrl()
    const ready = await waitForServerReady(prodUrl)

    if (!ready) {
      throw new Error(`Timed out waiting for bundled server at ${prodUrl}`)
    }

    await window.loadURL(prodUrl, { extraHeaders: 'x-electron-runtime: 1\n' })
  } catch (error) {
    await loadStaticFallback(window, error)
  }
}

function ensureServices() {
  if (!localDatabaseService || !syncManager || !tokenStore) {
    throw new Error('Electron services are not initialized')
  }

  return {
    localDatabaseService,
    syncManager,
    tokenStore,
  }
}

async function runSyncIfOnline() {
  const { syncManager: manager } = ensureServices()
  if (manager.getStatus().online) {
    await manager.syncNow()
  }
}

function registerSyncEventForwarding() {
  const { syncManager: manager } = ensureServices()

  manager.on('progress', (status) => {
    broadcast(IPC_CHANNELS.SYNC.ON_SYNC_PROGRESS, status)
  })

  manager.on('complete', (status) => {
    broadcast(IPC_CHANNELS.SYNC.ON_SYNC_COMPLETE, status)
  })

  manager.on('error', (status) => {
    broadcast(IPC_CHANNELS.SYNC.ON_SYNC_ERROR, status)
  })

  manager.on('status', (status) => {
    broadcast(IPC_CHANNELS.SYNC.ON_STATUS_CHANGE, status)
  })
}

function registerOnlineWatch() {
  const initialOnline = net.isOnline() && !manualOfflineMode
  let previousOnline = initialOnline
  broadcast(IPC_CHANNELS.PLATFORM.ON_ONLINE_CHANGE, initialOnline)

  if (networkWatchTimer) {
    clearInterval(networkWatchTimer)
  }

  networkWatchTimer = setInterval(() => {
    const currentOnline = net.isOnline() && !manualOfflineMode
    if (currentOnline !== previousOnline) {
      previousOnline = currentOnline
      broadcast(IPC_CHANNELS.PLATFORM.ON_ONLINE_CHANGE, currentOnline)
    }
  }, 5_000)
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => app.getVersion())
  ipcMain.handle(IPC_CHANNELS.APP.GET_PLATFORM, () => process.platform)
  ipcMain.handle(IPC_CHANNELS.APP.OPEN_EXTERNAL, async (_event, url: string) => {
    if (!isSafeExternalUrl(url)) {
      throw new Error('Blocked unsafe external URL')
    }

    await shell.openExternal(url)
  })
  ipcMain.handle(IPC_CHANNELS.APP.CHECK_UPDATE, async () => {
    if (!app.isPackaged) {
      return getUpdateState()
    }

    initializeAutoUpdater()
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      setUpdateState({
        checking: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Update check failed.',
      })
    }
    return getUpdateState()
  })
  ipcMain.handle(IPC_CHANNELS.APP.APPLY_UPDATE, async () => {
    if (!app.isPackaged || !appUpdateState.downloaded) {
      return false
    }
    autoUpdater.quitAndInstall()
    return true
  })
  ipcMain.handle(IPC_CHANNELS.APP.QUIT, () => app.quit())
  ipcMain.handle(IPC_CHANNELS.APP.MINIMIZE, () => {
    mainWindow?.minimize()
  })
  ipcMain.handle(IPC_CHANNELS.APP.MAXIMIZE, () => {
    if (!mainWindow) {
      return
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM.IS_ONLINE, () => net.isOnline() && !manualOfflineMode)
  ipcMain.handle(IPC_CHANNELS.PLATFORM.GET_PATH, (_event, targetPath: Parameters<Electron.App['getPath']>[0]) => {
    return app.getPath(targetPath)
  })

  ipcMain.handle(IPC_CHANNELS.DB.GET_SUBJECTS, (_event, userId: string) => {
    return ensureServices().localDatabaseService.getSubjects(userId)
  })
  ipcMain.handle(IPC_CHANNELS.DB.GET_SUBJECT_BY_ID, (_event, id: string, userId: string) => {
    return ensureServices().localDatabaseService.getSubjectById(id, userId)
  })
  ipcMain.handle(IPC_CHANNELS.DB.CREATE_SUBJECT, (_event, userId: string, data: Record<string, unknown>) => {
    return ensureServices().localDatabaseService.createSubject(userId, data)
  })
  ipcMain.handle(IPC_CHANNELS.DB.UPDATE_SUBJECT, (_event, id: string, userId: string, data: Record<string, unknown>) => {
    return ensureServices().localDatabaseService.updateSubject(id, userId, data)
  })
  ipcMain.handle(IPC_CHANNELS.DB.DELETE_SUBJECT, (_event, id: string, userId: string) => {
    return ensureServices().localDatabaseService.deleteSubject(id, userId)
  })

  ipcMain.handle(IPC_CHANNELS.DB.GET_TASKS, (_event, userId: string) => {
    return ensureServices().localDatabaseService.getTasks(userId)
  })
  ipcMain.handle(IPC_CHANNELS.DB.GET_TASKS_BY_SUBJECT, (_event, userId: string, subjectId: string) => {
    return ensureServices().localDatabaseService.getTasksBySubject(userId, subjectId)
  })
  ipcMain.handle(IPC_CHANNELS.DB.CREATE_TASK, (_event, userId: string, data: Record<string, unknown>) => {
    return ensureServices().localDatabaseService.createTask(userId, data)
  })
  ipcMain.handle(IPC_CHANNELS.DB.UPDATE_TASK, (_event, id: string, userId: string, data: Record<string, unknown>) => {
    return ensureServices().localDatabaseService.updateTask(id, userId, data)
  })
  ipcMain.handle(IPC_CHANNELS.DB.DELETE_TASK, (_event, id: string, userId: string) => {
    return ensureServices().localDatabaseService.deleteTask(id, userId)
  })

  ipcMain.handle(IPC_CHANNELS.DB.GET_ASSESSMENTS, (_event, userId: string) => {
    return ensureServices().localDatabaseService.getAssessments(userId)
  })
  ipcMain.handle(IPC_CHANNELS.DB.GET_ASSESSMENTS_BY_SUBJECT, (_event, userId: string, subjectId: string) => {
    return ensureServices().localDatabaseService.getAssessmentsBySubject(userId, subjectId)
  })
  ipcMain.handle(IPC_CHANNELS.DB.CREATE_ASSESSMENT, (_event, userId: string, data: Record<string, unknown>) => {
    return ensureServices().localDatabaseService.createAssessment(userId, data)
  })
  ipcMain.handle(IPC_CHANNELS.DB.UPDATE_ASSESSMENT, (_event, id: string, userId: string, data: Record<string, unknown>) => {
    return ensureServices().localDatabaseService.updateAssessment(id, userId, data)
  })
  ipcMain.handle(IPC_CHANNELS.DB.DELETE_ASSESSMENT, (_event, id: string, userId: string) => {
    return ensureServices().localDatabaseService.deleteAssessment(id, userId)
  })

  ipcMain.handle(
    IPC_CHANNELS.DB.QUERY_TABLE,
    (
      _event,
      table: string,
      options?: {
        filters?: Record<string, string | number | boolean | null>
        orderBy?: string
        ascending?: boolean
        includeDeleted?: boolean
        limit?: number
        userId?: string
      }
    ) => ensureServices().localDatabaseService.queryTable(table, options)
  )
  ipcMain.handle(
    IPC_CHANNELS.DB.CREATE_TABLE_RECORD,
    (_event, table: string, userId: string, data: RowRecord) => {
      return ensureServices().localDatabaseService.createTableRecord(table, userId, data)
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.DB.UPDATE_TABLE_RECORDS,
    (
      _event,
      table: string,
      userId: string,
      filters: Record<string, string | number | boolean | null>,
      patch: RowRecord
    ) => ensureServices().localDatabaseService.updateTableRecords(table, userId, filters, patch)
  )
  ipcMain.handle(
    IPC_CHANNELS.DB.DELETE_TABLE_RECORDS,
    (_event, table: string, userId: string, filters: Record<string, string | number | boolean | null>) => {
      return ensureServices().localDatabaseService.deleteTableRecords(table, userId, filters)
    }
  )
  ipcMain.handle(IPC_CHANNELS.DB.INVOKE, (_event, method: string, args: unknown[] = []) => {
    if (!ALLOWED_DB_METHODS.has(method)) {
      throw new Error(`Unsupported database method: ${method}`)
    }

    return ensureServices().localDatabaseService.invoke(method, args)
  })

  ipcMain.handle(IPC_CHANNELS.SYNC.STATUS, async () => {
    return ensureServices().syncManager.getStatus()
  })
  ipcMain.handle(IPC_CHANNELS.SYNC.START, async () => {
    return ensureServices().syncManager.syncNow()
  })
  ipcMain.handle(IPC_CHANNELS.SYNC.GET_PENDING_COUNT, async () => {
    const { syncManager: manager, tokenStore: store } = ensureServices()
    const userId = store.getSession()?.user?.id
    if (!userId) {
      return 0
    }
    return manager.getPendingChanges(userId)
  })
  ipcMain.handle(IPC_CHANNELS.SYNC.GET_LAST_SYNCED, async () => {
    return ensureServices().syncManager.getStatus().lastSyncedAt
  })
  ipcMain.handle(IPC_CHANNELS.SYNC.SET_ONLINE_STATE, async (_event, online: boolean) => {
    const nextOnline = Boolean(online)
    manualOfflineMode = !nextOnline
    await ensureServices().syncManager.setOnline(nextOnline)
    broadcast(IPC_CHANNELS.PLATFORM.ON_ONLINE_CHANGE, nextOnline)
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.SET_TOKEN, async (_event, sessionPayload: StoredAuthSession) => {
    const { tokenStore: store } = ensureServices()
    store.setSession(sessionPayload)
    await runSyncIfOnline()
  })
  ipcMain.handle(IPC_CHANNELS.AUTH.GET_TOKEN, async () => {
    return ensureServices().tokenStore.getSession()?.accessToken ?? null
  })
  ipcMain.handle(IPC_CHANNELS.AUTH.CLEAR_TOKEN, async () => {
    ensureServices().tokenStore.clearSession()
  })
  ipcMain.handle(IPC_CHANNELS.AUTH.GET_USER, async () => {
    return ensureServices().tokenStore.getSession()?.user ?? null
  })

  // Backward-compatible auth handlers.
  ipcMain.handle(IPC_CHANNELS.AUTH.STORE_SESSION, async (_event, sessionPayload: StoredAuthSession) => {
    const { tokenStore: store } = ensureServices()
    store.setSession(sessionPayload)
    await runSyncIfOnline()
  })
  ipcMain.handle(IPC_CHANNELS.AUTH.CLEAR_SESSION, async () => {
    ensureServices().tokenStore.clearSession()
  })
  ipcMain.handle(IPC_CHANNELS.AUTH.GET_LAST_USER, async () => {
    return ensureServices().tokenStore.getLastUser()
  })
}

app.whenReady().then(async () => {
  process.on('uncaughtException', (error) => {
    writeStartupLog('Unhandled exception in main process', error)
  })

  process.on('unhandledRejection', (reason) => {
    writeStartupLog('Unhandled rejection in main process', reason)
  })

  writeStartupLog('Electron app boot sequence started')

  loadDesktopEnv()
  installSupabaseRequestBlocker()

  const db = initializeDatabase()
  localDatabaseService = new LocalDatabaseService(db)
  tokenStore = new TokenStore()
  syncManager = new SyncManager(localDatabaseService, tokenStore)

  await syncManager.initialize()
  await syncManager.setOnline(net.isOnline())

  registerIpcHandlers()
  registerSyncEventForwarding()
  registerOnlineWatch()
  await createMainWindow()
  initializeAutoUpdater()
  writeStartupLog('Electron app boot sequence completed')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow()
    }
  })
}).catch((error) => {
  writeStartupLog('Failed to initialize Electron services', error)
  showStartupErrorWindow(error)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (nextServerProcess && !nextServerProcess.killed) {
    nextServerProcess.kill()
  }
  nextServerProcess = null

  if (networkWatchTimer) {
    clearInterval(networkWatchTimer)
    networkWatchTimer = null
  }

  closeDatabase()
})
