import {ErrorContractError} from './ErrorContractError'
import type {ValidationPath} from './ValidationError'

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject
export interface JsonObject { readonly [key: string]: JsonValue }
export type ErrorParams = JsonObject

interface JsonLimits {
  readonly maxDepth: number
  readonly maxNodes: number
  readonly maxBytes: number
  readonly maxStringLength: number
}

const paramsLimits: JsonLimits = {maxDepth: 32, maxNodes: 10000, maxBytes: 1048576, maxStringLength: 65536}

export function invalid(reason: string, path: ValidationPath = []): never {
  throw new ErrorContractError(reason, path)
}

/** Own enumerable data only. Missing and present undefined remain distinguishable. */
export function dataProperty(object: object, key: string | number, path: ValidationPath): PropertyDescriptor | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(object, key)
  if (descriptor && (!('value' in descriptor) || !descriptor.enumerable)) invalid('unsafe_descriptor', path)
  return descriptor
}

/** UTF-8 length, including replacement bytes for unpaired UTF-16 surrogates. */
function utf8Length(value: string): number {
  let bytes = 0
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index)
    if (unit < 0x80) bytes++
    else if (unit < 0x800) bytes += 2
    else if (unit >= 0xd800 && unit <= 0xdbff && index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4
      index++
    } else bytes += 3
  }
  return bytes
}

/** Counts logical output and optionally charges a larger enclosing parser budget. */
export class JsonBudget {
  private nodes = 0
  private bytes = 0

  constructor(private readonly limits: JsonLimits, private readonly enclosing?: JsonBudget, private readonly offset = 0) {}

  get remainingNodes(): number { return this.limits.maxNodes - this.nodes }

  checkNodes(count: number, path: ValidationPath): void {
    if (count > this.remainingNodes) invalid('limit_exceeded', path)
    this.enclosing?.checkNodes(count, path)
  }

  node(depth: number, path: ValidationPath): void {
    if (depth > this.limits.maxDepth || ++this.nodes > this.limits.maxNodes) invalid('limit_exceeded', path)
    this.enclosing?.node(depth + this.offset, path)
  }

  charge(amount: number, path: ValidationPath): void {
    this.bytes += amount
    if (this.bytes > this.limits.maxBytes) invalid('limit_exceeded', path)
    this.enclosing?.charge(amount, path)
  }

  private checkString(value: string, path: ValidationPath): void {
    if (value.length > this.limits.maxStringLength) invalid('limit_exceeded', path)
    this.enclosing?.checkString(value, path)
  }

  string(value: string, path: ValidationPath): void {
    this.checkString(value, path)
    this.charge(utf8Length(value), path)
  }
}

/** Validate, detach and freeze JSON data without getters, iterators or toJSON. */
export function normalizeJson(
  input: unknown, budget: JsonBudget, root: ValidationPath = [], kind = 'json',
  record?: (copy: object) => void, startDepth = 0,
): JsonValue {
  const active = new WeakSet<object>()
  const visit = (value: unknown, depth: number, path: ValidationPath): JsonValue => {
    budget.node(depth, path)
    if (value === null || typeof value === 'boolean') { budget.charge(1, path); return value }
    if (typeof value === 'string') { budget.string(value, path); return value }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) invalid('nonfinite_number', path)
      budget.charge(8, path)
      return value === 0 ? 0 : value
    }
    if (typeof value !== 'object') return invalid(`invalid_${kind}_type`, path)
    const array = Array.isArray(value)
    const prototype = Object.getPrototypeOf(value)
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      return invalid(`invalid_${kind}_type`, path)
    }
    if (active.has(value)) return invalid(`cyclic_${kind}`, path)
    budget.charge(2, path)
    active.add(value)
    try {
      const keys = Reflect.ownKeys(value)
      if (array) {
        const length = Object.getOwnPropertyDescriptor(value, 'length')!.value as number
        budget.checkNodes(length, path)
        if (keys.length !== length + 1) invalid('unsafe_descriptor', path)
        const output: JsonValue[] = []
        for (let index = 0; index < length; index++) {
          const childPath = [...path, index]
          const descriptor = dataProperty(value, index, childPath)
          if (!descriptor) invalid('unsafe_descriptor', childPath)
          output.push(visit(descriptor.value, depth + 1, childPath))
        }
        record?.(output)
        return Object.freeze(output)
      }
      budget.checkNodes(keys.length, path)
      const output: Record<string, JsonValue> = Object.create(null)
      for (const key of keys) {
        if (typeof key !== 'string') invalid(`invalid_${kind}_type`, path)
        const childPath = [...path, key]
        budget.string(key, childPath)
        output[key] = visit(dataProperty(value, key, childPath)!.value, depth + 1, childPath)
      }
      record?.(output)
      return Object.freeze(output)
    } finally { active.delete(value) }
  }
  return visit(input, startDepth, root)
}

export function normalizeErrorParams(input: unknown, enclosing?: JsonBudget, path: ValidationPath = ['params']): ErrorParams {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) invalid('invalid_params_type', path)
  return normalizeJson(input, new JsonBudget(paramsLimits, enclosing, 1), path, 'params') as ErrorParams
}
