import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, ErrorContractError, Field, Form, NumberType, StringType,
  type ValidationErrorInput, type ValidationErrorSource} from '../../src'
import {ErrorStore} from '../../src/core/state/ErrorStore'
import {replaceNodeErrors} from '../../src/core/state/ErrorNode'

const sources: readonly ValidationErrorSource[] = ['type', 'custom', 'server', 'manual']
const error = (code: string): readonly ValidationErrorInput[] => [{code}]
class Row extends Form {
  name = new Field(StringType, 'name')
  tags = new ArrayField(value => new Field(StringType, value), {}, ['tag'])
}
class Root extends Form {
  name = new Field(StringType, 'root')
  rows = new ArrayFormField(Row, {}, [{}, {}])
}

// Server ingress is deliberately internal until tokenized Apply is implemented.
const server = (node: object, code = 'remote') => replaceNodeErrors(node, 'server', error(code))

describe('V3 source storage', () => {
  it('orders independent sources and keeps duplicate codes and insertion order', () => {
    const store = new ErrorStore()
    for (const source of [...sources].reverse()) store.replace(source, [{code: 'same'}, {code: 'same', params: {source}}])
    expect(store.read().map(entry => entry.source)).toEqual(sources.flatMap(source => [source, source]))
    expect(store.read()).toHaveLength(8)
  })

  it.each(sources)('replaces only %s and preserves the other partitions', source => {
    const store = new ErrorStore()
    for (const entry of sources) store.replace(entry, error(entry))
    store.replace(source, error('replacement'))
    expect(store.read().map(entry => entry.code)).toEqual(sources.map(entry => entry === source ? 'replacement' : entry))
    store.replace(source, [])
    expect(store.read().map(entry => entry.source)).toEqual(sources.filter(entry => entry !== source))
  })

  it('normalizes, deeply detaches and freezes every source without freezing inputs', () => {
    const store = new ErrorStore(), params = {nested: [{value: -0}]}
    for (const source of sources) store.replace(source, [{code: 'same', params}])
    params.nested[0].value = 2
    for (const entry of store.read()) {
      expect(entry.params).toEqual({nested: [{value: 0}]})
      expect(Object.isFrozen(entry.params?.nested)).toBe(true)
      expect(Object.isFrozen((entry.params?.nested as readonly object[])[0])).toBe(true)
    }
    expect(Object.isFrozen(params)).toBe(false)
    expect(Object.isFrozen(store.read())).toBe(true)
    expect(() => (store.read() as unknown[]).push({})).toThrow(TypeError)
  })

  it.each(sources)('preserves every partition when %s normalization fails', source => {
    const store = new ErrorStore()
    for (const entry of sources) store.replace(entry, error(entry))
    const before = store.read()
    expect(() => store.replace(source, [{code: 'good'}, {code: 'bad', params: {value: NaN}}])).toThrow(ErrorContractError)
    expect(store.read()).toBe(before)
  })

  it('normalizes both client sources before installing either', () => {
    const store = new ErrorStore()
    store.replaceClient(error('old.type'), error('old.custom'))
    const before = store.read()
    expect(() => store.replaceClient(error('new.type'), [{code: 'bad', params: {n: Infinity}}])).toThrow(ErrorContractError)
    expect(store.read()).toBe(before)
  })

  it('rejects malformed arrays and validates a clear selection before writing', () => {
    const store = new ErrorStore()
    store.replace('manual', error('kept'))
    const before = store.read()
    expect(() => store.replace('manual', new Array(1))).toThrow(ErrorContractError)
    expect(() => store.replace('manual', {} as readonly ValidationErrorInput[])).toThrow(ErrorContractError)
    expect(() => store.clear(['manual', 'spoof' as ValidationErrorSource])).toThrow(ErrorContractError)
    expect(store.read()).toBe(before)
  })
})

describe('V3 validity and lifecycle', () => {
  it('distinguishes unchecked, failed, cleared, checked and manual-only states', () => {
    const field = new Field(StringType)
    expect(field.isValid).toBeNull()
    field.setErrors(error('review'))
    expect(field.isValid).toBe(false)
    field.setErrors([])
    expect(field.isValid).toBeNull()
    expect(field.checkValid()).toBe(false)
    field.clearErrors({sources: ['type']})
    expect(field.isValid).toBeNull()
    field.setRawValue('valid', false)
    expect(field.isValid).toBeNull()
    expect(field.checkValid()).toBe(true)
    field.setErrors(error('review'))
    expect(field.isValid).toBe(false)
    field.setErrors([])
    expect(field.isValid).toBe(true)
    field.clearErrors({sources: ['custom']})
    expect(field.isValid).toBeNull()
  })

  it('preserves server/manual through repeated client checks and effective validity stays false', () => {
    const field = new Field(StringType, 'x', {validate: () => [{code: 'custom'}, {code: 'custom'}]})
    server(field)
    field.setErrors(error('manual'))
    for (let i = 0; i < 3; i++) {
      expect(field.checkAndSetValid()).toBe(false)
      expect(field.errors.map(entry => entry.source)).toEqual(['custom', 'custom', 'server', 'manual'])
    }
    field.options = {validate: () => []}
    expect(field.checkValid()).toBe(false)
    expect(field.errors.map(entry => entry.source)).toEqual(['server', 'manual'])
    field.clearErrors({sources: ['server', 'manual']})
    expect(field.isValid).toBe(true)
  })

  it('clears stale custom results on type failure and stale type results on success', () => {
    const field = new Field(StringType, 'valid', {minLength: 3, validate: () => error('custom')})
    field.setRawValue('x', false)
    field.checkValid()
    expect(field.errors.map(entry => entry.source)).toEqual(['type'])
    field.options = {validate: () => []}
    field.rawValue = 'valid'
    expect(field.errors).toEqual([])
    expect(field.isValid).toBe(true)
  })

  it.each([true, false])('clears all own sources on an actual value change, validate=%s', validate => {
    const field = new Field(StringType, 'old')
    server(field)
    field.setErrors(error('manual'))
    field.setRawValue('new', validate)
    expect(field.errors).toEqual([])
    expect(field.isValid).toBe(validate ? true : null)
  })

  it.each([true, false])('keeps server/manual on equal assignments, validate=%s', validate => {
    const field = new Field(NumberType, 10)
    server(field)
    field.setErrors(error('manual'))
    const before = field.errors
    field.setRawValue(10, validate)
    expect(field.errors).toBe(before)
    expect(field.isValid).toBe(false)
  })

  it('compares post-plugin raw and clean values; normalized equal input is unchanged', () => {
    const field = new Field(StringType, 'x', {plugins: [{toRawValue: value => String(value).trim()}]})
    server(field)
    field.setRawValue(' x ', false)
    expect(field.errors.map(entry => entry.source)).toEqual(['server'])
  })

  it('distinguishes different invalid raw inputs sharing a null cast', () => {
    const field = new Field(NumberType)
    field.setRawValue('bad', false)
    server(field)
    field.setRawValue('worse', false)
    expect(field.valueClear).toBeNull()
    expect(field.errors).toEqual([])
    expect(field.isValid).toBeNull()
  })

  it('treats raw formatting changes as changes even with equal clean values', () => {
    const field = new Field(NumberType, 10)
    server(field)
    field.setRawValue('10', false)
    expect(field.valueClear).toBe(10)
    expect(field.errors).toEqual([])
    expect(field.isDirty).toBe(false)
  })

  it('keeps equivalent object values and invalidates structurally different objects', () => {
    class ObjectType {
      readonly typeId = 'test.object'
      constructor(public options: object) {}
      cast(value: unknown) { return value as {x: number} }
      validateErrors() { return [] }
    }
    const field = new Field(ObjectType, {x: 1})
    server(field)
    field.setRawValue({x: 1}, false)
    expect(field.errors).toHaveLength(1)
    field.setRawValue({x: 2}, false)
    expect(field.errors).toEqual([])
  })

  it('reset clears recursively, restores defaults and leaves checks unknown', () => {
    const root = new Root()
    root.rows.add({name: 'added'})
    for (const node of [root, root.name, root.rows, ...root.rows.forms, root.rows.forms[0].name, root.rows.forms[0].tags.items[0]]) {
      node.setErrors(error('manual')); server(node)
    }
    root.reset()
    expect(root.getErrors()).toEqual([])
    expect(root.name.isValid).toBeNull()
    expect(root.rows.forms[0].name.isValid).toBeNull()
    expect(root.rows.forms).toHaveLength(3)
    expect(root.rows.isValid).toBe(false)
    expect(root.isValid).toBe(false)
    expect(root.isTouched).toBe(false)
  })

  it('a direct leaf reset clears containing collection errors when its value changes', () => {
    const root = new Root(), row = root.rows.forms[0]
    row.tags.items[0].rawValue = 'changed'
    root.rows.setErrors(error('outer')); row.tags.setErrors(error('inner'))
    root.setErrors(error('global')); row.setErrors(error('row.global'))
    row.tags.items[0].reset()
    expect(root.rows.errors).toEqual([])
    expect(row.tags.errors).toEqual([])
    expect(row.tags.items[0].isValid).toBeNull()
    expect(root.errors).toHaveLength(1)
    expect(row.errors).toHaveLength(1)
  })

  it.each(['scalar', 'forms'] as const)('a %s collection failure preserves external errors and leaves its check unknown', kind => {
    let fail = false
    const validate = () => {
      if (fail) throw new Error('collection failure')
      return []
    }
    const collection = kind === 'scalar'
      ? new ArrayField(value => new Field(StringType, value), {validate}, ['x'])
      : new ArrayFormField(Row, {validate}, [{}])
    server(collection); collection.setErrors(error('manual'))
    fail = true
    expect(() => collection.checkValid()).toThrow('collection failure')
    expect(collection.errors.map(entry => entry.source)).toEqual(['server', 'manual'])
    collection.clearErrors({sources: ['server', 'manual']})
    expect(collection.isValid).toBe(false)
    fail = false
    expect(collection.checkValid()).toBe(true)
  })

  it('ignores untrusted manual provenance and local routing data at runtime', () => {
    const field = new Field(StringType, 'x')
    const input = {code: 'review', source: 'server', path: ['other'], params: {n: 1}}
    field.setErrors([input])
    expect(field.errors).toEqual([{code: 'review', source: 'manual', params: {n: 1}}])
    expect(field.errors[0]).not.toHaveProperty('path')
  })

  it('commitBaseline changes dirty without clearing errors or client-check knowledge', () => {
    const root = new Root()
    root.name.rawValue = 'edited'
    root.checkValid()
    server(root.name); root.setErrors(error('global'))
    const before = root.getErrors()
    expect(root.isDirty).toBe(true)
    root.commitBaseline()
    expect(root.isDirty).toBe(false)
    expect(root.getErrors()).toEqual(before)
    root.clearErrors({sources: ['server', 'manual'], recursive: true})
    expect(root.isValid).toBe(true)
  })

  it('a normalization exception preserves errors, params, snapshots and external sources', () => {
    let fail = false
    const field = new Field(StringType, 'x', {validate: () => fail ? [{code: 'bad', params: {n: NaN}}] : []})
    server(field); field.setErrors(error('manual'))
    const before = field.getSnapshot(), notify = vi.fn()
    field.subscribe(notify)
    fail = true
    expect(() => field.checkValid()).toThrow(ErrorContractError)
    expect(field.getSnapshot()).toBe(before)
    expect(notify).not.toHaveBeenCalled()
    field.clearErrors({sources: ['server', 'manual']})
    expect(field.isValid).toBeNull()
    fail = false
    expect(field.checkValid()).toBe(true)
  })

  it('does not reuse an old successful check after an exception', () => {
    let fail = false
    const field = new Field(StringType, 'x', {validate: () => { if (fail) throw new Error('failure'); return [] }})
    expect(field.isValid).toBe(true)
    fail = true
    expect(() => field.checkValid()).toThrow('failure')
    expect(field.isValid).toBeNull()
  })
})

describe('V3 containers, paths and snapshots', () => {
  it('keeps own errors separate and aggregates full relative paths in receiver order', () => {
    const root = new Root(), row = root.rows.forms[0]
    root.name.setErrors(error('name'))
    root.rows.setErrors(error('rows'))
    row.tags.setErrors(error('tags'))
    row.tags.items[0].setErrors(error('item'))
    row.setErrors(error('row'))
    root.setErrors(error('root'))
    expect(root.getErrors().map(entry => [entry.code, entry.path])).toEqual([
      ['name', ['name']], ['rows', ['rows']], ['tags', ['rows', 0, 'tags']],
      ['item', ['rows', 0, 'tags', 0]], ['row', ['rows', 0]], ['root', []],
    ])
    expect(row.tags.getErrors().map(entry => entry.path)).toEqual([[], [0]])
    for (const node of [root, root.name, root.rows, row, row.tags, row.tags.items[0]]) {
      expect(node.errors).toBe(node.getOwnErrors())
      expect(node.errors.every(entry => !('path' in entry))).toBe(true)
    }
    expect(Object.isFrozen(root.getErrors()[0].path)).toBe(true)
    expect(Object.isFrozen(root.getErrors())).toBe(true)
  })

  it('clears containing collections on leaf edits without subscriptions, preserving siblings and Form globals', () => {
    const root = new Root(), row = root.rows.forms[0], sibling = root.rows.forms[1]
    for (const node of [root, root.rows, row, row.tags, row.tags.items[0], sibling.name]) {
      node.setErrors(error('manual')); server(node)
    }
    row.tags.items[0].rawValue = 'changed'
    for (const node of [root.rows, row.tags, row.tags.items[0]]) expect(node.errors).toEqual([])
    for (const node of [root, row, sibling.name]) expect(node.errors.map(entry => entry.source)).toEqual(['server', 'manual'])
  })

  it.each(['move', 'remove', 'insert'] as const)('clears own collection errors on %s and retains item identities/errors', action => {
    const root = new Root(), rows = root.rows, retained = rows.forms[1]
    rows.setErrors(error('own')); server(rows)
    retained.setErrors(error('global')); server(retained.name)
    const id = rows.getSnapshot().itemIds[1]
    if (action === 'move') rows.move(1, 0)
    if (action === 'remove') rows.remove(0)
    if (action === 'insert') rows.insert(0, {})
    const index = rows.forms.indexOf(retained)
    expect(rows.errors).toEqual([])
    expect(rows.getSnapshot().itemIds[index]).toBe(id)
    expect(root.getErrors().map(entry => entry.path)).toEqual([['rows', index, 'name'], ['rows', index]])
  })

  it('keeps errors through equal/invalid moves and equivalent leaf writes', () => {
    const rows = new Root().rows
    rows.setErrors(error('own')); server(rows)
    rows.move(0, 0); rows.move(-1, 0); rows.remove(-1)
    rows.forms[0].name.setRawValue('name', false)
    expect(rows.errors.map(entry => entry.source)).toEqual(['server', 'manual'])
  })

  it('detaches replaced and removed nodes from error lifecycle and notifications', () => {
    const rows = new Root().rows, old = rows.forms[0]
    rows.setForms([{}], false)
    rows.setErrors(error('retained')); server(rows)
    const notify = vi.fn()
    rows.subscribe(notify)
    old.name.rawValue = 'detached'
    expect(rows.errors.map(entry => entry.source)).toEqual(['server', 'manual'])
    expect(rows.forms[0].errors).toEqual([])
    expect(notify).not.toHaveBeenCalled()
  })

  it('supports recursive source clearing and preserves completed checks when clearing only external errors', () => {
    const root = new Root()
    root.checkValid()
    for (const node of [root, root.name, root.rows, root.rows.forms[0].name]) {
      node.setErrors(error('manual')); server(node)
    }
    root.clearErrors({sources: ['manual']})
    expect(root.errors.map(entry => entry.source)).toEqual(['server'])
    expect(root.name.errors).toHaveLength(2)
    root.clearErrors({sources: ['manual', 'server'], recursive: true})
    expect(root.isValid).toBe(true)
    root.clearErrors({sources: ['type'], recursive: true})
    expect(root.isValid).toBe(false)
    expect(root.name.isValid).toBeNull()
  })

  it('stores only own structured errors in immutable snapshots, with required stable IDs', () => {
    const root = new Root()
    root.setErrors(error('global')); root.rows.forms[0].name.setErrors(error('leaf'))
    const snapshot = root.getSnapshot()
    expect(snapshot.errors).toEqual([{code: 'global', source: 'manual'}])
    expect(snapshot.fields.rows).toMatchObject({errors: [], forms: [{fields: {name: {errors: [{code: 'leaf'}]}}}, {}]})
    expect(Object.isFrozen(snapshot.errors)).toBe(true)
    expect(Object.isFrozen(root.rows.getSnapshot().itemIds)).toBe(true)
    expect(snapshot).not.toHaveProperty('validationErrors')
    expect(snapshot).not.toHaveProperty('allErrors')
    expect(snapshot).not.toHaveProperty('globalErrors')
  })

  it('notifies for metadata changes and stays silent on equal replacement/revalidation', () => {
    const field = new Field(StringType, 'x'), notify = vi.fn()
    field.subscribe(notify)
    field.setErrors([{code: 'a', message: '', params: {n: 1}}])
    field.setErrors([{code: 'b', message: '', params: {n: 1}}])
    field.setErrors([{code: 'b', message: '', params: {n: 2}}])
    server(field)
    const before = field.getSnapshot()
    field.setErrors([{code: 'b', message: '', params: {n: 2}}]); server(field)
    field.checkValid(); field.checkValid()
    expect(notify).toHaveBeenCalledTimes(4)
    expect(field.getSnapshot()).toBe(before)
  })

  it('commits parent and child snapshots before callbacks and coalesces error-only batches', () => {
    const root = new Root(), row = root.rows.forms[0], observed: unknown[] = []
    root.subscribe(() => observed.push(root.getSnapshot()))
    row.name.subscribe(() => expect(root.getSnapshot().fields.rows).toBe(root.rows.getSnapshot()))
    const before = root.getSnapshot()
    root.batch(() => {
      row.name.setErrors(error('first')); row.name.setErrors(error('last'))
      expect(root.getSnapshot()).toBe(before)
    })
    expect(observed).toHaveLength(1)
    expect(row.name.errors).toEqual([{code: 'last', source: 'manual'}])
  })
})

function removedContracts(field: Field<string>, root: Root) {
  // @ts-expect-error Provenance is engine-owned; no public source setter.
  field.setErrors([{code: 'spoof'}], 'server')
  // @ts-expect-error Form manual setters take a structured own-error array.
  root.setErrors({name: 'old server response'})
  // @ts-expect-error Own errors cannot be replaced by property assignment.
  root.errors = []
  // @ts-expect-error String errors are not accepted.
  field.setErrors(['old'])
  // @ts-expect-error No mutable string facade.
  field.errors.push('old')
  // @ts-expect-error No legacy text setter.
  field.error = 'old'
  // @ts-expect-error Validity is derived, not writable.
  field.isValid = true
  // @ts-expect-error No keyed global setter.
  root.setGlobalError('key', 'old')
  // @ts-expect-error No string aggregator.
  void root.allErrors
  // @ts-expect-error No duplicate snapshot representation.
  void field.getSnapshot().validationErrors
}
void removedContracts
