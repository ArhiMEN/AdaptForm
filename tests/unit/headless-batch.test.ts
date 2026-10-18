import {describe, expect, it, vi} from 'vitest'
import {Form, Field, StringType, NumberType, ArrayField} from '../../src'

class Example extends Form {
  name = new Field(StringType)
  age = new Field(NumberType)
}

describe('HF-009 synchronous batch', () => {
  it('keeps the committed snapshot inside batch and emits one final update', () => {
    const form = new Example()
    const before = form.getSnapshot()
    const listener = vi.fn()
    const fieldListener = vi.fn()
    form.subscribe(listener)
    form.name.subscribe(fieldListener)
    const result = form.batch(() => {
      form.setGlobalError('server', 'error')
      form.clearGlobalErrors()
      form.name.rawValue = 'Alex'
      expect(form.getSnapshot()).toBe(before)
      expect(form.name.getSnapshot().valueClear).toBeNull()
      expect(fieldListener).not.toHaveBeenCalled()
      form.age.rawValue = 25
      expect(form.getSnapshot()).toBe(before)
      return 42
    })
    expect(result).toBe(42)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(fieldListener).toHaveBeenCalledTimes(1)
    expect(form.getSnapshot().fieldsValue).toEqual({name: 'Alex', age: 25})
    expect(form.isValid).toBe(true)
  })

  it('coalesces nested batches and repeated assignments', () => {
    const form = new Example()
    const listener = vi.fn()
    const validate = vi.fn(() => true)
    form.name.options = {validate}
    form.subscribe(listener)
    form.batch(() => {
      form.name.rawValue = 'one'
      form.batch(() => {
        form.name.rawValue = 'two'
        form.age.rawValue = 25
      })
      form.name.rawValue = 'two'
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1)
    form.batch(() => { form.name.rawValue = 'two' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('finalizes completed changes and notifications before rethrowing the original exception', () => {
    const form = new Example()
    const listener = vi.fn()
    form.subscribe(listener)
    const failure = new Error('batch')
    expect(() => form.batch(() => {
      form.name.rawValue = 'Alex'
      form.batch(() => { form.age.rawValue = 25; throw failure })
    })).toThrow(failure)
    expect(form.getSnapshot().fieldsValue).toEqual({name: 'Alex', age: 25})
    expect(form.isValid).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    form.name.rawValue = 'after'
    // Until HF-010, direct child propagation is tested through the field subscription.
    expect(form.name.getSnapshot().valueClear).toBe('after')
    form.batch(() => { form.age.rawValue = 26 })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('defers conditional validation until sibling values and collections are complete', () => {
    const observations: unknown[] = []
    class Conditional extends Form {
      first = new Field(StringType, null, {validate: (_value, form) => {
        observations.push(form?.fieldsValue)
        return form?.fieldsValue.second === 'ready'
      }})
      second = new Field(StringType)
      tags = new ArrayField(value => new Field(StringType, value), {validate: (_value, form) => {
        if (form) observations.push(form.fieldsValue)
        return true
      }})
    }
    const form = new Conditional()
    form.batch(() => {
      form.first.rawValue = 'one'
      form.tags.add('tag')
      form.second.rawValue = 'ready'
      expect(observations).toEqual([])
    })
    expect(observations).toEqual(Array(2).fill({first: 'one', second: 'ready', tags: ['tag']}))
    expect(form.isValid).toBe(true)
  })

  it('preserves deferred assignment when no automatic validation was requested', () => {
    const form = new Example()
    const validate = vi.fn(() => true)
    form.name.options = {validate}
    form.batch(() => { form.setFields({name: 'Alex', age: 25}, false) })
    expect(validate).not.toHaveBeenCalled()
    expect(form.name.isValid).toBeNull()
    expect(form.age.isValid).toBeNull()
  })

  it('runs explicitly requested checks immediately, then checks the final state', () => {
    let checks = 0
    class Counted extends Example {
      checkValid() { checks++; return super.checkValid() }
    }
    const form = new Counted()
    form.batch(() => {
      form.name.rawValue = 'Alex'
      expect(form.checkValid()).toBe(false)
      expect(checks).toBe(1)
      form.age.rawValue = 25
    })
    expect(checks).toBe(2)
    expect(form.isValid).toBe(true)
  })

  it('does not leave batch or notification flags stuck after a throwing validator', () => {
    const form = new Example()
    const failure = new Error('validator')
    form.name.options = {validate: () => { throw failure }}
    const listener = vi.fn()
    form.subscribe(listener)
    expect(() => form.batch(() => { form.name.rawValue = 'Alex' })).toThrow(failure)
    expect(listener).toHaveBeenCalledTimes(1)
    form.name.options = {validate: () => true}
    form.batch(() => { form.age.rawValue = 25 })
    expect(form.isValid).toBe(true)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('keeps outside-batch setter validation synchronous', () => {
    const validate = vi.fn(() => false)
    const field = new Field(StringType, null, {validate})
    field.rawValue = 'value'
    expect(validate).toHaveBeenCalledTimes(1)
    expect(field.isValid).toBe(false)
  })

  it('validates unrelated mutated nodes instead of losing their deferred checks', () => {
    const form = new Example()
    const validate = vi.fn(() => true)
    const other = new Field(StringType, null, {validate})
    form.batch(() => { other.rawValue = 'other' })
    expect(validate).toHaveBeenCalledTimes(1)
    expect(other.isValid).toBe(true)
  })

  it('does not notify an empty or state-equivalent batch', () => {
    const form = new Example()
    form.setFields({name: 'Alex', age: 25})
    const listener = vi.fn()
    form.subscribe(listener)
    form.batch(() => {})
    form.batch(() => { form.name.rawValue = 'other'; form.name.rawValue = 'Alex' })
    expect(listener).not.toHaveBeenCalled()
  })
})
