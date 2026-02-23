export const DATA_CHANGED_EVENT = 'ib:data-changed'

export type DataChangeDetail = {
  source: 'desktop-db' | 'supabase'
  action?: 'insert' | 'update' | 'delete' | 'mutation'
  table?: string
}

export function emitDataChanged(detail: DataChangeDetail) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent<DataChangeDetail>(DATA_CHANGED_EVENT, { detail }))
}

export function onDataChanged(handler: (detail: DataChangeDetail) => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<DataChangeDetail>
    handler(custom.detail)
  }

  window.addEventListener(DATA_CHANGED_EVENT, listener as EventListener)

  return () => {
    window.removeEventListener(DATA_CHANGED_EVENT, listener as EventListener)
  }
}
