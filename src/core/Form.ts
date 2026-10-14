import {Field} from "@core/fields/Field"
import {ArrayField} from "@core/fields/ArrayField"
import {ArrayFormField} from "@core/fields/ArrayFormField"
import {DefaultErrorsSchema, ErrorsSchema} from "@core/ErrorsShema"

export type FormFieldValue<TField> =
  TField extends Field<infer TValue, infer _Options> ? TValue | null :
  TField extends ArrayField<infer TValue> ? (TValue | null)[] :
  TField extends ArrayFormField<infer TForm>
    ? TForm extends Form ? FormFieldsValue<TForm>[] : unknown[]
    : never

export type FormFieldsValue<TForm extends Form> = {
  [K in keyof TForm as TForm[K] extends
    | Field<infer _Value, infer _Options>
    | ArrayField<infer _ArrayValue>
    | ArrayFormField<infer _NestedForm>
    ? K
    : never]: FormFieldValue<TForm[K]>
}

export abstract class Form {
  private _globalErrors: Record<string, string> = {}
  errorsShema: ErrorsSchema = DefaultErrorsSchema

  protected get _fields(): Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>> {
    const fields: Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>> = {}

    for (const key of Object.keys(this)) {
      const property = (this as any)[key]
      if (property instanceof Field || property instanceof ArrayField || property instanceof ArrayFormField) {
        fields[key] = property
      }
    }

    return fields
  }

  checkValid(form?: this): boolean {
    let isFormValid = true
    const fields = this._fields

    for (const key of Object.keys(fields)) {
      const field = fields[key]
      if (!field.checkAndSetValid(form ?? this)) {
        isFormValid = false
      }
    }

    return isFormValid && Object.keys(this._globalErrors).length === 0
  }

  get fieldsValue(): FormFieldsValue<this> {
    const data: Record<string, unknown> = {}
    const fields = this._fields

    for (const key of Object.keys(fields)) {
      let valueClear = null
      const field = fields[key]
      if (field instanceof Field) valueClear = field.valueClear
      else if (field instanceof ArrayField) valueClear = field.itemsValue
      else if (field instanceof ArrayFormField) valueClear = field.formsFieldsValue
      else console.error(`Invalid field "${key}" type`)
      data[key] = valueClear
    }

    return data as FormFieldsValue<this>
  }

  set fields(data: Record<string, unknown>) {
    this.setFields(data)
  }

  setFields(data: Record<string, unknown>, validate: boolean = true): void {
    const fields = this._fields

    for (const key of Object.keys(data)) {
      const field = fields[key]
      if (field) {
        if (field instanceof Field) field.setRawValue(data[key], false)
        else if (field instanceof ArrayField) field.itemsValue = data[key] as any[]
        else if (field instanceof ArrayFormField) field.setForms(data[key] as unknown[], false)
        else console.error(`Invalid field "${key}" type`)
      }
    }

    // Validate after assignment so conditional rules see the complete form.
    if (validate) this.checkValid()
  }

  get allErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {}
    const fields = this._fields

    for (const key of Object.keys(fields)) {
      const field = fields[key]

      if (field instanceof ArrayFormField) {
        // Collect errors from all nested forms in an ArrayFormField.
        const formErrors = this.collectArrayFormErrors(field)
        if (formErrors.length > 0) {
          errors[key] = formErrors
        }
      } else {
        // Use the field's own errors for Field and ArrayField.
        const fieldErrors = field.errors
        if (fieldErrors.length > 0) {
          errors[key] = fieldErrors
        }
      }
    }

    // Add global errors.
    for (const key of Object.keys(this._globalErrors)) {
      if (!errors[key]) {
        errors[key] = []
      }
      errors[key].push(this._globalErrors[key])
    }

    return errors
  }

  /**
   * Recursively collect all errors from an ArrayFormField.
   */
  private collectArrayFormErrors(arrayField: ArrayFormField): string[] {
    const allErrors: string[] = []

    // Include errors from the ArrayFormField itself.
    allErrors.push(...arrayField.errors)

    // Include errors from each form in the array.
    for (let i = 0; i < arrayField.forms.length; i++) {
      const form = arrayField.forms[i]
      const formAllErrors = form.allErrors

      for (const [fieldName, fieldErrors] of Object.entries(formAllErrors)) {
        for (const error of fieldErrors) {
          allErrors.push(`Форма ${i + 1}, ${fieldName}: ${error}`)
        }
      }
    }

    return allErrors
  }

  get globalErrors(): Record<string, string> {
    return {...this._globalErrors}
  }

  set errors(errors: Record<string, unknown>) {
    this.clearErrorsRecursively()
    const fields = this._fields

    // Parse errors using the configured schema.
    const parsedErrors = this.errorsShema.parseErrors(errors)

    // Apply the parsed errors.
    for (const [fieldName, errorMessage] of Object.entries(parsedErrors)) {
      this.applyErrorToField(fieldName, errorMessage, fields, this)
    }
  }

  private clearErrorsRecursively(): void {
    this._globalErrors = {}

    for (const field of Object.values(this._fields)) {
      if (field instanceof Field) {
        field.error = null
      } else if (field instanceof ArrayField) {
        field.error = null
        for (const item of field.items) item.error = null
      } else if (field instanceof ArrayFormField) {
        field.error = null
        for (const nestedForm of field.forms) nestedForm.clearErrorsRecursively()
      }
    }
  }

  /**
   * Apply an error to the corresponding field.
   * Supports nested fields using dot notation.
   */
  private applyErrorToField(
    fieldPath: string,
    errorMessage: string,
    fields: Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>>,
    targetForm: Form
  ): void {
    // Guard against an undefined target form.
    if (!targetForm) {
      console.error('applyErrorToField: targetForm is undefined')
      return
    }

    // Check for a direct field match first.
    if (fieldPath in fields && fields[fieldPath]) {
      fields[fieldPath].error = errorMessage
      return
    }

    // If no direct match exists, interpret the key as a nested path.
    const parts = fieldPath.split('.')
    const rootField = parts[0]

    if (rootField in fields && fields[rootField]) {
      const field = fields[rootField]

      if (parts.length === 1) {
        field.error = errorMessage
      } else if (parts.length > 1) {
        this.applyNestedError(field, parts.slice(1), errorMessage, fieldPath, targetForm)
      }
    } else {
      // If the field is not found, add the error to the target form's global errors.
      targetForm.setGlobalError(fieldPath, errorMessage)
    }
  }

  private applyNestedError(
    field: Field<any> | ArrayField<any> | ArrayFormField<any>,
    pathParts: string[],
    errorMessage: string,
    fullPath: string,
    targetForm: Form
  ): void {
    // Guard against an undefined target form.
    if (!targetForm) {
      console.error('applyNestedError: targetForm is undefined')
      return
    }

    const [currentPart, ...remainingParts] = pathParts

    // Handle ArrayFormField (an array of forms).
    if (field instanceof ArrayFormField) {
      const index = parseInt(currentPart)
      if (!isNaN(index) && index >= 0 && index < field.forms.length) {
        const form = field.forms[index]
        if (remainingParts.length > 0) {
          // Recursively apply the error to a field inside the form.
          const formFields = form['_fields']
          // Use the nested form as the target for global errors.
          this.applyErrorToField(remainingParts.join('.'), errorMessage, formFields, form)
        } else {
          // If the path specifies an index without a field,
          // add it as a global form error.
          form.setGlobalError(`index_${index}`, errorMessage)
        }
      } else {
        // If the index is out of range, add a global error to the target form.
        targetForm.setGlobalError(fullPath, errorMessage)
      }
    }
    // For ArrayField and Field, add the error to the target form's global errors.
    else {
      targetForm.setGlobalError(fullPath, errorMessage)
    }
  }

  setGlobalError(key: string, message: string): void {
    this._globalErrors[key] = message
  }

  clearGlobalErrors(): void {
    this._globalErrors = {}
  }

  reset(): void {
    const fields = this._fields
    for (const key of Object.keys(fields)) {
      fields[key].reset()
    }
    this._globalErrors = {}
  }

  get isTouched(): boolean {
    const fields = this._fields
    for (const key of Object.keys(fields)) {
      if (fields[key].isTouched) return true
    }
    return false
  }

  // Check whether the form is valid.
  get isValid(): boolean {
    const fields = this._fields
    for (const key of Object.keys(fields)) {
      if (fields[key].isValid !== true) return false
    }
    return Object.keys(this._globalErrors).length === 0
  }

  // Serialize form values for multipart requests.
  toFormData(): FormData {
    const formData = new FormData()
    const data = this.fieldsValue

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue

      if (typeof Blob !== 'undefined' && value instanceof Blob) {
        formData.append(key, value)
      } else if (value instanceof Date) {
        formData.append(key, value.toISOString())
      } else if (typeof value === 'object') {
        // Encode collections and nested objects as JSON instead of lossy String(value).
        const serialized = JSON.stringify(value)
        if (serialized !== undefined) formData.append(key, serialized)
      } else {
        formData.append(key, String(value))
      }
    }

    return formData
  }

  // Get all values in JSON-compatible form.
  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(this.fieldsValue)) {
      json[key] = this.serializeJsonValue(value)
    }

    return json
  }

  private serializeJsonValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString()
    }

    if (Array.isArray(value)) {
      return value.map(item => this.serializeJsonValue(item))
    }

    if (value !== null && typeof value === 'object') {
      const prototype = Object.getPrototypeOf(value)
      if (prototype === Object.prototype || prototype === null) {
        return Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [key, this.serializeJsonValue(nestedValue)])
        )
      }
    }

    return value
  }
}