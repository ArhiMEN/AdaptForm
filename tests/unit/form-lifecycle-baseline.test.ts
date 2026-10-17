import { describe, expect, it, vi } from 'vitest'
import { Form } from '@core/Form'
import { Field } from '@core/fields/Field'
import { ArrayField } from '@core/fields/ArrayField'
import { ArrayFormField } from '@core/fields/ArrayFormField'
import { StringType } from '@core/types/StringType'
import { NumberType } from '@core/types/NumberType'
import { DecimalType } from '@core/types/DecimalType'

// HF-001 records current behavior, including issues reserved for later tasks.
describe('HF-001 form lifecycle baseline', () => {
  describe('deferred assignment', () => {
    it('casts and touches a field, clears errors, and leaves validation unset', () => {
      const validate = vi.fn(() => false)
      const field = new Field(NumberType, null, { validate })
      field.rawValue = 1
      expect(field.isValid).toBe(false)
      expect(field.errors).not.toEqual([])
      validate.mockClear()

      field.setRawValue('42', false)

      expect(field.rawValue).toBe('42')
      expect(field.valueClear).toBe(42)
      expect(field.isTouched).toBe(true)
      expect(field.errors).toEqual([])
      expect(field.isValid).toBeNull()
      expect(validate).not.toHaveBeenCalled()
      expect(field.checkAndSetValid()).toBe(false)
      expect(validate).toHaveBeenCalledExactlyOnceWith(42, undefined)
    })

    it('defers type and required errors even when casting fails', () => {
      const field = new Field(NumberType)
      for (const input of ['malformed', '']) {
        field.setRawValue(input, false)
        expect(field.valueClear).toBeNull()
        expect(field.isValid).toBeNull()
        expect(field.errors).toEqual([])
        expect(field.checkAndSetValid()).toBe(false)
        expect(field.errors).toHaveLength(1)
      }
    })

    it('defers direct fields, retains omitted state and global errors, then validates once', () => {
      const validate = vi.fn(() => true)
      class Example extends Form {
        value = new Field(NumberType, null, { validate })
        omitted = new Field(StringType, 'default')
      }
      const form = new Example()
      form.value.error = 'previous error'
      form.setGlobalError('server', 'server error')
      form.setFields({ value: '42', unknown: 'ignored' }, false)

      expect(form.toJSON()).toEqual({ value: 42, omitted: 'default' })
      expect(form.value.errors).toEqual([])
      expect(form.value.isValid).toBeNull()
      expect(form.omitted.isValid).toBe(true)
      expect(form.omitted.isTouched).toBe(false)
      expect(form.isTouched).toBe(true)
      expect(form.isValid).toBe(false)
      expect(form.globalErrors).toEqual({ server: 'server error' })
      expect(validate).not.toHaveBeenCalled()
      expect(form.checkValid()).toBe(false)
      expect(validate).toHaveBeenCalledExactlyOnceWith(42, form)
      form.clearGlobalErrors()
      expect(form.isValid).toBe(true)
      expect(validate).toHaveBeenCalledTimes(1)
    })

    it('passes complete new sibling values to one final direct-field validation', () => {
      const observations: unknown[] = []
      class Example extends Form {
        first = new Field(StringType, null, {
          validate: (_value, form) => {
            observations.push(form?.fieldsValue)
            return true
          },
        })
        second = new Field(StringType)
      }
      const form = new Example()
      form.setFields({ first: 'one', second: 'two' })
      expect(observations).toEqual([{ first: 'one', second: 'two' }])
      expect(form.isValid).toBe(true)
      expect(form.isTouched).toBe(true)
    })
  })

  describe('ArrayField assignment validation', () => {
    it('validates only the replacement collection and validates new non-null items twice', () => {
      const itemValidate = vi.fn(() => true)
      const collectionValidate = vi.fn(() => true)
      const field = new ArrayField(
        (value?: string) => new Field(StringType, value, { validate: itemValidate }),
        { isRequired: false, validate: collectionValidate },
      )
      collectionValidate.mockClear()
      field.itemsValue = ['new']

      expect(collectionValidate).toHaveBeenCalledExactlyOnceWith(['new'], undefined)
      expect(itemValidate).toHaveBeenCalledTimes(2)
      expect(itemValidate).toHaveBeenNthCalledWith(1, 'new', undefined)
      expect(itemValidate).toHaveBeenNthCalledWith(2, 'new', undefined)
      expect(field.isTouched).toBe(true)
      expect(field.items[0].isTouched).toBe(false)
      expect(field.isValid).toBe(true)
    })

    it.each([false, true])('defers collection validation until the final check when setFields validate=%s', (validate) => {
      const itemValidate = vi.fn(() => true)
      const observations: { values: unknown; sibling: unknown; hasParent: boolean }[] = []
      class Example extends Form {
        values = new ArrayField(
          (value?: string) => new Field(StringType, value, { validate: itemValidate }),
          {
            isRequired: false,
            validate: (values, form) => {
              observations.push({ values, sibling: form?.fieldsValue.sibling, hasParent: !!form })
              return true
            },
          },
        )
        sibling = new Field(StringType)
      }
      const form = new Example()
      observations.length = 0
      form.setFields({ values: ['new'], sibling: 'ready' }, validate)

      expect(observations).toEqual([
        ...(validate ? [{ values: ['new'], sibling: 'ready', hasParent: true }] : []),
      ])
      expect(itemValidate).toHaveBeenCalledTimes(validate ? 2 : 1)
      expect(itemValidate).toHaveBeenNthCalledWith(1, 'new', undefined)
      if (validate) expect(itemValidate).toHaveBeenNthCalledWith(2, 'new', form)
      expect(form.values.isValid).toBe(validate)
      expect(form.sibling.isValid).toBe(validate ? true : null)
      expect(form.isValid).toBe(validate)
    })

    it('retains touched=false when removing or clearing a pristine collection', () => {
      const field = new ArrayField((value?: string) => new Field(StringType, value), {}, ['a', 'b'])
      field.remove(0)
      expect(field.itemsValue).toEqual(['b'])
      expect(field.isTouched).toBe(false)
      field.clear()
      expect(field.isValid).toBe(false)
      expect(field.isTouched).toBe(false)
    })
  })

  describe('nested form assignment and state', () => {
    it('defers null-default nested validators until the parent check', () => {
      const validate = vi.fn(() => true)
      class Child extends Form {
        name = new Field(StringType, null, { validate })
      }
      class Parent extends Form {
        children = new ArrayFormField(Child)
      }
      const parent = new Parent()
      parent.setFields({ children: [{ name: 'new' }] }, false)
      const child = parent.children.forms[0]
      expect(child.name.isTouched).toBe(true)
      expect(child.name.isValid).toBeNull()
      expect(child.isTouched).toBe(true)
      expect(parent.isTouched).toBe(true)
      expect(parent.isValid).toBe(false)
      expect(validate).not.toHaveBeenCalled()
      expect(parent.checkValid()).toBe(true)
      expect(validate).toHaveBeenCalledExactlyOnceWith('new', child)
      expect(parent.isValid).toBe(true)
    })

    it('runs non-null constructor defaults even during deferred nested hydration', () => {
      const validate = vi.fn(() => true)
      class Child extends Form {
        name = new Field(StringType, 'default', { validate })
      }
      const children = new ArrayFormField(Child)
      children.setForms([{ name: 'hydrated' }], false)
      expect(validate).toHaveBeenCalledExactlyOnceWith('default', undefined)
      expect(children.forms[0].name.valueClear).toBe('hydrated')
      expect(children.forms[0].name.isValid).toBeNull()
    })

    it('does not aggregate child touched state through a pristine collection', () => {
      class Child extends Form {
        name = new Field(StringType)
      }
      class Parent extends Form {
        children = new ArrayFormField(Child, {}, [{ name: 'initial' }])
      }
      const parent = new Parent()
      const child = parent.children.forms[0]
      expect(child.isTouched).toBe(true)
      expect(parent.children.isTouched).toBe(false)
      expect(parent.isTouched).toBe(false)
      child.name.setRawValue('changed', false)
      expect(child.isTouched).toBe(true)
      expect(parent.isTouched).toBe(false)
      expect(parent.isValid).toBe(false)
    })
  })

  describe('collection reset after structural changes', () => {
    it('keeps surviving and added fields, restoring their own constructor defaults', () => {
      const validate = vi.fn(() => true)
      const field = new ArrayField(
        (value?: string) => new Field(StringType, value, { validate }), {}, ['first', 'removed'],
      )
      const first = field.items[0]
      field.remove(1)
      const added = field.add('added')
      first.rawValue = 'edited first'
      added.rawValue = 'edited added'
      field.error = 'server error'
      validate.mockClear()
      field.reset()
      expect(field.items).toEqual([first, added])
      expect(field.itemsValue).toEqual(['first', 'added'])
      expect(field.errors).toEqual([])
      expect(field.isTouched).toBe(false)
      expect(field.isValid).toBe(false)
      expect(field.items.map(item => [item.isTouched, item.isValid])).toEqual([[false, null], [false, null]])
      expect(validate).not.toHaveBeenCalled()
      expect(field.checkValid()).toBe(true)
      expect(validate).toHaveBeenCalledTimes(2)
    })

    it('keeps surviving and added forms, restoring class defaults rather than hydrated values', () => {
      const validate = vi.fn(() => true)
      class Child extends Form {
        name = new Field(StringType, 'class default', { validate })
        optional = new Field(StringType)
      }
      const field = new ArrayFormField(Child, {}, [{ name: 'first' }, { name: 'removed' }])
      const first = field.forms[0]
      field.remove(1)
      const added = field.add({ name: 'added' })
      first.name.rawValue = 'edited'
      added.setGlobalError('server', 'server error')
      field.error = 'collection error'
      validate.mockClear()
      field.reset()
      expect(field.forms).toEqual([first, added])
      expect(field.formsFieldsValue).toEqual([
        { name: 'class default', optional: null }, { name: 'class default', optional: null },
      ])
      expect(field.errors).toEqual([])
      expect(added.globalErrors).toEqual({})
      expect(field.isTouched).toBe(false)
      expect(field.isValid).toBe(false)
      expect(field.forms.map(form => [form.isTouched, form.name.isValid])).toEqual([[false, null], [false, null]])
      expect(validate).not.toHaveBeenCalled()
      expect(field.checkValid()).toBe(false)
      expect(validate).toHaveBeenCalledTimes(2)
    })
  })

  describe('decimal input and submission', () => {
    it.each([
      [{ gt: 123 }, '123', false], [{ gt: 123 }, '123.', true],
      [{ ge: 124 }, '123', false], [{ ge: 124 }, '123.', true],
      [{ lt: 123 }, '123', false], [{ lt: 123 }, '123.', true],
      [{ le: 122 }, '123', false], [{ le: 122 }, '123.', true],
    ])('characterizes bounds %j for input %s', (options, input, valid) => {
      class Example extends Form {
        amount = new Field(DecimalType, null, options)
      }
      const form = new Example()
      form.setFields({ amount: input })
      expect(form.amount.valueClear).toBe(input)
      expect(form.amount.isValid).toBe(valid)
      expect(form.isValid).toBe(valid)
      expect(form.checkValid()).toBe(valid)
      expect(form.toJSON()).toEqual({ amount: input })
    })

    it.each([
      [' 123,40 ', '123.40', true], ['1.234', '1.234', false], [1.234, 1.234, false],
      ['1234567.', '1234567.', false], ['123456.78', '123456.78', true],
      ['.5', null, false], ['1.2.3', null, false], ['1,2,3', null, false],
      ['12x', null, false], ['1e2', null, false], [Infinity, null, false],
    ])('casts %j to %j with validity %s without rounding', (input, clean, valid) => {
      const field = new Field(DecimalType)
      field.setRawValue(input)
      expect(field.rawValue).toBe(input)
      expect(field.valueClear).toBe(clean)
      expect(field.isValid).toBe(valid)
      expect(field.errors.length > 0).toBe(!valid)
    })

    it.each([123, '123'])('accepts inclusive bounds and rejects exclusive bounds for %j', (input) => {
      const inclusive = new Field(DecimalType, null, { ge: 123, le: 123 })
      const exclusive = new Field(DecimalType, null, { gt: 123, lt: 123 })
      inclusive.setRawValue(input)
      exclusive.setRawValue(input)
      expect(inclusive.isValid).toBe(true)
      expect(exclusive.isValid).toBe(false)
      expect(exclusive.errors).toHaveLength(2)
    })
  })
})
