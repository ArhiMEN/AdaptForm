import {describe, expect, it, vi} from 'vitest'
import {ErrorContractError, Field, StringType, ValidationMutationError} from '../../src'
import {ErrorsSchema, serverEntries} from '../../src/core/server/ErrorsSchema'
import {ErrorsMapping} from '../../src/core/server/ErrorsMapping'
import type {ParsedServerErrors} from '../../src/core/server/schemaTypes'

const records = (mapping?: ErrorsMapping) => new ErrorsSchema({
  kind: 'records', path: {at: ['path']}, code: {at: ['code']},
  message: {at: ['message']}, params: {at: ['params']}, mapping,
})

describe('V3 server error extraction', () => {
  it('selects own envelope paths and makes detached, canonical server entries', () => {
    const schema = new ErrorsSchema({
      kind: 'records', select: {at: ['nested', 'errors']},
      code: {at: ['code']}, message: {at: ['message']}, params: {at: ['params']}, path: {at: ['path']},
    })
    const input = {nested: {errors: [
      {code: 'taken', path: ['constructor', 1], params: {sizes: [2]}},
      {code: 'taken', path: ['constructor', 1], message: '', source: 'type'},
    ]}}
    const batch = schema.parse(input, {trace: true})
    input.nested.errors[0].params!.sizes.push(9)
    expect(batch.entries).toEqual([
      {path: ['constructor', 1], error: {code: 'taken', params: {sizes: [2]}, source: 'server'}},
      {path: ['constructor', 1], error: {code: 'taken', message: '', source: 'server'}},
    ])
    expect(Object.isFrozen(batch.entries[0].error.params?.sizes)).toBe(true)
    expect(Object.isFrozen(batch.trace?.[0].from)).toBe(true)
    expect(serverEntries(batch)).toBe(batch.entries)
    expect(() => serverEntries({...batch} as ParsedServerErrors)).toThrow(ErrorContractError)
  })

  it('distinguishes an empty list from a missing envelope and path codecs are explicit', () => {
    const schema = new ErrorsSchema({
      kind: 'records', select: {at: ['issues']}, path: {at: ['issuePath']}, code: {value: 'app.server'},
      decodePath: path => typeof path === 'string' ? path.split('.') : [],
    })
    expect(schema.parse({issues: []}).entries).toEqual([])
    expect(schema.parse({issues: [{issuePath: 'rows.1'}]}).entries[0].path).toEqual(['rows', '1'])
    expect(() => schema.parse({issues: [{}]})).toThrow('missing_required_selector')
    expect(() => schema.parse({})).toThrow('missing_response_selector')
    expect(() => records().parse([{code: 'error', path: 'literal.key'}])).toThrow('invalid_path')
  })

  it('passes whole leaves to the decoder before descending into literal object keys', () => {
    const tree = new ErrorsSchema({
      kind: 'tree',
      leaf: value => {
        if (value === null) return []
        if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
          return value.length ? [{code: 'leaf', message: value.join(',').toUpperCase()}] : []
        }
        return typeof value === 'string' ? [{code: 'leaf', message: value}] : undefined
      },
    })
    const batch = tree.parse(JSON.parse('{"items":[{"a.b":["one","two"]}],"__proto__":{"code":"literal"},"empty":null}'))
    expect(batch.entries.map(entry => [entry.path, entry.error.message])).toEqual([
      [['items', 0, 'a.b'], 'ONE,TWO'], [['__proto__', 'code'], 'literal'],
    ])
    expect(() => tree.parse({number: 1})).toThrow('unrecognized_tree_leaf')
  })

  it('checks JSON safety before callbacks and stops accessors, cycles and excess results', () => {
    const getter = vi.fn(() => 'secret')
    const leaf = vi.fn(() => undefined)
    const tree = new ErrorsSchema({kind: 'tree', leaf})
    const data = Object.defineProperty({}, 'secret', {get: getter, enumerable: true})
    expect(() => tree.parse(data)).toThrow('unsafe_descriptor')
    expect(leaf).not.toHaveBeenCalled()
    expect(getter).not.toHaveBeenCalled()
    const cycle: {self?: object} = {}
    cycle.self = cycle
    expect(() => tree.parse(cycle)).toThrow('cyclic_response')
    expect(() => tree.parse({date: new Date()})).toThrow('invalid_response_type')
    const bounded = new ErrorsSchema({
      kind: 'adapter', limits: {maxErrors: 2},
      mapping: new ErrorsMapping({fallback: () => null}),
      *extract() { while (true) yield {path: [], code: 'drop'} },
    })
    expect(() => bounded.parse({})).toThrow('limit_exceeded')
    expect(() => new ErrorsSchema({kind: 'tree', leaf, limits: {maxBytes: 8388609}})).toThrow('invalid_schema_limits')
  })

  it('guards node mutations in trusted extraction callbacks and recovers', () => {
    const field = new Field(StringType, 'old')
    const schema = new ErrorsSchema({
      kind: 'adapter',
      *extract() { yield {path: [], code: 'first'}; field.rawValue = 'bad' },
    })
    expect(() => schema.parse({})).toThrow(ValidationMutationError)
    expect(field.rawValue).toBe('old')
    field.rawValue = 'after'
    expect(field.rawValue).toBe('after')
  })
})

describe('V3 mapping composition', () => {
  it('runs scoped transforms before static/dynamic/fallback selection and retains duplicate targets', () => {
    const first = vi.fn((error: {readonly code: string}) => ({code: error.code + '.left'}))
    const second = vi.fn((error: {readonly code: string}) => ({code: error.code + '.right'}))
    const regex = /^x(\d)$/g
    regex.lastIndex = 8
    const map = new ErrorsMapping({
      transform: [first],
      mappings: [{kind: 'static', from: ['single'], to: ['slot']},
        {kind: 'dynamic', pattern: regex, key: path => path.join('.'), to: match => ['slot', Number(match[1])]}],
    }).merge(new ErrorsMapping({transform: [second], fallback: () => null}))
    const schema = records(map)
    const batch = schema.parse([
      {path: ['x1'], code: 'A'}, {path: ['x1'], code: 'A'}, {path: ['single'], code: 'B'}, {path: ['missing'], code: 'C'},
    ], {trace: true})
    expect(batch.entries.map(entry => [entry.path, entry.error.code])).toEqual([
      [['slot', 1], 'A.left.right'], [['slot', 1], 'A.left.right'], [['slot'], 'B.left.right'],
    ])
    expect(first).toHaveBeenCalledTimes(4)
    expect(second.mock.calls[0][0]).toEqual({code: 'A.left'})
    expect(batch.trace?.map(row => row.matchedBy)).toEqual(['dynamic', 'dynamic', 'static', 'fallback'])
    expect(regex.lastIndex).toBe(8)
  })

  it('preserves local paths, array globals, literal names and dropped scope trace', () => {
    const index = vi.fn((value: string | number) => typeof value === 'string' ? Number(value.slice(1)) : value)
    const input = ErrorsMapping.fromObject({'a.b': ['email'], global: []})
    const wrapped = ErrorsMapping.forArray(input.nest({sourcePrefix: ['row']}), {
      sourcePrefix: ['users'], targetPrefix: ['rows'], index,
    })
    const schema = records(wrapped.clone())
    const batch = schema.parse([
      {path: ['users', 'x2', 'row', 'a.b'], code: 'error'},
      {path: ['users', 3, 'row', 'global'], code: 'error'},
      {path: ['other'], code: 'error'},
    ], {trace: true})
    expect(batch.entries.map(entry => entry.path)).toEqual([['rows', 2, 'email'], ['rows', 3]])
    expect(index.mock.calls).toEqual([['x2'], [3]])
    expect(batch.trace?.[2]).toEqual({index: 2, from: ['other'], to: null, matchedBy: 'scope'})
  })

  it('diagnoses static and fallback conflicts without executing callbacks and supports precedence', () => {
    const left = ErrorsMapping.forArray(ErrorsMapping.fromObject({email: ['left']}), {sourcePrefix: ['rows']})
    const right = new ErrorsMapping({mappings: [{kind: 'static', from: ['rows', 1, 'email'], to: ['right']}]})
    expect(() => left.merge(right)).toThrow('static_mapping_conflict')
    const schema = records(left.merge(right, {staticConflict: 'right'}))
    expect(schema.parse([
      {path: ['rows', 1, 'email'], code: 'error'}, {path: ['rows', 2, 'email'], code: 'error'},
    ]).entries.map(entry => entry.path)).toEqual([['right'], ['rows', 2, 'left']])
    const fallback = vi.fn(() => ['fallback'])
    const a = new ErrorsMapping({fallback})
    const b = new ErrorsMapping({fallback: () => null}).nest({sourcePrefix: ['a']})
    expect(() => a.merge(b)).toThrow('fallback_mapping_conflict')
    expect(fallback).not.toHaveBeenCalled()
    expect(records(a.merge(b, {fallbackConflict: 'right'})).parse([
      {path: ['a'], code: 'drop'}, {path: ['b'], code: 'stay'},
    ]).entries.map(entry => entry.path)).toEqual([['fallback']])
  })
})
