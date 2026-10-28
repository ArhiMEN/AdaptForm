import {performance} from 'node:perf_hooks'
import {cpus} from 'node:os'
import {writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

// Compare two built cores in one process, alternating order to reduce host drift.
// Run manually; timings are evidence, never a CI pass/fail threshold.
const baselinePath = resolve(process.argv[2])
const currentPath = resolve('dist/index.mjs')
const libraries = [await import(pathToFileURL(baselinePath)), await import(pathToFileURL(currentPath))]
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const samples = 9
const iterations = 20
const results = []
let sink
for (const operation of ['unchangedSnapshot', 'observedWrite', 'batch10', 'fieldAddRemove', 'formAddRemove']) {
  const fixtures = libraries.map(({ArrayField, ArrayFormField, Field, Form, StringType}) => {
    class Row extends Form { value = new Field(StringType, 'initial') }
    let sequence = 0
    if (operation.endsWith('AddRemove')) {
      const collection = operation === 'fieldAddRemove'
        ? new ArrayField(value => new Field(StringType, value), {}, Array(1000).fill('initial'))
        : new ArrayFormField(Row, {}, Array.from({length: 1000}, () => ({value: 'initial'})))
      const off = collection.subscribe(() => {})
      return {off, run: () => { collection.add(operation === 'fieldAddRemove' ? 'added' : {value: 'added'}, false); collection.remove(1000) }}
    }
    class Flat extends Form {}
    const form = new Flat()
    for (let i = 0; i < 1000; i++) form[`f${i}`] = new Field(StringType, 'initial')
    const off = operation === 'unchangedSnapshot' ? () => {} : form.subscribe(() => {})
    form.getSnapshot()
    return {off, run: () => {
      if (operation === 'unchangedSnapshot') sink = form.getSnapshot()
      else if (operation === 'observedWrite') form.f0.setRawValue(String(sequence++), false)
      else form.batch(() => {
        for (let i = 0; i < 10; i++) form[`f${i}`].setRawValue(String(sequence++), false)
      })
    }}
  })
  for (let warmup = 0; warmup < 20; warmup++) fixtures.forEach(fixture => fixture.run())
  const timings = [[], []]
  for (let sample = 0; sample < samples; sample++) {
    for (const index of sample % 2 ? [1, 0] : [0, 1]) {
      const start = performance.now()
      for (let iteration = 0; iteration < iterations; iteration++) fixtures[index].run()
      timings[index].push((performance.now() - start) / iterations)
    }
  }
  fixtures.forEach(fixture => fixture.off())
  const medians = timings.map(median)
  results.push({operation, baselineMs: medians[0], currentMs: medians[1], ratio: medians[1] / medians[0], samplesMs: timings})
  process.stderr.write(`${operation}: ${medians[0].toFixed(4)} -> ${medians[1].toFixed(4)} ms\n`)
}
void sink
const report = {generatedAt: new Date().toISOString(), node: process.version, cpu: cpus()[0]?.model,
  samples, iterations, fields: 1000, warmup: 20, results}
writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n')
