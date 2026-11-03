import {ErrorContractError} from './ErrorContractError'
import type {ValidationPath} from './ValidationError'

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject
export interface JsonObject { readonly [key: string]: JsonValue }
export type ErrorParams = JsonObject

// ODR-02 hard budgets, per params root. Keep independent from value snapshots.
const maxDepth = 32
const maxNodes = 10000
const maxBytes = 1048576
const maxStringLength = 65536

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

/** Validate, detach and deeply freeze one params root without executing accessors. */
export function normalizeErrorParams(input: unknown): ErrorParams {
  let nodes = 0, bytes = 0
  const active = new WeakSet<object>()
  const fail = (reason: string, path: ValidationPath): never => { throw new ErrorContractError(reason, path) }
  const charge = (amount: number, path: ValidationPath) => {
    if (bytes + amount > maxBytes) fail('limit_exceeded', path)
    bytes += amount
  }
  const string = (value: string, path: ValidationPath) => {
    if (value.length > maxStringLength) fail('limit_exceeded', path)
    charge(utf8Length(value), path)
  }
  const data = (object: object, key: PropertyKey, path: ValidationPath): unknown => {
    const descriptor = Object.getOwnPropertyDescriptor(object, key)
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail('unsafe_descriptor', path)
    return descriptor!.value
  }
  const visit = (value: unknown, depth: number, path: ValidationPath): JsonValue => {
    if (depth > maxDepth || ++nodes > maxNodes) fail('limit_exceeded', path)
    if (value === null || typeof value === 'boolean') { charge(1, path); return value }
    if (typeof value === 'string') { string(value, path); return value }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) fail('nonfinite_number', path)
      charge(8, path)
      return value === 0 ? 0 : value
    }
    if (typeof value !== 'object') return fail('invalid_params_type', path)
    const array = Array.isArray(value)
    const prototype = Object.getPrototypeOf(value)
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      return fail('invalid_params_type', path)
    }
    if (active.has(value)) return fail('cyclic_params', path)
    charge(2, path)
    active.add(value)
    try {
      const keys = Reflect.ownKeys(value)
      if (array) {
        // Ordinary array length is an own data property. No getters or iteration hooks.
        const length = Object.getOwnPropertyDescriptor(value, 'length')!.value as number
        if (length > maxNodes - nodes) fail('limit_exceeded', path)
        if (keys.length !== length + 1) fail('unsafe_descriptor', path)
        const output: JsonValue[] = []
        for (let index = 0; index < length; index++) {
          const childPath = [...path, index]
          output.push(visit(data(value, String(index), childPath), depth + 1, childPath))
        }
        return Object.freeze(output)
      }
      const output: Record<string, JsonValue> = Object.create(null)
      for (const key of keys) {
        if (typeof key !== 'string') fail('invalid_params_type', path)
        const childPath = [...path, key as string]
        string(key as string, childPath)
        const child = data(value, key, childPath)
        output[key as string] = visit(child, depth + 1, childPath)
      }
      return Object.freeze(output)
    } finally { active.delete(value) }
  }
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('invalid_params_type', ['params'])
  }
  return visit(input, 0, ['params']) as ErrorParams
}
