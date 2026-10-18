/** Detached captures for supported mutable values; custom instances remain opaque. */
export function copyValue<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return seen.get(value) as T
  const remember = (copy: unknown): T => { seen.set(value, copy); return copy as T }
  if (value instanceof Date) return remember(new Date(value.getTime()))
  if (value instanceof RegExp) return remember(new RegExp(value.source, value.flags))
  if (value instanceof ArrayBuffer) return remember(value.slice(0))
  if (ArrayBuffer.isView(value)) {
    const bytes = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
    return remember(value instanceof DataView ? new DataView(bytes) :
      new (value.constructor as new (buffer: ArrayBuffer) => object)(bytes as ArrayBuffer))
  }
  if (value instanceof Map) {
    const result = new Map()
    seen.set(value, result)
    for (const [key, item] of value) result.set(copyValue(key, seen), copyValue(item, seen))
    return result as T
  }
  if (value instanceof Set) {
    const result = new Set()
    seen.set(value, result)
    for (const item of value) result.add(copyValue(item, seen))
    return result as T
  }
  if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
    const result = Array.isArray(value) ? new Array(value.length) : Object.create(Object.getPrototypeOf(value))
    seen.set(value, result)
    for (const key of Object.keys(value)) Object.defineProperty(result, key, {
      value: copyValue((value as Record<string, unknown>)[key], seen), enumerable: true, writable: true, configurable: true,
    })
    return result as T
  }
  return value
}

export function equalValue(a: unknown, b: unknown, seen = new WeakMap<object, object>()): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false
  if (seen.has(a)) return seen.get(a) === b
  seen.set(a, b)
  if (a instanceof Date && b instanceof Date) return Object.is(a.getTime(), b.getTime())
  if (a instanceof RegExp && b instanceof RegExp) return a.source === b.source && a.flags === b.flags
  if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) return equalValue(new Uint8Array(a), new Uint8Array(b), seen)
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    const av = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
    const bv = new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
    return av.length === bv.length && av.every((byte, i) => byte === bv[i])
  }
  if (a instanceof Map && b instanceof Map) return equalValue([...a], [...b], seen)
  if (a instanceof Set && b instanceof Set) return equalValue([...a], [...b], seen)
  // Luxon stays optional. Its immutable DateTime implements semantic equality.
  if ('isLuxonDateTime' in a && a.isLuxonDateTime === true && 'equals' in a && typeof a.equals === 'function') {
    return a.equals(b)
  }
  if (!Array.isArray(a) && Object.getPrototypeOf(a) !== Object.prototype && Object.getPrototypeOf(a) !== null) return false
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key =>
    Object.prototype.hasOwnProperty.call(b, key) && equalValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], seen))
}
