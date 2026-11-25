import {invalid} from '../ErrorParams'
import type {Form} from '../Form'
import {normalizePath, type ValidationError, type ValidationPath} from '../ValidationError'
import type {ServerPartitionPlan} from '../state/ErrorStore'
import {assertValidationAllowed, validationCallback} from '../state/validationExecution'
import {serverEntries} from './ErrorsSchema'
import type {ApplyServerErrorsOptions, BeginServerErrorsOptions, ServerErrorOperation} from './applyTypes'
import {
  ancestors, captureRevision, changedSince, lookupPath, positionChangedSince, serverNode, targetIndex, walkTargets,
  type ServerNode, type Target, type TargetIndex,
} from './nodes'
import type {ParsedServerErrors} from './schemaTypes'

interface Operation {
  readonly receiver: Form
  readonly node: ServerNode
  readonly path: ValidationPath
  readonly revision: ReturnType<typeof captureRevision>
  readonly positions: readonly (readonly [ServerNode, bigint])[]
  used: boolean
}

const operations = new WeakMap<ServerErrorOperation, Operation>()
const earliestAllowed = new WeakMap<ServerNode, Operation>()

export function beginServerOperation(receiver: Form, options: BeginServerErrorsOptions = {}): ServerErrorOperation {
  assertValidationAllowed()
  return validationCallback(() => {
    const path = normalizePath(options.scope ?? [])
    const index = targetIndex(receiver)
    const {target, found} = lookupPath(index.root, path)
    if (!found) invalid('unknown_scope', path)
    // Link the registered tree before tracking any descendant changes.
    for (const node of index.targets.keys()) serverNode(node).connect()
    for (const node of ancestors(target.node)) earliestAllowed.delete(node)
    for (const {node} of walkTargets(target)) earliestAllowed.delete(node)
    const positions: [ServerNode, bigint][] = []
    for (let cursor: Target | undefined = target; cursor; cursor = cursor.parent) {
      positions.push([cursor.node, captureRevision(cursor.node).position])
    }
    const operation = {receiver, node: target.node, path, revision: captureRevision(target.node), positions, used: false}
    const token = Object.freeze({}) as ServerErrorOperation
    operations.set(token, operation)
    earliestAllowed.set(target.node, operation)
    return token
  })
}

function requireCurrent(receiver: Form, token: ServerErrorOperation): Operation {
  const operation = operations.get(token)
  if (!operation || operation.receiver !== receiver) invalid('invalid_server_operation')
  if (operation.used) invalid('used_server_operation', operation.path)
  if (earliestAllowed.get(operation.node) !== operation) invalid('superseded_server_operation', operation.path)
  if (changedSince(operation.node, operation.revision) ||
    operation.positions.some(([node, position]) => positionChangedSince(node, position))) {
    invalid('stale_server_operation', operation.path)
  }
  return operation
}

function inScope(scope: ValidationPath, path: ValidationPath): boolean {
  return scope.length <= path.length && scope.every((part, index) => part === path[index])
}

interface PreparedApply {
  readonly plans: readonly ServerPartitionPlan[]
  readonly changed: ReadonlySet<ServerNode>
  readonly index: TargetIndex
  readonly applied: number
  readonly ignored: number
  readonly unresolved: readonly ValidationPath[]
  readonly consume: () => void
  readonly recheck: () => void
}

const empty: readonly ValidationError[] = Object.freeze([])

export function prepareApply(receiver: Form, batch: ParsedServerErrors, options: ApplyServerErrorsOptions): PreparedApply {
  const entries = serverEntries(batch)
  if (!options || typeof options !== 'object') invalid('invalid_apply_options')
  const token = options.operation
  const operation = requireCurrent(receiver, token)
  const mode = options.mode ?? 'replace'
  const unknownPath = options.unknownPath ?? 'error'
  if (mode !== 'replace' && mode !== 'append' ||
    unknownPath !== 'error' && unknownPath !== 'ignore' && unknownPath !== 'global') invalid('invalid_apply_options')
  const index = targetIndex(receiver)
  const {target: scope, found} = lookupPath(index.root, operation.path)
  if (!found || scope.node !== operation.node) invalid('detached_server_operation', operation.path)

  const incoming = new Map<ServerNode, ValidationError[]>()
  const unresolved: ValidationPath[] = []
  let applied = 0, ignored = 0
  for (const {path, error} of entries) {
    if (!inScope(operation.path, path)) invalid('out_of_scope_server_path', path)
    const match = lookupPath(index.root, path)
    let target: Target | undefined = match.target
    if (!match.found) {
      if (unknownPath === 'error') invalid('unknown_server_path', path)
      unresolved.push(path)
      if (unknownPath === 'ignore') { ignored++; continue }
      while (target && !target.form && target !== scope) target = target.parent
      if (!target?.form || !inScope(operation.path, target.path)) invalid('unknown_server_global', path)
    }
    const group = incoming.get(target.node)
    if (group) group.push(error)
    else incoming.set(target.node, [error])
    applied++
  }

  const plans: ServerPartitionPlan[] = []
  const changed = new Set<ServerNode>()
  const targets = mode === 'replace' ? [...walkTargets(scope)].map(target => target.node) : incoming.keys()
  for (const node of targets) {
    const group = incoming.get(node)
    const plan = serverNode(node).errors.prepareServer(group ? Object.freeze(group) : empty, mode)
    if (plan) { plans.push(plan); changed.add(node) }
  }
  return {
    plans, changed, index, applied, ignored, unresolved: Object.freeze(unresolved),
    recheck: () => { requireCurrent(receiver, token) },
    consume: () => {
      operation.used = true
      earliestAllowed.delete(operation.node)
    },
  }
}
