import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {
  ArrayField, ArrayFormField, ErrorContractError, Field, Form, StringType,
  type FieldValidator, type ValidationErrorInput, type ValidationResult,
} from '../../src'
import {installServerErrors} from '../helpers/serverErrors'

class Row extends Form {
  name = new Field(StringType)
}

class Root extends Form {
  scalar = new Field(StringType)
  tags = new ArrayField((value?: string) => new Field(StringType, value))
  rows = new ArrayFormField(Row)
}

describe('V3 validation runner', () => {
  it('returns the effective validity of every node and retains other sources', () => {
    const root = new Root()
    root.setFields({scalar: 'text', tags: ['tag'], rows: [{name: 'row'}]}, false)
    expect(root.validate()).toEqual({valid: true})

    for (const node of [root.scalar, root.tags, root.rows, root.rows.forms[0], root]) {
      installServerErrors(node, [{code: 'server'}])
      node.setErrors([{code: 'manual'}])
      expect(node.validate()).toEqual({valid: false})
      expect(node.errors.map(error => error.source)).toEqual(['server', 'manual'])
      node.clearErrors({sources: ['server', 'manual']})
      expect(node.isValid).toBe(true)
    }
  })

  it('runs only eligible scalar callbacks in order', () => {
    const events: string[] = []
    let failType = false
    class Type extends StringType {
      cast(value: unknown) { return typeof value === 'string' ? value : null }
      validateErrors(): ValidationErrorInput[] {
        events.push('type')
        return failType ? [{code: 'app.type'}] : []
      }
    }
    const field = new Field(Type, null, {
      isRequired: () => { events.push('required'); return false },
      validate: () => { events.push('custom'); return [] },
    })
    expect(field.validate().valid).toBe(true)
    field.setRawValue(1, false)
    expect(field.validate().valid).toBe(false)
    expect(field.errors[0].code).toBe('invalid_type')
    field.setRawValue('text', false)
    failType = true
    expect(field.validate().valid).toBe(false)
    failType = false
    expect(field.validate().valid).toBe(true)
    expect(events).toEqual(['required', 'required', 'required', 'type', 'required', 'type', 'custom'])
  })

  it('keeps installed partitions when a later type-success/custom check throws', () => {
    const typeCallback = vi.fn<() => ValidationErrorInput[]>(() => [{code: 'app.old_type'}])
    class Type extends StringType {
      validateErrors() { return typeCallback() }
    }
    const validator = vi.fn<FieldValidator<string>>(() => [
      {code: 'app.custom', params: {values: [1]}},
      {code: 'app.custom', message: ''},
    ])
    const field = new Field(Type, null, {validate: validator})
    field.setRawValue('text', false)
    installServerErrors(field, [{code: 'app.server'}])
    field.setErrors([{code: 'app.manual'}])
    field.validate()
    const errors = field.errors
    expect(validator).not.toHaveBeenCalled()

    typeCallback.mockReturnValue([])
    validator.mockReturnValueOnce([{code: 'app.new'}, {code: 'app.bad', params: {value: Infinity}}])
    expect(() => field.validate()).toThrow(ErrorContractError)
    expect(field.errors).toBe(errors)
    expect(field.validate()).toEqual({valid: false})
    expect(field.errors.map(error => [error.source, error.code, error.message])).toEqual([
      ['custom', 'app.custom', undefined], ['custom', 'app.custom', ''],
      ['server', 'app.server', undefined], ['manual', 'app.manual', undefined],
    ])
  })

  it('rejects invalid type results before calling the custom rule', () => {
    const validate = vi.fn(() => [])
    class Type extends StringType {
      validateErrors() { return undefined as unknown as ValidationErrorInput[] }
    }
    const field = new Field(Type, null, {validate})
    field.setRawValue('text', false)
    expect(() => field.validate()).toThrow(ErrorContractError)
    expect(validate).not.toHaveBeenCalled()
    expect(field.isValid).toBeNull()
  })

  it('rejects an asynchronous required rule without replacing previous errors', () => {
    let asyncRule = false
    const field = new Field(StringType, null, {
      isRequired: () => asyncRule ? Promise.resolve(true) as unknown as boolean : true,
    })
    expect(field.validate().valid).toBe(false)
    const errors = field.errors
    asyncRule = true
    expect(() => field.validate()).toThrow(ErrorContractError)
    expect(field.errors).toBe(errors)
  })

  it('infers the clean values of scalar and collection callbacks', () => {
    new Field(StringType, null, {validate: (value, context) => {
      expectTypeOf(value).toEqualTypeOf<string>()
      expectTypeOf(context).toEqualTypeOf<Form | undefined>()
      return []
    }})
    new ArrayField((value?: string) => new Field(StringType, value), {validate: values => {
      expectTypeOf(values).toEqualTypeOf<(string | null)[]>()
      return []
    }})
    new ArrayFormField(Row, {validate: rows => {
      expectTypeOf(rows).toEqualTypeOf<Row[]>()
      return []
    }})
    expectTypeOf(new Root().validate()).toEqualTypeOf<ValidationResult>()
  })
})

function removedContracts(form: Root) {
  // @ts-expect-error The boolean validation API was removed.
  form.checkValid()
  // @ts-expect-error The boolean validation API was removed.
  form.scalar.checkAndSetValid()
  // @ts-expect-error The boolean validation API was removed.
  form.tags.checkValid()
  // @ts-expect-error The boolean validation API was removed.
  form.rows.checkAndSetValid()
  // @ts-expect-error A validator must return an array.
  new Field(StringType, null, {validate: () => ({code: 'single'})})
  // @ts-expect-error A validator must return an array.
  new Field(StringType, null, {validate: () => 'message'})
  // @ts-expect-error A validation result is an object.
  const valid: boolean = form.validate()
  return valid
}
void removedContracts
