import {describe, expect, expectTypeOf, it} from 'vitest'
import {ArrayField, ArrayFormField, Field, Form, NumberType, StringType, type FormFieldsValue} from '../../src'

class Leaf extends Form {
  label = new Field(StringType)
  count = new Field(NumberType)
  metadata = 'not a field'
}
class Branch extends Form {
  title = new Field(StringType)
  tags = new ArrayField((value?: string) => new Field(StringType, value))
  leaves = new ArrayFormField(Leaf)
}
class Root extends Form {
  branches = new ArrayFormField(Branch)
}
class Recursive extends Form {
  label = new Field(StringType)
  children: ArrayFormField<Recursive> = new ArrayFormField(Recursive)
}

describe('Form value type contracts', () => {
  it('infers scalar, array and nested values without expanding Form members', () => {
    const form = new Root()
    const values = form.fieldsValue
    expectTypeOf(values).toEqualTypeOf<{branches: {
      title: string | null
      tags: (string | null)[]
      leaves: {label: string | null; count: number | null}[]
    }[]}>()
    expectTypeOf<FormFieldsValue<Leaf>>().toEqualTypeOf<{label: string | null; count: number | null}>()
    expectTypeOf(new Leaf().label.valueClear).toEqualTypeOf<string | null>()
    expectTypeOf(new Leaf().count.valueClear).toEqualTypeOf<number | null>()
    expect(values).toEqual({branches: []})
  })

  it('supports finite access into a recursive collection model', () => {
    const form = new Recursive()
    const values = form.fieldsValue
    expectTypeOf<(typeof values)['children'][number]['children'][number]['label']>().toEqualTypeOf<string | null>()
    expect(values).toEqual({label: null, children: []})
  })
})

// Compile-time negative cases must never execute.
function rejectedContracts(field: Field<string>, form: Leaf) {
  // @ts-expect-error A validation context must remain a real Form.
  field.checkValid({label: {valueClear: 'fake'}})
  // @ts-expect-error Clean numeric values must not widen to strings or any.
  const invalid: string | null = form.count.valueClear
  // @ts-expect-error Synchronous validators do not accept async callbacks.
  new Field(StringType, null, {validate: async () => true})
  // @ts-expect-error Non-field properties are not serialized field values.
  void form.fieldsValue.metadata
  return invalid
}
void rejectedContracts
