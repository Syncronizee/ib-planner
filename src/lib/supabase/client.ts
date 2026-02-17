import { createBrowserClient } from '@supabase/ssr'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createOfflineAwareSupabaseClient } from '@/lib/supabase/offline-client'

let browserClient: ReturnType<typeof createBrowserClient> | null = null
let appClient: ReturnType<typeof createBrowserClient> | null = null
let authBridgeAttached = false

async function pushSessionToElectron(session: Session | null) {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return
  }

  try {
    if (!session?.access_token || !session.user?.id) {
      if (window.electronAPI.auth?.clearToken) {
        await window.electronAPI.auth.clearToken()
      } else if (window.electronAPI.clearAuthSession) {
        await window.electronAPI.clearAuthSession()
      }
      return
    }

    const payload = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? null,
      user: {
        id: session.user.id,
        email: session.user.email ?? null,
      },
    }

    if (window.electronAPI.auth?.setToken) {
      await window.electronAPI.auth.setToken(payload)
    } else if (window.electronAPI.storeAuthSession) {
      await window.electronAPI.storeAuthSession(payload)
    }
  } catch {
    // Ignore bridge failures; browser auth should continue working.
  }
}

function attachElectronAuthBridge(client: ReturnType<typeof createBrowserClient>) {
  if (authBridgeAttached || typeof window === 'undefined' || !window.electronAPI) {
    return
  }

  authBridgeAttached = true

  client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
    void pushSessionToElectron(session)
  })

  void client.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
    void pushSessionToElectron(data.session)
  })
}

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  attachElectronAuthBridge(browserClient)

  if (!appClient) {
    appClient = createOfflineAwareSupabaseClient(browserClient)
  }

  return appClient
}
