import {invalid} from '../ErrorParams'
import type {ValidationPath} from '../ValidationError'
import type {ErrorNode} from '../state/ErrorNode'
import type {ErrorStore} from '../state/ErrorStore'

export type ServerNode = ErrorNode<unknown>
type Segment = ValidationPath[number]
export type RegisteredChild = readonly [Segment, ServerNode]

interface Access {
  readonly errors: ErrorStore
  readonly children: () => readonly RegisteredChild[]
  readonly parents: () => ReadonlySet<ServerNode>
  readonly connect: () => void
  readonly form: () => boolean
}

const nodes = new WeakMap<ServerNode, Access>()

export function registerServerNode(node: ServerNode, access: Access): void { nodes.set(node, access) }
export function serverNode(node: ServerNode): Access { return nodes.get(node) ?? invalid('unknown_error_node') }

interface Revisions { input: bigint; structure: bigint; reset: bigint; position: bigint }
const revisions = new WeakMap<ServerNode, Revisions>()

export function captureRevision(node: ServerNode): Readonly<Revisions> {
  let revision = revisions.get(node)
  if (!revision) {
    revision = {input: 0n, structure: 0n, reset: 0n, position: 0n}
    revisions.set(node, revision)
  }
  return {...revision}
}

export function changedSince(node: ServerNode, before: Readonly<Revisions>): boolean {
  const current = revisions.get(node)
  return current === undefined || current.input !== before.input ||
    current.structure !== before.structure || current.reset !== before.reset || current.position !== before.position
}

export function positionChangedSince(node: ServerNode, position: bigint): boolean {
  return revisions.get(node)?.position !== position
}

export function refreshChildPositions(previous: ReadonlySet<ServerNode>, next: ReadonlySet<ServerNode>): void {
  const tracked = new Map<ServerNode, number>()
  let index = 0
  for (const node of previous) {
    if (revisions.has(node)) tracked.set(node, index)
    index++
  }
  index = 0
  for (const node of next) {
    // Only captured routing edges need a revision. Others have no outstanding owner.
    if (revisions.has(node) && tracked.get(node) !== index) advanceServerRevision(node, 'position')
    tracked.delete(node)
    index++
  }
  for (const node of tracked.keys()) advanceServerRevision(node, 'position')
}

export function advanceServerRevision(node: ServerNode, kind: keyof Revisions): void {
  const state = revisions.get(node)
  if (state) state[kind]++
}

export function resetServerRevision(node: ServerNode, seen = new Set<ServerNode>()): void {
  if (seen.has(node)) return
  seen.add(node)
  advanceServerRevision(node, 'reset')
  for (const parent of serverNode(node).parents()) resetServerRevision(parent, seen)
}

export interface Target {
  readonly node: ServerNode
  readonly path: ValidationPath
  readonly parent?: Target
  readonly children: ReadonlyMap<Segment, Target>
  readonly form: boolean
}

export interface TargetIndex {
  readonly root: Target
  readonly targets: ReadonlyMap<ServerNode, Target>
}

/** Index registered data once in field/current item order. */
export function targetIndex(root: ServerNode): TargetIndex {
  const targets = new Map<ServerNode, Target>()
  const visit = (node: ServerNode, path: ValidationPath, parent?: Target): Target => {
    if (targets.has(node)) invalid('ambiguous_server_target', path)
    const access = serverNode(node)
    const children = new Map<Segment, Target>()
    const target: Target = {node, parent, path: Object.freeze(path), children, form: access.form()}
    targets.set(node, target)
    for (const [key, child] of access.children()) {
      children.set(key, visit(child, [...path, key], target))
    }
    return target
  }
  return {root: visit(root, []), targets}
}

export function lookupPath(root: Target, path: ValidationPath): {target: Target; found: boolean} {
  let target = root
  for (const segment of path) {
    const child = target.children.get(segment)
    if (!child) return {target, found: false}
    target = child
  }
  return {target, found: true}
}

export function* walkTargets(target: Target): IterableIterator<Target> {
  yield target
  for (const child of target.children.values()) yield* walkTargets(child)
}

export function ancestors(node: ServerNode, found = new Set<ServerNode>()): Set<ServerNode> {
  const visit = (current: ServerNode) => {
    if (found.has(current)) return
    found.add(current)
    for (const parent of serverNode(current).parents()) visit(parent)
  }
  visit(node)
  return found
}


/** Diagnostics use postorder paths relative to the highest registered owning Form. */
export function notificationPaths(index: TargetIndex): ReadonlyMap<ServerNode, ValidationPath> {
  const seen = new Set<ServerNode>([index.root.node])
  let node = index.root.node
  let top = node
  while (true) {
    const parent = [...serverNode(node).parents()].find(candidate =>
      !seen.has(candidate) && serverNode(candidate).children().some(([, child]) => child === node))
    if (!parent) break
    node = parent
    seen.add(node)
    if (serverNode(node).form()) top = node
  }
  seen.clear()
  const paths = new Map<ServerNode, ValidationPath>()
  const visit = (current: ServerNode, path: ValidationPath): void => {
    if (seen.has(current)) return
    seen.add(current)
    const known = index.targets.get(current)
    if (known) {
      for (const [key, child] of known.children) visit(child.node, [...path, key])
    } else {
      for (const [key, child] of serverNode(current).children()) visit(child, [...path, key])
    }
    paths.set(current, Object.freeze(path))
  }
  visit(top, [])
  return paths
}
