import {DateTime} from 'luxon'
import {DateLuxonType} from '../../src/luxon'
import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, BooleanType, DateType, DecimalType, ErrorsSchema, Field, FieldType, Form,
  NumberType, StringType, type FieldSnapshot, type ValidationError, type ValidationErrorInput,
  type ValidationResult} from '../../src'

class Row extends Form {
  name = new Field(StringType, 'name')
  tags = new ArrayField(value => new Field(StringType, value), {}, ['tag'])
}
class Root extends Form {
  email = new Field(StringType, 'email')
  rows = new ArrayFormField(Row, {}, [{}, {}])
  tags = new ArrayField(value => new Field(StringType, value), {}, ['a', 'b'])
}
const duplicate = [{code: 'rule', message: 'First', params: {min: 2}}, {code: 'rule', message: 'Second'}] as const

describe('structured validation errors', () => {
  it('retains multiple errors, repeated codes and their order', () => {
    const field = new Field(StringType, 'x', {validate: () => duplicate})
    expect(field.getErrors()).toEqual(duplicate.map(error => ({...error, source: 'custom', path: []})))
    expect(field.errors).toEqual(['First', 'Second'])
    expect(field.error).toBe('First')
    expect(field.isValid).toBe(false)
  })

  it('supports errors without a message independently from their text projection', () => {
    const field = new Field(StringType, 'x', {validate: () => ({code: 'unavailable'})})
    expect(field.getErrors()).toEqual([{code: 'unavailable', source: 'custom', path: []}])
    expect(field.errors).toEqual(['unavailable'])
    expect(field.isValid).toBe(false)
  })

  it('detaches and freezes params without retaining the input object or extra error properties', () => {
    const params = {min: 2, nested: {expected: ['a']}}
    const input = {code: 'min_length', params, value: 'sensitive', rawValue: 'sensitive'}
    const field = new Field(StringType, 'secret', {validate: () => input})
    const error = field.getErrors()[0]
    params.nested.expected.push('b')
    expect(error.params).toEqual({min: 2, nested: {expected: ['a']}})
    expect(Object.keys(error)).toEqual(['code', 'params', 'path', 'source'])
    expect(Object.isFrozen(error)).toBe(true)
    expect(Object.isFrozen(error.params)).toBe(true)
    expect(Object.isFrozen(error.path)).toBe(true)
    expect(JSON.stringify(error)).not.toContain('sensitive')
  })

  it.each([true, false, '', 'Specific failure'] as const)('preserves legacy validator result %j', result => {
    const field = new Field(StringType, 'x', {validate: () => result, messages: {validate: 'Configured'}})
    expect(field.isValid).toBe(result === true)
    expect(field.errors).toEqual(result === true ? [] : [result === false ? 'Configured' : result])
  })

  it.each([undefined, null, 0, {}, [], [true]])('preserves other legacy JS success values %j', result => {
    const field = new Field(StringType, 'x', {validate: (() => result) as () => ValidationResult})
    expect(field.isValid).toBe(true)
    expect(field.getErrors()).toEqual([])
  })

  it('preserves type-specific early exits and does not invoke custom rules on type failures', () => {
    const validate = vi.fn(() => duplicate)
    const field = new Field(StringType, 'x', {minLength: 2, pattern: /^z$/, validate})
    expect(field.getErrors().map(error => error.code)).toEqual(['min_length', 'pattern'])
    expect(validate).not.toHaveBeenCalled()
    expect(field.errors).toEqual(['Минимальная длина 2 символов', 'Неверный формат'])
  })

  it('keeps custom FieldType string validators and built-in subclass overrides working', () => {
    class Custom extends FieldType<string> {
      cast(value: unknown) { return String(value) }
      validate() { return ['One', 'Two'] }
      getTypeName() { return 'custom' }
    }
    class CustomString extends StringType { validate() { return ['Override'] } }
    expect(new Field(Custom, 'x').errors).toEqual(['One', 'Two'])
    expect(new Field(CustomString, 'x', {minLength: 20}).getErrors()).toMatchObject([{message: 'Override'}])
    expect(new StringType({minLength: 2}).validate('x')).toEqual(['Минимальная длина 2 символов'])
  })

  it('preserves protected _errors subclass writes and mutable legacy arrays', () => {
    class CustomField extends Field<string> {
      protected _errors: string[] = ['Subclass']
    }
    const field = new CustomField(StringType)
    expect(field.getErrors()).toMatchObject([{message: 'Subclass', source: 'external'}])
    field.errors.push('Added')
    expect(field.getSnapshot().validationErrors).toMatchObject([{message: 'Subclass'}, {message: 'Added'}])
    field.errors.splice(0, 1)
    expect(field.getErrors()).toMatchObject([{message: 'Added'}])
  })

  it('keeps duplicate structured entries distinct after legacy array edits', () => {
    const field = new Field(StringType, 'x')
    field.setErrors([{code: 'one', message: 'same'}, {code: 'two', message: 'same'}])
    field.errors.push('external')
    expect(field.getErrors().map(error => error.code)).toEqual(['one', 'two', 'external'])
    field.errors.reverse()
    expect(field.getErrors().map(error => error.code)).toEqual(['external', 'two', 'one'])
  })

  it('assigns provenance at the engine boundary', () => {
    const field = new Field(StringType, 'x', {validate: () => ({code: 'rule', source: 'server', path: ['spoofed']})})
    expect(field.getErrors()).toEqual([{code: 'rule', source: 'custom', path: []}])
    field.error = 'Manual'
    expect(field.getErrors()[0].source).toBe('external')
    field.setErrors([{code: 'manual'}])
    expect(field.getErrors()[0].source).toBe('external')
  })

  it('rejects missing or empty explicit codes atomically', () => {
    const field = new Field(StringType, 'x')
    field.setErrors([{code: 'previous'}])
    expect(() => field.setErrors([{code: ''}])).toThrow(TypeError)
    expect(field.getErrors()[0].code).toBe('previous')
  })

  it('keeps declarations additive and validators contextually typed', () => {
    expectTypeOf<ValidationError['code']>().toEqualTypeOf<string>()
    expectTypeOf<ValidationError['path']>().toEqualTypeOf<readonly (string | number)[]>()
    expectTypeOf(new Field(StringType).getErrors()).toEqualTypeOf<readonly ValidationError[]>()
    const oldSnapshot: FieldSnapshot = {rawValue: null, valueClear: null, errors: [], isValid: null, isTouched: false, isDirty: false}
    expect(oldSnapshot.validationErrors).toBeUndefined()
    const options = {validate: (value: string): ValidationResult => value.length < 2 ? {code: 'min_length', params: {min: 2}} : true}
    expectTypeOf(options.validate('x')).toEqualTypeOf<ValidationResult>()
    expectTypeOf(new Root().fieldsValue.email).toEqualTypeOf<string | null>()
  })
})

describe('built-in codes', () => {
  it('provides required and cast-error codes', () => {
    const required = new Field(StringType)
    required.checkAndSetValid()
    expect(required.getErrors()).toMatchObject([{code: 'required', source: 'client'}])
    expect(new Field(NumberType, 'bad' as unknown as number).getErrors()).toMatchObject([{code: 'invalid_type'}])
  })

  it('provides stable codes with custom messages and multiple identical codes', () => {
    const field = new Field(NumberType, 1.5, {gt: 5, ge: 6, lt: 0, le: 1, messages: {gt: 'Same', ge: 'Same'}})
    expect(field.getErrors().map(error => error.code)).toEqual(['integer', 'min_value', 'min_value', 'max_value', 'max_value'])
    expect(field.getErrors()[1].params).toEqual({min: 5, exclusive: true})
    expect(field.getErrors()[2].params).toEqual({min: 6, exclusive: false})
    expect(field.errors.slice(1, 3)).toEqual(['Same', 'Same'])
    expect(new Field(StringType, 'abc', {maxLength: 2}).getErrors()[0].code).toBe('max_length')
  })

  it('covers decimal format, precision and digit constraints without changing messages', () => {
    expect(new Field(DecimalType, '123.').getErrors()[0].code).toBe('pattern')
    const decimal = new Field(DecimalType, '12345.678', {maxDigits: 6, decimalPlaces: 2})
    expect(decimal.getErrors().map(error => error.code)).toEqual(['max_digits', 'max_digits', 'decimal_places'])
    expect(new Field(DecimalType, '1', {ge: 2}).getErrors()).toMatchObject([{code: 'min_value', params: {min: 2}}])
    expect(new Field(DecimalType, '5', {le: 2}).getErrors()).toMatchObject([{code: 'max_value', params: {max: 2}}])
  })

  it('covers date and boolean constraints', () => {
    expect(new Field(DateType, new Date('2020-01-01'), {minDate: new Date('2021-01-01')}).getErrors()).toMatchObject([{code: 'min_date'}])
    expect(new Field(DateType, new Date('2022-01-01'), {maxDate: new Date('2021-01-01')}).getErrors()).toMatchObject([{code: 'max_date'}])
    expect(new Field(BooleanType, false, {mustBeTrue: true}).getErrors()[0].code).toBe('must_be_true')
    expect(new Field(BooleanType, true, {mustBeFalse: true}).getErrors()[0].code).toBe('must_be_false')
  })

  it('covers both collection constraints and structured callbacks', () => {
    expect(new ArrayField(value => new Field(StringType, value)).getErrors()[0].code).toBe('required')
    expect(new ArrayField(value => new Field(StringType, value), {isRequired: false, minItems: 1}).getErrors()[0].code).toBe('min_items')
    expect(new ArrayField(value => new Field(StringType, value), {maxItems: 0}, ['x']).getErrors()[0].code).toBe('max_items')
    expect(new ArrayFormField(Row, {minForms: 1}).getErrors()[0].code).toBe('min_items')
    expect(new ArrayFormField(Row, {maxForms: 0}, [{}]).getErrors()[0].code).toBe('max_items')
    expect(new ArrayFormField(Row, {isRequired: true}).getErrors()[0].code).toBe('required')
    const tags = new ArrayField(value => new Field(StringType, value), {validate: () => duplicate}, ['x'])
    const rows = new ArrayFormField(Row, {validate: () => duplicate}, [{}])
    expect(tags.errors).toEqual(['First', 'Second'])
    expect(rows.errors).toEqual(['First', 'Second'])
    expect(tags.isValid).toBe(false)
    expect(rows.isValid).toBe(false)
    expect(rows.getErrors().map(error => error.source)).toEqual(['custom', 'custom'])
  })
})

describe('server schemas and compatibility', () => {
  it('preserves legacy parsing, replacement and scalar collection routing', () => {
    const form = new Root()
    form.errors = {email: ['first', 'second'], 'tags.0': 'old routing'}
    expect(form.email.errors).toEqual(['["first","second"]'])
    expect(form.globalErrors).toEqual({'tags.0': 'old routing'})
    expect(form.tags.items[0].errors).toEqual([])
    expect(form.email.getErrors()).toMatchObject([{source: 'server', code: 'server'}])
    form.errors = {'rows.0.name': 'nested'}
    expect(form.getErrors()).toEqual([{code: 'server', message: 'nested', path: ['rows', 0, 'name'], source: 'server'}])
    expect(form.allErrors).toEqual({rows: ['Форма 1, name: nested']})
  })

  it('imports strings and structured arrays without collapsing duplicate codes', () => {
    const form = new Root()
    form.setErrors({email: [...duplicate, {code: 'unavailable'}]})
    expect(form.email.errors).toEqual(['First', 'Second', 'unavailable'])
    expect(form.getErrors().map(error => error.path)).toEqual([['email'], ['email'], ['email']])
    expect(form.getErrors().every(error => error.source === 'server')).toBe(true)
    expect(form.allErrors).toEqual({email: ['First', 'Second', 'unavailable']})
    form.setErrors({email: ['first', 'second']})
    expect(form.email.errors).toEqual(['first', 'second'])
  })

  it('retains many server keys mapped to one target in input order', () => {
    const schema = new ErrorsSchema().staticKey('a', 'email').staticKey('b', 'email')
    expect(schema.parseErrors({a: 'first', b: 'second'})).toEqual({email: 'second'})
    expect(schema.parseValidationErrors({a: 'first', b: 'second'}).map(error => error.message)).toEqual(['first', 'second'])
    const form = new Root()
    form.errorsShema = schema
    form.setErrors({a: 'first', b: 'second'})
    expect(form.email.errors).toEqual(['first', 'second'])
  })

  it('preserves transformer order, callback values, schema composition and custom parser overrides', () => {
    const transform = vi.fn((value: unknown) => Array.isArray(value) ? value[0] : value)
    const mapping = vi.fn((_key: string, _value: unknown) => 'email')
    const form = new Root()
    form.errorsShema = new ErrorsSchema().transformValue(transform).fallback(mapping).clone().merge(new ErrorsSchema())
    form.setErrors({email: duplicate})
    expect(transform).toHaveBeenCalledTimes(1)
    expect(mapping).toHaveBeenCalledWith('email', duplicate[0])
    expect(form.email.errors).toEqual(['First'])
    class LegacySchema extends ErrorsSchema {
      parseErrors() { return {email: 'Custom parser'} }
    }
    form.errorsShema = new LegacySchema()
    form.setErrors({other: 'ignored'})
    expect(form.email.errors).toEqual(['Custom parser'])
  })

  it('passes old arrays of message objects to transformers before interpreting collection containers', () => {
    const schema = new ErrorsSchema().fallback(key => key)
      .transformValue(value => Array.isArray(value) ? value[0] : value)
      .transformValue(value => value && typeof value === 'object' && 'message' in value ? value.message : value)
    const form = new Root()
    form.errorsShema = schema
    form.setErrors({email: [{message: 'Old format'}, {message: 'Second'}]})
    expect(form.email.errors).toEqual(['Old format'])
    expect(schema.parseErrors({email: [{message: 'Old format'}]})).toEqual({email: 'Old format'})
  })

  it('supports forArray, nested objects and actual arrays of forms', () => {
    const form = new Root()
    form.errorsShema = ErrorsSchema.forArray(ErrorsSchema.fromObject({remote: 'name'}), 'rows')
    form.setErrors({'rows[1].remote': duplicate})
    expect(form.getErrors().map(error => error.path)).toEqual([['rows', 1, 'name'], ['rows', 1, 'name']])
    form.errorsShema = new ErrorsSchema().fallback(key => key)
    form.setErrors({rows: [{name: duplicate}, {name: {code: 'remote'}}]})
    expect(form.rows.forms[0].name.errors).toEqual(['First', 'Second'])
    expect(form.rows.forms[1].name.errors).toEqual(['remote'])
  })

  it('supports scalar collection item paths and explicit typed paths', () => {
    const form = new Root()
    form.setErrors([{path: ['tags', 1], code: 'taken'}, {path: ['tags', 1], code: 'taken', message: 'Again'}])
    expect(form.tags.items[1].getErrors()).toEqual([
      {code: 'taken', path: [], source: 'server'}, {code: 'taken', message: 'Again', path: [], source: 'server'},
    ])
    expect(form.tags.getErrors().map(error => error.path)).toEqual([[1], [1]])
    expect(form.getErrors().map(error => error.path)).toEqual([['tags', 1], ['tags', 1]])
    expect(form.isValid).toBe(false)
  })

  it('retains global duplicates, missing indexes and nested unknown fields', () => {
    const form = new Root()
    form.setErrors({'unknown': duplicate, 'rows.99.name': {code: 'missing'}, 'rows.0.remote': {code: 'unknown'}})
    expect(form.getErrors()).toMatchObject([
      {path: ['rows', 0, 'remote'], code: 'unknown'},
      {path: ['unknown'], code: 'rule'}, {path: ['unknown'], code: 'rule'}, {path: ['rows', 99, 'name'], code: 'missing'},
    ])
    expect(form.allErrors.unknown).toEqual(['First', 'Second'])
    expect(form.globalErrors.unknown).toBe('Second')
    expect(form.isValid).toBe(false)
  })

  it('preserves invalidation for writes, explicit validation, global errors and reset', () => {
    const form = new Root()
    form.setErrors({email: {code: 'taken'}, auth: {code: 'unauthorized'}})
    form.email.setRawValue('new', false)
    expect(form.email.getErrors()).toEqual([])
    expect(form.email.isValid).toBeNull()
    expect(form.getErrors()).toMatchObject([{code: 'unauthorized'}])
    form.email.setErrors([{code: 'taken'}], 'server')
    form.email.checkAndSetValid()
    expect(form.email.getErrors()).toEqual([])
    expect(form.checkValid()).toBe(false)
    form.clearGlobalErrors()
    expect(form.getErrors()).toEqual([])
    form.setErrors({email: {code: 'taken'}, auth: {code: 'unauthorized'}})
    form.reset()
    expect(form.getErrors()).toEqual([])
  })

  it('replaces all previous client, server and external errors on either server entry point', () => {
    const form = new Root()
    form.email.error = 'External'
    form.tags.items[0].setErrors(duplicate)
    form.rows.forms[0].setGlobalError('auth', 'old')
    form.setErrors({email: {code: 'server'}})
    expect(form.getErrors()).toHaveLength(1)
    form.errors = {}
    expect(form.getErrors()).toEqual([])
  })
})

describe('snapshots, ownership and scheduling', () => {
  it('notifies once on code, source or params changes even with the same text', () => {
    const form = new Root()
    const notify = vi.fn()
    form.subscribe(notify)
    form.email.setErrors([{code: 'one', message: 'same', params: {min: 1}}])
    const before = form.getSnapshot()
    form.email.setErrors([{code: 'two', message: 'same', params: {min: 1}}])
    form.email.setErrors([{code: 'two', message: 'same', params: {min: 2}}])
    form.email.setErrors([{code: 'two', message: 'same', params: {min: 2}}], 'server')
    expect(notify).toHaveBeenCalledTimes(4)
    expect(before.fields.email.validationErrors).toMatchObject([{code: 'one', params: {min: 1}}])
    const stable = form.getSnapshot()
    form.email.setErrors([{code: 'two', message: 'same', params: {min: 2}}], 'server')
    expect(form.getSnapshot()).toBe(stable)
    expect(notify).toHaveBeenCalledTimes(4)
  })

  it('notifies nested global-error subscribers once on server application and clearing', () => {
    const form = new Root()
    const child = form.rows.forms[0]
    const childNotify = vi.fn(), rootNotify = vi.fn()
    child.subscribe(childNotify)
    form.subscribe(rootNotify)
    form.setErrors({'rows.0.auth': {code: 'authorization'}})
    expect(childNotify).toHaveBeenCalledTimes(1)
    expect(rootNotify).toHaveBeenCalledTimes(1)
    expect(child.getSnapshot().validationErrors).toMatchObject([{code: 'authorization', path: ['auth']}])
    form.errors = {}
    expect(childNotify).toHaveBeenCalledTimes(2)
    expect(rootNotify).toHaveBeenCalledTimes(2)
  })

  it('captures only node-owned errors in snapshots and never runs validators on reads', () => {
    const form = new Root()
    const validate = vi.fn(() => duplicate)
    form.email.options = {validate}
    form.email.checkAndSetValid()
    validate.mockClear()
    expect(form.getSnapshot().validationErrors).toEqual([])
    expect(form.getSnapshot().fields.email.validationErrors).toHaveLength(2)
    const stable = form.getSnapshot()
    expect(form.getSnapshot()).toBe(stable)
    expect(form.getErrors()).toHaveLength(2)
    expect(validate).not.toHaveBeenCalled()
  })

  it('uses current indexes after move/remove and detaches removed children', () => {
    const form = new Root()
    for (const row of form.rows.forms) row.name.options = {validate: () => duplicate}
    form.checkValid()
    const retained = form.rows.forms[1]
    const removed = form.rows.forms[0]
    const id = form.rows.getSnapshot().itemIds?.[1]
    form.rows.move(1, 0)
    expect(form.rows.forms[0]).toBe(retained)
    expect(form.rows.getSnapshot().itemIds?.[0]).toBe(id)
    expect(form.getErrors().slice(0, 2).map(error => error.path)).toEqual([['rows', 0, 'name'], ['rows', 0, 'name']])
    form.rows.remove(1)
    const notify = vi.fn()
    form.subscribe(notify)
    removed.name.setErrors([{code: 'detached'}])
    expect(notify).not.toHaveBeenCalled()
    expect(form.getErrors()).toHaveLength(2)
  })

  it('keeps scalar item paths current and preserves automatic move revalidation', () => {
    const tags = new ArrayField(value => new Field(StringType, value, {validate: () => ({code: 'rule'})}), {}, ['a', 'b'])
    const retained = tags.items[1]
    tags.move(1, 0)
    expect(tags.items[0]).toBe(retained)
    expect(tags.getErrors().map(error => error.path)).toEqual([[0], [1]])
    tags.remove(1)
    expect(tags.getErrors().map(error => error.path)).toEqual([[0]])
    retained.setErrors([{code: 'server'}], 'server')
    tags.add('c')
    expect(retained.getErrors()[0].source).toBe('custom')
  })

  it('deduplicates batch dependency validation and publishes atomic structured state', () => {
    const validate = vi.fn((value: string) => value === 'valid' ? true : duplicate)
    const unrelated = vi.fn(() => true)
    class Dependent extends Form {
      source = new Field(StringType, 'old')
      target = new Field(StringType, 'old', {dependsOn: [{path: ['source']}], validate})
      other = new Field(StringType, 'old', {validate: unrelated})
    }
    const form = new Dependent()
    form.enableDependencies()
    validate.mockClear(); unrelated.mockClear()
    const snapshots: unknown[] = []
    form.subscribe(() => snapshots.push(form.getSnapshot()))
    const before = form.getSnapshot()
    form.batch(() => {
      form.source.rawValue = 'new'
      form.target.rawValue = 'invalid'
      form.source.rawValue = 'final'
      expect(form.getSnapshot()).toBe(before)
    })
    expect(validate).toHaveBeenCalledTimes(1)
    expect(unrelated).not.toHaveBeenCalled()
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]).toMatchObject({fields: {target: {validationErrors: [{code: 'rule'}, {code: 'rule'}]}}})
    expect(form.getErrors().map(error => error.path)).toEqual([['target'], ['target']])
  })

  it('does not notify for identical repeated validation or change touched/dirty', () => {
    const field = new Field(StringType, 'x', {validate: () => duplicate})
    const notify = vi.fn()
    field.subscribe(notify)
    const snapshot = field.getSnapshot()
    for (let i = 0; i < 10; i++) field.checkAndSetValid()
    expect(field.getSnapshot()).toBe(snapshot)
    expect(notify).not.toHaveBeenCalled()
    expect(field.isTouched).toBe(false)
    expect(field.isDirty).toBe(false)
  })

  it('does not add validator work or duplicate notifications to a large form', () => {
    class Large extends Form {}
    const form = new Large()
    const validate = vi.fn(() => duplicate)
    const fields = Array.from({length: 1000}, (_, index) => {
      const field = new Field(StringType, 'x', {validate})
      Object.assign(form, {[`f${index}`]: field})
      return field
    })
    const notify = vi.fn()
    form.subscribe(notify)
    validate.mockClear()
    const before = form.getSnapshot()
    for (let i = 0; i < 3; i++) expect(form.getSnapshot()).toBe(before)
    expect(validate).not.toHaveBeenCalled()
    form.batch(() => {
      fields[0].rawValue = 'new'
      fields[1].rawValue = 'new'
    })
    expect(validate).toHaveBeenCalledTimes(1000)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(form.getErrors()).toHaveLength(2000)
  })
})


describe('optional Luxon error codes', () => {
  it('retains optional date constraints and messages', () => {
    const date = DateTime.fromISO('2020-01-01')
    expect(new Field(DateLuxonType, date, {minDate: DateTime.fromISO('2021-01-01')}).getErrors()).toMatchObject([{code: 'min_date'}])
    expect(new Field(DateLuxonType, date, {maxDate: DateTime.fromISO('2019-01-01')}).getErrors()).toMatchObject([{code: 'max_date'}])
    expect(new Field(DateLuxonType, DateTime.fromISO('1800-01-01')).getErrors()).toMatchObject([{code: 'invalid_year', params: {min: 1900, max: 2100}}])
    expect(new DateLuxonType({}).validateErrors(DateTime.invalid('invalid'))).toMatchObject([{code: 'invalid_type'}])
  })
})

// Declaration regressions: invalid contracts must stay rejected.
function rejectedErrors(field: Field<string>, form: Root, error: ValidationError) {
  // @ts-expect-error Codes are required.
  const missingCode: ValidationErrorInput = {message: 'Failure'}
  // @ts-expect-error Structured error collections are readonly.
  field.getErrors().push(error)
  // @ts-expect-error Paths are readonly metadata.
  error.path.push('field')
  // @ts-expect-error Validators remain synchronous.
  new Field(StringType, null, {validate: async () => ({code: 'async'})})
  // @ts-expect-error Explicit server errors require a path.
  form.setErrors([{code: 'missing_path'}])
  void missingCode
}
void rejectedErrors

describe('legacy extension and path boundaries', () => {
  it('keeps legacy error setters and global-error overrides in the server assignment path', () => {
    class CustomField extends Field<string> {
      get error(): string { return super.error }
      set error(message: string | null) { super.error = message ? `Prefix: ${message}` : null }
    }
    class CustomForm extends Form {
      value = new CustomField(StringType, 'x')
      setGlobalError(key: string, message: string) { super.setGlobalError(key, `Global: ${message}`) }
    }
    const form = new CustomForm()
    form.errors = {value: 'Remote', unknown: 'Remote'}
    expect(form.value.errors).toEqual(['Prefix: Remote'])
    expect(form.globalErrors).toEqual({unknown: 'Global: Remote'})
    expect(form.getErrors().every(error => error.source === 'server')).toBe(true)
    form.value.error = 'Manual'
    expect(form.value.getErrors()[0].source).toBe('external')
  })

  it('replaces all duplicates at a global key while retaining its original position', () => {
    const form = new Root()
    form.setErrors({first: 'First', auth: duplicate, last: 'Last'})
    form.setGlobalError('auth', 'Replacement')
    expect(form.globalErrors.auth).toBe('Replacement')
    expect(form.allErrors.auth).toEqual(['Replacement'])
    expect(form.getErrors().map(error => error.path)).toEqual([['first'], ['auth'], ['last']])
  })

  it('resolves explicit literal keys without confusing them with collection paths', () => {
    class Dotted extends Root { 'rows.0.name' = new Field(StringType, 'literal') }
    const form = new Dotted()
    form.setErrors([{path: ['rows.0.name'], code: 'literal'}, {path: ['rows', 0, 'name'], code: 'nested'}])
    expect(form['rows.0.name'].getErrors()[0].code).toBe('literal')
    expect(form.rows.forms[0].name.getErrors()[0].code).toBe('nested')
  })

  it('supports multiple nested collections and preserves subscription ownership', () => {
    class Branch extends Form { leaves = new ArrayFormField(Row, {}, [{}]) }
    class Tree extends Form { branches = new ArrayFormField(Branch, {}, [{}, {}]) }
    const form = new Tree()
    const notify = vi.fn()
    form.subscribe(notify)
    form.setErrors({'branches.1.leaves.0.tags.0': duplicate})
    expect(form.getErrors().map(error => error.path)).toEqual([
      ['branches', 1, 'leaves', 0, 'tags', 0], ['branches', 1, 'leaves', 0, 'tags', 0],
    ])
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('keeps unknown prototype names global in the new path importer', () => {
    const form = new Root()
    form.setErrors([{path: ['constructor'], code: 'unknown'}])
    expect(form.getErrors()).toMatchObject([{path: ['constructor'], code: 'unknown'}])
  })
})

describe('error-only batch boundaries', () => {
  it('batches server metadata without scheduling dependent validators', () => {
    const validate = vi.fn(() => true)
    class Dependent extends Form {
      source = new Field(StringType, 'a')
      target = new Field(StringType, 'b', {dependsOn: [{path: ['source']}], validate})
    }
    const form = new Dependent()
    form.enableDependencies()
    validate.mockClear()
    const notify = vi.fn()
    form.subscribe(notify)
    const before = form.getSnapshot()
    form.batch(() => {
      form.setErrors({target: {code: 'first'}})
      form.setErrors({target: {code: 'final'}})
      expect(form.getSnapshot()).toBe(before)
    })
    expect(validate).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledTimes(1)
    expect(form.target.getErrors()).toEqual([{code: 'final', source: 'server', path: []}])
    expect(form.isTouched).toBe(false)
    expect(form.isDirty).toBe(false)
  })

  it('restores external provenance after a throwing legacy server setter', () => {
    class Throwing extends Field<string> {
      get error(): string { return super.error }
      set error(message: string | null) {
        if (message) throw new Error('setter failure')
        super.error = message
      }
    }
    class Custom extends Form { value = new Throwing(StringType, 'x') }
    const form = new Custom()
    expect(() => { form.errors = {value: 'remote'} }).toThrow('setter failure')
    const field = new Field(StringType, 'x')
    field.error = 'manual'
    expect(field.getErrors()[0].source).toBe('external')
  })
})
