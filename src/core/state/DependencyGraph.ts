import {Field} from '../fields/Field'
import type {Form} from '../Form'
import type {ObservableNode} from './ObservableNode'
import {copyValue, equalValue} from './value'
import {
  assertValidationMutationAllowed, cancelDependencies, dependencyOwner, DependencyConfigurationError, dependencyValidation,
  ownDependencies, releaseDependencies, scheduleDependencies, type DependencyScheduler,
} from './dependencyScheduling'

type Node = ObservableNode<unknown>
type Fields = Readonly<Record<string, Node>>

/** One explicitly enabled Form; collection paths and direct references are excluded. */
export class DependencyGraph implements DependencyScheduler {
  private members = new Set<Node>()
  private fields: Field<unknown>[] = []
  private edges = new Map<Field<unknown>, Set<Field<unknown>>>()
  private order: Field<unknown>[] = []
  private values = new Map<Field<unknown>, unknown>()
  private requested = new Set<Field<unknown>>()
  private enabled = true
  private configuration?: readonly {name: string; node: Node; refs: unknown}[]

  constructor(private form: Form, private getFields: () => Fields, private getTree: () => readonly Node[], private invalidate: () => void) {
    this.compile()
    this.rememberValues()
  }

  readonly disable = (): void => {
    assertValidationMutationAllowed()
    if (!this.enabled) return
    this.enabled = false
    for (const node of this.members) releaseDependencies(node, this)
    this.members.clear()
    this.fields = []
    this.order = []
    this.edges.clear()
    this.values.clear()
    this.requested.clear()
    this.configuration = undefined
    cancelDependencies(this)
  }

  get isEnabled(): boolean { return this.enabled }

  get selective(): boolean {
    return this.enabled && Object.values(this.getFields()).some(node => node instanceof Field &&
      node.options.dependsOn !== undefined &&
      (!Array.isArray(node.options.dependsOn) || node.options.dependsOn.length > 0))
  }

  selects(node: Node): boolean { return node === this.form || this.fields.includes(node as Field<unknown>) }

  request(node: Node): boolean {
    if (!this.selective || !(node instanceof Field) || !this.fields.includes(node)) return false
    this.requested.add(node)
    scheduleDependencies(this)
    return true
  }

  /** Explicit full checks remain immediate, but may not bypass invalid configuration. */
  check<TResult>(callback: () => TResult): TResult {
    this.compile()
    return this.selective ? dependencyValidation(callback) : callback()
  }

  private compile(): void {
    const entries = Object.entries(this.getFields())
    const configuration = entries.map(([name, node]) => ({name, node,
      refs: node instanceof Field ? node.options.dependsOn : undefined}))
    const unchanged = this.configuration?.length === configuration.length && configuration.every((entry, index) => {
      const previous = this.configuration![index]
      return previous.name === entry.name && previous.node === entry.node && previous.refs === entry.refs
    })
    if (unchanged) {
      this.reconcileMembers()
      return
    }
    const fields = entries.filter((entry): entry is [string, Field<unknown>] => entry[1] instanceof Field)
    const names = new Map(fields.map(([name, field]) => [field, name]))
    const byName = new Map(fields)
    const edges = new Map(fields.map(([, field]) => [field, new Set<Field<unknown>>()]))
    const fail = (message: string): never => { throw new DependencyConfigurationError(message) }
    if (names.size !== fields.length) fail('A Field must have exactly one property in an enabled Form')
    for (const [name, target] of fields) {
      const refs: unknown = target.options.dependsOn
      if (refs === undefined) continue
      if (!Array.isArray(refs)) fail(`Invalid dependsOn at ${JSON.stringify(name)}`)
      for (const ref of refs as unknown[]) {
        if (ref === null || typeof ref !== 'object' || !('path' in ref) ||
          Object.keys(ref).some(key => key !== 'path') || !Array.isArray(ref.path) ||
          ref.path.length !== 1 || typeof ref.path[0] !== 'string') {
          fail(`Expected a single literal Field path at ${JSON.stringify(name)}`)
        }
        const path = (ref as {path: [string]}).path
        const source = byName.get(path[0])
        if (!source) fail(`Unknown or unsupported dependency ${JSON.stringify(path)} at ${JSON.stringify(name)}`)
        edges.get(source!)!.add(target)
      }
    }
    // Kahn ordering with traversal-order tie breaks, including newly ready nodes.
    const indegree = new Map(fields.map(([, field]) => [field, 0]))
    for (const targets of edges.values()) for (const target of targets) indegree.set(target, indegree.get(target)! + 1)
    const order: Field<unknown>[] = []
    const remaining = new Set(fields.map(([, field]) => field))
    while (remaining.size) {
      const next = fields.find(([, field]) => remaining.has(field) && indegree.get(field) === 0)?.[1]
      if (!next) fail(`Cyclic dependencies among ${JSON.stringify(fields.filter(([, field]) => remaining.has(field)).map(([name]) => name))}`)
      remaining.delete(next!)
      order.push(next!)
      for (const target of edges.get(next!)!) indegree.set(target, indegree.get(target)! - 1)
    }
    // Membership conflicts must be checked before installing either graph or ownership.
    this.reconcileMembers()
    this.fields = fields.map(([, field]) => field)
    this.edges = edges
    this.order = order
    this.configuration = configuration
  }

  private reconcileMembers(): void {
    const members = new Set(this.getTree())
    for (const node of members) {
      const owner = dependencyOwner(node)
      if (owner && owner !== this) throw new DependencyConfigurationError('Dependency Forms must not share nodes or overlap')
    }
    // Install only after every configuration check succeeds.
    for (const node of this.members) if (!members.has(node)) releaseDependencies(node, this)
    for (const node of members) ownDependencies(node, this)
    this.members = members
  }

  private rememberValues(): void {
    this.values = new Map(this.fields.map(field => [field, copyValue(field.valueClear)]))
  }

  commit(): void {
    if (!this.enabled) return
    const requested = this.requested
    this.requested = new Set()
    try {
      this.compile()
      const selected = new Set([...requested].filter(field => this.fields.includes(field)))
      // Only validation-requesting, changed cleaned values originate propagation.
      // Already selected direct requests still need their transitive closure.
      const propagated = new Set<Field<unknown>>()
      const sources = [...requested].filter(source => selected.has(source) &&
        !equalValue(this.values.get(source), source.valueClear))
      while (sources.length) {
        const source = sources.pop()!
        if (propagated.has(source)) continue
        propagated.add(source)
        for (const target of this.edges.get(source) ?? []) {
          selected.add(target)
          sources.push(target)
        }
      }
      dependencyValidation(() => {
        for (const field of this.order) if (selected.has(field)) field.checkAndSetValid(this.form)
      })
    } finally {
      this.rememberValues()
      dependencyValidation(this.invalidate)
    }
  }
}
