import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, Field, Form, StringType} from '../../src'

class Row extends Form { value = new Field(StringType, 'initial') }
class Root extends Form {
  values = new ArrayField((value?: string) => new Field(StringType, value), {}, ['initial'])
  rows = new ArrayFormField(Row, {}, [{value: 'initial'}])
}
type Store = {parents: Set<unknown>; children: Set<unknown>; listeners: Set<unknown>}
const store = (node: unknown) => (node as {_stateStore: Store})._stateStore

describe('STAB-02 subscription lifetime', () => {
  it('keeps repeated registrations independent and removes the last ownership link', () => {
    const root = new Root()
    const listener = vi.fn()
    const first = root.subscribe(listener)
    const second = root.subscribe(listener)
    root.rows.forms[0].value.rawValue = 'one'
    expect(listener).toHaveBeenCalledTimes(2)
    first(); first()
    root.rows.forms[0].value.rawValue = 'two'
    expect(listener).toHaveBeenCalledTimes(3)
    second()
    expect(store(root).listeners.size).toBe(0)
    expect(store(root).children.size).toBe(0)
    expect(store(root.rows.forms[0].value).parents.size).toBe(0)
    root.rows.forms[0].value.rawValue = 'three'
    expect(listener).toHaveBeenCalledTimes(3)
    const off = root.subscribe(listener)
    root.rows.forms[0].value.rawValue = 'four'
    expect(listener).toHaveBeenCalledTimes(4)
    off()
  })

  it.each(['fields', 'forms'] as const)('isolates removed %s during a batch while preserving their own subscriptions', kind => {
    const root = new Root()
    const collection = kind === 'fields' ? root.values : root.rows
    const removed = kind === 'fields' ? root.values.items[0] : root.rows.forms[0]
    const field = removed instanceof Field ? removed : removed.value
    const parentListener = vi.fn()
    const childListener = vi.fn()
    const offParent = root.subscribe(parentListener)
    const offChild = removed.subscribe(childListener)
    root.batch(() => {
      collection.remove(0)
      expect(store(removed).parents.size).toBe(0)
      field.setRawValue('detached in batch', false)
    })
    expect(parentListener).toHaveBeenCalledTimes(1)
    expect(childListener).toHaveBeenCalledTimes(1)
    field.rawValue = 'detached later'
    expect(parentListener).toHaveBeenCalledTimes(1)
    expect(childListener).toHaveBeenCalledTimes(2)
    expect(removed.getSnapshot().isDirty).toBe(true)
    offChild(); offParent()
    expect(store(removed).parents.size).toBe(0)
    expect(store(removed).children.size).toBe(0)
    expect(store(field).parents.size).toBe(0)
  })

  it('honors unsubscribe during delivery and reconnects after repeated lifetimes', () => {
    const root = new Root()
    const second = vi.fn()
    let offSecond = () => {}
    const offFirst = root.subscribe(() => offSecond())
    offSecond = root.subscribe(second)
    root.values.items[0].rawValue = 'change'
    expect(second).not.toHaveBeenCalled()
    offFirst()
    for (let i = 0; i < 50; i++) {
      const off = root.subscribe(second)
      const row = root.rows.add({value: String(i)}, false)
      root.rows.remove(1)
      const count = second.mock.calls.length
      row.value.rawValue = 'detached'
      expect(second).toHaveBeenCalledTimes(count)
      off()
      expect(store(root).children.size).toBe(0)
      expect(store(row.value).parents.size).toBe(0)
    }
  })
})
