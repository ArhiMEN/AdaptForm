import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, Field, Form, StringType} from '../../src'

function spyOnCheck(node: {checkValid(): boolean}) {
  return vi.spyOn(node, 'checkValid')
}

function setup(kind: 'ArrayField' | 'ArrayFormField') {
  const descendantValidate = vi.fn((_value: unknown, _context?: Form) => true)
  const siblingValidate = vi.fn(() => true)
  const required = vi.fn((_context: Form | null) => false)
  const validate = vi.fn((_values: unknown, context?: Form): boolean =>
    context instanceof CollectionForm ? context.sibling.valueClear === 'ready' : true)
  class Row extends Form {
    name = new Field(StringType, 'row', {validate: descendantValidate})
  }
  class CollectionForm extends Form {
    collection = kind === 'ArrayField'
      ? new ArrayField(value => new Field(StringType, value, {validate: descendantValidate}),
        {isRequired: required, validate}, ['first', 'second'])
      : new ArrayFormField(Row, {isRequired: required, validate}, [{name: 'first'}, {name: 'second'}])
    sibling = new Field(StringType, 'waiting', {validate: siblingValidate})
  }
  const form = new CollectionForm()
  const checks = spyOnCheck(form)
  const collectionChecks = spyOnCheck(form.collection)
  const resetChecks = () => {
    for (const mock of [descendantValidate, siblingValidate, required, validate, checks, collectionChecks]) {
      mock.mockClear()
    }
  }
  resetChecks()
  return {form, CollectionForm, descendantValidate, siblingValidate, required, validate,
    checks, collectionChecks, resetChecks}
}

const operations = ['remove', 'clear'] as const
function mutate(collection: {remove(index: number): void; clear(): void}, operation: typeof operations[number]) {
  if (operation === 'remove') collection.remove(0)
  else collection.clear()
}

describe.each(['ArrayField', 'ArrayFormField'] as const)('HF-009 %s removal batches', kind => {
  describe.each(operations)('%s', operation => {
    it.each(['collection only', 'sibling assignment', 'nested batch', 'callback exception', 'nested callback exception'])(
      'defers automatic validation and notifications: %s', mode => {
        const {form, validate, required, checks, collectionChecks, descendantValidate, siblingValidate} = setup(kind)
        const collection = form.collection
        const before = form.getSnapshot()
        const collectionBefore = collection.getSnapshot()
        const observations: unknown[] = []
        const listeners = [form, collection, form.sibling].map(node => {
          const listener = vi.fn(() => observations.push(form.getSnapshot()))
          node.subscribe(listener)
          return listener
        })
        const assertDeferred = () => {
          for (const mock of [validate, required, checks, collectionChecks, descendantValidate, siblingValidate, ...listeners]) {
            expect(mock).not.toHaveBeenCalled()
          }
          expect(form.getSnapshot()).toBe(before)
          expect(collection.getSnapshot()).toBe(collectionBefore)
        }
        const failure = new Error('callback failure')
        const writes = () => {
          mutate(collection, operation)
          assertDeferred()
          if (mode !== 'collection only') form.sibling.rawValue = 'ready'
          assertDeferred()
          if (mode.endsWith('exception')) throw failure
        }
        const run = () => form.batch(() => {
          if (mode.startsWith('nested')) form.batch(writes)
          else writes()
          assertDeferred()
        })
        if (mode.endsWith('exception')) expect(run).toThrow(failure)
        else run()

        expect(checks).toHaveBeenCalledTimes(1)
        expect(collectionChecks).toHaveBeenCalledExactlyOnceWith(form)
        expect(required).toHaveBeenCalledExactlyOnceWith(form)
        expect(validate).toHaveBeenCalledTimes(1)
        expect(validate.mock.calls[0][1]).toBe(form)
        expect(siblingValidate).toHaveBeenCalledTimes(1)
        expect(descendantValidate).toHaveBeenCalledTimes(operation === 'remove' ? 1 : 0)
        const remaining = operation === 'remove' ? ['second'] : []
        const values = kind === 'ArrayField' ? remaining : remaining.map(name => ({name}))
        expect(form.getSnapshot().fieldsValue).toEqual({collection: values,
          sibling: mode === 'collection only' ? 'waiting' : 'ready'})
        expect(collection.isValid).toBe(mode !== 'collection only')
        expect(form.isValid).toBe(mode !== 'collection only')
        for (const listener of listeners.slice(0, 2)) expect(listener).toHaveBeenCalledTimes(1)
        expect(listeners[2]).toHaveBeenCalledTimes(mode === 'collection only' ? 0 : 1)
        expect(observations).toEqual(Array(mode === 'collection only' ? 2 : 3).fill(form.getSnapshot()))

        // A completed or throwing batch must release all scheduling state.
        if (mode.endsWith('exception')) {
          form.batch(() => { form.sibling.rawValue = 'after' })
          expect(checks).toHaveBeenCalledTimes(2)
          expect(validate).toHaveBeenCalledTimes(2)
          for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(2)
        }
      })

    it('keeps automatic validation synchronous outside batch without adding parent context', () => {
      const {form, validate, required, checks, collectionChecks, descendantValidate} = setup(kind)
      mutate(form.collection, operation)
      expect(checks).not.toHaveBeenCalled()
      expect(collectionChecks).toHaveBeenCalledExactlyOnceWith()
      expect(required).toHaveBeenCalledExactlyOnceWith(null)
      expect(validate).toHaveBeenCalledTimes(1)
      expect(validate.mock.calls[0][1]).toBeUndefined()
      expect(descendantValidate).toHaveBeenCalledTimes(operation === 'remove' ? 1 : 0)
      expect(form.collection.isValid).toBe(true)
    })

    it('keeps explicit collection checks immediate and still validates the final parent state', () => {
      const {form, validate, required, checks, collectionChecks} = setup(kind)
      const listener = vi.fn()
      form.subscribe(listener)
      form.batch(() => {
        mutate(form.collection, operation)
        expect(validate).not.toHaveBeenCalled()
        expect(form.collection.checkValid()).toBe(true)
        expect(collectionChecks).toHaveBeenCalledExactlyOnceWith()
        expect(validate).toHaveBeenCalledTimes(1)
        expect(required).toHaveBeenCalledExactlyOnceWith(null)
        expect(validate.mock.calls[0][1]).toBeUndefined()
        expect(checks).not.toHaveBeenCalled()
        form.sibling.rawValue = 'ready'
        expect(listener).not.toHaveBeenCalled()
      })
      expect(checks).toHaveBeenCalledTimes(1)
      expect(collectionChecks).toHaveBeenCalledTimes(2)
      expect(validate).toHaveBeenCalledTimes(2)
      expect(required).toHaveBeenCalledTimes(2)
      expect(validate.mock.calls[1][1]).toBe(form)
      expect(form.isValid).toBe(true)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('coalesces ancestor and child batches while preserving the immediate owning Form context', () => {
      const fixture = setup(kind)
      class Root extends Form {
        children = new ArrayFormField(fixture.CollectionForm, {}, [{}])
        sibling = new Field(StringType, 'waiting')
      }
      const root = new Root()
      const child = root.children.forms[0]
      const rootChecks = spyOnCheck(root)
      const childChecks = spyOnCheck(child)
      const listeners = [root, root.children, child, child.collection].map(node => {
        const listener = vi.fn()
        node.subscribe(listener)
        return listener
      })
      fixture.resetChecks()
      root.batch(() => {
        child.batch(() => {
          mutate(child.collection, operation)
          expect(fixture.validate).not.toHaveBeenCalled()
          child.sibling.rawValue = 'ready'
        })
        root.sibling.rawValue = 'ready'
        expect(rootChecks).not.toHaveBeenCalled()
        expect(childChecks).not.toHaveBeenCalled()
        expect(fixture.validate).not.toHaveBeenCalled()
        for (const listener of listeners) expect(listener).not.toHaveBeenCalled()
      })
      expect(rootChecks).toHaveBeenCalledTimes(1)
      expect(childChecks).toHaveBeenCalledExactlyOnceWith(child)
      expect(fixture.required).toHaveBeenCalledExactlyOnceWith(child)
      expect(fixture.validate).toHaveBeenCalledTimes(1)
      expect(fixture.validate.mock.calls[0][1]).toBe(child)
      expect(fixture.descendantValidate).toHaveBeenCalledTimes(operation === 'remove' ? 1 : 0)
      expect(root.isValid).toBe(true)
      for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  it('deduplicates repeated remove and clear requests across nested batches', () => {
    const {form, validate, required, checks, collectionChecks, descendantValidate} = setup(kind)
    const listener = vi.fn()
    form.subscribe(listener)
    form.batch(() => {
      form.collection.remove(0)
      form.batch(() => {
        form.collection.remove(0)
        form.collection.clear()
        form.collection.clear()
      })
      expect(validate).not.toHaveBeenCalled()
      expect(required).not.toHaveBeenCalled()
      expect(listener).not.toHaveBeenCalled()
      form.sibling.rawValue = 'ready'
    })
    expect(checks).toHaveBeenCalledTimes(1)
    expect(collectionChecks).toHaveBeenCalledExactlyOnceWith(form)
    expect(required).toHaveBeenCalledExactlyOnceWith(form)
    expect(validate).toHaveBeenCalledTimes(1)
    expect(descendantValidate).not.toHaveBeenCalled()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(form.isValid).toBe(true)
  })
})
