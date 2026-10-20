import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, Field, Form, StringType} from '../../src'

class Row extends Form {
  name = new Field(StringType, 'initial')
  tags = new ArrayField((value?: string) => new Field(StringType, value), {}, ['tag'])
}
class Root extends Form {
  values = new ArrayField((value?: string) => new Field(StringType, value), {}, ['a', 'b'])
  rows = new ArrayFormField(Row, {}, [{name: 'a'}, {name: 'b'}])
}
const ids = (collection: ArrayField<string> | ArrayFormField<Row>) => collection.getSnapshot().itemIds

describe('HF-011 retained collection identities', () => {
  it.each(['fields', 'forms'] as const)('retains %s objects and IDs across insertion, movement and removal', kind => {
    const root = new Root()
    const collection = kind === 'fields' ? root.values : root.rows
    const before = [...(kind === 'fields' ? root.values.items : root.rows.forms)]
    const originalIds = [...ids(collection)!]
    const listener = vi.fn()
    const off = root.subscribe(listener)
    const inserted = kind === 'fields' ? root.values.insert(1, 'new', false) : root.rows.insert(1, {name: 'new'}, false)
    expect(inserted).toBeDefined()
    expect(ids(collection)![0]).toBe(originalIds[0])
    expect(ids(collection)![2]).toBe(originalIds[1])
    expect(originalIds).not.toContain(ids(collection)![1])
    collection.move(2, 0)
    const nodes = kind === 'fields' ? root.values.items : root.rows.forms
    expect(nodes[0]).toBe(before[1])
    expect(nodes[1]).toBe(before[0])
    expect(nodes[2]).toBe(inserted)
    expect(ids(collection)).toEqual([originalIds[1], originalIds[0], ids(collection)![2]])
    collection.remove(1)
    expect(ids(collection)![0]).toBe(originalIds[1])
    expect(listener).toHaveBeenCalledTimes(3)
    const calls = listener.mock.calls.length
    const removed = before[0]
    if (removed instanceof Field) removed.rawValue = 'detached'
    else removed.tags.items[0].rawValue = 'detached nested'
    expect(listener).toHaveBeenCalledTimes(calls)
    const retained = nodes[0]
    if (retained instanceof Field) retained.rawValue = 'retained'
    else retained.tags.items[0].rawValue = 'retained nested'
    expect(listener).toHaveBeenCalledTimes(calls + 1)
    off()
  })

  it.each(['fields', 'forms'] as const)('distinguishes equal-valued %s and publishes their reorder once', kind => {
    const root = new Root()
    if (kind === 'fields') root.values.setItemsValue(['same', 'same'])
    else root.rows.setForms([{name: 'same'}, {name: 'same'}])
    root.commitBaseline()
    const collection = kind === 'fields' ? root.values : root.rows
    const before = collection.getSnapshot()
    const originalIds = [...before.itemIds!]
    expect(new Set(originalIds).size).toBe(2)
    const listener = vi.fn()
    root.subscribe(listener)
    collection.move(0, 1)
    expect(ids(collection)).toEqual([originalIds[1], originalIds[0]])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(root.isDirty).toBe(false) // Dirty remains content-based, not ID-based.
    expect(collection.getSnapshot()).not.toBe(before)
    const after = collection.getSnapshot()
    expect(collection.getSnapshot()).toBe(after)
    expect(Object.isFrozen(after.itemIds)).toBe(true)
  })

  it('routes indexed errors and notifications to retained nested forms at their current indexes', () => {
    const root = new Root()
    const moved = root.rows.forms[0]
    const nestedItem = moved.tags.items[0]
    const nestedId = moved.tags.getSnapshot().itemIds![0]
    const parent = vi.fn()
    const child = vi.fn()
    root.subscribe(parent)
    moved.subscribe(child)
    root.rows.move(0, 1)
    expect(root.rows.forms[1]).toBe(moved)
    expect(moved.tags.items[0]).toBe(nestedItem)
    expect(moved.tags.getSnapshot().itemIds![0]).toBe(nestedId)
    root.errors = {'rows.1.name': 'server at current index'}
    expect(moved.name.error).toBe('server at current index')
    expect(root.rows.forms[0].name.error).toBe('')
    expect(root.allErrors.rows).toEqual(['Форма 2, name: server at current index'])
    expect(root.getSnapshot().allErrors.rows).toEqual(root.allErrors.rows)
    const calls = parent.mock.calls.length
    moved.tags.items[0].rawValue = 'changed'
    expect(parent).toHaveBeenCalledTimes(calls + 1)
    expect(child).toHaveBeenCalledTimes(2)
  })

  it('keeps per-item errors on surviving scalar nodes after an index shift', () => {
    const values = new ArrayField((value?: string) => new Field(StringType, value, {
      validate: value => value === 'bad' ? 'bad item' : true,
    }), {}, ['good', 'bad'])
    const bad = values.items[1]
    const identity = ids(values)![1]
    values.remove(0)
    expect(values.items[0]).toBe(bad)
    expect(ids(values)).toEqual([identity])
    expect(values.getSnapshot().items[0].errors).toEqual(['bad item'])
  })

  it('coalesces structural changes and validates once with final values and parent context', () => {
    const validate = vi.fn(() => true)
    class Batched extends Form {
      values = new ArrayField((value?: string) => new Field(StringType, value), {validate}, ['a', 'b'])
    }
    const root = new Batched()
    const listener = vi.fn()
    root.subscribe(listener)
    const before = root.getSnapshot()
    const retained = root.values.items[1]
    const identity = ids(root.values)![1]
    validate.mockClear()
    root.batch(() => {
      root.values.insert(0, 'new')
      root.values.move(2, 0)
      root.values.remove(2)
      retained.rawValue = 'final'
      expect(root.getSnapshot()).toBe(before)
    })
    expect(root.values.itemsValue).toEqual(['final', 'new'])
    expect(ids(root.values)![0]).toBe(identity)
    expect(validate).toHaveBeenCalledExactlyOnceWith(['final', 'new'], root)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it.each(['fields', 'forms'] as const)('preserves %s own subscriptions after removal and releases parent links', kind => {
    const root = new Root()
    const collection = kind === 'fields' ? root.values : root.rows
    const removed = kind === 'fields' ? root.values.items[0] : root.rows.forms[0]
    const own = vi.fn()
    const parent = vi.fn()
    const offOwn = removed.subscribe(own)
    root.subscribe(parent)
    collection.move(0, 1)
    collection.remove(1)
    const calls = parent.mock.calls.length
    if (removed instanceof Field) removed.rawValue = 'removed'
    else removed.name.rawValue = 'removed'
    expect(own).toHaveBeenCalledTimes(1)
    expect(parent).toHaveBeenCalledTimes(calls)
    offOwn()
  })

  it('retains full replacement semantics and payload shapes without matching equal values', () => {
    const root = new Root()
    const oldField = root.values.items[0]
    const oldForm = root.rows.forms[0]
    const oldFieldIds = [...ids(root.values)!]
    const oldFormIds = [...ids(root.rows)!]
    const before = root.toJSON()
    root.values.setItemsValue(['a', 'b'], false)
    root.rows.setForms([{name: 'a'}, {name: 'b'}], false)
    expect(root.values.items[0]).not.toBe(oldField)
    expect(root.rows.forms[0]).not.toBe(oldForm)
    expect(ids(root.values)!.every(id => !oldFieldIds.includes(id))).toBe(true)
    expect(ids(root.rows)!.every(id => !oldFormIds.includes(id))).toBe(true)
    expect(root.toJSON()).toEqual(before)
    root.values.move(0, 1)
    root.rows.move(0, 1)
    expect(root.toJSON()).toEqual({values: ['b', 'a'], rows: [
      {name: 'b', tags: ['tag']}, {name: 'a', tags: ['tag']},
    ]})
    expect(root.toFormData().get('values')).toBe('["b","a"]')
    expect(root.toFormData().get('rows')).toBe(JSON.stringify(root.toJSON().rows))
    expect(JSON.stringify(root.toJSON())).not.toContain('adaptform-item-')
    expectTypeOf(root.values.insert(0, 'typed', false)).toEqualTypeOf<Field<string> | undefined>()
    expectTypeOf(root.rows.insert(0, {}, false)).toEqualTypeOf<Row | undefined>()
  })

  it('keeps content-based baseline and the existing surviving-node reset semantics', () => {
    const root = new Root()
    const originalIds = [...ids(root.values)!]
    root.values.move(0, 1)
    expect(root.isDirty).toBe(true)
    root.values.move(1, 0)
    expect(root.isDirty).toBe(false)
    expect(ids(root.values)).toEqual(originalIds)
    root.values.insert(0, 'new')
    root.commitBaseline()
    expect(root.isDirty).toBe(false)
    const committedIds = [...ids(root.values)!]
    root.values.items[0].rawValue = 'edited'
    root.reset()
    expect(root.values.itemsValue).toEqual(['new', 'a', 'b'])
    expect(ids(root.values)).toEqual(committedIds)
    expect(root.values.isDirty).toBe(false)
    // Hydrated rows still reset to their class defaults, not their committed baseline.
    expect(root.rows.forms[0].name.valueClear).toBe('initial')
    expect(root.isDirty).toBe(true)
    expect(root.isTouched).toBe(false)
  })

  it('finalizes nested structural batches on exceptions and keeps retained form identity', () => {
    const validate = vi.fn(() => true)
    class Batched extends Form {
      rows = new ArrayFormField(Row, {validate}, [{name: 'a'}, {name: 'b'}])
    }
    const root = new Batched()
    const retained = root.rows.forms[1]
    const retainedId = ids(root.rows)![1]
    const listener = vi.fn()
    root.subscribe(listener)
    validate.mockClear()
    expect(() => root.batch(() => {
      root.rows.insert(0, {name: 'new'})
      root.rows.move(2, 0)
      retained.batch(() => {
        retained.tags.insert(0, 'nested')
        retained.tags.move(1, 0)
      })
      root.rows.remove(2)
      throw new Error('completed writes remain')
    })).toThrow('completed writes remain')
    expect(root.rows.forms[0]).toBe(retained)
    expect(ids(root.rows)![0]).toBe(retainedId)
    expect(retained.tags.itemsValue).toEqual(['tag', 'nested'])
    expect(validate).toHaveBeenCalledExactlyOnceWith(root.rows.forms, root)
    expect(listener).toHaveBeenCalledTimes(1)
    retained.tags.items[0].rawValue = 'after failure'
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it.each([-1, 0.5, NaN, Infinity, -Infinity, 3])('ignores invalid indexes %s without creating nodes or validating', index => {
    const root = new Root()
    const listener = vi.fn()
    root.subscribe(listener)
    const before = root.getSnapshot()
    expect(root.values.insert(index, 'invalid')).toBeUndefined()
    expect(root.rows.insert(index, {name: 'invalid'})).toBeUndefined()
    root.values.move(index, 0)
    root.values.move(0, index)
    root.rows.move(index, 0)
    root.rows.move(0, index)
    expect(root.getSnapshot()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })

  it('accepts insertion at length and into empty collections; equal-index moves are no-ops', () => {
    const root = new Root()
    root.values.clear()
    root.rows.clear()
    expect(root.values.insert(0, 'first')).toBe(root.values.items[0])
    expect(root.rows.insert(0, {name: 'first'})).toBe(root.rows.forms[0])
    expect(root.values.insert(1, 'last')).toBe(root.values.items[1])
    expect(root.rows.insert(1, {name: 'last'})).toBe(root.rows.forms[1])
    const listener = vi.fn()
    root.subscribe(listener)
    const before = root.getSnapshot()
    root.values.move(0, 0)
    root.rows.move(1, 1)
    expect(root.getSnapshot()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })
})
