import {describe, expect, it, vi} from 'vitest'
import {Field} from '@core/fields/Field'
import {StringType} from '@core/types/StringType'
import {NumberType} from '@core/types/NumberType'
import {DateType} from '@core/types/DateType'
import {FieldType} from '@core/types/FieldType'
import {BasePlugin} from '@core/plugins/FieldPlugin'
import {DateLuxonType} from '@core/types/DateLuxonType'
import {DateTime} from 'luxon'

class StructuredType extends FieldType<unknown> {
  cast(value: unknown) { return value }
  validate() { return [] }
  getTypeName() { return 'structured' }
}

describe('HF-006 Field baseline', () => {
  it.each([undefined, null, '', 'initial'])('captures constructor value %s and tracks edit/revert', initial => {
    const field = new Field(StringType, initial)
    expect(field.isDirty).toBe(false)
    field.setRawValue('changed', false)
    expect(field.isDirty).toBe(true)
    expect(field.isTouched).toBe(true)
    field.reset()
    expect(field.isDirty).toBe(false)
    expect(field.isTouched).toBe(false)
  })

  it('compares cached cast values without extra casts or validation', () => {
    const validate = vi.fn(() => true)
    const cast = vi.spyOn(NumberType.prototype, 'cast')
    const field = new Field(NumberType, 42, {validate})
    field.setRawValue('042', false)
    const calls = cast.mock.calls.length
    for (let i = 0; i < 5; i++) expect(field.isDirty).toBe(false)
    expect(cast).toHaveBeenCalledTimes(calls)
    expect(validate).toHaveBeenCalledTimes(1)
    cast.mockRestore()
  })

  it('commits independently of touched, errors, validity and reset target', () => {
    const field = new Field(NumberType, 1)
    field.rawValue = 2
    field.error = 'server'
    field.commitBaseline()
    expect(field.isDirty).toBe(false)
    expect(field.isTouched).toBe(true)
    expect(field.errors).toEqual(['server'])
    expect(field.isValid).toBe(false)
    field.reset()
    expect(field.valueClear).toBe(1)
    expect(field.isDirty).toBe(true)
  })

  it('treats validation and invalid null casts independently from dirty', () => {
    const field = new Field(NumberType)
    field.rawValue = 'invalid'
    expect(field.isDirty).toBe(false)
    field.checkValid()
    expect(field.isDirty).toBe(false)
    field.rawValue = 0
    expect(field.isDirty).toBe(true)
    field.rawValue = null
    expect(field.isDirty).toBe(false)
  })

  it('compares Date timestamps and detaches a mutable default', () => {
    const initial = new Date('2020-01-01')
    const field = new Field(DateType, initial)
    field.rawValue = new Date(initial)
    expect(field.isDirty).toBe(false)
    initial.setFullYear(2021)
    field.rawValue = initial
    expect(field.isDirty).toBe(true)
    field.rawValue = new Date('2020-01-01')
    expect(field.isDirty).toBe(false)
  })

  it('compares optional Luxon values semantically', () => {
    const field = new Field(DateLuxonType, DateTime.fromISO('2020-01-01'))
    field.rawValue = DateTime.fromISO('2020-01-01')
    expect(field.isDirty).toBe(false)
    field.rawValue = DateTime.fromISO('2020-01-02')
    expect(field.isDirty).toBe(true)
  })

  it('compares plugin-cleaned values instead of input formatting', () => {
    class CleanPlugin extends BasePlugin {
      toValueClear(value: string) { return value.replace(/\s/g, '') }
    }
    const field = new Field(StringType, 'ab', {plugins: [new CleanPlugin()]})
    field.rawValue = 'a b'
    expect(field.isDirty).toBe(false)
    field.rawValue = 'a c'
    expect(field.isDirty).toBe(true)
  })

  it('captures nested structures, dates, maps, sets, buffers and cycles without JSON', () => {
    const make = () => ({a: [null, NaN, new Date(0)], map: new Map([['a', new Set([1, 2])]]), bytes: new Uint8Array([1, 2]), rx: /a/g})
    const initial = make()
    const field = new Field(StructuredType, initial)
    field.rawValue = make()
    expect(field.isDirty).toBe(false)
    initial.a.push(null)
    field.rawValue = initial
    expect(field.isDirty).toBe(true)
    const cyclic: {self?: unknown} = {}
    cyclic.self = cyclic
    field.rawValue = cyclic
    field.commitBaseline()
    expect(field.isDirty).toBe(false)
    field.rawValue = {self: null}
    expect(field.isDirty).toBe(true)
  })
  it('preserves shared built-ins, sparse arrays and special record keys in baseline captures', () => {
    const date = new Date(0)
    const bytes = new Uint8Array([1, 2])
    const value = {dates: [date, date], bytes: [bytes, bytes], sparse: new Array(3),
      record: Object.fromEntries([['__proto__', {safe: true}]])}
    const field = new Field(StructuredType, value)
    expect(field.isDirty).toBe(false)
    value.dates[0].setTime(1000)
    expect(field.isDirty).toBe(true)
    value.dates[0].setTime(0)
    expect(field.isDirty).toBe(false)
    value.bytes[0][0] = 2
    expect(field.isDirty).toBe(true)
  })

})
