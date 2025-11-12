import {FormField} from "./FormField"

export abstract class Form<TFields extends Record<string, any> = any> {
  private readonly _errors: Record<string, string | null> = {}

  protected get declaredFields(): (keyof TFields)[] {
    return Object.keys(this).filter(
      key => (this as any)[key] instanceof FormField
    ) as (keyof TFields)[]
  }

  checkValid(): boolean {
    let isValid = true

    for (const key of this.declaredFields) {
      const field = (this as any)[key]
      if (field instanceof FormField) {
        field.checkValid()
        if (field.isValid === false || (field.isValid === null && field.isRequired)) {
          isValid = false
        }
      }
    }

    return isValid
  }

  get valueObject(): Record<keyof TFields, any> {
    const result = {} as Record<keyof TFields, any>
    for (const key of this.declaredFields) {
      const field = (this as any)[key]
      result[key] = field instanceof FormField ? field.valueClear : field
    }
    return result
  }

  get valueArray(): any[] {
    return this.declaredFields.map(key => {
      const field = (this as any)[key]
      return field instanceof FormField ? field.valueClear : field
    })
  }

  get errors() {
    return this._errors
  }

  set errors(errors: Record<string, any>) {
    for (const key in errors) {
      const field = (this as any)[key]
      if (field instanceof FormField) {
        field.error = errors[key]
      } else {
        this._errors[key] = errors[key]
      }
    }
  }

  set fields(values: Partial<Record<keyof TFields, any>>) {
    for (const key in values) {
      if (!this.declaredFields.includes(key as keyof TFields)) {
        throw new Error(
          `Field "${key}" is not declared in form "${this.constructor.name}"`
        )
      }

      const field = (this as any)[key]
      const value = values[key]

      if (field instanceof FormField) {
        field.value = value
      } else {
        (this as any)[key] = value
      }
    }
  }

  setFieldValue<K extends keyof TFields>(key: K, value: any) {
    const field = (this as any)[key]
    if (field instanceof FormField) {
      field.value = value
    } else {
      (this as any)[key] = value
    }
  }

  getFieldValue<K extends keyof TFields>(key: K): any {
    const field = (this as any)[key]
    return field instanceof FormField ? field.valueClear : field
  }

  reset(): this {
    for (const key of this.declaredFields) {
      const field = (this as any)[key]
      if (field instanceof FormField) field.reset()
    }
    for (const key of Object.keys(this._errors)) delete this._errors[key]
    return this
  }
}
