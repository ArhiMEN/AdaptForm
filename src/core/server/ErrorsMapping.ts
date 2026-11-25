import {invalid} from '../ErrorParams'
import {normalizePath, type ValidationErrorInput, type ValidationPath} from '../ValidationError'
import type {
  ArrayMappingOptions, DynamicErrorMapping, ErrorMappingTrace, ErrorsMappingConfig, ErrorTransform, MappingMergeOptions,
  MappingPrefixOptions, ServerErrorInput, StaticErrorMapping,
} from './schemaTypes'

type Segment = string | number
interface Capture { readonly at: number; readonly decode?: ArrayMappingOptions['index'] }
type Pattern = readonly (Segment | Capture)[]

interface Scope {
  readonly source: Pattern
  readonly target: Pattern
  readonly transforms: readonly ErrorTransform[]
  readonly fallback?: ErrorsMappingConfig['fallback']
}

interface StaticRule { readonly scope: Scope; readonly from: ValidationPath; readonly to: StaticErrorMapping['to'] }
interface DynamicRule {
  readonly scope: Scope
  readonly source: string
  readonly flags: string
  readonly key: DynamicErrorMapping['key']
  readonly to: DynamicErrorMapping['to']
  readonly priority: number
}

interface Program {
  readonly scopes: readonly Scope[]
  readonly statics: readonly StaticRule[]
  readonly dynamics: readonly DynamicRule[]
  readonly fallbackOrder: readonly Scope[]
}

const programs = new WeakMap<ErrorsMapping, Program>()
const empty: ValidationPath = Object.freeze([])
const isCapture = (part: Segment | Capture): part is Capture => typeof part === 'object'

function overlaps(left: Pattern, right: Pattern, exact = false): boolean {
  if (exact && left.length !== right.length) return false
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index++) {
    const a = left[index], b = right[index]
    if (!isCapture(a) && !isCapture(b) && a !== b) return false
  }
  return true
}

function matches(pattern: Pattern, path: ValidationPath): boolean {
  return pattern.length <= path.length && pattern.every((segment, index) => isCapture(segment) || segment === path[index])
}

function samePath(left: ValidationPath, right: ValidationPath): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index])
}

function sameIdentity(left: Scope, right: Scope): boolean {
  const length = Math.max(left.source.length, right.source.length)
  const input: Pattern = Array.from({length}, (_, at) => {
    const a = left.source[at], b = right.source[at]
    if (a !== undefined && !isCapture(a)) return a
    if (b !== undefined && !isCapture(b)) return b
    return {at}
  })
  const output = (scope: Scope): Pattern => [
    ...scope.target.map(segment => isCapture(segment) && !segment.decode ? input[segment.at] : segment),
    ...input.slice(scope.source.length),
  ]
  const a = output(left), b = output(right)
  return a.length === b.length && a.every((part, index) => {
    const other = b[index]
    return isCapture(part) && isCapture(other) ? part.at === other.at && part.decode === other.decode : part === other
  })
}

function compiled(config: ErrorsMappingConfig): Program {
  if (config === null || typeof config !== 'object') invalid('invalid_mapping')
  const transforms = Object.freeze([...(config.transform ?? [])])
  if (transforms.some(callback => typeof callback !== 'function') ||
    config.fallback !== undefined && typeof config.fallback !== 'function') invalid('invalid_mapping')
  const scope: Scope = {source: empty, target: empty, transforms, fallback: config.fallback}
  const statics: StaticRule[] = [], dynamics: DynamicRule[] = []
  const registered = new Set<string>()
  for (const rule of config.mappings ?? []) {
    if (!rule || typeof rule !== 'object') invalid('invalid_mapping')
    if (rule.kind === 'static') {
      const from = normalizePath(rule.from)
      const key = JSON.stringify(from)
      if (registered.has(key)) invalid('duplicate_static_mapping', from)
      registered.add(key)
      const to = typeof rule.to === 'function' ? rule.to : normalizePath(rule.to)
      statics.push({scope, from, to})
    } else if (rule.kind === 'dynamic') {
      const priority = rule.priority ?? 0
      if (!Number.isFinite(priority) || !(rule.pattern instanceof RegExp) ||
        typeof rule.key !== 'function' || typeof rule.to !== 'function') invalid('invalid_mapping')
      dynamics.push({scope, source: rule.pattern.source, flags: rule.pattern.flags, key: rule.key, to: rule.to, priority})
    } else invalid('invalid_mapping')
  }
  return {scopes: [scope], statics, dynamics: dynamics.sort((a, b) => b.priority - a.priority), fallbackOrder: [scope]}
}

function programFor(mapping: ErrorsMapping): Program {
  return programs.get(mapping) ?? invalid('invalid_mapping')
}

function fromProgram(program: Program): ErrorsMapping {
  const mapping = Object.create(ErrorsMapping.prototype) as ErrorsMapping
  programs.set(mapping, program)
  return Object.freeze(mapping)
}

function replaceScopes(program: Program, replace: (scope: Scope) => Scope): Program {
  const correspondence = new Map(program.scopes.map(scope => [scope, replace(scope)]))
  return {
    scopes: [...correspondence.values()],
    statics: program.statics.map(rule => ({...rule, scope: correspondence.get(rule.scope)!})),
    dynamics: program.dynamics.map(rule => ({...rule, scope: correspondence.get(rule.scope)!})),
    fallbackOrder: program.fallbackOrder.map(scope => correspondence.get(scope)!),
  }
}

function wrap(program: Program, source: Pattern, target: Pattern): Program {
  return replaceScopes(program, scope => {
    const shift = (part: Segment | Capture): Segment | Capture =>
      isCapture(part) ? {...part, at: part.at + source.length} : part
    return {...scope, source: [...source, ...scope.source.map(shift)], target: [...target, ...scope.target.map(shift)]}
  })
}

function checkPolicy(policy: 'error' | 'left' | 'right'): void {
  if (policy !== 'error' && policy !== 'left' && policy !== 'right') invalid('invalid_mapping_policy')
}

export class ErrorsMapping {
  constructor(config: ErrorsMappingConfig) {
    programs.set(this, compiled(config))
    Object.freeze(this)
  }

  static fromObject(mapping: Readonly<Record<string, ValidationPath>>): ErrorsMapping {
    const mappings: StaticErrorMapping[] = []
    for (const key of Reflect.ownKeys(mapping)) {
      if (typeof key !== 'string') invalid('unsafe_descriptor')
      const descriptor = Object.getOwnPropertyDescriptor(mapping, key)!
      if (!('value' in descriptor)) invalid('unsafe_descriptor', [key])
      if (descriptor.enumerable) mappings.push({kind: 'static', from: [key], to: normalizePath(descriptor.value)})
    }
    return new ErrorsMapping({mappings})
  }

  static forArray(item: ErrorsMapping, options: ArrayMappingOptions): ErrorsMapping {
    const source = normalizePath(options.sourcePrefix)
    const target = options.targetPrefix === undefined ? source : normalizePath(options.targetPrefix)
    const decode = options.index
    if (decode !== undefined && typeof decode !== 'function') invalid('invalid_mapping')
    const capture: Capture = {at: source.length, decode}
    return fromProgram(wrap(programFor(item), [...source, capture], [...target, capture]))
  }

  nest(options: MappingPrefixOptions): ErrorsMapping {
    return fromProgram(wrap(programFor(this), normalizePath(options.sourcePrefix),
      options.targetPrefix === undefined ? empty : normalizePath(options.targetPrefix)))
  }

  clone(): ErrorsMapping {
    const copy = replaceScopes(programFor(this), scope => ({
      ...scope, source: [...scope.source], target: [...scope.target], transforms: [...scope.transforms],
    }))
    return fromProgram({...copy, statics: copy.statics.map(rule => ({
      ...rule, from: normalizePath(rule.from), to: typeof rule.to === 'function' ? rule.to : normalizePath(rule.to),
    }))})
  }

  merge(other: ErrorsMapping, options: MappingMergeOptions = {}): ErrorsMapping {
    const left = programFor(this), right = programFor(other.clone())
    const staticPolicy = options.staticConflict ?? 'error', fallbackPolicy = options.fallbackConflict ?? 'error'
    checkPolicy(staticPolicy)
    checkPolicy(fallbackPolicy)
    if (staticPolicy === 'error') {
      for (const a of left.statics) for (const b of right.statics) {
        if (overlaps([...a.scope.source, ...a.from], [...b.scope.source, ...b.from], true)) invalid('static_mapping_conflict')
      }
    }
    if (fallbackPolicy === 'error') {
      for (const a of left.scopes) for (const b of right.scopes) {
        if (!overlaps(a.source, b.source)) continue
        if (a.fallback && b.fallback || !a.fallback && !b.fallback && !sameIdentity(a, b)) invalid('fallback_mapping_conflict')
      }
    }
    return fromProgram({
      scopes: [...left.scopes, ...right.scopes],
      statics: staticPolicy === 'right' ? [...right.statics, ...left.statics] : [...left.statics, ...right.statics],
      dynamics: [...left.dynamics, ...right.dynamics].sort((a, b) => b.priority - a.priority),
      fallbackOrder: fallbackPolicy === 'right'
        ? [...right.fallbackOrder, ...left.fallbackOrder] : [...left.fallbackOrder, ...right.fallbackOrder],
    })
  }
}

interface Route { readonly local: ValidationPath; readonly prefix: ValidationPath }
type Selection = Pick<ErrorMappingTrace, 'to' | 'matchedBy'> & {readonly error: ValidationErrorInput}

export function mapError(
  mapping: ErrorsMapping | undefined, path: ValidationPath, input: ValidationErrorInput,
  normalize: (result: unknown, previous: ValidationErrorInput) => ValidationErrorInput, maxSegments: number,
): Selection {
  if (!mapping) return {to: path, matchedBy: 'identity', error: input}
  const program = programFor(mapping)
  const routes = new Map<Scope, Route>()
  const indexes = new Map<Capture, number>()
  let error = input
  for (const scope of program.scopes) {
    if (!matches(scope.source, path)) continue
    const prefix = scope.target.map(segment => {
      if (!isCapture(segment)) return segment
      const previous = indexes.get(segment)
      if (previous !== undefined) return previous
      const raw = path[segment.at]
      const index = segment.decode ? segment.decode(raw) : raw
      if (typeof index !== 'number' || !Number.isSafeInteger(index) || index < 0) invalid('invalid_index', path)
      indexes.set(segment, index)
      return index
    })
    const local = Object.freeze(path.slice(scope.source.length))
    routes.set(scope, {local, prefix})
    for (const transform of scope.transforms) error = normalize(transform(error, local), error)
  }

  const view = (route: Route): ServerErrorInput => Object.freeze({...error, path: route.local})
  const result = (route: Route, to: unknown, matchedBy: Selection['matchedBy']): Selection => ({
    to: to === null ? null : normalizePath([...route.prefix, ...normalizePath(to, maxSegments)], maxSegments),
    matchedBy, error,
  })
  for (const rule of program.statics) {
    const route = routes.get(rule.scope)
    if (route && samePath(rule.from, route.local)) {
      return result(route, typeof rule.to === 'function' ? rule.to(view(route)) : rule.to, 'static')
    }
  }
  for (const rule of program.dynamics) {
    const route = routes.get(rule.scope)
    if (!route) continue
    const key = rule.key(route.local)
    if (typeof key !== 'string') invalid('invalid_mapping_key', path)
    const match = new RegExp(rule.source, rule.flags).exec(key)
    if (match) return result(route, rule.to(match, view(route)), 'dynamic')
  }
  for (const scope of program.fallbackOrder) {
    const route = routes.get(scope)
    if (route && scope.fallback) return result(route, scope.fallback(view(route)), 'fallback')
  }
  for (const scope of program.fallbackOrder) {
    const route = routes.get(scope)
    if (route) return result(route, route.local, 'identity')
  }
  return {to: null, matchedBy: 'scope', error}
}
