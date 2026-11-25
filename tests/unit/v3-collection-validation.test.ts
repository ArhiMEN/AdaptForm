import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, Field, Form, StringType} from '../../src'

describe('ODR-03 validation assembly', () => {
  it('initializes plugins, casts, baselines and nested defaults without validating', () => {
    const required = vi.fn(() => true)
    const type = vi.fn(() => [])
    const validate = vi.fn(() => [])
    const casts = vi.fn()
    const init = vi.fn()
    class Type extends StringType {
      cast(value: unknown) { casts(value); return super.cast(value) }
      validateErrors() { return type() }
    }
    const options = {isRequired: required, validate, plugins: [{init}]}
    const item = (value = 'item') => new Field(Type, value, options)
    class Row extends Form {
      name = item('row')
      tags = new ArrayField(item, {isRequired: required, validate}, ['nested'])
    }
    class Root extends Form {
      defaultField = item('root')
      rows = new ArrayFormField(Row, {isRequired: required, validate}, [{name: 'hydrated'}])
    }
    const root = new Root()
    expect(root.toJSON()).toEqual({defaultField: 'root', rows: [{name: 'hydrated', tags: ['nested']}]})
    expect(root.defaultField.isValid).toBeNull()
    expect(root.rows.forms[0].name.isValid).toBeNull()
    expect(root.rows.forms[0].tags.isValid).toBe(false)
    expect(root.isDirty).toBe(false)
    expect(init).toHaveBeenCalledTimes(3)
    expect(casts.mock.calls.map(([value]) => value)).toEqual(['root', 'row', 'nested', 'hydrated'])
    root.setFields({rows: [{name: 'other', tags: ['first', 'second']}]}, false)
    root.getSnapshot()
    root.commitBaseline()
    for (const probe of [required, type, validate]) expect(probe).not.toHaveBeenCalled()
  })

  it('suppresses implicit checks inside factories and rejects premature explicit checks', () => {
    const validate = vi.fn(() => [])
    const collection = new ArrayField((value?: string) => {
      const item = new Field(StringType, 'default', {validate})
      item.rawValue = value
      if (value === 'premature') item.validate()
      return item
    })
    expect(() => collection.add('premature')).toThrow('completed node assembly')
    expect(collection.items).toEqual([])
    const unchecked = collection.add('deferred', false)
    expect(unchecked.isValid).toBeNull()
    expect(validate).not.toHaveBeenCalled()
    collection.add('checked')
    expect(validate).toHaveBeenCalledExactlyOnceWith('checked', undefined)
    expect(unchecked.isValid).toBeNull()
  })
})

describe('ODR-03 validation traversal and local requests', () => {
  it('checks every child despite container errors and preserves the owning Form context', () => {
    const calls: unknown[][] = []
    class Row extends Form {
      text = new Field(StringType, 'text', {validate: (value, form) => {
        calls.push(['row', value, form])
        return [{code: 'app.text'}]
      }})
    }
    class Root extends Form {
      first = new ArrayField((value?: string) => new Field(StringType, value, {
        validate: (value, form) => { calls.push(['item', value, form]); return [{code: 'app.item'}] },
      }), {
        minItems: 3,
        isRequired: () => { calls.push(['required']); return false },
        validate: () => { calls.push(['skipped']); return [] },
      }, ['a', 'b'])
      rows = new ArrayFormField(Row, {validate: (_rows, form) => { calls.push(['container', form]); return [] }}, [{}, {}])
      last = new Field(StringType, 'last', {validate: (_value, form) => { calls.push(['last', form]); return [] }})
    }
    const root = new Root()
    expect(root.validate(new Row())).toEqual({valid: false})
    expect(calls).toEqual([
      ['required'], ['item', 'a', root], ['item', 'b', root],
      ['row', 'text', root.rows.forms[0]], ['row', 'text', root.rows.forms[1]],
      ['container', root], ['last', root],
    ])
    expect(root.getErrors().map(error => error.path)).toEqual([
      ['first'], ['first', 0], ['first', 1], ['rows', 0, 'text'], ['rows', 1, 'text'],
    ])
  })

  it('coalesces new items, own checks and full replacements without touching retained siblings', () => {
    const calls: string[] = []
    const tag = (value?: string) => new Field(StringType, value, {
      validate: value => { calls.push(value); return [] },
    })
    class Root extends Form {
      tags = new ArrayField(tag, {
        isRequired: () => { calls.push('required'); return false },
        validate: () => { calls.push('own'); return [] },
      }, ['retained'])
      sibling = new Field(StringType, 'sibling', {validate: value => { calls.push(value); return [] }})
    }
    const root = new Root()
    root.validate()
    calls.length = 0
    root.batch(() => {
      root.tags.add('removed')
      root.tags.remove(1)
      root.tags.insert(0, 'first')
      root.tags.add('last')
      root.tags.move(0, 1)
      root.tags.move(0, 0)
      expect(calls).toEqual([])
    })
    expect(calls).toEqual(['required', 'first', 'last', 'own'])
    calls.length = 0
    root.batch(() => {
      root.tags.add('superseded')
      root.tags.setItemsValue(['replacement'])
      root.tags.add('new')
    })
    expect(calls).toEqual(['required', 'replacement', 'new', 'own'])
    calls.length = 0
    root.tags.clear()
    root.tags.clear()
    root.tags.setItemsValue([])
    expect(calls).toEqual(['required', 'own'])
  })

  it('checks only the new nested Form and the affected ancestor collections', () => {
    const calls: unknown[][] = []
    class Row extends Form {
      tags = new ArrayField((value?: string) => new Field(StringType, value, {
        validate: (value, form) => { calls.push(['tag', value, form]); return [] },
      }), {validate: (_values, form) => { calls.push(['tags', form]); return [] }}, ['retained'])
      scalar = new Field(StringType, 'unchanged', {validate: value => { calls.push([value]); return [] }})
    }
    const rows = new ArrayFormField(Row, {validate: () => { calls.push(['rows']); return [] }}, [{}, {}])
    rows.validate()
    const row = rows.forms[0]
    calls.length = 0
    row.tags.add('new')
    expect(calls).toEqual([['tag', 'new', row], ['tags', row], ['rows']])
    calls.length = 0
    const added = rows.add()
    expect(calls).toEqual([['tag', 'retained', added], ['tags', added], ['unchanged'], ['rows']])
  })
})
