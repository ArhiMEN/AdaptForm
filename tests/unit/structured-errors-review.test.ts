import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, ErrorsSchema, Field, Form, StringType} from '../../src'

describe('HF-015 review regressions', () => {
  it('isolates server provenance from other nodes in a legacy setter callback', () => {
    const other = new Field(StringType, 'other')
    class Custom extends Field<string> {
      get error(): string { return super.error }
      set error(message: string | null) {
        if (message) other.error = 'manual callback'
        super.error = message
      }
    }
    class Root extends Form { value = new Custom(StringType, 'x') }
    const form = new Root()
    form.errors = {value: 'remote'}
    expect(form.value.getErrors()[0].source).toBe('server')
    expect(other.getErrors()[0].source).toBe('external')
  })

  it('isolates global keys and restores nested server setter contexts', () => {
    class Inner extends Form { value = new Field(StringType, 'inner') }
    const inner = new Inner()
    class Root extends Form {
      setGlobalError(key: string, message: string) {
        if (key === 'remote') {
          inner.errors = {value: 'nested'}
          super.setGlobalError('manual', 'callback')
        }
        super.setGlobalError(key, message)
      }
    }
    const form = new Root()
    form.errors = {remote: 'server'}
    expect(form.getErrors().map(error => [error.path, error.source])).toEqual([
      [['manual'], 'external'], [['remote'], 'server'],
    ])
    expect(inner.value.getErrors()[0].source).toBe('server')
    inner.value.error = 'manual'
    expect(inner.value.getErrors()[0].source).toBe('external')
  })

  it('preserves repeated delegation to the addressed setter through a subclass', () => {
    const other = new Field(StringType, 'other')
    class Custom extends Field<string> {
      get error(): string { return super.error }
      set error(message: string | null) {
        super.error = message
        if (message) {
          expect(this.getErrors()[0].source).toBe('server')
          super.error = `Again: ${message}`
          other.error = 'manual'
        }
      }
    }
    class Root extends Form { value = new Custom(StringType, 'x') }
    const form = new Root()
    form.errors = {value: 'remote'}
    expect(form.value.getErrors()[0]).toMatchObject({source: 'server', message: 'Again: remote'})
    expect(other.getErrors()[0].source).toBe('external')
  })

  it('isolates incidental writes in collection setter overrides', () => {
    const other = new Field(StringType, 'other')
    class Row extends Form { value = new Field(StringType, 'x') }
    class Tags extends ArrayField<string> {
      get error(): string { return super.error }
      set error(message: string | null) { if (message) other.error = message; super.error = message }
    }
    class Rows extends ArrayFormField<Row> {
      get error(): string { return super.error }
      set error(message: string | null) { if (message) other.error = message; super.error = message }
    }
    class Root extends Form {
      tags = new Tags(value => new Field(StringType, value), {}, ['x'])
      rows = new Rows(Row, {}, [{}])
    }
    const form = new Root()
    for (const key of ['tags', 'rows'] as const) {
      form.errors = {[key]: 'remote'}
      expect(form[key].getOwnErrors()[0].source).toBe('server')
      expect(other.getErrors()[0].source).toBe('external')
    }
  })

  it('keeps repeated server imports silent when the final state is equivalent', () => {
    class Root extends Form { value = new Field(StringType, 'x') }
    const form = new Root(), notify = vi.fn()
    form.subscribe(notify)
    form.setErrors({value: [{code: 'same'}, {code: 'same'}]})
    const snapshot = form.getSnapshot()
    form.setErrors({value: [{code: 'same'}, {code: 'same'}]})
    expect(form.getSnapshot()).toBe(snapshot)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('runs reentrant subscriber writes with external provenance', () => {
    class Root extends Form { value = new Field(StringType, 'x') }
    const form = new Root()
    let calls = 0
    form.subscribe(() => { if (++calls === 1) form.value.error = 'subscriber' })
    form.errors = {value: 'remote'}
    expect(form.value.getErrors()[0].source).toBe('external')
    expect(calls).toBe(2)
  })

  it('publishes unknown prototype-named paths as ordinary global errors', () => {
    class Root extends Form {}
    const form = new Root(), notify = vi.fn()
    form.subscribe(notify)
    form.setErrors([
      {path: ['constructor'], code: 'missing'},
      {path: ['__proto__'], code: 'missing'},
      {path: ['toString'], code: 'missing'},
    ])
    expect(Object.keys(form.allErrors)).toEqual(['constructor', '__proto__', 'toString'])
    expect(Object.getOwnPropertyDescriptor(form.allErrors, '__proto__')?.value).toEqual(['missing'])
    expect(form.getSnapshot().validationErrors).toHaveLength(3)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('routes unknown prototype names through the legacy global-error path', () => {
    class Root extends Form {}
    const form = new Root()
    const previous = Object.getOwnPropertyDescriptor(Object, 'error')
    try {
      form.errors = {constructor: 'remote'}
      expect(form.getErrors()).toMatchObject([{path: ['constructor'], source: 'server', message: 'remote'}])
      expect(Object.getOwnPropertyDescriptor(Object, 'error')).toEqual(previous)
    } finally {
      if (previous) Object.defineProperty(Object, 'error', previous)
      else Reflect.deleteProperty(Object, 'error')
    }
    const input = Object.fromEntries([['__proto__', 'remote'], ['toString', 'remote']])
    const schema = new ErrorsSchema().fallback(key => key)
    expect(Object.keys(schema.parseErrors(input))).toEqual(['__proto__', 'toString'])
    expect(Object.keys(schema.parseErrorsDetailed(input))).toEqual(['__proto__', 'toString'])
    form.errors = input
    expect(Object.keys(form.allErrors)).toEqual(['__proto__', 'toString'])
  })

  it('keeps the legacy schema bridge result immutable', () => {
    class Custom extends ErrorsSchema { parseErrors() { return {value: 'remote'} } }
    expect(Object.isFrozen(new Custom().parseValidationErrors({}))).toBe(true)
  })
})
