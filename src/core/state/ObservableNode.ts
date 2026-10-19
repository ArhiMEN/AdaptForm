import {equalValue} from './value'
import {freezeSnapshot} from './snapshot'

let mutationDepth = 0
let flushing = false
let publishing = false
let batchDepth = 0
const validations = new Map<ObservableNode<unknown>, () => unknown>()
const batchRoots = new Map<ObservableNode<unknown>, () => unknown>()
const pending = new Set<SnapshotStore>()

function flush(): void {
  if (mutationDepth || flushing) return
  flushing = true
  let failure: unknown
  let failed = false
  try {
    while (pending.size) {
      const stores = [...pending]
      const before = stores.map(store => store.committed())
      pending.clear()
      // Parent captures can refresh children: compare against all pre-flush snapshots.
      for (const store of stores) store.refresh()
      const changed = stores.filter((store, index) => !equalValue(before[index], store.committed()))
      publishing = true
      try {
        for (const store of changed) {
          try { store.notify() } catch (error) {
            if (!failed) { failure = error; failed = true }
          }
        }
      } finally {
        publishing = false
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
  private parents = new Set<SnapshotStore>()
  private children = new Set<SnapshotStore>()

  constructor(private capture: () => unknown, private getChildren: () => readonly SnapshotStore[]) {}

  private reconcile(seen = new Set<SnapshotStore>()): void {
    if (seen.has(this)) return
    seen.add(this)
    const next = new Set(this.listeners.size || this.parents.size ? this.getChildren() : [])
    for (const child of this.children) {
      if (!next.has(child)) {
        child.parents.delete(this)
        child.reconcile(seen)
      }
    }
    const previous = this.children
    this.children = next
    for (const child of next) {
      if (!previous.has(child)) {
        child.parents.add(this)
        child.reconcile(seen)
      }
    }
  }

  read(): unknown {
    if (!mutationDepth && !publishing) this.refresh()
    else if (!this.initialized) this.refresh()
    return this.snapshot
  }

  committed(): unknown { return this.snapshot }

  refresh(): boolean {
    this.reconcile()
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
    this.reconcile()
    return () => {
      this.listeners.delete(registration)
      this.reconcile()
    }
  }

  changed(seen = new Set<SnapshotStore>()): void {
    if (seen.has(this)) return
    seen.add(this)
    this.reconcile()
    if (this.listeners.size || this.parents.size || this.initialized) pending.add(this)
    for (const parent of this.parents) parent.changed(seen)
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
  private readonly _stateStore: SnapshotStore = new SnapshotStore(
    () => this.captureState(),
    () => this.stateChildren().map(child => child._stateStore),
  )

  protected abstract captureState(): TSnapshot

  protected stateChildren(): readonly ObservableNode<unknown>[] { return [] }

  private contains(node: ObservableNode<unknown>, seen = new Set<ObservableNode<unknown>>()): boolean {
    if (this === node) return true
    if (seen.has(this)) return false
    seen.add(this)
    return this.stateChildren().some(child => child.contains(node, seen))
  }

  protected validateAfterMutation(callback: () => unknown): void {
    if (batchDepth) validations.set(this, callback)
    else callback()
  }

  protected batchUpdate<TResult>(callback: () => TResult, validate: () => unknown): TResult {
    // Capture committed state before the first write, including descendants.
    this.getSnapshot()
    return this.update(() => {
      batchDepth++
      batchRoots.set(this, validate)
      let failed = false
      let failure: unknown
      let result!: TResult
      try {
        result = callback()
        if (result !== null && (typeof result === 'object' || typeof result === 'function') &&
          'then' in result && typeof result.then === 'function') {
          throw new TypeError('batch callbacks must be synchronous')
        }
      } catch (error) {
        failed = true
        failure = error
      } finally {
        batchDepth--
      }
      if (!batchDepth) {
        const requested = [...validations]
        const roots = [...batchRoots]
        validations.clear()
        batchRoots.clear()
        const selected = roots.filter(([root]) => requested.some(([node]) => root.contains(node)))
          .filter(([root], index, all) => !all.some(([other], otherIndex) =>
            other !== root && other.contains(root) && (!root.contains(other) || otherIndex < index)))
        const checks = [...selected.map(([, check]) => check),
          ...requested.filter(([node]) => !selected.some(([root]) => root.contains(node))).map(([, check]) => check)]
        for (const check of checks) {
          try { check() } catch (error) {
            if (!failed) { failed = true; failure = error }
          }
        }
      }
      if (failed) throw failure
      return result
    })
  }

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
