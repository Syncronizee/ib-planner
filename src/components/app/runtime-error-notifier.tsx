'use client'

import { useEffect, useState } from 'react'

function getMessage(input: unknown) {
  if (input instanceof Error && input.message) {
    return input.message
  }

  if (typeof input === 'string' && input.trim()) {
    return input
  }

  if (input && typeof input === 'object') {
    const candidate = input as Record<string, unknown>
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message
    }

    try {
      return JSON.stringify(input)
    } catch {
      return 'Something went wrong.'
    }
  }

  return 'Something went wrong.'
}

export function RuntimeErrorNotifier() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const pushMessage = (next: string) => {
      if (!next || next.includes('ResizeObserver loop')) {
        return
      }

      setMessage(next)
    }

    const onError = (event: ErrorEvent) => {
      pushMessage(event.message || getMessage(event.error))
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      pushMessage(getMessage(event.reason))
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    if (!message) {
      return
    }

    const timer = window.setTimeout(() => setMessage(null), 8000)
    return () => window.clearTimeout(timer)
  }, [message])

  if (!message) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] max-w-sm rounded-2xl border border-rose-500/35 bg-[var(--card)] px-4 py-3 shadow-2xl">
      <div className="pointer-events-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--card-fg)]">Something went wrong</p>
            <p className="mt-1 text-xs text-rose-300">{message}</p>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="rounded-md px-2 py-1 text-xs text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--card-fg)]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
