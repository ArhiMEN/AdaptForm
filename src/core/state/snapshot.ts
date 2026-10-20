/** Snapshots contain data only: mutable built-ins and opaque instances are described. */
export type SnapshotValue = null | undefined | string | number | boolean | bigint |
  readonly SnapshotValue[] | {readonly [key: string]: SnapshotValue}

export interface NodeSnapshot {
  readonly isValid: boolean | null
  readonly isTouched: boolean
  readonly isDirty: boolean
}
export interface FieldSnapshot extends NodeSnapshot {
  readonly rawValue: SnapshotValue
  readonly valueClear: SnapshotValue
  readonly errors: readonly string[]
}
export interface FormSnapshot extends NodeSnapshot {
  readonly fieldsValue: Readonly<Record<string, SnapshotValue>>
  readonly allErrors: Readonly<Record<string, readonly string[]>>
  readonly globalErrors: Readonly<Record<string, string>>
  readonly fields: Readonly<Record<string, FieldSnapshot | ArrayFieldSnapshot | ArrayFormSnapshot>>
}
export interface ArrayFieldSnapshot extends NodeSnapshot {
  /** Present on engine snapshots; optional for compatibility with 2.2.0 producers. */
  readonly itemIds?: readonly string[]
  readonly itemsValue: readonly SnapshotValue[]
  readonly errors: readonly string[]
  readonly items: readonly FieldSnapshot[]
}
export interface ArrayFormSnapshot extends NodeSnapshot {
  /** Ordered node identities, independent of current indexes and values. */
  readonly itemIds?: readonly string[]
  readonly formsFieldsValue: readonly Readonly<Record<string, SnapshotValue>>[]
  readonly errors: readonly string[]
  readonly forms: readonly FormSnapshot[]
}

export function snapshotValue(value: unknown, seen = new WeakMap<object, SnapshotValue>()): SnapshotValue {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value
  if (typeof value !== 'object') return Object.freeze({kind: 'Opaque', type: typeof value})
  const previous = seen.get(value)
  if (previous) return previous
  if (value instanceof Date) return Object.freeze({kind: 'Date', timestamp: value.getTime()})
  if (value instanceof RegExp) return Object.freeze({kind: 'RegExp', source: value.source, flags: value.flags})
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    return Object.freeze({kind: value.constructor.name, bytes: Object.freeze([...bytes])})
  }
  if ('isLuxonDateTime' in value && value.isLuxonDateTime === true && 'toISO' in value && typeof value.toISO === 'function') {
    return Object.freeze({kind: 'DateTime', iso: value.toISO() as string | null})
  }
  if (value instanceof Map || value instanceof Set) {
    const result: Record<string, SnapshotValue> = {kind: value instanceof Map ? 'Map' : 'Set'}
    seen.set(value, result)
    result.entries = snapshotValue([...value], seen)
    return Object.freeze(result)
  }
  if (Array.isArray(value)) {
    const result: SnapshotValue[] = []
    seen.set(value, result)
    for (const item of value) result.push(snapshotValue(item, seen))
    return Object.freeze(result)
  }
  if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
    const result: Record<string, SnapshotValue> = Object.create(null)
    seen.set(value, result)
    for (const [key, item] of Object.entries(value)) result[key] = snapshotValue(item, seen)
    return Object.freeze(result)
  }
  return Object.freeze({kind: 'Opaque', type: value.constructor?.name ?? 'object'})
}

/** Freeze node metadata without following or retaining model objects. */
export function freezeSnapshot<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const item of Object.values(value)) freezeSnapshot(item, seen)
  return Object.freeze(value)
}
