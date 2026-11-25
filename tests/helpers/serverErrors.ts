import {
  ArrayField, ArrayFormField, ErrorsSchema, Field, Form,
  type ServerErrorInput, type ValidationErrorInput, type ValidationPath,
} from '../../src'

const schema = new ErrorsSchema<readonly ServerErrorInput[]>({kind: 'adapter', extract: errors => errors})

/** Attach standalone test fixtures when the production API requires a Form owner. */
export function installServerErrors(node: object, errors: readonly ValidationErrorInput[]): void {
  let form: Form
  let scope: ValidationPath
  if (node instanceof Form) {
    form = node
    scope = []
  } else {
    if (!(node instanceof Field || node instanceof ArrayField || node instanceof ArrayFormField)) throw new TypeError('Expected an error node')
    class Fixture extends Form {
      target = node as Field | ArrayField | ArrayFormField
    }
    form = new Fixture()
    scope = ['target']
  }
  const batch = schema.parse(errors.map(error => ({...error, path: scope})))
  form.applyServerErrors(batch, {operation: form.beginServerErrorOperation({scope})})
}
