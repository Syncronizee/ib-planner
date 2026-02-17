import { safeStorage } from 'electron'
import Store from 'electron-store'
import type { SessionUser, StoredAuthSession } from '../shared-types'

type AuthStoreSchema = {
  session: string | null
  lastUser: SessionUser | null
}

function encode(data: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    return data
  }

  return safeStorage.encryptString(data).toString('base64')
}

function decode(data: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    return data
  }

  return safeStorage.decryptString(Buffer.from(data, 'base64'))
}

export class TokenStore {
  private readonly store: Store<AuthStoreSchema>

  private setValue<K extends keyof AuthStoreSchema>(key: K, value: AuthStoreSchema[K]) {
    ;(this.store as unknown as { set: (key: K, value: AuthStoreSchema[K]) => void }).set(key, value)
  }

  private getValue<K extends keyof AuthStoreSchema>(key: K) {
    return (this.store as unknown as { get: (key: K) => AuthStoreSchema[K] }).get(key)
  }

  constructor() {
    this.store = new Store<AuthStoreSchema>({
      name: 'auth-session',
      defaults: {
        session: null,
        lastUser: null,
      },
    })
  }

  setSession(session: StoredAuthSession) {
    const serialized = JSON.stringify(session)
    this.setValue('session', encode(serialized))
    this.setValue('lastUser', session.user)
  }

  getSession(): StoredAuthSession | null {
    const encoded = this.getValue('session')

    if (!encoded) {
      return null
    }

    try {
      const payload = decode(encoded)
      return JSON.parse(payload) as StoredAuthSession
    } catch {
      return null
    }
  }

  clearSession() {
    this.setValue('session', null)
  }

  getLastUser() {
    return this.getValue('lastUser')
  }

  setLastUser(user: SessionUser | null) {
    this.setValue('lastUser', user)
  }
}
