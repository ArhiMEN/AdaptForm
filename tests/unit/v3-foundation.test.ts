import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {DateTime} from 'luxon'
import {DateLuxonType} from '../../src/luxon'
import {ArrayField, BooleanType, DateType, DecimalType, ErrorContractError, Field, FieldType, Form,
  NumberType, StringType, type BuiltinTypeId, type BuiltinValidationErrorInput, type ErrorParams,
  type FieldOptions, type FieldTypeContract, type FieldTypeConstructor, type JsonObject, type JsonValue,
  type LocatedValidationError, type ValidationError, type ValidationErrorInput, type ValidationErrorSource,
  type ValidationPath, type ValidationResult} from '../../src'
import {normalizeErrorParams} from '../../src/core/ErrorParams'
import {validationError} from '../../src/core/ValidationError'

class Slug implements FieldTypeContract<string, {prefix?: string}> {
  readonly typeId: string = 'app.slug'
  constructor(public options: {prefix?: string}) {}
  cast(raw: unknown) { return typeof raw === 'string' ? raw : null }
  validateErrors(value: string): readonly ValidationErrorInput[] {
    return value.startsWith(this.options.prefix ?? '') ? [] : [{code: 'app.prefix'}]
  }
}

function failure(callback: () => unknown, reason: string, path?: ValidationPath) {
  let caught: unknown
  try { callback() } catch (error) { caught = error }
  expect(caught).toBeInstanceOf(ErrorContractError)
  expect(caught).toMatchObject({reason, ...(path ? {path} : {})})
  expect(Object.isFrozen((caught as ErrorContractError).path)).toBe(true)
}

const builtins = [
  [StringType, {}, 'string'], [NumberType, {}, 'number'], [DecimalType, {}, 'decimal'],
  [BooleanType, {}, 'boolean'], [DateType, {}, 'date'], [DateType, {isDatetime: true}, 'datetime'],
  [DateLuxonType, {}, 'luxon_date'], [DateLuxonType, {isDatetime: true}, 'luxon_datetime'],
] as const

describe('V3 foundational contracts', () => {
  it('accepts a structural type without inheritance, including custom options and value inference', () => {
    const field = new Field(Slug, 'wrong', {prefix: 'ok'})
    expectTypeOf(field.valueClear).toEqualTypeOf<string | null>()
    expectTypeOf(field.options.prefix).toEqualTypeOf<string | undefined>()
    expect(field.getErrors()).toEqual([{code: 'app.prefix', source: 'type'}])
    field.rawValue = 'okay'
    expect(field.isValid).toBe(true)
    expect(field.valueClear).toBe('okay')
    field.rawValue = null
    field.checkAndSetValid()
    expect(field.getErrors()).toMatchObject([{code: 'required'}])
    class Root extends Form { slug = new Field(Slug, 'okay', {prefix: 'ok'}) }
    expectTypeOf(new Root().fieldsValue.slug).toEqualTypeOf<string | null>()
    expect(new Root().toJSON()).toEqual({slug: 'okay'})
    expect(new Slug({})).not.toBeInstanceOf(FieldType)
  })

  it('preserves options objects supplied by structural implementations', () => {
    class Configuration {
      prefix = 'ok'
      accepts(value: string) { return value.startsWith(this.prefix) }
    }
    const configuration = new Configuration()
    class Configured implements FieldTypeContract<string, Configuration> {
      readonly typeId = 'app.configured'
      options = configuration
      constructor(_options: Configuration) {}
      cast(raw: unknown) { return typeof raw === 'string' ? raw : null }
      validateErrors(value: string) { return this.options.accepts(value) ? [] : [{code: 'app.prefix'}] }
    }
    const field = new Field(Configured, 'okay')
    expect(field.options).toBe(configuration)
    expect(field.options.accepts('okay')).toBe(true)
    expect(field.isValid).toBe(true)
  })

  it.each(builtins)('uses the specified ID for %p in mode %j', (Type, options, id) => {
    const type = new Type(options)
    expect(type.typeId).toBe(id)
    expect('getTypeName' in type).toBe(false)
    expect('validate' in type).toBe(false)
  })

  it('uses the configured semantic ID on every built-in failed-cast route', () => {
    for (const [Type, options, id] of builtins) {
      if (Type === StringType) continue // StringType intentionally casts all nonempty inputs.
      const field = new Field(Type as FieldTypeConstructor<unknown, object>, null, options)
      field.setRawValue('not a valid value')
      expect(field.getErrors()).toEqual([{code: 'invalid_type', params: {expected: id}, source: 'type'}])
    }
  })

  it('uses explicit custom IDs even when constructor names change', () => {
    Object.defineProperty(Slug, 'name', {value: 'Minified'})
    const field = new Field(Slug)
    field.setRawValue(42)
    expect(field.getErrors()).toEqual([{code: 'invalid_type', params: {expected: 'app.slug'}, source: 'type'}])
    Object.defineProperty(Slug, 'name', {value: 'Slug'})
  })

  it.each([undefined, '', 42])('rejects invalid typeId %j at setup without a fallback', typeId => {
    class Broken extends Slug { readonly typeId = typeId as unknown as string }
    failure(() => new Field(Broken), 'invalid_type_id', ['typeId'])
  })

  it('uses mode getters and the same defensive and failed-cast expected IDs', () => {
    expect(new NumberType({}).validateErrors(Infinity)).toEqual([{code: 'invalid_type', params: {expected: 'number'}}])
    for (const mode of [false, true]) {
      const date = new DateType({isDatetime: mode})
      const luxon = new DateLuxonType({isDatetime: mode})
      expect(date.validateErrors(new Date(NaN))).toEqual([{code: 'invalid_type', params: {expected: date.typeId}}])
      expect(luxon.validateErrors(DateTime.invalid('test'))).toEqual([{code: 'invalid_type', params: {expected: luxon.typeId}}])
      for (const Type of [DateType, DateLuxonType]) {
        const field = new Field(Type as FieldTypeConstructor<unknown, {isDatetime: boolean}>, null, {isDatetime: mode})
        field.setRawValue('not a date')
        expect(field.getErrors()[0].params?.expected).toBe(Type === DateType ? date.typeId : luxon.typeId)
      }
      date.options = {isDatetime: !mode}
      luxon.options = {isDatetime: !mode}
      expect(date.typeId).toBe(mode ? 'date' : 'datetime')
      expect(luxon.typeId).toBe(mode ? 'luxon_date' : 'luxon_datetime')
    }
  })

  it('invalidates a successful field check when a supported date mode change changes its semantic ID', () => {
    const field = new Field(DateType, new Date('2026-01-01'))
    expect(field.isValid).toBe(true)
    field.options = {isDatetime: true}
    expect(field.isValid).toBe(null)
    field.checkAndSetValid()
    expect(field.isValid).toBe(true)
  })

  it('keeps local errors pathless and adds immutable relative aggregate paths', () => {
    class Root extends Form {
      tags = new ArrayField(value => new Field(StringType, value), {}, ['x'])
    }
    const form = new Root()
    form.tags.items[0].setErrors([{code: 'app.rule'}])
    expect(form.tags.items[0].getErrors()).toEqual([{code: 'app.rule', source: 'manual'}])
    expect(form.tags.getOwnErrors()).toEqual([])
    expect(form.tags.getErrors()).toEqual([{code: 'app.rule', source: 'manual', path: [0]}])
    expect(form.getErrors()).toEqual([{code: 'app.rule', source: 'manual', path: ['tags', 0]}])
    expect(Object.isFrozen(form.getErrors()[0].path)).toBe(true)
    form.setGlobalError('review', 'Review')
    expect(form.getOwnErrors()).toEqual([{code: 'manual', source: 'manual', message: 'Review'}])
    expect(form.getErrors()[form.getErrors().length - 1].path).toEqual([])
  })

  it('preserves order and repeated codes while assigning provenance and discarding untrusted fields', () => {
    for (const source of ['type', 'custom', 'server', 'manual'] as const) {
      const input = {code: 'app.repeat', params: {}, source: 'spoofed', path: ['spoofed'], rawValue: 'secret'}
      expect(validationError(input, source)).toEqual({code: 'app.repeat', params: {}, source})
    }
    const field = new Field(StringType)
    field.setErrors([{code: 'same'}, {code: 'same', message: ''}])
    expect(field.getErrors()).toEqual([{code: 'same', source: 'manual'}, {code: 'same', source: 'manual', message: ''}])
    expect(Object.isFrozen(field.getErrors())).toBe(true)
  })

  it('detaches located paths and rejects malformed path data without executing accessors', () => {
    const path = ['tags', 0]
    const error = validationError({code: 'app.rule'}, 'manual', path)
    path.push('later')
    expect(error.path).toEqual(['tags', 0])
    expect(Object.isFrozen(error.path)).toBe(true)
    for (const path of [[-1], [NaN], [Infinity], [1.5], [Number.MAX_SAFE_INTEGER + 1], [null], [{}]]) {
      failure(() => validationError({code: 'x'}, 'server', path as ValidationPath), 'invalid_path')
    }
    const getter = vi.fn(() => 'tags')
    const accessor = Object.defineProperty([0], '0', {get: getter})
    failure(() => validationError({code: 'x'}, 'server', accessor), 'unsafe_descriptor')
    expect(getter).not.toHaveBeenCalled()
  })

  it('validates code, message and present params before replacing existing errors', () => {
    const field = new Field(StringType)
    field.setErrors([{code: 'previous'}])
    const snapshot = field.getSnapshot(), notify = vi.fn()
    field.subscribe(notify)
    for (const input of [{code: ''}, {code: 1}, {code: 'x', params: undefined}, {code: 'x', message: undefined}]) {
      expect(() => field.setErrors([input as unknown as ValidationErrorInput])).toThrow(ErrorContractError)
      expect(field.getErrors()[0].code).toBe('previous')
      expect(field.getSnapshot()).toBe(snapshot)
    }
    expect(notify).not.toHaveBeenCalled()
  })

  it('does not execute code/message/params accessors at normalization', () => {
    for (const key of ['code', 'message', 'params']) {
      const getter = vi.fn(() => 'x')
      const input = Object.defineProperty(key === 'code' ? {} : {code: 'x'}, key, {get: getter})
      failure(() => validationError(input as ValidationErrorInput, 'manual'), 'unsafe_descriptor', [key])
      expect(getter).not.toHaveBeenCalled()
    }
  })
})

describe('ODR-02 ErrorParams domain', () => {
  it('copies valid nested JSON values, normalizes -0, and deeply freezes without freezing caller data', () => {
    const shared = {values: [1, true, null, 'text', -0]}
    const input = {a: shared, b: shared, emptyObject: {}, emptyArray: []}
    const output = normalizeErrorParams(input)
    expect(output).toEqual({a: {values: [1, true, null, 'text', 0]}, b: {values: [1, true, null, 'text', 0]}, emptyObject: {}, emptyArray: []})
    expect(Object.getPrototypeOf(output)).toBe(null)
    expect(output.a).not.toBe(output.b)
    expect(output.a).not.toBe(shared)
    expect(Object.is(((output.a as JsonObject).values as readonly JsonValue[])[4], -0)).toBe(false)
    const walk = (value: JsonValue) => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true)
        for (const child of Object.values(value)) walk(child)
      }
    }
    walk(output)
    shared.values.push('later')
    expect((output.a as JsonObject).values).toEqual([1, true, null, 'text', 0])
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(shared.values)).toBe(false)
    expect(() => { (output.a as Record<string, JsonValue>).changed = true }).toThrow(TypeError)
  })

  it.each([undefined, null, 'root', 1, true, [], new Date(), new Map(), new Set()])('rejects a non-object root %p', input => {
    failure(() => normalizeErrorParams(input), 'invalid_params_type', ['params'])
  })

  it.each([undefined, BigInt(1), Symbol('x'), () => {}, new Date(), new Map(), new Set(), /x/, new (class DTO {})()])(
    'rejects unsupported nested value %p', value => failure(() => normalizeErrorParams({nested: [value]}), 'invalid_params_type', ['params', 'nested', 0]),
  )

  it.each([NaN, Infinity, -Infinity])('rejects nonfinite number %p', value => {
    failure(() => normalizeErrorParams({limit: value}), 'nonfinite_number', ['params', 'limit'])
  })

  it('rejects object and array cycles, while accepting repeated acyclic data', () => {
    const object: Record<string, unknown> = {}; object.self = object
    failure(() => normalizeErrorParams(object), 'cyclic_params', ['params', 'self'])
    const array: unknown[] = []; array.push(array)
    failure(() => normalizeErrorParams({array}), 'cyclic_params', ['params', 'array', 0])
    const shared = {ok: 1}
    expect(normalizeErrorParams({a: shared, b: shared})).toEqual({a: {ok: 1}, b: {ok: 1}})
  })

  it('preserves dangerous keys as ordinary data in null-prototype output records', () => {
    const input = Object.create(null)
    for (const key of ['__proto__', 'constructor', 'prototype', 'toJSON', 'toString']) input[key] = {safe: key}
    const output = normalizeErrorParams(input)
    expect(Object.keys(output)).toEqual(Object.keys(input))
    expect(output).toEqual(input)
    expect(Object.getPrototypeOf(output)).toBe(null)
    expect(Object.getPrototypeOf(output.__proto__)).toBe(null)
    expect(Object.prototype).not.toHaveProperty('safe')
  })

  it('rejects unsafe prototypes, descriptors, sparse arrays, array subclasses and extra array keys', () => {
    const getter = vi.fn(() => 1), toJSON = vi.fn(() => ({}))
    const cases = [
      Object.create({inherited: 1}),
      Object.defineProperty({}, 'hidden', {value: 1}),
      Object.defineProperty({}, 'accessor', {get: getter, enumerable: true}),
      {[Symbol('key')]: 1},
      {array: Array(1)},
      {array: Object.assign([1], {extra: true})},
      {array: Object.assign([1], {[Symbol('key')]: 1})},
      {array: new (class Items extends Array<number> {})()},
      {array: Object.setPrototypeOf([], null)},
      {array: Object.defineProperty([1], '0', {get: getter})},
      {array: Object.defineProperty([1], '0', {enumerable: false})},
      {toJSON},
    ]
    for (const input of cases) expect(() => normalizeErrorParams(input)).toThrow(ErrorContractError)
    expect(getter).not.toHaveBeenCalled()
    expect(toJSON).not.toHaveBeenCalled()
    const frozen = Object.freeze({array: Object.freeze([Object.freeze({ok: 1})])})
    expect(normalizeErrorParams(frozen)).toEqual(frozen)
  })

  it('enforces exactly 32 levels with the params root at depth zero', () => {
    const nested = (depth: number): unknown => depth ? {child: nested(depth - 1)} : null
    expect(normalizeErrorParams(nested(32))).toBeDefined()
    failure(() => normalizeErrorParams(nested(33)), 'limit_exceeded')
  })

  it('enforces exactly 10000 visited nodes, charging repeated references per occurrence', () => {
    expect(normalizeErrorParams({items: Array(9998).fill(null)})).toBeDefined()
    failure(() => normalizeErrorParams({items: Array(9999).fill(null)}), 'limit_exceeded')
    const shared = {value: null}
    expect(normalizeErrorParams({items: Array(4999).fill(shared)})).toBeDefined()
    failure(() => normalizeErrorParams({items: Array(5000).fill(shared)}), 'limit_exceeded')
  })

  it('enforces exactly 65536 UTF-16 units for strings and keys', () => {
    expect(normalizeErrorParams({value: 'x'.repeat(65536)})).toBeDefined()
    failure(() => normalizeErrorParams({value: 'x'.repeat(65537)}), 'limit_exceeded', ['params', 'value'])
    expect(normalizeErrorParams({['x'.repeat(65536)]: null})).toBeDefined()
    failure(() => normalizeErrorParams({['x'.repeat(65537)]: null}), 'limit_exceeded')
  })

  it.each(['x', 'я', '界', '😀', '\ud800', '\udc00'])('counts deterministic UTF-8 bytes for %j at the exact total budget', unit => {
    const full = unit.repeat(Math.floor(65536 / unit.length))
    const parts: string[] = []
    let remaining = 1048576 - 2 - 1 - 2 // root, key "v", array
    const chunkBytes = new TextEncoder().encode(full).length
    while (remaining >= chunkBytes) { parts.push(full); remaining -= chunkBytes }
    // Remainder may use ASCII; every string still obeys the independent UTF-16 limit.
    while (remaining > 0) { const size = Math.min(remaining, 65536); parts.push('a'.repeat(size)); remaining -= size }
    expect(normalizeErrorParams({v: parts})).toBeDefined()
    failure(() => normalizeErrorParams({v: [...parts, 'x']}), 'limit_exceeded')
  })

  it('includes keys, numbers, booleans, null and every shared occurrence in byte accounting', () => {
    const chunk = 'x'.repeat(65536)
    // 2 root + 1 key + 2 array + 8 number + 1 boolean + 1 null + 1048561 string bytes.
    const parts: JsonValue[] = [42, true, null, ...Array(15).fill(chunk), 'x'.repeat(65521)]
    expect(normalizeErrorParams({v: parts})).toBeDefined()
    failure(() => normalizeErrorParams({v: [...parts, false]}), 'limit_exceeded')
    const shared = {value: chunk}
    failure(() => normalizeErrorParams({items: Array(16).fill(shared)}), 'limit_exceeded')
  })

  it('keeps the previous own errors when client DTO normalization fails', () => {
    const field = new Field(StringType, 'x')
    field.setErrors([{code: 'previous'}])
    field.options = {validate: () => [{code: 'bad', params: {nested: Infinity}}]}
    failure(() => field.checkValid(), 'nonfinite_number')
    expect(field.getErrors()).toEqual([{code: 'previous', source: 'manual'}])
    const callback = vi.fn((): readonly ValidationErrorInput[] => [{code: 'previous'}])
    const array = new ArrayField(value => new Field(StringType, value), {validate: callback}, ['x'])
    callback.mockReturnValue([{code: 'bad', params: {nested: Infinity}}])
    failure(() => array.checkValid(), 'nonfinite_number')
    expect(array.getOwnErrors()).toEqual([{code: 'previous', source: 'custom'}])
  })

  it('applies the same params validation to existing type, custom, manual and server ingress', () => {
    class BadType extends Slug { validateErrors() { return [{code: 'bad', params: {value: Infinity}}] } }
    failure(() => new Field(BadType, 'x'), 'nonfinite_number')
    failure(() => new Field(StringType, 'x', {validate: () => [{code: 'bad', params: {value: Infinity}}]}), 'nonfinite_number')
    const field = new Field(StringType)
    failure(() => field.setErrors([{code: 'bad', params: {value: Infinity}}]), 'nonfinite_number')
    class Root extends Form { value = field }
    const root = new Root()
    failure(() => root.setErrors([{path: ['value'], code: 'bad', params: {value: Infinity}}]), 'nonfinite_number')
    expect(field.getErrors()).toEqual([])
  })
})

// These checks exercise the exported contracts, not implementation-only inferred types.
function declarationContract() {
  expectTypeOf<ValidationErrorSource>().toEqualTypeOf<'type' | 'custom' | 'server' | 'manual'>()
  expectTypeOf<ValidationErrorInput['params']>().toEqualTypeOf<ErrorParams | undefined>()
  expectTypeOf<ValidationPath>().toEqualTypeOf<readonly (string | number)[]>()
  expectTypeOf<ValidationResult>().toEqualTypeOf<{readonly valid: boolean}>()
  expectTypeOf<keyof ValidationError>().toEqualTypeOf<'code' | 'message' | 'params' | 'source'>()
  expectTypeOf<LocatedValidationError['path']>().toEqualTypeOf<ValidationPath>()
  expectTypeOf<ErrorParams>().toEqualTypeOf<JsonObject>()
  const constructor: FieldTypeConstructor<string, {prefix?: string}> = Slug
  const params: ErrorParams = {nested: [null, true, 1, {value: 'ok'}]}
  const id: BuiltinTypeId = 'luxon_datetime'
  const builtin: BuiltinValidationErrorInput = {code: 'invalid_type', params: {expected: id}}
  const result: ValidationResult = {valid: false}
  // @ts-expect-error Rich values are outside the JSON params domain.
  const date: ErrorParams = {value: new Date()}
  // @ts-expect-error Present undefined is not JSON.
  const undefinedParam: ErrorParams = {value: undefined}
  // @ts-expect-error Built-in producers cannot attach display messages.
  const message: BuiltinValidationErrorInput = {code: 'required', message: 'Text'}
  // @ts-expect-error Catalogue-specific params are checked without an open string-code escape.
  const wrongParams: BuiltinValidationErrorInput = {code: 'min_length', params: {max: 2}}
  // @ts-expect-error A typeId is required even for structural implementations.
  const missingTypeId: FieldTypeContract<string, object> = {options: {}, cast: () => '', validateErrors: () => []}
  // @ts-expect-error The final result is an object, not the old validator-output union.
  const oldResult: ValidationResult = true
  const custom: FieldTypeContract<string, object> = new Slug({})
  // @ts-expect-error The required typeId is readonly.
  custom.typeId = 'changed'
  const options: FieldOptions = {validate: () => []}
  void [constructor, params, builtin, result, date, undefinedParam, message, wrongParams, missingTypeId, oldResult, options]
}
void declarationContract
