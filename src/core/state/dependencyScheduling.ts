import type {ObservableNode} from './ObservableNode'

export interface DependencyScheduler {
  readonly selective: boolean
  selects(node: ObservableNode<unknown>): boolean
  request(node: ObservableNode<unknown>): boolean
  commit(): void
}

const owners = new WeakMap<ObservableNode<unknown>, DependencyScheduler>()
const pending = new Set<DependencyScheduler>()
let validationDepth = 0
let callbackDepth = 0

export class DependencyConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DependencyConfigurationError'
  }
}

export class ValidationMutationError extends Error {
  constructor() {
    super('Graph-enabled validators must not mutate library state')
    this.name = 'ValidationMutationError'
  }
}

export function dependencyOwner(node: ObservableNode<unknown>): DependencyScheduler | undefined {
  return owners.get(node)
}

export function ownDependencies(node: ObservableNode<unknown>, owner: DependencyScheduler): void {
  owners.set(node, owner)
}

export function releaseDependencies(node: ObservableNode<unknown>, owner: DependencyScheduler): void {
  if (owners.get(node) === owner) owners.delete(node)
}

export function scheduleDependencies(owner: DependencyScheduler): void { pending.add(owner) }
export function cancelDependencies(owner: DependencyScheduler): void { pending.delete(owner) }

export function commitDependencies(): void {
  let failure: unknown
  let failed = false
  const work = [...pending]
  pending.clear()
  for (const owner of work) {
    try { owner.commit() } catch (error) {
      if (!failed) { failed = true; failure = error }
    }
  }
  if (failed) throw failure
}

export function assertValidationMutationAllowed(): void {
  if (callbackDepth) throw new ValidationMutationError()
}

export function dependencyValidation<TResult>(callback: () => TResult): TResult {
  validationDepth++
  try { return callback() } finally { validationDepth-- }
}

/** Only user rule execution is guarded; the engine still writes validation metadata. */
export function validationCallback<TResult>(callback: () => TResult): TResult {
  if (!validationDepth) return callback()
  callbackDepth++
  try { return callback() } finally { callbackDepth-- }
}

export function noteDependencyMutation(node: ObservableNode<unknown>): void {
  const owner = owners.get(node)
  if (owner && !validationDepth) pending.add(owner)
}
