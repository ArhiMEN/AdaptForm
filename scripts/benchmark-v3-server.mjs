import {strict as assert} from 'node:assert'
import {writeFileSync} from 'node:fs'
import {cpus} from 'node:os'
import {performance} from 'node:perf_hooks'
import {ArrayFormField, ErrorsMapping, ErrorsSchema, Field, Form, StringType} from '../dist/index.mjs'

const destination = process.argv[2]
if (!destination || !global.gc) throw new Error('Run with node --expose-gc and supply a report destination')
const samples = 7
const warmup = 5
const median = values => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)]
const metrics = times => ({medianMs: median(times), minMs: Math.min(...times), maxMs: Math.max(...times)})
const heap = () => { global.gc(); global.gc(); return process.memoryUsage().heapUsed }
const parseSchema = mapping => new ErrorsSchema({
  kind: 'records', path: {at: ['path']}, code: {at: ['code']}, params: {at: ['params']}, mapping,
})

function flat(size) {
  class Flat extends Form {}
  const form = new Flat()
  for (let index = 0; index < size; index++) form[`f${index}`] = new Field(StringType, 'value')
  return form
}

function nested(depth) {
  let Type = class extends Form { label = new Field(StringType, 'value') }
  for (let level = 0; level < depth; level++) {
    const Row = Type
    Type = class extends Form { rows = new ArrayFormField(Row, {}, [{}]) }
  }
  return new Type()
}

function scenario(name, form, schema, createItems, count) {
  let notifications = 0
  const off = form.subscribe(() => { notifications++ })
  const begin = [], parse = [], apply = []
  for (let index = 0; index < warmup + samples; index++) {
    const items = createItems(index)
    const start = performance.now()
    const operation = form.beginServerErrorOperation()
    const started = performance.now()
    const batch = schema.parse(items)
    const parsed = performance.now()
    const result = form.applyServerErrors(batch, {operation})
    const finished = performance.now()
    assert.equal(result.applied, count)
    assert.equal(result.notification.status, 'delivered')
    if (index >= warmup) {
      begin.push(started - start)
      parse.push(parsed - started)
      apply.push(finished - parsed)
    }
  }
  assert.equal(notifications, warmup + samples)
  off()
  return {name, count, begin: metrics(begin), parse: metrics(parse), apply: metrics(apply)}
}

const fill = (count, path) => revision => Array.from({length: count}, (_, index) => ({
  path: path(index), code: `issue.${revision}`, params: {index},
}))

const cases = [
  scenario('single/500', flat(1000), parseSchema(), fill(500, () => ['f0']), 500),
  scenario('single/5000', flat(1000), parseSchema(), fill(5000, () => ['f0']), 5000),
  scenario('many/1000', flat(1000), parseSchema(), fill(1000, index => [`f${index}`]), 1000),
  scenario('mapped/1000', flat(1000), parseSchema(ErrorsMapping.fromObject(
    Object.fromEntries(Array.from({length: 1000}, (_, index) => [`remote${index}`, [`f${index}`]])))),
  fill(1000, index => [`remote${index}`]), 1000),
  scenario('depth/5', nested(5), parseSchema(), fill(100, () => [
    ...Array.from({length: 5}, () => ['rows', 0]).flat(), 'label',
  ]), 100),
]

const tokens = flat(100)
const baseline = heap()
const retained = []
for (let index = 0; index < 1000; index++) {
  retained.push(tokens.beginServerErrorOperation({scope: [`f${index % 100}`]}))
}
const withTokens = heap()
retained.length = 0
const afterRelease = heap()
const report = {
  node: process.version, cpu: cpus()[0]?.model, samples, warmup, cases,
  tokens: {issued: 1000, distinctScopes: 100, baseline, withTokens, afterRelease},
}
writeFileSync(destination, JSON.stringify(report, null, 2) + '\n')
