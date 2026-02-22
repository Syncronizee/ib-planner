'use client'

import { useMemo } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { AlertCircle, CheckCircle2, CloudOff, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePlatform } from '@/hooks/use-platform'
import { useSync } from '@/hooks/use-sync'
import { cn } from '@/lib/utils'

interface SyncStatusProps {
  className?: string
  showLastSynced?: boolean
  compact?: boolean
  showHoverRefresh?: boolean
}

export function SyncStatus({
  className,
  showLastSynced = true,
  compact = false,
  showHoverRefresh = true,
}: SyncStatusProps) {
  const { isElectron } = usePlatform()
  const {
    status,
    lastSynced,
    pendingChanges,
    error,
    sync,
    isOnline,
  } = useSync()

  const relativeSyncedText = useMemo(() => {
    if (!lastSynced) {
      return null
    }

    return `${formatDistanceToNowStrict(lastSynced)} ago`
  }, [lastSynced])

  const stateMeta = useMemo(() => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        dotClassName: 'bg-amber-400',
        wrapperClassName: 'border-amber-500/40 bg-amber-500/12 text-[var(--fg)]',
        label: `Offline${pendingChanges > 0 ? ` • ${pendingChanges} pending` : ''}`,
      }
    }

    if (status === 'syncing') {
      return {
        icon: Loader2,
        dotClassName: 'bg-sky-400',
        wrapperClassName: 'border-sky-500/40 bg-sky-500/12 text-[var(--fg)]',
        label: 'Syncing...',
      }
    }

    if (status === 'error') {
      return {
        icon: AlertCircle,
        dotClassName: 'bg-rose-400',
        wrapperClassName: 'border-rose-500/40 bg-rose-500/12 text-[var(--fg)]',
        label: 'Sync failed',
      }
    }

    return {
      icon: CheckCircle2,
      dotClassName: 'bg-emerald-400',
      wrapperClassName: 'border-emerald-500/40 bg-emerald-500/12 text-[var(--fg)]',
      label: showLastSynced && relativeSyncedText ? `Synced • ${relativeSyncedText}` : 'Synced',
    }
  }, [isOnline, pendingChanges, relativeSyncedText, showLastSynced, status])

  if (!isElectron) {
    return null
  }

  const Icon = stateMeta.icon
  const trigger = (
    <button
      type="button"
      className={cn(
        'group flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-smooth',
        stateMeta.wrapperClassName,
        className
      )}
      aria-label="Open sync status details"
    >
      <span className={cn('h-2 w-2 rounded-full', stateMeta.dotClassName, !isOnline ? 'animate-pulse' : '')} />
      <Icon className={cn('h-4 w-4', status === 'syncing' ? 'animate-spin' : '')} />
      {!compact ? <span className="max-w-40 truncate">{stateMeta.label}</span> : null}
      {showHoverRefresh ? (
        <RefreshCw className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      ) : null}
    </button>
  )

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-fg)] p-4 shadow-lg"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--card-fg)]">Sync Status</p>
            <p className="text-xs text-[var(--muted-fg)]">
              {isOnline ? 'Online' : 'Offline'}
              {pendingChanges > 0 ? ` • ${pendingChanges} pending change${pendingChanges > 1 ? 's' : ''}` : ''}
            </p>
          </div>
          {isOnline ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-400" />
          )}
        </div>

        <div className="mt-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/35 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-fg)]">State</span>
            <span className="font-medium capitalize text-[var(--card-fg)]">{status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-fg)]">Last synced</span>
            <span className="font-medium text-[var(--card-fg)]">
              {lastSynced ? formatDistanceToNowStrict(lastSynced, { addSuffix: true }) : 'Never'}
            </span>
          </div>
          {error ? (
            <p className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-[var(--muted-fg)] hover:text-[var(--card-fg)]"
            onClick={() => void sync()}
            disabled={!isOnline || status === 'syncing'}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', status === 'syncing' ? 'animate-spin' : '')} />
            {status === 'error' ? 'Retry' : 'Force Sync'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
