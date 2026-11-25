import {describe, expect, it, vi} from 'vitest'
import {
  ArrayField, ArrayFormField, Field, Form, NumberType, StringType, ValidationMutationError,
} from '../../src'
import {DecoratorPlugin} from '../../src/core/plugins/DecoratorPlugin'

class Row extends Form {
  text = new Field(StringType, 'row')
}

class Root extends Form {
  trigger = new Field(StringType, 'trigger')
  number = new Field(NumberType, 1)
  tags = new ArrayField((value?: string) => new Field(StringType, value), {}, ['tag'])
  rows = new ArrayFormField(Row, {}, [{}])
}

describe('V3 validation purity', () => {
  const operations = [
    'own raw value', 'another raw value', 'options', 'touched', 'errors', 'clear errors',
    'form fields', 'form errors', 'reset', 'baseline', 'array add', 'array insert', 'array move',
    'array remove', 'array clear', 'array replacement', 'nested replacement', 'nested reset',
    'activation', 'disposal', 'batch', 'subscribe', 'unsubscribe', 'recursive validation',
    'other form validation', 'plugin rules',
  ] as const

  it.each(operations)('rejects %s before an observable write during a standalone check', operation => {
    const field = new Field(StringType, null)
    const root = new Root()
    root.validate()
    root.number.setErrors([{code: 'preexisting'}])
    root.number.setRawValue(2, false)
    root.number.setErrors([{code: 'preexisting'}])
    const deactivate = root.enableDependencies()
    const listener = vi.fn()
    const unsubscribe = root.subscribe(listener)
    const plugin = new DecoratorPlugin()
    const before = root.getSnapshot()
    const actions: Record<typeof operation, () => unknown> = {
      'own raw value': () => { field.rawValue = 'bad' },
      'another raw value': () => { root.number.rawValue = 3 },
      options: () => { root.number.options = {lt: 1} },
      touched: () => { root.number.isTouched = false },
      errors: () => root.number.setErrors([{code: 'bad'}]),
      'clear errors': () => root.number.clearErrors(),
      'form fields': () => root.setFields({number: 3}),
      'form errors': () => root.setErrors([{code: 'bad'}]),
      reset: () => root.reset(),
      baseline: () => root.commitBaseline(),
      'array add': () => root.tags.add('bad'),
      'array insert': () => root.tags.insert(-1, 'bad'),
      'array move': () => root.tags.move(0, 0),
      'array remove': () => root.tags.remove(0),
      'array clear': () => root.tags.clear(),
      'array replacement': () => root.tags.setItemsValue(['bad']),
      'nested replacement': () => root.rows.setForms([{text: 'bad'}]),
      'nested reset': () => root.rows.forms[0].reset(),
      activation: () => root.enableDependencies(),
      disposal: deactivate,
      batch: () => root.batch(() => { root.number.rawValue = 3 }),
      subscribe: () => root.subscribe(listener),
      unsubscribe,
      'recursive validation': () => field.validate(),
      'other form validation': () => root.validate(),
      'plugin rules': () => plugin.symbol('bad'),
    }
    field.options = {validate: () => { actions[operation](); return [] }}
    field.setRawValue('valid input', false)
    expect(() => field.validate()).toThrow(ValidationMutationError)
    expect(field.valueClear).toBe('valid input')
    expect(field.isValid).toBeNull()
    expect(root.getSnapshot()).toBe(before)
    expect(root.number.options.lt).toBeUndefined()
    expect(listener).not.toHaveBeenCalled()

    field.options = {validate: () => []}
    expect(field.validate()).toEqual({valid: true})
    root.number.rawValue = 4
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    deactivate()
  })

  it('guards required and structural type rules without an enabled graph', () => {
    const other = new Root()
    const mutate = () => { other.number.rawValue = 3 }
    const required = new Field(StringType, null, {isRequired: () => { mutate(); return false }})
    class MutatingType extends StringType {
      validateErrors(): [] { mutate(); return [] }
    }
    const type = new Field(MutatingType)
    type.setRawValue('text', false)
    expect(() => required.validate()).toThrow(ValidationMutationError)
    expect(() => type.validate()).toThrow(ValidationMutationError)
    expect(other.number.valueClear).toBe(1)
  })

  it.each(['form', 'nested', 'collection required', 'collection custom', 'row custom', 'automatic', 'batch'] as const)(
    'guards %s validation and preserves the already committed input', kind => {
      const root = new Root()
      const other = new Root()
      let mutate = false
      const write = () => { if (mutate) other.number.rawValue = 2 }
      const validate = () => { write(); return [] }
      root.trigger.options = {validate}
      root.rows.forms[0].text.options = {validate}
      const values = new ArrayField((value?: string) => new Field(StringType, value), {
        isRequired: () => { if (kind === 'collection required') write(); return false },
        validate,
      })
      const rows = new ArrayFormField(Row, {validate})
      const run = {
        form: () => root.validate(),
        nested: () => root.rows.validate(),
        'collection required': () => values.validate(),
        'collection custom': () => values.validate(),
        'row custom': () => rows.validate(),
        automatic: () => { root.trigger.rawValue = 'automatic' },
        batch: () => root.batch(() => root.trigger.validate()),
      }[kind]
      mutate = true
      expect(run).toThrow(ValidationMutationError)
      expect(other.number.valueClear).toBe(1)
      if (kind === 'automatic') expect(root.trigger.valueClear).toBe('automatic')
      mutate = false
      expect(run).not.toThrow()
    },
  )
})
