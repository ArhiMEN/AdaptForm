import type {ObservableNode} from './ObservableNode'

export interface DependencyScheduler {
  readonly selective: boolean
  selects(node: ObservableNode<unknown>): boolean
  request(node: ObservableNode<unknown>): boolean
  commit(): void
}

const owners = new WeakMap<ObservableNode<unknown>, DependencyScheduler>()
const pending = new Set<DependencyScheduler>()
let dependencySuppressionDepth = 0

export class DependencyConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DependencyConfigurationError'
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

export function withoutDependencyScheduling<TResult>(callback: () => TResult): TResult {
  dependencySuppressionDepth++
  try { return callback() } finally { dependencySuppressionDepth-- }
}

export function noteDependencyMutation(node: ObservableNode<unknown>): void {
  const owner = owners.get(node)
  if (owner && !dependencySuppressionDepth) pending.add(owner)
}
