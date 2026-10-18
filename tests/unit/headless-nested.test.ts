import {describe, expect, it, vi} from 'vitest'
import {Form, Field, StringType, ArrayField, ArrayFormField} from '../../src'

class Leaf extends Form {
  name = new Field(StringType, 'initial')
  tags = new ArrayField(value => new Field(StringType, value), {}, ['tag'])
}
class Branch extends Form {
  leaves = new ArrayFormField(Leaf, {}, [{name: 'leaf'}])
}
class Root extends Form {
  name = new Field(StringType, 'root')
  branches = new ArrayFormField(Branch, {}, [{leaves: [{name: 'leaf'}]}])
}

describe('HF-010 nested propagation and ownership', () => {
  it('observes direct fields, array items and deeply nested form fields', () => {
    const form = new Root()
    const leaf = form.branches.forms[0].leaves.forms[0]
    const listener = vi.fn()
    const childListener = vi.fn()
    form.subscribe(listener)
    leaf.subscribe(childListener)
    form.name.rawValue = 'changed'
    expect(listener).toHaveBeenCalledTimes(1)
    leaf.name.rawValue = 'changed'
    expect(listener).toHaveBeenCalledTimes(2)
    expect(childListener).toHaveBeenCalledTimes(1)
    leaf.tags.items[0].rawValue = 'changed tag'
    expect(listener).toHaveBeenCalledTimes(3)
    expect(childListener).toHaveBeenCalledTimes(2)
    expect(form.getSnapshot().isDirty).toBe(true)
    expect(form.getSnapshot().fieldsValue.branches).toEqual([{leaves: [{name: 'changed', tags: ['changed tag']}]}])
  })

  it('publishes consistent snapshots to child subscribers before or after parent subscribers', () => {
    const form = new Root()
    const observations: unknown[] = []
    form.name.subscribe(() => observations.push(form.getSnapshot().fieldsValue.name))
    form.subscribe(() => observations.push(form.name.getSnapshot().valueClear))
    form.name.rawValue = 'changed'
    expect(observations).toEqual(['changed', 'changed'])
  })

  it('attaches added children and detaches removed children without removing their listeners', () => {
    const form = new Root()
    const leaves = form.branches.forms[0].leaves
    const listener = vi.fn()
    form.subscribe(listener)
    const added = leaves.add({name: 'added'})
    expect(listener).toHaveBeenCalledTimes(1)
    added.name.rawValue = 'edited'
    expect(listener).toHaveBeenCalledTimes(2)
    const detached = vi.fn()
    added.subscribe(detached)
    leaves.remove(1)
    expect(listener).toHaveBeenCalledTimes(3)
    added.name.rawValue = 'detached'
    expect(listener).toHaveBeenCalledTimes(3)
    expect(detached).toHaveBeenCalledTimes(1)
    const tags = leaves.forms[0].tags
    const item = tags.add('added')
    tags.remove(1)
    const calls = listener.mock.calls.length
    item.rawValue = 'detached item'
    expect(listener).toHaveBeenCalledTimes(calls)
  })

  it('cleans old ownership on replacement and clear', () => {
    const form = new Root()
    const leaves = form.branches.forms[0].leaves
    const previous = leaves.forms[0]
    const oldItem = previous.tags.items[0]
    const listener = vi.fn()
    form.subscribe(listener)
    leaves.setForms([{name: 'replacement'}])
    const replacement = leaves.forms[0]
    const calls = listener.mock.calls.length
    previous.name.rawValue = 'old'
    oldItem.rawValue = 'old'
    expect(listener).toHaveBeenCalledTimes(calls)
    replacement.name.rawValue = 'new'
    expect(listener).toHaveBeenCalledTimes(calls + 1)
    const tags = replacement.tags
    const replacedTag = tags.items[0]
    tags.setItemsValue(['replacement'])
    const afterReplace = listener.mock.calls.length
    replacedTag.rawValue = 'old tag'
    expect(listener).toHaveBeenCalledTimes(afterReplace)
    const last = tags.items[0]
    tags.clear()
    const afterClear = listener.mock.calls.length
    last.rawValue = 'cleared tag'
    expect(listener).toHaveBeenCalledTimes(afterClear)
    leaves.clear()
    const afterFormsClear = listener.mock.calls.length
    replacement.name.rawValue = 'cleared form'
    expect(listener).toHaveBeenCalledTimes(afterFormsClear)
  })

  it('propagates reset, baseline, errors and writable validity without validation reads', () => {
    const form = new Root()
    const leaf = form.branches.forms[0].leaves.forms[0]
    const listener = vi.fn()
    form.subscribe(listener)
    leaf.name.error = 'server'
    expect(listener).toHaveBeenCalledTimes(1)
    expect(form.isValid).toBe(false)
    leaf.name.isValid = true
    expect(listener).toHaveBeenCalledTimes(2)
    leaf.name.isTouched = false
    expect(listener).toHaveBeenCalledTimes(3)
    leaf.name.rawValue = 'edit'
    expect(listener).toHaveBeenCalledTimes(4)
    form.commitBaseline()
    expect(listener).toHaveBeenCalledTimes(5)
    expect(form.isDirty).toBe(false)
    form.reset()
    expect(listener).toHaveBeenCalledTimes(6)
    expect(form.isDirty).toBe(true)
    const before = form.getSnapshot()
    form.errors = {branches: {'0': {leaves: {'0': {name: 'remote'}}}}}
    expect(listener).toHaveBeenCalledTimes(7)
    expect(form.getSnapshot()).not.toBe(before)
    form.checkValid()
    expect(listener).toHaveBeenCalledTimes(8)
  })

  it('coalesces all ownership levels and nested batches into one event each', () => {
    const form = new Root()
    const branches = form.branches
    const branch = branches.forms[0]
    const leaves = branch.leaves
    const leaf = leaves.forms[0]
    const nodes = [form, branches, branch, leaves, leaf, leaf.name]
    const listeners = nodes.map(node => {
      const listener = vi.fn()
      node.subscribe(listener)
      return listener
    })
    form.batch(() => {
      form.setGlobalError('server', 'error')
      form.clearGlobalErrors()
      form.name.rawValue = 'changed'
      branch.batch(() => {
        leaf.name.rawValue = 'one'
        leaf.name.rawValue = 'two'
        leaf.tags.add('new')
      })
    })
    for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1)
  })

  it('survives repeated add/remove, replacement and unsubscribe/resubscribe cycles', () => {
    const form = new Root()
    const leaves = form.branches.forms[0].leaves
    const listener = vi.fn()
    const off = form.subscribe(listener)
    for (let i = 0; i < 40; i++) {
      const leaf = leaves.add({name: `added ${i}`})
      const item = leaf.tags.add('added')
      leaves.remove(1)
      const before = listener.mock.calls.length
      leaf.name.rawValue = 'removed'
      item.rawValue = 'removed'
      expect(listener).toHaveBeenCalledTimes(before)
    }
    off(); off()
    const before = listener.mock.calls.length
    leaves.forms[0].name.rawValue = 'unobserved'
    expect(listener).toHaveBeenCalledTimes(before)
    for (let i = 0; i < 10; i++) {
      const unsubscribe = form.subscribe(listener)
      leaves.forms[0].name.rawValue = `cycle ${i}`
      expect(listener).toHaveBeenCalledTimes(before + i + 1)
      unsubscribe()
    }
  })

  it('supports a child shared between parents without duplicate or stale ownership', () => {
    class Parent extends Form {
      value = new Field(StringType)
    }
    const first = new Parent()
    const second = new Parent()
    second.value = first.value
    const a = vi.fn()
    const b = vi.fn()
    const off = first.subscribe(a)
    second.subscribe(b)
    first.value.rawValue = 'shared'
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    off()
    first.value.rawValue = 'next'
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(2)
  })

  it('releases internal links recursively after the last observer leaves', () => {
    const form = new Root()
    const leaf = form.branches.forms[0].leaves.forms[0]
    // Inspect ownership, not GC timing, for a deterministic retention regression.
    type Store = {parents: Set<unknown>; children: Set<unknown>}
    const store = (node: unknown) => (node as {_stateStore: Store})._stateStore
    const off1 = form.subscribe(() => {})
    const off2 = form.subscribe(() => {})
    expect(store(leaf.name).parents.size).toBe(1)
    off1()
    expect(store(leaf.name).parents.size).toBe(1)
    off2()
    expect(store(form).children.size).toBe(0)
    expect(store(leaf.name).parents.size).toBe(0)
    const off3 = form.subscribe(() => {})
    const removed = form.branches.forms[0]
    form.branches.clear()
    expect(store(removed).parents.size).toBe(0)
    expect(store(removed).children.size).toBe(0)
    off3()
  })
  it('queues listener writes as the next update without changing the current delivery', () => {
    const form = new Root()
    const seen: unknown[] = []
    form.subscribe(() => {
      if (form.getSnapshot().fieldsValue.name === 'one') form.name.rawValue = 'two'
    })
    form.subscribe(() => seen.push(form.getSnapshot().fieldsValue.name))
    form.name.rawValue = 'one'
    expect(seen).toEqual(['one', 'two'])
    expect(form.getSnapshot().fieldsValue.name).toBe('two')
  })

  it('copies aggregated errors without freezing or mutating the live errors', () => {
    const form = new Root()
    form.name.error = 'local'
    form.setGlobalError('name', 'global')
    const snapshot = form.getSnapshot()
    expect(snapshot.allErrors.name).toEqual(['local', 'global'])
    expect(Object.isFrozen(form.name.errors)).toBe(false)
    expect(form.name.errors).toEqual(['local'])
    expect(form.getSnapshot()).toBe(snapshot)
    form.name.error = 'new'
    expect(snapshot.allErrors.name).toEqual(['local', 'global'])
  })

  it('notifies an empty nested form when parent error assignment clears its global errors', () => {
    class Empty extends Form {}
    class Parent extends Form { children = new ArrayFormField(Empty, {}, [{}]) }
    const form = new Parent()
    const child = form.children.forms[0]
    const parentListener = vi.fn()
    const childListener = vi.fn()
    form.subscribe(parentListener)
    child.subscribe(childListener)
    child.setGlobalError('server', 'error')
    expect(parentListener).toHaveBeenCalledTimes(1)
    expect(childListener).toHaveBeenCalledTimes(1)
    form.errors = {}
    expect(parentListener).toHaveBeenCalledTimes(2)
    expect(childListener).toHaveBeenCalledTimes(2)
    expect(child.getSnapshot().globalErrors).toEqual({})
    expect(child.getSnapshot().isValid).toBe(true)
  })

})
