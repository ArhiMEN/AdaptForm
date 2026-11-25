import {describe, expect, it, vi} from 'vitest'
import * as adaptform from '../../src'
import {ErrorsMapping, ErrorsSchema, type ValidationErrorInput, type ValidationPath} from '../../src'

const message = (value: unknown): readonly ValidationErrorInput[] | undefined => {
  if (value === null) return []
  if (typeof value === 'string') return [{code: 'app.server', message: value}]
  return undefined
}

const schema = (mapping?: ErrorsMapping) => new ErrorsSchema({kind: 'tree', leaf: message, mapping})

describe('ErrorsSchema public migration', () => {
  it('exports only the configured parser and mapping program', () => {
    expect(adaptform.ErrorsSchema).toBe(ErrorsSchema)
    expect(adaptform.ErrorsMapping).toBe(ErrorsMapping)
    expect('DefaultErrorsSchema' in adaptform).toBe(false)
    const parser = schema()
    for (const method of ['parseErrors', 'parseErrorsDetailed', 'parseValidationErrors', 'staticKey', 'transformValue']) {
      expect(method in parser).toBe(false)
    }
    expect('parse' in new ErrorsMapping({})).toBe(false)
  })

  it('applies static precedence and stops at a declining rule', () => {
    const dynamic = vi.fn(() => ['dynamic'])
    const fallback = vi.fn(() => ['fallback'])
    const mapped = schema(new ErrorsMapping({
      mappings: [
        {kind: 'static', from: ['email'], to: error => error.message === 'drop' ? null : ['account', 'email']},
        {kind: 'dynamic', pattern: /^email/, key: path => String(path[0]), to: dynamic},
      ],
      fallback,
    }))
    const success = mapped.parse({email: 'taken'})
    expect(success.entries[0].path).toEqual(['account', 'email'])
    expect(mapped.parse({email: 'drop'}).entries).toEqual([])
    expect(dynamic).not.toHaveBeenCalled()
    expect(fallback).not.toHaveBeenCalled()
    expect(mapped.parse({other: 'missing'}).entries[0].path).toEqual(['fallback'])
    expect(fallback).toHaveBeenCalledExactlyOnceWith({path: ['other'], code: 'app.server', message: 'missing'})
  })

  it('keeps regex priorities and registration order through merge, with detached configuration', () => {
    const from: string[] = ['literal']
    const to: string[] = ['stable']
    const left = new ErrorsMapping({mappings: [
      {kind: 'static', from, to},
      {kind: 'dynamic', pattern: /^id\.(.*)$/y, key: path => String(path[0]), to: match => ['left', match[1]], priority: 5},
    ]})
    from.push('changed')
    to[0] = 'changed'
    const right = new ErrorsMapping({mappings: [
      {kind: 'dynamic', pattern: /^id\.(.*)$/, key: path => String(path[0]), to: () => ['right'], priority: 5},
      {kind: 'dynamic', pattern: /^id\.special$/, key: path => String(path[0]), to: () => [], priority: 10},
    ]})
    const mapped = schema(left.clone().merge(right))
    expect(mapped.parse({literal: 'static', 'id.normal': 'tie', 'id.special': 'priority'}).entries.map(entry => entry.path))
      .toEqual([['stable'], ['left', 'normal'], []])
  })

  it('passes leaf-level conversions into scoped mapping callbacks', () => {
    const nested = new ErrorsMapping({fallback: error => error.message === 'SERVER' ? ['global'] : null})
      .nest({sourcePrefix: ['response'], targetPrefix: ['form']})
    const adapter = new ErrorsSchema<{response: Record<string, string[]>}>({
      kind: 'adapter',
      mapping: nested,
      extract: response => Object.entries(response.response).map(([key, values]) => ({
        path: ['response', key], code: 'custom', message: values.join(',').toUpperCase(),
      })),
    })
    expect(adapter.parse({response: {key: ['server']}}).entries[0])
      .toEqual({path: ['form', 'global'], error: {code: 'custom', source: 'server', message: 'SERVER'}})
  })

  it('uses explicit codecs for bracket and dotted paths or keeps literal keys', () => {
    const mapping = ErrorsMapping.forArray(ErrorsMapping.fromObject({answer_text: ['text']}), {
      sourcePrefix: ['questions'], targetPrefix: ['answers'],
    })
    const coded = new ErrorsSchema({
      kind: 'tree', mapping, leaf: message,
      decodeKey: key => {
        const match = /^questions(?:\[(\d+)\]|\.(\d+))\.(.+)$/.exec(key)
        return match ? ['questions', Number(match[1] ?? match[2]), match[3]] : [key]
      },
    })
    expect(coded.parse({'questions[0].answer_text': 'one', 'questions.1.answer_text': 'two'}).entries.map(entry => entry.path))
      .toEqual([['answers', 0, 'text'], ['answers', 1, 'text']])
    expect(schema().parse({'questions.0.answer_text': 'one'}).entries[0].path).toEqual(['questions.0.answer_text'])
    expect(() => schema(mapping).parse({questions: {'0': {answer_text: 'string index'}}})).toThrow('invalid_index')
  })

  it('accepts adapter-declared backend records and preserves duplicates and order', () => {
    interface Payload { detail: Array<{readonly loc: ValidationPath; readonly msg: string; readonly type: string}> }
    const configured = new ErrorsSchema<Payload>({
      kind: 'records', select: {at: ['detail']}, path: {at: ['loc']}, code: {at: ['type']}, message: {at: ['msg']},
      decodePath: value => ['email', ...(Array.isArray(value) ? value.slice(2) : [])],
    })
    const batch = configured.parse({detail: [
      {loc: ['body', 'email'], msg: 'already used', type: 'taken'},
      {loc: ['body', 'email'], msg: 'try later', type: 'taken'},
    ]}, {trace: true})
    expect(batch.entries.map(entry => [entry.path, entry.error.code, entry.error.message]))
      .toEqual([[['email'], 'taken', 'already used'], [['email'], 'taken', 'try later']])
    expect(batch.trace?.map(entry => entry.index)).toEqual([0, 1])
  })
})

function removedContracts(parser: ErrorsSchema, mapping: ErrorsMapping) {
  // @ts-expect-error The parser requires an explicit extraction config.
  new ErrorsSchema()
  // @ts-expect-error The old string parser was removed.
  parser.parseErrors({})
  // @ts-expect-error Mapping programs do not parse responses.
  mapping.parse({})
  // @ts-expect-error ServerErrorOperation cannot be constructed by a consumer.
  const fake: adaptform.ServerErrorOperation = {}
  return fake
}
void removedContracts
