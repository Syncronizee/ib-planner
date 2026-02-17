export class SyncQueue {
  private current: Promise<unknown> = Promise.resolve()

  enqueue<T>(work: () => Promise<T>) {
    const next = this.current.then(work, work)
    this.current = next.then(
      () => undefined,
      () => undefined
    )

    return next
  }
}
