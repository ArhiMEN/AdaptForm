import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, Field, Form, StringType, ValidationMutationError} from '../../src'
import {ErrorsSchema} from '../../src/core/server/ErrorsSchema'
import type {ParsedServerErrors, ServerErrorInput} from '../../src/core/server/schemaTypes'
import type {ErrorNotificationReport} from '../../src/core/server/applyTypes'

const schema = new ErrorsSchema({
  kind: 'records', path: {at: ['path']}, code: {at: ['code']},
  message: {at: ['message']}, params: {at: ['params']},
})
const parse = (...entries: ServerErrorInput[]) => schema.parse(entries)
const input = (path: ServerErrorInput['path'], code: string) => ({path, code})

class Row extends Form {
  label = new Field(StringType, 'row')
}
class Root extends Form {
  ['a.b'] = new Field(StringType, 'literal')
  first = new Field(StringType, 'first', {validate: () => [{code: 'client'}]})
  second = new Field(StringType, 'second')
  rows = new ArrayFormField(Row, {}, [{}, {}])
  tags = new ArrayField((value?: string) => new Field(StringType, value), {}, ['tag'])
}

describe('V3 server errors Apply', () => {
  it('installs canonical entries once in input order and scopes replacement by node', () => {
    const form = new Root()
    form.validate()
    form.first.setErrors([{code: 'manual'}])
    const batch = parse(input(['first'], 'one'), input(['first'], 'one'), input([], 'global'),
      input(['rows', 0], 'row-global'), input(['tags', 0], 'tag'))
    const result = form.applyServerErrors(batch, {operation: form.beginServerErrorOperation()})
    expect(result).toMatchObject({committed: true, applied: 5, ignored: 0, unresolved: [], notification: {status: 'delivered'}})
    expect(form.first.errors.map(error => error.code)).toEqual(['client', 'one', 'one', 'manual'])
    expect(form.first.errors[1]).toBe(batch.entries[0].error)
    expect(form.first.errors[2]).toBe(batch.entries[1].error)
    expect(form.rows.forms[0].errors[0].code).toBe('row-global')
    expect(form.tags.items[0].errors[0].code).toBe('tag')
    form.applyServerErrors(parse(), {operation: form.beginServerErrorOperation({scope: ['first']})})
    expect(form.first.errors.map(error => error.code)).toEqual(['client', 'manual'])
    expect(form.errors[0].code).toBe('global')
    const append = form.beginServerErrorOperation({scope: ['rows', 0]})
    form.applyServerErrors(parse(input(['rows', 0], 'append')), {operation: append, mode: 'append'})
    expect(form.rows.forms[0].errors.map(error => error.code)).toEqual(['row-global', 'append'])
    form.applyServerErrors(parse(), {operation: form.beginServerErrorOperation()})
    expect(form.getErrors().map(error => error.source)).toEqual(['custom', 'manual'])
  })

  it('does not change a token, store or snapshot if a late path fails preflight', () => {
    const form = new Root()
    const operation = form.beginServerErrorOperation()
    const before = form.getSnapshot()
    const notify = vi.fn()
    form.subscribe(notify)
    expect(() => form.applyServerErrors(parse(input(['first'], 'one'), input(['tags', 99], 'late')), {operation}))
      .toThrow('unknown_server_path')
    expect(form.getSnapshot()).toBe(before)
    expect(form.first.errors).toEqual([])
    expect(notify).not.toHaveBeenCalled()
    form.applyServerErrors(parse(input(['first'], 'retried')), {operation})
    expect(form.first.errors[0].code).toBe('retried')
    expect(() => form.applyServerErrors(parse(), {operation})).toThrow('used_server_operation')
  })

  it('resolves literal prototype-like own keys and never invokes arbitrary property getters', () => {
    const form = new Root()
    const reveal = vi.fn(() => new Field(StringType))
    Object.defineProperty(form, '__proto__', {value: new Field(StringType, 'own'), enumerable: true})
    Object.defineProperty(form, 'constructor', {value: new Field(StringType, 'ctor'), enumerable: true})
    Object.defineProperty(form, 'toString', {get: reveal, enumerable: true})
    const batch = parse(input(['__proto__'], 'p'), input(['constructor'], 'c'), input(['a.b'], 'dot'),
      input(['toString'], 'drop'), input(['rows', '0'], 'string index'))
    const applied = form.applyServerErrors(batch, {operation: form.beginServerErrorOperation(), unknownPath: 'ignore'})
    expect(applied).toMatchObject({applied: 3, ignored: 2, unresolved: [['toString'], ['rows', '0']]})
    expect(form.getErrors().map(error => error.path)).toEqual([['a.b'], ['__proto__'], ['constructor']])
    expect(Object.getPrototypeOf(form.toJSON())).toBe(Object.prototype)
    expect(Object.getOwnPropertyDescriptor(form.toJSON(), '__proto__')?.value).toBe('own')
    expect(reveal).not.toHaveBeenCalled()
  })

  it('routes unknown paths to the nearest scoped Form only when enabled', () => {
    const form = new Root()
    const scoped = form.beginServerErrorOperation({scope: ['rows', 0]})
    expect(() => form.applyServerErrors(parse(input(['rows', 1, 'missing'], 'out')), {
      operation: scoped, unknownPath: 'ignore',
    })).toThrow('out_of_scope_server_path')
    const unknown = ['rows', 0, 'missing'] as const
    const result = form.applyServerErrors(parse(input(unknown, 'converted')), {operation: scoped, unknownPath: 'global'})
    expect(result.unresolved).toEqual([unknown])
    expect(form.rows.forms[0].errors[0].code).toBe('converted')
    expect(form.errors).toEqual([])
    const scalar = form.beginServerErrorOperation({scope: ['first']})
    expect(() => form.applyServerErrors(parse(input(['first', 'missing'], 'out')), {
      operation: scalar, unknownPath: 'global',
    })).toThrow('unknown_server_global')
  })
})

describe('server operation fencing', () => {
  it('rejects forged, wrong-owner, consumed and superseded operations and keeps scopes independent', () => {
    const form = new Root()
    const older = form.beginServerErrorOperation()
    const first = form.beginServerErrorOperation({scope: ['first']})
    const second = form.beginServerErrorOperation({scope: ['second']})
    const batch = parse(input(['first'], 'from-first'))
    expect(() => form.applyServerErrors(batch, {operation: older})).toThrow('superseded_server_operation')
    expect(() => new Root().applyServerErrors(batch, {operation: first})).toThrow('invalid_server_operation')
    expect(() => form.applyServerErrors({...batch} as ParsedServerErrors, {operation: first})).toThrow('invalid_server_batch')
    form.applyServerErrors(batch, {operation: first})
    form.applyServerErrors(parse(input(['second'], 'from-second')), {operation: second})
    expect(form.getErrors().map(error => error.code)).toEqual(['from-first', 'from-second'])
  })

  it('rejects input ABA, equal-content position ABA and reset while accepting metadata changes', () => {
    const form = new Root()
    const meta = form.beginServerErrorOperation({scope: ['first']})
    form.first.setErrors([{code: 'manual'}])
    form.first.validate()
    form.commitBaseline()
    form.applyServerErrors(parse(input(['first'], 'metadata-ok')), {operation: meta})
    const aba = form.beginServerErrorOperation({scope: ['first']})
    form.first.setRawValue('other', false)
    form.first.setRawValue('first', false)
    expect(() => form.applyServerErrors(parse(), {operation: aba})).toThrow('stale_server_operation')
    const position = form.beginServerErrorOperation({scope: ['rows', 0, 'label']})
    form.rows.move(0, 1)
    form.rows.move(1, 0)
    expect(() => form.applyServerErrors(parse(), {operation: position})).toThrow('stale_server_operation')
    const reset = form.beginServerErrorOperation({scope: ['second']})
    form.second.reset()
    expect(() => form.applyServerErrors(parse(), {operation: reset})).toThrow('stale_server_operation')
  })

  it('supersedes overlapping operations issued from nested receivers', () => {
    const form = new Root()
    const first = form.beginServerErrorOperation({scope: ['rows']})
    const nested = form.rows.forms[0]
    const operation = nested.beginServerErrorOperation()
    expect(() => form.applyServerErrors(parse(), {operation: first})).toThrow('superseded_server_operation')
    const unrelated = form.beginServerErrorOperation({scope: ['first']})
    nested.applyServerErrors(parse(input(['label'], 'nested')), {operation})
    form.applyServerErrors(parse(), {operation: unrelated})
    expect(nested.label.errors[0].code).toBe('nested')
  })
})

describe('server Apply preflight and notification', () => {
  it('stages fallible capture under purity and retains snapshots and token after exceptions', () => {
    let fail = false
    let mutate = false
    const other = new Field(StringType, 'untouched')
    class Fault extends Field<string> {
      protected override captureState() {
        if (mutate) other.rawValue = 'forbidden'
        if (fail) throw new Error('capture failed')
        return super.captureState()
      }
    }
    class Test extends Form {
      first = new Field(StringType, 'one')
      last = new Fault(StringType, 'two')
    }
    const form = new Test()
    const before = form.getSnapshot()
    const operation = form.beginServerErrorOperation()
    const notify = vi.fn()
    form.subscribe(notify)
    const batch = parse(input(['first'], 'first'), input(['last'], 'last'))
    fail = true
    expect(() => form.applyServerErrors(batch, {operation})).toThrow('capture failed')
    fail = false
    mutate = true
    expect(() => form.applyServerErrors(batch, {operation})).toThrow(ValidationMutationError)
    mutate = false
    expect(other.rawValue).toBe('untouched')
    expect(form.getSnapshot()).toBe(before)
    expect(form.first.errors).toEqual([])
    expect(notify).not.toHaveBeenCalled()
    expect(form.applyServerErrors(batch, {operation}).committed).toBe(true)
    expect(notify).toHaveBeenCalledOnce()
  })

  it('delivers all subscribers in tree order and retains diagnostic failures without rejecting Apply', () => {
    const form = new Root()
    const observed: string[] = []
    const faults = ['first fail', 'second fail', 'root fail', 'diagnostic fail']
    form.subscribe(() => {
      observed.push('root')
      expect(form.getSnapshot().fields.second.errors[0].code).toBe('second')
      throw faults[2]
    })
    form.first.subscribe(() => { observed.push('first'); throw faults[0] })
    form.first.subscribe(() => { observed.push('first later') })
    form.second.subscribe(() => { observed.push('second'); throw faults[1] })
    form.subscribeErrorNotifications(report => {
      observed.push('diagnostic')
      expect(report.status).toBe('pending')
      expect(report.failures).toHaveLength(3)
      throw faults[3]
    })
    form.subscribeErrorNotifications(report => {
      observed.push('diagnostic later')
      expect(report.failures).toHaveLength(4)
    })
    const {notification} = form.applyServerErrors(parse(input(['second'], 'second'), input(['first'], 'first')), {
      operation: form.beginServerErrorOperation(),
    })
    expect(observed).toEqual(['first', 'first later', 'second', 'root', 'diagnostic', 'diagnostic later'])
    expect(notification.status).toBe('delivered')
    expect(notification.failures.map(failure => [failure.phase, failure.path, failure.subscriber, failure.error])).toEqual([
      ['subscriber', ['first'], 0, faults[0]], ['subscriber', ['second'], 0, faults[1]],
      ['subscriber', [], 0, faults[2]], ['diagnostic', [], 0, faults[3]],
    ])
    expect(form.getErrorNotificationReports()).toEqual([notification])
    expect(Object.isFrozen(notification.failures)).toBe(true)
    form.clearErrorNotificationReports()
    expect(form.getErrorNotificationReports()).toEqual([])
  })

  it('commits live errors in nested batches and coalesces delivery with later writes', () => {
    const form = new Root()
    const before = form.getSnapshot()
    const observe = vi.fn(() => form.getSnapshot())
    form.subscribe(observe)
    const handles: ErrorNotificationReport[] = []
    form.batch(() => {
      form.batch(() => {
        const result = form.applyServerErrors(parse(input(['first'], 'first')), {
          operation: form.beginServerErrorOperation({scope: ['first']}),
        })
        handles.push(result.notification)
        expect(form.first.errors[0].code).toBe('first')
        expect(form.getSnapshot()).toBe(before)
      })
      expect(handles[0].status).toBe('pending')
      const next = form.applyServerErrors(parse(input(['second'], 'second')), {
        operation: form.beginServerErrorOperation({scope: ['second']}),
      })
      handles.push(next.notification)
      expect(form.getSnapshot()).toBe(before)
      expect(observe).not.toHaveBeenCalled()
      form.first.setRawValue('edited', false)
    })
    expect(handles[0]).toBe(handles[1])
    expect(handles[0].status).toBe('delivered')
    expect(observe).toHaveBeenCalledOnce()
    expect(form.getSnapshot().fields.first.errors).toEqual([])
    expect(form.getSnapshot().fields.second.errors[0].code).toBe('second')
  })

  it('reports moved items at their committed paths and retains child-first order', () => {
    const form = new Root()
    const row = form.rows.forms[0]
    const calls: string[] = []
    form.subscribe(() => { calls.push('root') })
    row.label.subscribe(() => { calls.push('child'); throw 'child listener' })
    row.subscribeErrorNotifications(() => { calls.push('diagnostic'); throw 'diagnostic listener' })
    let handle: ErrorNotificationReport | undefined
    form.batch(() => {
      handle = row.applyServerErrors(parse(input(['label'], 'moved')), {
        operation: row.beginServerErrorOperation(),
      }).notification
      form.rows.move(0, 1)
    })
    expect(calls).toEqual(['child', 'root', 'diagnostic'])
    expect(handle?.failures.map(failure => [failure.error, failure.path])).toEqual([
      ['child listener', ['rows', 1, 'label']], ['diagnostic listener', ['rows', 1]],
    ])
  })

  it('consumes an equal replacement without notification and delivers a later reentrant wave', () => {
    const form = new Root()
    const first = parse(input(['first'], 'first'))
    const calls: string[] = []
    let later: ErrorNotificationReport | undefined
    form.first.subscribe(() => {
      calls.push('first')
      later = form.applyServerErrors(parse(input(['second'], 'second')), {
        operation: form.beginServerErrorOperation({scope: ['second']}),
      }).notification
      expect(later.status).toBe('pending')
      expect(form.second.errors[0].code).toBe('second')
      expect(form.second.getSnapshot().errors).toEqual([])
    })
    form.second.subscribe(() => { calls.push('second') })
    const initial = form.applyServerErrors(first, {operation: form.beginServerErrorOperation({scope: ['first']})})
    expect(initial.notification.status).toBe('delivered')
    expect(later?.status).toBe('delivered')
    expect(calls).toEqual(['first', 'second'])
    const operation = form.beginServerErrorOperation({scope: ['first']})
    expect(form.applyServerErrors(first, {operation}).notification.status).toBe('delivered')
    expect(calls).toEqual(['first', 'second'])
    expect(() => form.applyServerErrors(first, {operation})).toThrow('used_server_operation')
  })

  it('keeps a complete generation when a later batch capture fails and rethrows that batch failure', () => {
    let fail = false
    class Fault extends Field<string> {
      protected override captureState() {
        if (fail) throw new Error('finalization fault')
        return super.captureState()
      }
    }
    class Test extends Form {
      first = new Field(StringType, 'one')
      last = new Fault(StringType, 'two')
    }
    const form = new Test()
    const seen: unknown[] = []
    form.subscribe(() => seen.push(form.getSnapshot()))
    let notification: ErrorNotificationReport | undefined
    expect(() => form.batch(() => {
      notification = form.applyServerErrors(parse(input(['first'], 'committed')), {
        operation: form.beginServerErrorOperation(),
      }).notification
      form.last.setRawValue('later', false)
      fail = true
    })).toThrow('finalization fault')
    expect(form.first.errors[0].code).toBe('committed')
    expect(seen).toMatchObject([{fields: {first: {errors: [{code: 'committed'}]}, last: {valueClear: 'two'}}}])
    expect(notification?.status).toBe('delivered')
    expect(notification?.failures).toMatchObject([{phase: 'finalization'}])
    fail = false
    expect(form.last.getSnapshot().valueClear).toBe('later')
  })
})
