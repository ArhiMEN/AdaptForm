import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, DateType, Field, Form, StringType} from '../../src'
import * as snapshots from '@core/state/snapshot'
import {FieldType} from '@core/types/FieldType'

class Row extends Form {
  value = new Field(StringType, 'initial')
  sibling = new Field(StringType, 'sibling')
}
class Root extends Form {
  rows = new ArrayFormField(Row, {}, [{value: 'initial'}])
  tags = new ArrayField(value => new Field(StringType, value), {}, ['tag'])
}
class Structured extends FieldType<unknown> {
  cast(value: unknown) { return value }
  validate() { return [] }
  getTypeName() { return 'structured' }
}

describe('PERF-01 snapshot cache regressions', () => {
  it('reuses unchanged aggregates and child snapshots without repeating value aggregation', () => {
    const root = new Root()
    const before = root.getSnapshot()
    const describeValue = vi.spyOn(snapshots, 'snapshotValue')
    for (let i = 0; i < 10; i++) expect(root.getSnapshot()).toBe(before)
    expect(describeValue).not.toHaveBeenCalled()
    describeValue.mockRestore()
    root.rows.forms[0].value.setRawValue('changed', false)
    const after = root.getSnapshot()
    expect(after).not.toBe(before)
    expect(after.fields.tags).toBe(before.fields.tags)
    expect(after.fieldsValue.rows).toEqual([{value: 'changed', sibling: 'sibling'}])
    expect(before.fieldsValue.rows).toEqual([{value: 'initial', sibling: 'sibling'}])
    expect(Object.isFrozen(after.fieldsValue.rows)).toBe(true)
  })

  it('detects nested writes after a read without retaining observer ownership', () => {
    const root = new Root()
    const initial = root.getSnapshot()
    root.rows.forms[0].value.rawValue = 'unobserved'
    expect(root.getSnapshot()).not.toBe(initial)
    expect(root.getSnapshot().fieldsValue.rows).toEqual([{value: 'unobserved', sibling: 'sibling'}])
    const listener = vi.fn()
    const off = root.subscribe(listener)
    off()
    root.rows.forms[0].value.rawValue = 'after unsubscribe'
    expect(listener).not.toHaveBeenCalled()
    expect(root.getSnapshot().fieldsValue.rows).toEqual([{value: 'after unsubscribe', sibling: 'sibling'}])
  })

  it('refreshes direct property replacement and reconnects ownership on a public read', () => {
    const row = new Row()
    const listener = vi.fn()
    row.subscribe(listener)
    const old = row.value
    row.value = new Field(StringType, 'replacement')
    expect(listener).not.toHaveBeenCalled()
    expect(row.getSnapshot().fieldsValue.value).toBe('replacement')
    old.rawValue = 'detached'
    expect(listener).not.toHaveBeenCalled()
    row.value.rawValue = 'connected'
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('discovers external legacy collection edits and preserves node identities', () => {
    const root = new Root()
    const listener = vi.fn()
    root.subscribe(listener)
    const before = root.getSnapshot()
    const old = root.rows.forms[0]
    const replacement = new Row()
    root.rows.forms.splice(0, 1, replacement)
    root.tags.items.push(new Field(StringType, 'external'))
    const next = root.getSnapshot()
    expect('itemIds' in next.fields.rows && next.fields.rows.itemIds)
      .not.toEqual('itemIds' in before.fields.rows && before.fields.rows.itemIds)
    expect(root.rows.forms[0]).toBe(replacement)
    expect(next.fieldsValue.tags).toEqual(['tag', 'external'])
    old.value.rawValue = 'old'
    expect(listener).not.toHaveBeenCalled()
    replacement.value.rawValue = 'new'
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('refreshes mutable dates, cyclic values and externally mutated error arrays on reads', () => {
    const date = new Date(0)
    const field = new Field(DateType, date)
    const before = field.getSnapshot()
    date.setTime(1000)
    expect(field.getSnapshot().rawValue).toEqual({kind: 'Date', timestamp: 1000})
    expect(before.rawValue).toEqual({kind: 'Date', timestamp: 0})
    const data: {values: Map<string, Set<number>>; self?: unknown} = {values: new Map([['a', new Set([1])]])}
    data.self = data
    const structured = new Field(Structured, data)
    const initial = structured.getSnapshot()
    data.values.get('a')!.add(2)
    const changed = structured.getSnapshot()
    expect(changed).not.toBe(initial)
    expect(changed.isDirty).toBe(true)
    expect(structured.getSnapshot()).toBe(changed)
    field.errors.push('external')
    expect(field.getSnapshot().errors).toEqual(['external'])
    expect(before.errors).toEqual([])
  })

  it('refreshes externally edited siblings at the next library mutation', () => {
    const row = new Row()
    const observed: unknown[] = []
    row.subscribe(() => observed.push(row.getSnapshot()))
    row.sibling.errors.push('external')
    row.value.rawValue = 'changed'
    expect(observed).toHaveLength(1)
    expect(observed[0]).toMatchObject({
      allErrors: {sibling: ['external']},
      fields: {sibling: {errors: ['external']}},
    })
  })

  it('preserves committed snapshots, equivalent batches, exception recovery and validation counts', () => {
    const root = new Root()
    const row = root.rows.forms[0]
    const validate = vi.fn(() => true)
    row.value.options = {validate}
    const listener = vi.fn()
    root.subscribe(listener)
    const before = root.getSnapshot()
    root.batch(() => {
      row.value.rawValue = 'temporary'
      row.value.rawValue = 'initial'
      expect(root.getSnapshot()).toBe(before)
    })
    expect(root.getSnapshot()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
    expect(validate).toHaveBeenCalledTimes(1)
    const failure = new Error('callback')
    expect(() => root.batch(() => {
      row.value.rawValue = 'final'
      expect(root.getSnapshot()).toBe(before)
      throw failure
    })).toThrow(failure)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(2)
    root.batch(() => { row.value.rawValue = 'recovered' })
    expect(listener).toHaveBeenCalledTimes(2)
    expect(root.getSnapshot().fieldsValue.rows).toEqual([{value: 'recovered', sibling: 'sibling'}])
  })

  it('keeps reentrant delivery consistent for child and multiple parent subscribers', () => {
    const first = new Row()
    const second = new Row()
    second.value = first.value
    const seen: string[] = []
    first.subscribe(() => {
      const value = first.getSnapshot().fieldsValue.value as string
      seen.push(`first:${value}`)
      if (value === 'one') first.value.rawValue = 'two'
    })
    second.subscribe(() => seen.push(`second:${second.getSnapshot().fieldsValue.value}`))
    first.value.subscribe(() => seen.push(`child:${first.value.getSnapshot().valueClear}`))
    first.value.rawValue = 'one'
    expect(seen).toEqual(['child:one', 'first:one', 'second:one', 'child:two', 'first:two', 'second:two'])
  })

  it('invalidates errors, validity, touched, baseline and reset through a cached ancestor', () => {
    const root = new Root()
    const row = root.rows.forms[0]
    const listener = vi.fn()
    root.subscribe(listener)
    const before = root.getSnapshot()
    row.value.error = 'server'
    expect(root.getSnapshot().allErrors.rows).toEqual(['Форма 1, value: server'])
    row.value.isValid = true
    row.value.isTouched = false
    row.value.rawValue = 'changed'
    root.commitBaseline()
    expect(root.getSnapshot().isDirty).toBe(false)
    root.reset()
    const after = root.getSnapshot()
    expect(after.isDirty).toBe(true)
    expect(after.isValid).toBe(false)
    expect(after.fieldsValue).toEqual(before.fieldsValue)
    expect(root.rows.forms[0]).toBe(row)
    expect(root.toJSON()).toEqual({rows: [{value: 'initial', sibling: 'sibling'}], tags: ['tag']})
    expect(listener).toHaveBeenCalledTimes(6)
  })

  it('preserves custom aggregate getters and captureState overrides', () => {
    let external = 'one'
    class Custom extends Row {
      get fieldsValue() { return {...super.fieldsValue, value: external} }
      get allErrors() { return {value: [external]} }
    }
    const custom = new Custom()
    custom.getSnapshot()
    external = 'two'
    expect(custom.getSnapshot().fieldsValue.value).toBe('two')
    expect(custom.getSnapshot().allErrors.value).toEqual(['two'])
    class Captured extends Field<string> {
      protected captureState() {
        const snapshot = super.captureState()
        return Object.assign(snapshot, {custom: external})
      }
    }
    const field = new Captured(StringType, 'value')
    field.getSnapshot()
    external = 'three'
    expect(field.getSnapshot()).toMatchObject({custom: 'three'})
  })

  it.each(['fields', 'forms'] as const)('preserves custom %s collection value getters', kind => {
    let external = 'one'
    class Values extends ArrayField<string> {
      get itemsValue() { return super.itemsValue.map(() => external) }
      set itemsValue(values: (string | null)[]) { super.itemsValue = values }
    }
    class Forms extends ArrayFormField<Row> {
      get formsFieldsValue() { return super.formsFieldsValue.map(value => ({...value, value: external})) }
    }
    const collection = kind === 'fields'
      ? new Values(value => new Field(StringType, value), {}, ['initial'])
      : new Forms(Row, {}, [{}])
    collection.getSnapshot()
    external = 'two'
    const after = collection.getSnapshot()
    expect('itemsValue' in after ? after.itemsValue : after.formsFieldsValue).toEqual(
      kind === 'fields' ? ['two'] : [{value: 'two', sibling: 'sibling'}],
    )
  })

  it('refreshes parent aggregates derived from custom child getters', () => {
    let external = 'one'
    class CustomField extends Field<string> {
      get valueClear() { return external }
      get errors() { return [external] }
    }
    class CustomRow extends Form { value = new CustomField(StringType, 'initial') }
    const row = new CustomRow()
    const tags = new ArrayField(() => new CustomField(StringType, 'initial'), {}, ['initial'])
    row.getSnapshot()
    tags.getSnapshot()
    external = 'two'
    expect(row.getSnapshot().fieldsValue.value).toBe('two')
    expect(row.getSnapshot().allErrors.value).toEqual(['two'])
    expect(tags.getSnapshot().itemsValue).toEqual(['two'])
  })

  it('discovers added and deleted class fields after priming the cache', () => {
    class Dynamic extends Form { declare extra?: Field<string> }
    const form = new Dynamic()
    const before = form.getSnapshot()
    form.extra = new Field(StringType, 'added')
    expect(form.getSnapshot().fieldsValue).toEqual({extra: 'added'})
    delete form.extra
    expect(form.getSnapshot()).toEqual(before)
  })

  it('does not rescan a collection for each validated child', () => {
    const rows = new ArrayFormField(Row, {}, Array.from({length: 100}, () => ({})))
    rows.subscribe(() => {})
    // Count the ownership boundary rather than asserting host-dependent timings.
    const membership = vi.spyOn(rows as unknown as {stateChildren: () => readonly Row[]}, 'stateChildren')
    rows.remove(99)
    expect(membership.mock.calls.length).toBeLessThan(5)
    expect(rows.forms).toHaveLength(99)
  })
})
