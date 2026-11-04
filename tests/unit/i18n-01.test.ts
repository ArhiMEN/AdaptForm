import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {Settings} from 'luxon'
import {DateLuxonType, type DateLuxonOptions} from '../../src/luxon'
import {ArrayField, ArrayFormField, Field, Form, NumberType, StringType,
  type FieldOptions, type StringOptions, type NumberOptions, type BooleanOptions,
  type DateOptions, type DecimalOptions, type ArrayFieldOptions, type ArrayFormFieldOptions,
  type ValidationErrorInput} from '../../src'
import {replaceNodeErrors} from '../../src/core/state/ErrorNode'

class Row extends Form { name = new Field(StringType, 'valid') }
const item = (value?: string) => new Field(StringType, value)

// Compile-time removals apply to every options interface and both entry points.
type Options = [FieldOptions, StringOptions, NumberOptions, BooleanOptions, DateOptions,
  DecimalOptions, ArrayFieldOptions, ArrayFormFieldOptions, DateLuxonOptions]
type RemovedKeys = {[K in keyof Options]: 'messages' extends keyof Options[K] ? true : false}
expectTypeOf<RemovedKeys[0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8]>().toEqualTypeOf<false>()
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesOptions as _messagesOptions} from '../../src'
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesStringOptions as _messagesStringOptions} from '../../src'
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesNumberOptions as _messagesNumberOptions} from '../../src'
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesBooleanOptions as _messagesBooleanOptions} from '../../src'
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesDateOptions as _messagesDateOptions} from '../../src'
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesDecimalOptions as _messagesDecimalOptions} from '../../src'
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesArrayFieldOptions as _messagesArrayFieldOptions} from '../../src'
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesArrayFormFieldOptions as _messagesArrayFormFieldOptions} from '../../src'
// @ts-expect-error Removed message interface has no compatibility export.
import type {messagesDateLuxonOptions as _messagesDateLuxonOptions} from '../../src/luxon'
function negativeOptions() {
  // @ts-expect-error Display configuration is not a Field option.
  new Field(StringType, null, {messages: {isRequired: 'Required'}})
  // @ts-expect-error Display configuration is not a collection option.
  new ArrayField(item, {messages: {minItems: 'Too few'}})
  // @ts-expect-error Display configuration is not a form collection option.
  new ArrayFormField(Row, {messages: {minForms: 'Too few'}})
  // @ts-expect-error Display configuration is not an optional Luxon option.
  new DateLuxonType({messages: {minDate: 'Too early'}})
}
void negativeOptions

describe('I18N-01 application-owned messages', () => {
  it.each([null, undefined, '', '  ', []])('emits required without params or message for %j', raw => {
    const custom = vi.fn(() => [])
    const field = new Field(StringType, null, {validate: custom})
    field.setRawValue(raw, false)
    expect(field.checkValid()).toBe(false)
    expect(field.errors).toEqual([{code: 'required', source: 'type'}])
    expect(custom).not.toHaveBeenCalled()
    field.options = {isRequired: false}
    expect(field.checkValid()).toBe(true)
    expect(field.errors).toEqual([])
  })

  it('uses the machine type ID after a failed cast', () => {
    const field = new Field(NumberType)
    field.setRawValue('not a number')
    expect(field.errors).toEqual([{code: 'invalid_type', params: {expected: 'number'}, source: 'type'}])
  })

  it.each(['items', 'forms'] as const)('retains exact structural gates for %s', kind => {
    const make = (size: number, required: boolean, min: number, max: number) => kind === 'items'
      ? new ArrayField(item, {isRequired: required, minItems: min, maxItems: max}, Array(size).fill('valid'))
      : new ArrayFormField(Row, {isRequired: required, minForms: min, maxForms: max}, Array.from({length: size}, () => ({})))
    for (const [size, required, min, max, expected] of [
      [0, true, 2, 4, {code: 'required'}],
      [0, false, 2, 4, {code: 'min_items', params: {min: 2}}],
      [1, true, 2, 4, {code: 'min_items', params: {min: 2}}],
      [3, true, 1, 2, {code: 'max_items', params: {max: 2}}],
    ] as const) {
      const field = make(size, required, min, max)
      expect(field.checkValid()).toBe(false)
      expect(field.errors).toEqual([{...expected, source: 'type'}])
    }
    const valid = make(2, true, 2, 2)
    expect(valid.checkValid()).toBe(true)
    expect(valid.errors).toEqual([])
  })

  it.each(['field', 'items', 'forms'] as const)('preserves explicit, empty and absent custom messages on %s', kind => {
    const errors: ValidationErrorInput[] = [
      {code: 'app.rule', params: {min: 2}},
      {code: 'app.rule', message: ''},
      {code: 'app.rule', message: 'Application text'},
      {code: 'app.rule', params: {min: 2}},
    ]
    const validate = () => errors
    const field = kind === 'field' ? new Field(StringType, 'valid', {validate})
      : kind === 'items' ? new ArrayField(item, {validate}, ['valid'])
      : new ArrayFormField(Row, {validate}, [{}])
    expect(field.errors).toEqual(errors.map(error => ({...error, source: 'custom'})))
    expect(Object.prototype.hasOwnProperty.call(field.errors[0], 'message')).toBe(false)
    expect(Object.isFrozen(field.errors)).toBe(true)
    errors[2] = {code: 'changed'}
    expect(field.errors[2].message).toBe('Application text')
  })

  it('preserves manual/server messages through client checks and rejects partial replacement', () => {
    const field = new Field(StringType, 'valid')
    field.setErrors([{code: 'manual', message: ''}])
    replaceNodeErrors(field, 'server', [{code: 'server', message: 'Server text'}])
    expect(field.checkValid()).toBe(false)
    const before = field.errors
    field.options = {validate: () => [{code: 'ok'}, {code: 'bad', params: {value: Infinity}}]}
    expect(() => field.checkValid()).toThrow()
    expect(field.errors).toBe(before)
    expect(field.errors).toEqual([{code: 'server', message: 'Server text', source: 'server'},
      {code: 'manual', message: '', source: 'manual'}])
  })

  it('retains legacy false failure without generating fallback text', () => {
    const field = new Field(StringType, 'valid', {validate: () => false})
    expect(field.errors).toEqual([{code: 'custom', source: 'custom'}])
  })

  it('does not depend on application locale', () => {
    const previous = Settings.defaultLocale
    try {
      const results = ['en', 'ru', 'de'].map(locale => {
        Settings.defaultLocale = locale
        document.documentElement.lang = locale
        return new Field(StringType, 'x', {minLength: 3}).errors
      })
      expect(results[0]).toEqual([{code: 'min_length', params: {min: 3}, source: 'type'}])
      expect(results[1]).toEqual(results[0])
      expect(results[2]).toEqual(results[0])
    } finally {
      Settings.defaultLocale = previous
      document.documentElement.lang = ''
    }
  })
})
