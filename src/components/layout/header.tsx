'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, Calendar, LayoutDashboard, Compass, Lightbulb, BookOpen, Sparkles, RefreshCw, Download, Settings } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import type { ThemeId } from '@/components/theme/themes'
import { SyncStatus } from '@/components/sync-status'
import { usePlatform } from '@/hooks/use-platform'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface HeaderProps {
  email: string
}

export function Header({ email }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme, themes } = useTheme()
  const { isElectron } = usePlatform()
  const [resolvedEmail, setResolvedEmail] = useState(email)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('Check for updates')
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    setResolvedEmail(email)
  }, [email])

  useEffect(() => {
    if (!isElectron || resolvedEmail || !window.electronAPI?.auth?.getLastUser) {
      return
    }

    void window.electronAPI.auth.getLastUser().then((user) => {
      if (user?.email) {
        setResolvedEmail(user.email)
      }
    }).catch(() => {
      // Best-effort local user label.
    })
  }, [isElectron, resolvedEmail])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCheckUpdates = async () => {
    if (!window.electronAPI?.app?.checkUpdate || checkingUpdate) {
      return
    }

    setCheckingUpdate(true)
    setUpdateStatus('Checking...')

    try {
      const result = await window.electronAPI.app.checkUpdate()
      if (result.error) {
        setUpdateStatus('Update check failed')
        setUpdateReady(false)
      } else if (result.downloaded) {
        setUpdateStatus('Update downloaded')
        setUpdateReady(true)
      } else if (result.updateAvailable) {
        setUpdateStatus('Downloading update...')
        setUpdateReady(false)
      } else {
        setUpdateStatus('Up to date')
        setUpdateReady(false)
      }
    } catch {
      setUpdateStatus('Update check failed')
      setUpdateReady(false)
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleApplyUpdate = async () => {
    if (!window.electronAPI?.app?.applyUpdate) {
      return
    }

    const applied = await window.electronAPI.app.applyUpdate()
    if (!applied) {
      setUpdateStatus('No downloaded update yet')
    }
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    { href: '/dashboard/plan-week', label: 'Plan', icon: Sparkles },
    { href: '/dashboard/study-sessions', label: 'Sessions', icon: BookOpen },
    { href: '/dashboard/cas', label: 'CAS', icon: Compass },
    { href: '/dashboard/tok', label: 'TOK', icon: Lightbulb },
  ]

  return (
    <header className="token-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="h-8 w-8 rounded-xl border border-[var(--border)] bg-[var(--muted)]/70 flex items-center justify-center shadow-sm"
          >
            <span className="h-3 w-3 rounded-full bg-[var(--accent)]" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-smooth flex items-center gap-1.5 px-4 py-2 rounded-xl border ${
                    isActive 
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                      : 'text-[var(--muted-fg)] border-transparent hover:text-[var(--fg)] hover:bg-[var(--muted)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="ml-auto flex items-center justify-end gap-3 lg:gap-4 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)] transition-smooth"
                aria-label="Open settings menu"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-fg)] p-3"
            >
              <div className="space-y-3">
                <div className="pb-3 border-b border-[var(--border)]">
                  <p className="mb-2 text-[11px] uppercase tracking-wide token-muted">Sync</p>
                  <SyncStatus className="w-full justify-center" showHoverRefresh={false} />
                </div>

                <div className="pb-3 border-b border-[var(--border)]">
                  <label htmlFor="theme-menu-select" className="mb-2 block text-[11px] uppercase tracking-wide token-muted">
                    Theme
                  </label>
                  <select
                    id="theme-menu-select"
                    aria-label="Theme"
                    value={theme}
                    onChange={(event) => setTheme(event.target.value as ThemeId)}
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--card-fg)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    {themes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {isElectron ? (
                  <div className="pb-3 border-b border-[var(--border)]">
                    <p className="mb-2 text-[11px] uppercase tracking-wide token-muted">Updates</p>
                    <p className="text-xs text-[var(--muted-fg)] mb-2">{updateStatus}</p>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleCheckUpdates()}
                        disabled={checkingUpdate}
                        className="h-8 text-[var(--muted-fg)] hover:text-[var(--fg)]"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                        Check
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleApplyUpdate()}
                        disabled={!updateReady}
                        className="h-8 text-[var(--muted-fg)] hover:text-[var(--fg)]"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Restart
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="text-xs token-muted truncate">{resolvedEmail || 'Local offline user'}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="w-full justify-start text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)]"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-[var(--border)] px-3 py-2">
      <nav className="md:hidden grid grid-cols-3 gap-1 px-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[10px] transition-smooth ${
                isActive 
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'text-[var(--muted-fg)]'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      </div>
    </header>
  )
}
