import {describe, expect, it, vi, expectTypeOf} from 'vitest'
import {Field, Form, StringType, DateType, ArrayField, type FormSnapshot, type FieldSnapshot} from '../../src'
import {FieldType} from '@core/types/FieldType'

class Example extends Form {
  name = new Field(StringType)
  other = new Field(StringType)
}

describe('HF-008 snapshots and subscriptions', () => {
  it('publishes a complete form mutation once and preserves unchanged references', () => {
    const form = new Example()
    const initial = form.getSnapshot()
    expect(form.getSnapshot()).toBe(initial)
    expectTypeOf(initial).toEqualTypeOf<FormSnapshot>()
    const observed: FormSnapshot[] = []
    form.subscribe(() => observed.push(form.getSnapshot()))
    form.setFields({name: 'Alex', other: 'ready'})
    expect(observed).toHaveLength(1)
    expect(observed[0].fieldsValue).toEqual({name: 'Alex', other: 'ready'})
    expect(observed[0].isValid).toBe(true)
    expect(observed[0].isTouched).toBe(true)
    expect(observed[0].isDirty).toBe(true)
    form.setFields({name: 'Alex', other: 'ready'})
    expect(observed).toHaveLength(1)
    expect(form.getSnapshot()).toBe(observed[0])
    expect(initial.fieldsValue).toEqual({name: null, other: null})
  })

  it('observes field errors, touched, validity and baseline separately', () => {
    const field = new Field(StringType)
    expectTypeOf(field.getSnapshot()).toEqualTypeOf<FieldSnapshot>()
    const listener = vi.fn()
    field.subscribe(listener)
    field.isTouched = true
    field.isTouched = true
    expect(listener).toHaveBeenCalledTimes(1)
    field.error = 'server'
    expect(listener).toHaveBeenCalledTimes(2)
    const previous = field.getSnapshot()
    field.checkValid()
    expect(listener).toHaveBeenCalledTimes(3)
    expect(field.isValid).toBe(false) // checkValid retains legacy validity assignment semantics.
    expect(previous.errors).toEqual(['server'])
    field.checkAndSetValid()
    expect(listener).toHaveBeenCalledTimes(3)
    field.isValid = true
    expect(listener).toHaveBeenCalledTimes(4)
    field.rawValue = 'changed'
    field.commitBaseline()
    expect(field.getSnapshot().isDirty).toBe(false)
    expect(listener).toHaveBeenCalledTimes(6)
  })

  it('supports independent registrations, multiple listeners and idempotent unsubscribe', () => {
    const field = new Field(StringType)
    const listener = vi.fn()
    const second = vi.fn()
    const off1 = field.subscribe(listener)
    const off2 = field.subscribe(listener)
    const off3 = field.subscribe(second)
    field.rawValue = 'one'
    expect(listener).toHaveBeenCalledTimes(2)
    expect(second).toHaveBeenCalledTimes(1)
    off1(); off1(); off3()
    field.rawValue = 'two'
    expect(listener).toHaveBeenCalledTimes(3)
    expect(second).toHaveBeenCalledTimes(1)
    off2()
    field.rawValue = 'three'
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('does not expose mutable dates, containers or model references', () => {
    const field = new Field(DateType, new Date(0))
    const snapshot = field.getSnapshot()
    expect(snapshot.valueClear).toEqual({kind: 'Date', timestamp: 0})
    expect(Object.isFrozen(snapshot.valueClear)).toBe(true)
    expect(() => { (snapshot.valueClear as Record<string, unknown>).timestamp = 5 }).toThrow()
    field.rawValue = new Date(1000)
    expect(snapshot.valueClear).toEqual({kind: 'Date', timestamp: 0})
    class Structured extends FieldType<unknown> {
      cast(value: unknown) { return value }
      validate() { return [] }
      getTypeName() { return 'structured' }
    }
    const input = {items: [new Map([['key', new Set([1])]])]}
    const structured = new Field(Structured, input)
    const before = structured.getSnapshot()
    input.items.push(new Map())
    expect(before.valueClear).toEqual({items: [{kind: 'Map', entries: [['key', {kind: 'Set', entries: [1]}]]}]})
    expect(Object.isFrozen(before.valueClear)).toBe(true)
    const custom = new Example()
    structured.rawValue = custom
    expect(structured.getSnapshot().valueClear).toEqual({kind: 'Opaque', type: 'Example'})
  })

  it('exposes frozen nested collection snapshots without freezing live models', () => {
    const tags = new ArrayField(value => new Field(StringType, value), {}, ['a'])
    const old = tags.getSnapshot()
    tags.add('b')
    expect(old.itemsValue).toEqual(['a'])
    expect(old.items).toHaveLength(1)
    expect(Object.isFrozen(old.items[0].errors)).toBe(true)
    expect(Object.isFrozen(tags.items[0])).toBe(false)
  })

  it('does not validate or cast on snapshot reads', () => {
    const validate = vi.fn(() => true)
    const field = new Field(StringType, 'initial', {validate})
    const cast = vi.spyOn(StringType.prototype, 'cast')
    field.getSnapshot(); field.getSnapshot(); field.subscribe(() => {})
    expect(validate).toHaveBeenCalledTimes(1)
    expect(cast).not.toHaveBeenCalled()
    cast.mockRestore()
  })

  it('finishes notifying other listeners when a listener throws', () => {
    const field = new Field(StringType)
    const fail = new Error('listener')
    const off = field.subscribe(() => { throw fail })
    const other = vi.fn()
    field.subscribe(other)
    expect(() => { field.rawValue = 'one' }).toThrow(fail)
    expect(other).toHaveBeenCalledTimes(1)
    off()
    field.rawValue = 'two'
    expect(other).toHaveBeenCalledTimes(2)
  })

  it('publishes form-only errors without changing values or dirty', () => {
    const form = new Example()
    const listener = vi.fn()
    form.subscribe(listener)
    form.setGlobalError('server', 'failed')
    const snapshot = form.getSnapshot()
    expect(snapshot.globalErrors).toEqual({server: 'failed'})
    expect(snapshot.isDirty).toBe(false)
    form.setGlobalError('server', 'failed')
    expect(listener).toHaveBeenCalledTimes(1)
    form.clearGlobalErrors()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(snapshot.globalErrors).toEqual({server: 'failed'})
  })
})
