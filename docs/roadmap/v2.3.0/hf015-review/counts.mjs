import {writeFileSync} from 'node:fs'
const reports = []
for (const [name, path] of [['master', '../../../../work/master/dist/index.mjs'], ['prHead', '../../../../work/pr-head/dist/index.mjs'], ['fixed', '../../../../dist/index.mjs']]) {
  const {Field, Form, StringType} = await import(path)
  class Root extends Form {}
  const form = new Root()
  let validators = 0, notifications = 0
  for (let i = 0; i < 1000; i++) form[`f${i}`] = new Field(StringType, 'x', {validate: () => { validators++; return true }})
  const off = form.subscribe(() => notifications++)
  const operations = []
  for (const [operation, run] of [
    ['unchangedSnapshot3', () => {for (let i = 0; i < 3; i++) form.getSnapshot()}],
    ['write1', () => {form.f0.rawValue = 'one'}],
    ['batch10', () => form.batch(() => {for (let i = 0; i < 10; i++) form[`f${i}`].rawValue = 'batch'})],
  ]) {
    validators = 0; notifications = 0; run()
    operations.push({operation, validators, notifications})
  }
  off()
  reports.push({name, fields: 1000, operations})
}
writeFileSync('work/review-counts.json', JSON.stringify(reports, null, 2)+'\n')
if (reports.some(report => JSON.stringify(report.operations) !== JSON.stringify(reports[0].operations))) throw new Error('Count regression')
