import {performance} from 'node:perf_hooks'
import {cpus, platform, release, arch} from 'node:os'
import {execFileSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {ArrayField, ArrayFormField, Field, Form, StringType} from '../dist/index.mjs'

// No dependencies, validators, random input, UI or concurrent benchmark workers.
// Each operation is timed separately so fixture preparation is excluded.
const samples = 7
const warmup = 5
const targetMs = 25
let sink
function flat(size) {
  class Flat extends Form {}
  const form = new Flat()
  for (let i = 0; i < size; i++) form[`f${i}`] = new Field(StringType, 'initial')
  return form
}
// Explicit chain construction avoids copying private state stores between Forms.
function chain(depth) {
  let Constructor = class extends Form {
    value = new Field(StringType, 'initial')
    tags = new ArrayField(value => new Field(StringType, value), {}, ['a', 'b'])
  }
  for (let i = 0; i < depth; i++) {
    const Child = Constructor
    Constructor = class extends Form { rows = new ArrayFormField(Child, {}, [{}]) }
  }
  const form = new Constructor()
  let leaf = form
  for (let i = 0; i < depth; i++) leaf = leaf.rows.forms[0]
  return {form, leaf}
}
function median(values) { return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] }
function measure(name, setup, operation, cleanup = () => {}) {
  function once() {
    const fixture = setup()
    const start = performance.now()
    sink = operation(fixture)
    const elapsed = performance.now() - start
    cleanup(fixture)
    return elapsed
  }
  const warmed = Array.from({length: warmup}, once)
  const iterations = Math.max(1, Math.min(100, Math.ceil(targetMs / Math.max(median(warmed), 0.01))))
  const values = []
  for (let sample = 0; sample < samples; sample++) {
    let elapsed = 0
    for (let i = 0; i < iterations; i++) elapsed += once()
    values.push(elapsed / iterations)
  }
  const result = {name, iterations, samples, medianMs: median(values), minMs: Math.min(...values), maxMs: Math.max(...values)}
  results.push(result)
  process.stderr.write(`${name}: ${result.medianMs.toFixed(4)} ms/op\n`)
}
const results = []
for (const size of [10, 100, 1000]) {
  measure(`flat/${size}/create`, () => size, flat)
  measure(`flat/${size}/firstSnapshot`, () => flat(size), form => form.getSnapshot())
  const form = flat(size)
  form.getSnapshot()
  measure(`flat/${size}/unchangedSnapshot`, () => form, form => form.getSnapshot())
  let sequence = 0
  measure(`flat/${size}/oneField`, () => form, form => form.f0.setRawValue(String(sequence++), false))
  measure(`flat/${size}/batch10`, () => form, form => form.batch(() => {
    for (let i = 0; i < Math.min(10, size); i++) form[`f${i}`].setRawValue(String(sequence++), false)
  }))
  for (const listeners of [1, 10, 100]) {
    for (const readSnapshot of [false, true]) {
      const observed = flat(size)
      const off = Array.from({length: listeners}, () => observed.subscribe(() => {
        if (readSnapshot) sink = observed.getSnapshot()
      }))
      measure(`flat/${size}/notify${listeners}/${readSnapshot ? 'read' : 'empty'}`, () => observed,
        form => form.f0.setRawValue(String(sequence++), false))
      off.forEach(unsubscribe => unsubscribe())
    }
  }
}
for (const size of [10, 100, 1000]) {
  class Row extends Form { value = new Field(StringType, 'initial') }
  for (const kind of ['fields', 'forms']) {
    const collection = kind === 'fields'
      ? new ArrayField(value => new Field(StringType, value), {}, Array(size).fill('initial'))
      : new ArrayFormField(Row, {}, Array.from({length: size}, () => ({value: 'initial'})))
    const off = collection.subscribe(() => {})
    measure(`collection/${kind}/${size}/addRemove`, () => collection, collection => {
      collection.add(kind === 'fields' ? 'added' : {value: 'added'}, false)
      collection.remove(size)
    })
    off()
  }
}
for (const depth of [0, 1, 3, 5]) {
  measure(`depth/${depth}/create`, () => depth, depth => chain(depth))
  measure(`depth/${depth}/firstSnapshot`, () => chain(depth), ({form}) => form.getSnapshot())
  const fixture = chain(depth)
  const off = fixture.form.subscribe(() => {})
  let sequence = 0
  measure(`depth/${depth}/leafChange`, () => fixture, ({leaf}) => leaf.value.setRawValue(String(sequence++), false))
  off()
}
const memory = {available: typeof global.gc === 'function', rounds: []}
if (memory.available) {
  // Keep workload fixed; collect after all local model and unsubscribe references die.
  function workload() {
    for (let i = 0; i < 200; i++) {
      const {form, leaf} = chain(2)
      const off = form.subscribe(() => {})
      const child = leaf.tags.add('transient', false)
      leaf.tags.remove(2)
      child.setRawValue('detached', false)
      off()
    }
  }
  workload()
  sink = undefined
  for (let round = 0; round < 6; round++) {
    if (round) workload()
    global.gc(); global.gc()
    memory.rounds.push({round, heapUsed: process.memoryUsage().heapUsed})
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  environment: {node: process.version, v8: process.versions.v8, platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, cpus: cpus().length},
  harness: {warmup, samples, targetMs, maxIterations: 100, timer: 'performance.now; fixture preparation and cleanup excluded; per-operation timing overhead included'},
  results, memory,
}
const json = JSON.stringify(report, null, 2) + '\n'
if (process.argv[2]) writeFileSync(process.argv[2], json)
else process.stdout.write(json)
