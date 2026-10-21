import {equalValue} from './value'
import {freezeSnapshot} from './snapshot'
import {assertValidationMutationAllowed, commitDependencies, DependencyConfigurationError, dependencyOwner, noteDependencyMutation} from './dependencyScheduling'

let mutationDepth = 0
let flushing = false
let publishing = false
let batchDepth = 0
let captureDepth = 0
let pullEpoch = 0
let pulling = false
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
      // A library mutation also refreshes legacy externally edited values.
      // Probe each reachable store once for this wave, including clean siblings.
      pulling = true
      pullEpoch++
      try {
        for (const store of stores) store.refresh()
      } finally {
        pulling = false
      }
      const changed = stores.filter((store, index) => before[index] !== store.committed())
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
  private dirty = true
  private checkedEpoch = -1
  private listeners = new Set<() => void>()
  private parents = new Set<SnapshotStore>()
  private children = new Set<SnapshotStore>()

  constructor(private capture: () => unknown, private getChildren: () => readonly SnapshotStore[]) {}

  private reconcile(seen = new Set<SnapshotStore>()): void {
    if (seen.has(this)) return
    seen.add(this)
    if (!this.listeners.size && !this.parents.size && !this.children.size) return
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
    if (!mutationDepth && !publishing) {
      if (captureDepth) this.refresh()
      else {
        // Public reads still discover direct property/legacy-container edits.
        pulling = true
        pullEpoch++
        try { this.refresh() } finally { pulling = false }
      }
    } else if (!this.initialized) this.refresh()
    return this.snapshot
  }

  committed(): unknown { return this.snapshot }

  refresh(): boolean {
    if (this.initialized && !this.dirty && (!pulling || this.checkedEpoch === pullEpoch)) return false
    if (pulling) this.reconcile()
    let next: unknown
    captureDepth++
    try { next = freezeSnapshot(this.capture()) } finally { captureDepth-- }
    this.dirty = false
    this.checkedEpoch = pullEpoch
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
    this.reconcile()
    this.invalidate(seen)
  }

  private invalidate(seen: Set<SnapshotStore>): void {
    if (seen.has(this)) return
    seen.add(this)
    this.dirty = true
    if (this.listeners.size || this.parents.size || this.initialized) pending.add(this)
    // Descendant writes do not change an ancestor's membership. Reconcile only
    // the mutated owner, so validating N children does not scan N siblings N times.
    for (const parent of this.parents) parent.invalidate(seen)
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

  protected dependencyTree(seen = new Set<ObservableNode<unknown>>()): readonly ObservableNode<unknown>[] {
    if (seen.has(this)) throw new DependencyConfigurationError('Dependency Forms require an unshared acyclic ownership tree')
    seen.add(this)
    return [this, ...this.stateChildren().flatMap(child => child.dependencyTree(seen))]
  }

  private contains(node: ObservableNode<unknown>, seen = new Set<ObservableNode<unknown>>()): boolean {
    if (this === node) return true
    if (seen.has(this)) return false
    seen.add(this)
    return this.stateChildren().some(child => child.contains(node, seen))
  }

  private hasSelectiveDependencies(seen = new Set<ObservableNode<unknown>>()): boolean {
    if (seen.has(this)) return false
    seen.add(this)
    const owner = dependencyOwner(this)
    return owner?.selective === true && owner.selects(this) ||
      this.stateChildren().some(child => child.hasSelectiveDependencies(seen))
  }

  protected checkBatchNode(_node: ObservableNode<unknown>, check: () => unknown): unknown { return check() }

  protected validateNodeAfterMutation(node: ObservableNode<unknown>, callback: () => unknown): void {
    node.validateAfterMutation(callback)
  }

  protected validateAfterMutation(callback: () => unknown): void {
    if (dependencyOwner(this)?.request(this)) return
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
        const requested = [...validations].filter(([node]) => !dependencyOwner(node)?.request(node))
        const roots = [...batchRoots]
        validations.clear()
        batchRoots.clear()
        const legacyRoots = roots.filter(([root]) => !root.hasSelectiveDependencies())
        const selected = legacyRoots.filter(([root]) => requested.some(([node]) => root.contains(node)))
          .filter(([root], index, all) => !all.some(([other], otherIndex) =>
            other !== root && other.contains(root) && (!root.contains(other) || otherIndex < index)))
        const checks = [...selected.map(([, check]) => check),
          ...requested.filter(([node]) => !selected.some(([root]) => root.contains(node))).map(([node, check]) =>
            () => {
              const owner = roots.find(([root]) => root.contains(node))
              return owner ? owner[0].checkBatchNode(node, check) : check()
            })]
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
    assertValidationMutationAllowed()
    noteDependencyMutation(this)
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
      const finalize = () => {
        if (mutationDepth) return
        let graphFailed = false
        try {
          mutationDepth++
          commitDependencies()
        } catch (error) {
          graphFailed = true
          throw error
        } finally {
          mutationDepth--
          if (graphFailed) { try { flush() } catch { /* Preserve the graph failure. */ } }
          else flush()
        }
      }
      if (failed) { try { finalize() } catch { /* The original exception takes precedence. */ } }
      else finalize()
    }
  }
}
