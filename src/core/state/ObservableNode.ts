import type {Form} from '../Form'
import type {ValidationPath} from '../ValidationError'
import {ErrorNotificationCycle} from '../server/notifications'
import type {ErrorNotificationReport} from '../server/applyTypes'
import {equalValue} from './value'
import {freezeSnapshot} from './snapshot'
import {assertValidationMutationAllowed, isAssemblingValidationNodes, validationCallback} from './validationExecution'
import {commitDependencies, DependencyConfigurationError, dependencyOwner, noteDependencyMutation} from './dependencyScheduling'

let mutationDepth = 0
let mutationVersion = 0
let automaticFullCheckDepth = 0
let flushing = false
let publishing = false
let captureDepth = 0
let pullEpoch = 0
let pulling = false
type Node = ObservableNode<unknown>
type FullCheck = (form?: Form) => unknown
type OwnCheck = (form: Form | undefined, visitChildren: () => void) => unknown
interface ValidationRequest {
  full?: FullCheck
  own?: OwnCheck
  /** An inserted subtree is eligible while it belongs to this container. */
  parent?: Node
  structural?: boolean
}
const validations = new Map<Node, ValidationRequest>()
const batchRoots = new Map<Node, FullCheck>()
const pending = new Set<SnapshotStore>()
const snapshotOwners = new WeakMap<Node, SnapshotStore>()

function snapshotPaths(paths: ReadonlyMap<Node, ValidationPath>): readonly (readonly [SnapshotStore, ValidationPath])[] {
  const entries: Array<readonly [SnapshotStore, ValidationPath]> = []
  for (const [node, path] of paths) {
    const store = snapshotOwners.get(node)
    if (store) entries.push([store, path])
  }
  return entries
}

type SnapshotWave = ReadonlyMap<SnapshotStore, unknown>
let staging: Map<SnapshotStore, unknown> | undefined

interface ServerSnapshotPlan {
  readonly stores: ReadonlySet<SnapshotStore>
  readonly candidates: SnapshotWave
  readonly paths: ReadonlyMap<SnapshotStore, ValidationPath>
  readonly pathReaders: ReadonlyMap<Form, () => ReadonlyMap<Node, ValidationPath>>
  readonly version: number
  readonly cycle: ErrorNotificationCycle
}
let serverWave: ServerSnapshotPlan | undefined

function captureWave(stores: Iterable<SnapshotStore>): SnapshotWave {
  const previous = staging
  const wave = new Map<SnapshotStore, unknown>()
  staging = wave
  try {
    for (const store of stores) store.read()
    return wave
  } finally {
    staging = previous
  }
}

function flush(): void {
  if (mutationDepth || flushing) return
  flushing = true
  let failure: unknown
  let failed = false
  const reject = (error: unknown) => {
    if (!failed) { failure = error; failed = true }
  }
  try {
    while (pending.size || serverWave) {
      const wave = serverWave
      serverWave = undefined
      const stores = [...pending]
      const before = stores.map(store => store.committed())
      let paths = wave?.paths
      pending.clear()
      if (wave) {
        let candidates = wave.candidates
        if (wave.version !== mutationVersion) {
          try {
            const next = validationCallback(() => ({
              candidates: captureWave(stores),
              paths: new Map([...wave.pathReaders.values()].flatMap(read => snapshotPaths(read()))),
            }))
            candidates = next.candidates
            paths = next.paths
          } catch (error) {
            wave.cycle.record('finalization', Object.freeze([]), error)
            reject(error)
          }
        }
        // The preflight snapshot is the last complete generation if a later batch write fails capture.
        for (const [store, snapshot] of candidates) store.installCandidate(snapshot)
      } else {
        // A library mutation also refreshes externally edited values.
        pulling = true
        pullEpoch++
        try {
          for (const store of stores) store.refresh()
        } finally {
          pulling = false
        }
      }
      const changed = new Set(stores.filter((store, index) => before[index] !== store.committed()))
      publishing = true
      try {
        const ordered = paths
          ? [...[...paths.keys()].filter(store => changed.has(store)),
            ...SnapshotStore.notificationOrder(stores, changed).filter(store => !paths!.has(store))]
          : SnapshotStore.notificationOrder(stores, changed)
        for (const store of ordered) {
          const path = paths?.get(store)
          if (wave && path) store.notify((error, subscriber) => wave.cycle.record('subscriber', path, error, subscriber))
          else {
            try { store.notify() } catch (error) { reject(error) }
          }
        }
        if (wave && paths) {
          for (const receiver of wave.pathReaders.keys()) {
            const store = snapshotOwners.get(receiver)
            const path = store && paths.get(store)
            if (path) wave.cycle.add(receiver, path)
          }
          wave.cycle.deliver()
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

  addWithParents(stores: Set<SnapshotStore>): void {
    if (stores.has(this)) return
    stores.add(this)
    for (const parent of this.parents) parent.addWithParents(stores)
  }

  installCandidate(snapshot: unknown): void {
    this.snapshot = snapshot
    this.initialized = true
    this.dirty = false
  }

  read(): unknown {
    if (staging) {
      if (!staging.has(this)) {
        const next = freezeSnapshot(this.capture())
        staging.set(this, this.initialized && equalValue(this.snapshot, next) ? this.snapshot : next)
      }
      return staging.get(this)
    }
    if (!mutationDepth && !publishing) {
      if (captureDepth) this.refresh()
      else {
        // Public reads still discover direct property and container edits.
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
      assertValidationMutationAllowed()
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

  static notificationOrder(stores: readonly SnapshotStore[], changed: Set<SnapshotStore>): SnapshotStore[] {
    if (changed.size <= 1) return [...changed]
    const affected = new Set(stores)
    const seen = new Set<SnapshotStore>()
    const ordered: SnapshotStore[] = []
    const visit = (store: SnapshotStore): void => {
      if (seen.has(store)) return
      seen.add(store)
      for (const child of store.children) if (affected.has(child)) visit(child)
      if (changed.has(store)) ordered.push(store)
    }
    for (const store of stores) visit(store)
    return ordered
  }

  notify(report?: (error: unknown, subscriber: number) => void): void {
    let failure: unknown
    let failed = false
    for (const [subscriber, listener] of [...this.listeners].entries()) {
      if (!this.listeners.has(listener)) continue
      try { listener() } catch (error) {
        if (report) report(error, subscriber)
        else if (!failed) { failure = error; failed = true }
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

  constructor() { snapshotOwners.set(this, this._stateStore) }

  protected abstract captureState(): TSnapshot

  protected stateChildren(): readonly ObservableNode<unknown>[] { return [] }

  protected dependencyTree(seen = new Set<ObservableNode<unknown>>()): readonly ObservableNode<unknown>[] {
    if (seen.has(this)) throw new DependencyConfigurationError('Dependency Forms require an unshared acyclic ownership tree')
    seen.add(this)
    return [this, ...this.stateChildren().flatMap(child => child.dependencyTree(seen))]
  }

  protected childValidationContext(form?: Form): Form | undefined { return form }

  protected validateAfterMutation(check: FullCheck, parent?: Node, structural = false): void {
    if (isAssemblingValidationNodes() || dependencyOwner(this)?.request(this)) return
    const request = validations.get(this)
    // An independent request keeps its eligibility even if the node is detached.
    if (!request?.full || request.parent || !parent) validations.set(this, {...request, full: check, parent, structural})
  }

  protected validateNodeAfterMutation(node: Node, check: FullCheck): void {
    node.validateAfterMutation(check, this)
  }

  protected validateOwnAfterMutation(check: OwnCheck): void {
    if (isAssemblingValidationNodes()) return
    validations.set(this, {...validations.get(this), own: check})
  }

  protected get isAutomaticFullCheck(): boolean { return automaticFullCheckDepth > 0 }

  private static runAutomaticFullCheck(check: FullCheck, form?: Form): unknown {
    automaticFullCheckDepth++
    try {
      return check(form)
    } finally {
      automaticFullCheckDepth--
    }
  }

  private static commitValidations(): void {
    const requested = new Map(validations)
    const scopes = new Map(batchRoots)
    validations.clear()
    batchRoots.clear()
    for (const [node, {parent, own}] of requested) {
      if (!parent || parent.stateChildren().includes(node)) continue
      if (own) requested.set(node, {own})
      else requested.delete(node)
    }
    if (!requested.size) return

    const children = new Map<Node, readonly Node[]>()
    const descendants = new Set<Node>()
    const discover = (node: Node): void => {
      if (children.has(node)) return
      const nodes = node.stateChildren()
      children.set(node, nodes)
      for (const child of nodes) {
        descendants.add(child)
        discover(child)
      }
    }
    const roots = new Set([...scopes.keys(), ...requested.keys()])
    // A single request outside a batch needs neither context discovery nor overlap elimination.
    if (roots.size > 1) for (const root of roots) discover(root)
    // Scalar-only batches retain HF-009's full Form check when HF-013 is inactive.
    // An ODR-03 structural request keeps the batch on the local traversal path.
    const batchProfile = new Map<Node, {requested: boolean; selective: boolean; structural: boolean}>()
    const profile = (node: Node) => {
      const previous = batchProfile.get(node)
      if (previous) return previous
      const owner = dependencyOwner(node)
      const request = requested.get(node)
      const result = {
        requested: request !== undefined,
        selective: owner?.selective === true && owner.selects(node),
        structural: request?.own !== undefined || request?.structural === true,
      }
      batchProfile.set(node, result)
      for (const child of children.get(node) ?? []) {
        const nested = profile(child)
        result.requested ||= nested.requested
        result.selective ||= nested.selective
        result.structural ||= nested.structural
      }
      return result
    }
    const seen = new Set<Node>()
    const plan = (node: Node, context?: Form): (() => unknown)[] => {
      if (seen.has(node)) return []
      seen.add(node)
      const request = requested.get(node)
      const full = request?.full
      if (full) {
        if (dependencyOwner(node)?.request(node)) return []
        return [() => ObservableNode.runAutomaticFullCheck(full, context)]
      }
      const scope = scopes.get(node)
      if (scope) {
        const {requested, selective, structural} = profile(node)
        if (requested && !selective && !structural) return [() => ObservableNode.runAutomaticFullCheck(scope)]
      }
      const childContext = node.childValidationContext(context)
      const nested = (children.get(node) ?? []).flatMap(child => plan(child, childContext))
      const own = request?.own
      return own ? [() => own(context, () => { for (const check of nested) check() })] : nested
    }
    const checks = [...roots].filter(root => !descendants.has(root)).flatMap(node => plan(node))
    let failed = false
    let failure: unknown
    for (const check of checks) {
      try {
        check()
      } catch (error) {
        if (!failed) { failed = true; failure = error }
      }
    }
    if (failed) throw failure
  }

  protected batchUpdate<TResult>(callback: () => TResult, validate: FullCheck): TResult {
    assertValidationMutationAllowed()
    // Capture committed state before the first write, including descendants.
    this.getSnapshot()
    return this.update(() => {
      batchRoots.set(this, validate)
      const result = callback()
      if (result !== null && (typeof result === 'object' || typeof result === 'function') &&
        'then' in result && typeof result.then === 'function') {
        throw new TypeError('batch callbacks must be synchronous')
      }
      return result
    })
  }

  subscribe(listener: () => void): () => void {
    assertValidationMutationAllowed()
    return this._stateStore.subscribe(listener)
  }

  getSnapshot(): TSnapshot {
    return this._stateStore.read() as TSnapshot
  }

  /** Queue this node before propagating a value change to containing nodes. */
  protected markStateChanged(): void { this._stateStore.changed() }

  /** Stage candidates under the server partition overlay before touching a live store. */
  protected prepareServerSnapshots(
    receiver: Form, affected: Iterable<Node>, paths: ReadonlyMap<Node, ValidationPath>,
    readPaths: () => ReadonlyMap<Node, ValidationPath>,
  ): () => ErrorNotificationReport {
    const stores = new Set(pending)
    for (const node of affected) node._stateStore.addWithParents(stores)
    const candidates = captureWave(stores)
    const registeredPaths = new Map([...serverWave?.paths ?? [], ...snapshotPaths(paths)])
    const pathReaders = new Map(serverWave?.pathReaders)
    pathReaders.set(receiver, readPaths)
    const cycle = serverWave?.cycle ?? new ErrorNotificationCycle()
    const wave = {stores, candidates, paths: registeredPaths, pathReaders, version: mutationVersion, cycle}
    const receiverPath = paths.get(receiver) ?? Object.freeze([])
    return () => {
      for (const store of wave.stores) pending.add(store)
      cycle.add(receiver, receiverPath)
      serverWave = wave
      try {
        flush()
      } catch (error) {
        // A subsequent reentrant wave cannot turn an installed Apply into a rejection.
        if (cycle.report.status === 'delivered') cycle.retainFollowingFailure(error)
        else {
          cycle.record('finalization', receiverPath, error)
          cycle.deliver()
        }
      }
      return cycle.report
    }
  }

  protected update<TResult>(callback: () => TResult): TResult {
    assertValidationMutationAllowed()
    noteDependencyMutation(this)
    mutationVersion++
    mutationDepth++
    let failed = false
    try {
      return callback()
    } catch (error) {
      failed = true
      throw error
    } finally {
      let notificationFailed = false
      let notificationFailure: unknown
      try {
        this._stateStore.changed()
      } catch (error) {
        notificationFailed = true
        notificationFailure = error
      } finally {
        mutationDepth--
      }
      // Preserve the mutation's exception if finalization also throws.
      const finalize = () => {
        if (mutationDepth) {
          if (notificationFailed) throw notificationFailure
          return
        }
        mutationDepth++
        let failed = notificationFailed
        let failure: unknown = notificationFailure
        try {
          ObservableNode.commitValidations()
        } catch (error) {
          if (!failed) { failed = true; failure = error }
        }
        try {
          commitDependencies()
        } catch (error) {
          if (!failed) { failed = true; failure = error }
        } finally {
          mutationDepth--
        }
        if (failed) {
          serverWave?.cycle.record('finalization', Object.freeze([]), failure)
          try { flush() } catch { /* Preserve the original finalization failure. */ }
          throw failure
        }
        flush()
      }
      if (failed) { try { finalize() } catch { /* The original exception takes precedence. */ } }
      else finalize()
    }
  }
}
