import {equalValue} from './value'
import {freezeSnapshot} from './snapshot'

let mutationDepth = 0
let flushing = false
const pending = new Set<SnapshotStore>()

function flush(): void {
  if (mutationDepth || flushing) return
  flushing = true
  let failure: unknown
  let failed = false
  try {
    while (pending.size) {
      const stores = [...pending]
      pending.clear()
      // Commit every affected snapshot before calling any external listener.
      const changed = stores.filter(store => store.refresh())
      for (const store of changed) {
        try { store.notify() } catch (error) {
          if (!failed) { failure = error; failed = true }
        }
      }
    }
  } finally {
    flushing = false
  }
  if (failed) throw failure
}

class SnapshotStore {
  private snapshot: unknown
  private initialized = false
  private listeners = new Set<() => void>()

  constructor(private capture: () => unknown) {}

  read(): unknown {
    if (!mutationDepth) this.refresh()
    else if (!this.initialized) this.refresh()
    return this.snapshot
  }

  refresh(): boolean {
    const next = freezeSnapshot(this.capture())
    if (this.initialized && equalValue(this.snapshot, next)) return false
    this.snapshot = next
    this.initialized = true
    return true
  }

  subscribe(listener: () => void): () => void {
    this.read()
    // Each registration has its own lifetime, including repeated callbacks.
    const registration = () => listener()
    this.listeners.add(registration)
    return () => { this.listeners.delete(registration) }
  }

  changed(): void {
    if (this.listeners.size || this.initialized) pending.add(this)
  }

  notify(): void {
    let failure: unknown
    let failed = false
    for (const listener of [...this.listeners]) {
      if (!this.listeners.has(listener)) continue
      try { listener() } catch (error) {
        if (!failed) { failure = error; failed = true }
      }
    }
    if (failed) throw failure
  }
}

/** Shared mutation boundary; subclasses only describe state and their mutations. */
export abstract class ObservableNode<TSnapshot> {
  private readonly _stateStore = new SnapshotStore(() => this.captureState())

  protected abstract captureState(): TSnapshot

  subscribe(listener: () => void): () => void {
    return this._stateStore.subscribe(listener)
  }

  getSnapshot(): TSnapshot {
    return this._stateStore.read() as TSnapshot
  }

  protected update<TResult>(callback: () => TResult): TResult {
    mutationDepth++
    let failed = false
    try {
      return callback()
    } catch (error) {
      failed = true
      throw error
    } finally {
      this._stateStore.changed()
      mutationDepth--
      // Preserve the mutation's exception if finalization also throws.
      if (failed) { try { flush() } catch { /* The original exception takes precedence. */ } }
      else flush()
    }
  }
}
