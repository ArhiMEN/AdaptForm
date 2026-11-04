import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, ErrorsSchema, Field, Form, StringType, type ValidationErrorInput} from '../../src'
import {replaceNodeErrors} from '../../src/core/state/ErrorNode'

describe('structured error ownership review regressions', () => {
  it('keeps incidental manual writes in another node manual', () => {
    const other = new Field(StringType, 'other')
    class Custom extends Field<string> {
      setErrors(errors: readonly ValidationErrorInput[]) {
        other.setErrors([{code: 'callback'}])
        super.setErrors(errors)
      }
    }
    const field = new Custom(StringType, 'x')
    replaceNodeErrors(field, 'server', [{code: 'remote'}])
    field.setErrors([{code: 'review'}])
    expect(field.errors.map(error => error.source)).toEqual(['server', 'manual'])
    expect(other.errors[0].source).toBe('manual')
  })

  it('keeps nested Form manual writes separate from server partitions', () => {
    class Inner extends Form { value = new Field(StringType, 'inner') }
    const inner = new Inner()
    class Root extends Form {
      setErrors(errors: readonly ValidationErrorInput[]) {
        inner.setErrors([{code: 'callback'}])
        super.setErrors(errors)
      }
    }
    const root = new Root()
    replaceNodeErrors(root, 'server', [{code: 'remote'}])
    root.setErrors([{code: 'review'}])
    expect(root.errors.map(error => error.source)).toEqual(['server', 'manual'])
    expect(inner.errors[0].source).toBe('manual')
  })

  it('replaces only manual errors through repeated subclass delegation', () => {
    class Custom extends Field<string> {
      setErrors(errors: readonly ValidationErrorInput[]) {
        super.setErrors(errors)
        super.setErrors(errors.map(error => ({...error, message: 'Again'})))
      }
    }
    const field = new Custom(StringType, 'x')
    replaceNodeErrors(field, 'server', [{code: 'remote'}])
    field.setErrors([{code: 'manual'}])
    expect(field.errors).toEqual([{code: 'remote', source: 'server'}, {code: 'manual', source: 'manual', message: 'Again'}])
  })

  it('supports independent manual and server partitions on both collection kinds', () => {
    class Row extends Form { value = new Field(StringType, 'x') }
    const collections = [new ArrayField(value => new Field(StringType, value), {}, ['x']), new ArrayFormField(Row, {}, [{}])]
    for (const collection of collections) {
      replaceNodeErrors(collection, 'server', [{code: 'remote'}])
      collection.setErrors([{code: 'manual'}])
      collection.checkValid()
      expect(collection.errors.map(error => error.source)).toEqual(['server', 'manual'])
    }
  })

  it('keeps repeated server source replacement silent when the final state is equivalent', () => {
    const field = new Field(StringType, 'x'), notify = vi.fn()
    field.subscribe(notify)
    replaceNodeErrors(field, 'server', [{code: 'same'}, {code: 'same'}])
    const snapshot = field.getSnapshot()
    replaceNodeErrors(field, 'server', [{code: 'same'}, {code: 'same'}])
    expect(field.getSnapshot()).toBe(snapshot)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('keeps reentrant subscriber writes manual while retaining server errors', () => {
    const field = new Field(StringType, 'x')
    let calls = 0
    field.subscribe(() => { if (++calls === 1) field.setErrors([{code: 'subscriber'}]) })
    replaceNodeErrors(field, 'server', [{code: 'remote'}])
    expect(field.errors.map(error => error.source)).toEqual(['server', 'manual'])
    expect(calls).toBe(2)
  })

  it('preserves prototype-named codes and safe params as ordinary own errors', () => {
    class Root extends Form {}
    const root = new Root(), notify = vi.fn()
    root.subscribe(notify)
    root.setErrors(['constructor', '__proto__', 'toString'].map(code => ({code})))
    expect(root.getErrors().map(error => [error.code, error.path])).toEqual([
      ['constructor', []], ['__proto__', []], ['toString', []],
    ])
    expect(root.getSnapshot().errors).toHaveLength(3)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('retains prototype-name safety in the separately staged parser', () => {
    const previous = Object.getOwnPropertyDescriptor(Object, 'error')
    const input = Object.fromEntries([['constructor', 'remote'], ['__proto__', 'remote'], ['toString', 'remote']])
    const schema = new ErrorsSchema().fallback(key => key)
    expect(Object.keys(schema.parseErrors(input))).toEqual(['constructor', '__proto__', 'toString'])
    expect(Object.keys(schema.parseErrorsDetailed(input))).toEqual(['constructor', '__proto__', 'toString'])
    expect(Object.getOwnPropertyDescriptor(Object, 'error')).toEqual(previous)
  })

  it('retains immutable output from the separately staged schema override', () => {
    class Custom extends ErrorsSchema { parseErrors() { return {value: 'remote'} } }
    expect(Object.isFrozen(new Custom().parseValidationErrors({}))).toBe(true)
  })
})
