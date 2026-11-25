import {dataProperty, invalid, JsonBudget, normalizeErrorParams, normalizeJson} from '../ErrorParams'
import {normalizePath, type ValidationErrorInput, type ValidationPath} from '../ValidationError'
import {validationCallback} from '../state/validationExecution'
import {mapError} from './ErrorsMapping'
import type {ErrorMappingTrace, ErrorSelector, ErrorsSchemaConfig, ErrorsSchemaLimits, ParsedServerErrors, ServerErrorEntry} from './schemaTypes'

const ceilings: ErrorsSchemaLimits = {
  maxDepth: 64, maxNodes: 100000, maxErrors: 10000, maxPathSegments: 64,
  maxStringLength: 65536, maxBytes: 8388608,
}
const owned = new WeakSet<object>()
const missing = Symbol('missing selector value')

export function serverEntries(batch: ParsedServerErrors): readonly ServerErrorEntry[] {
  if (!owned.has(batch)) invalid('invalid_server_batch')
  return batch.entries
}

function schemaLimits(options: Partial<ErrorsSchemaLimits> | undefined): ErrorsSchemaLimits {
  const limits = {...ceilings}
  for (const key of Object.keys(options ?? {})) {
    if (!Object.prototype.hasOwnProperty.call(ceilings, key)) invalid('invalid_schema_limits', [key])
    const limit = key as keyof ErrorsSchemaLimits
    const value = options?.[limit]
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value > ceilings[limit]) {
      invalid('invalid_schema_limits', [key])
    }
    limits[limit] = value
  }
  return limits
}

function copySelector<T>(selector: ErrorSelector<T>, maxSegments: number): ErrorSelector<T> {
  if (!selector || typeof selector !== 'object') return invalid('invalid_selector')
  const keys = Reflect.ownKeys(selector)
  if (keys.length !== 1) return invalid('invalid_selector')
  if ('at' in selector && keys[0] === 'at') return {at: normalizePath(selector.at, maxSegments)}
  if ('read' in selector && keys[0] === 'read' && typeof selector.read === 'function') return {read: selector.read}
  if ('value' in selector && keys[0] === 'value') return {value: selector.value}
  return invalid('invalid_selector')
}

function select<T>(selector: ErrorSelector<T>, input: T): unknown {
  if ('read' in selector) {
    const value = selector.read(input)
    return value === undefined ? missing : value
  }
  if ('value' in selector) return selector.value
  let value: unknown = input
  for (const segment of selector.at) {
    if (value === null || typeof value !== 'object') return missing
    if (Array.isArray(value) ? typeof segment !== 'number' : typeof segment !== 'string') return missing
    const descriptor = dataProperty(value, segment, selector.at)
    if (!descriptor) return missing
    value = descriptor.value
  }
  return value
}

class ParsePass {
  private readonly json: JsonBudget
  private readonly detached = new WeakSet<object>()
  private count = 0
  private readonly entries: ServerErrorEntry[] = []
  private readonly trace?: ErrorMappingTrace[]

  constructor(private readonly limits: ErrorsSchemaLimits, trace: boolean) {
    this.json = new JsonBudget(limits)
    if (trace) this.trace = []
  }

  materialize(value: unknown, at: ValidationPath = []): unknown {
    if (value !== null && typeof value === 'object' && this.detached.has(value)) return value
    return normalizeJson(value, this.json, at, 'response', copy => this.detached.add(copy))
  }

  path(value: unknown, at: ValidationPath = ['path']): ValidationPath {
    return normalizePath(value, this.limits.maxPathSegments, at)
  }

  private chargePath(path: ValidationPath, at: ValidationPath): void {
    this.json.node(1, at)
    this.json.charge(2, at)
    for (const segment of path) {
      this.json.node(2, at)
      if (typeof segment === 'string') this.json.string(segment, at)
      else this.json.charge(8, at)
    }
  }

  private error(input: unknown, at: ValidationPath, previous?: ValidationErrorInput): ValidationErrorInput {
    if (previous && input === previous) return previous
    if (input === null || typeof input !== 'object' || Array.isArray(input)) invalid('invalid_error', at)
    const prototype = Object.getPrototypeOf(input)
    if (prototype !== Object.prototype && prototype !== null) invalid('invalid_error', at)
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== 'string') invalid('unsafe_descriptor', at)
      dataProperty(input, key, [...at, key])
    }
    const code = dataProperty(input, 'code', [...at, 'code'])?.value as unknown
    const message = dataProperty(input, 'message', [...at, 'message'])
    const params = dataProperty(input, 'params', [...at, 'params'])
    if (typeof code !== 'string' || !code.length) invalid('invalid_code', [...at, 'code'])
    if (message && typeof message.value !== 'string') invalid('invalid_message', [...at, 'message'])
    this.json.node(0, at)
    this.json.charge(2, at)
    const string = (key: string, value: string) => {
      const path = [...at, key]
      this.json.node(1, path)
      this.json.string(key, path)
      this.json.string(value, path)
    }
    string('code', code)
    if (message) string('message', message.value)
    if (params) this.json.string('params', [...at, 'params'])
    const normalized = params && previous?.params !== undefined && params.value === previous.params
      ? previous.params : params ? normalizeErrorParams(params.value, this.json, [...at, 'params']) : undefined
    return Object.freeze({code, ...(message ? {message: message.value as string} : {}),
      ...(normalized === undefined ? {} : {params: normalized})})
  }

  add(mapping: ErrorsSchemaConfig<unknown>['mapping'], path: ValidationPath, value: unknown): void {
    const index = this.count++
    if (this.count > this.limits.maxErrors) invalid('limit_exceeded', [index])
    this.chargePath(path, [index, 'path'])
    const error = this.error(value, [index])
    const mapped = mapError(mapping, path, error, (next, previous) => this.error(next, [index], previous),
      this.limits.maxPathSegments)
    const {to, matchedBy} = mapped
    if (to !== null) {
      if (to !== path) this.chargePath(to, [index, 'path'])
      this.entries.push(Object.freeze({path: to, error: Object.freeze({...mapped.error, source: 'server' as const})}))
    }
    this.trace?.push(Object.freeze({index, from: path, to, matchedBy}))
  }

  records<R>(config: Extract<ErrorsSchemaConfig<R>, {kind: 'records'}>, value: unknown): void {
    if (!Array.isArray(value)) invalid('invalid_records')
    for (const record of value) {
      const rawPath = select(config.path, record)
      const rawCode = select(config.code, record)
      if (rawPath === missing || rawCode === missing) invalid('missing_required_selector', [this.count])
      const path = this.path(config.decodePath ? config.decodePath(this.materialize(rawPath)) : rawPath)
      const message = config.message ? select(config.message, record) : missing
      const params = config.params ? select(config.params, record) : missing
      this.add(config.mapping, path, {code: rawCode,
        ...(message === missing ? {} : {message}), ...(params === missing ? {} : {params})})
    }
  }

  tree<R>(config: Extract<ErrorsSchemaConfig<R>, {kind: 'tree'}>, value: unknown, path: ValidationPath = Object.freeze([])): void {
    const leaf = config.leaf(value, path)
    if (leaf !== undefined) {
      if (!Array.isArray(leaf) || Object.getPrototypeOf(leaf) !== Array.prototype) invalid('invalid_leaf', path)
      if (leaf.length > this.limits.maxErrors - this.count) invalid('limit_exceeded', path)
      if (Reflect.ownKeys(leaf).length !== leaf.length + 1) invalid('unsafe_descriptor', path)
      for (let index = 0; index < leaf.length; index++) {
        const entry = dataProperty(leaf, index, [...path, index])
        if (!entry) invalid('unsafe_descriptor', [...path, index])
        this.add(config.mapping, path, entry.value)
      }
    } else if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        this.tree(config, value[index], this.path([...path, index]))
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        const segments = config.decodeKey ? this.path(config.decodeKey(key)) : [key]
        this.tree(config, child, this.path([...path, ...segments]))
      }
    } else invalid('unrecognized_tree_leaf', path)
  }

  adapter<R>(config: Extract<ErrorsSchemaConfig<R>, {kind: 'adapter'}>, response: R): void {
    const extracted = config.extract(response)
    if (!extracted || typeof extracted !== 'object' && typeof extracted !== 'function' ||
      typeof extracted[Symbol.iterator] !== 'function' || Symbol.asyncIterator in extracted) invalid('invalid_adapter_result')
    for (const entry of extracted) {
      if (!entry || typeof entry !== 'object') invalid('invalid_error', [this.count])
      const path = this.path(dataProperty(entry, 'path', [this.count, 'path'])?.value)
      this.add(config.mapping, path, entry)
    }
  }

  finish(): ParsedServerErrors {
    const batch = Object.freeze({
      entries: Object.freeze(this.entries),
      ...(this.trace ? {trace: Object.freeze(this.trace)} : {}),
    }) as ParsedServerErrors
    owned.add(batch)
    return batch
  }
}

/** Parse one explicitly configured response format into reusable server entries. */
export class ErrorsSchema<R = unknown> {
  private readonly config: ErrorsSchemaConfig<R>
  private readonly limits: ErrorsSchemaLimits

  constructor(config: ErrorsSchemaConfig<R>) {
    if (!config || typeof config !== 'object') invalid('invalid_schema_config')
    this.limits = schemaLimits(config.limits)
    const copy = <T>(selector: ErrorSelector<T>) => copySelector(selector, this.limits.maxPathSegments)
    if (config.kind === 'adapter') {
      if (typeof config.extract !== 'function') invalid('invalid_schema_config')
      this.config = {...config}
    } else if (config.kind === 'tree') {
      if (typeof config.leaf !== 'function') invalid('invalid_schema_config')
      this.config = {...config, ...(config.select ? {select: copy(config.select)} : {})}
    } else if (config.kind === 'records') {
      this.config = {...config, path: copy(config.path), code: copy(config.code),
        ...(config.select ? {select: copy(config.select)} : {}),
        ...(config.message ? {message: copy(config.message)} : {}),
        ...(config.params ? {params: copy(config.params)} : {}),
      }
    } else invalid('invalid_schema_config')
  }

  parse(response: R, options: {readonly trace?: boolean} = {}): ParsedServerErrors {
    return validationCallback(() => {
      const pass = new ParsePass(this.limits, options.trace === true)
      const input = pass.materialize(response) as R
      const config = this.config
      if (config.kind === 'adapter') pass.adapter(config, input)
      else {
        const selected = config.select ? select(config.select, input) : input
        if (selected === missing) invalid('missing_response_selector')
        const normalized = config.select && !('at' in config.select) ? pass.materialize(selected) : selected
        if (config.kind === 'records') pass.records(config, normalized)
        else pass.tree(config, normalized)
      }
      return pass.finish()
    })
  }
}
