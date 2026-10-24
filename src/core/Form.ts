import {ErrorState, errorMessage, manualErrorSource, withErrorSource, prefixErrors, validationError, type ValidationError, type ValidationErrorInput, type ValidationPath, type ValidationErrorSource} from './ValidationError'
import {ObservableNode} from "@core/state/ObservableNode"
import {hasStandardGetters, snapshotValue, type FormSnapshot} from "@core/state/snapshot"
import {Field} from "@core/fields/Field"
import {ArrayField} from "@core/fields/ArrayField"
import {ArrayFormField} from "@core/fields/ArrayFormField"
import {DefaultErrorsSchema, ErrorsSchema} from "@core/ErrorsShema"

import {DependencyGraph} from "@core/state/DependencyGraph"
import {assertValidationMutationAllowed} from "@core/state/dependencyScheduling"

export type FormFieldValue<TField> =
  TField extends Field<infer TValue, infer _Options> ? TValue | null :
  TField extends ArrayField<infer TValue> ? (TValue | null)[] :
  TField extends ArrayFormField<infer TForm>
    ? TForm extends Form ? FormFieldsValue<TForm>[] : unknown[]
    : never

// Base members (including fieldsValue itself) cannot be fields. Filter them before
// inspecting their types to avoid recursively expanding the polymorphic this type.
export type FormFieldsValue<TForm extends Form> = {
  [K in keyof TForm as K extends keyof Form ? never : TForm[K] extends
    | Field<infer _Value, infer _Options>
    | ArrayField<infer _ArrayValue>
    | ArrayFormField<infer _NestedForm>
    ? K
    : never]: FormFieldValue<TForm[K]>
}

export abstract class Form extends ObservableNode<FormSnapshot> {
  private _dependencies?: DependencyGraph

  /** Compile explicit dependencies after subclass fields have initialized. */
  enableDependencies(): () => void {
    assertValidationMutationAllowed()
    if (!this._dependencies?.isEnabled) {
      this._dependencies = new DependencyGraph(this, () => this._fields, () => this.dependencyTree(), () => this.update(() => {}))
    }
    return this._dependencies.disable
  }

  protected checkBatchNode(node: ObservableNode<unknown>, check: () => unknown): unknown {
    const field = Object.values(this._fields).find(field => field === node)
    return field ? field.checkAndSetValid(this) : check()
  }

  private _snapshot?: FormSnapshot
  private _snapshotFields?: Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>>

  protected captureState(): FormSnapshot {
    // Reuse field discovery only within this capture. Later reads must still
    // discover arbitrary class-property replacement/addition/removal.
    this._snapshotFields = this._fields
    try {
      const fields = Object.fromEntries(Object.entries(this._fields).map(([key, field]) => [key, field.getSnapshot()]))
      const globalErrors = this.globalErrors
      const validationErrors = this._globalErrorState.getErrors()
      const isValid = this.isValid, isTouched = this.isTouched, isDirty = this.isDirty
      const previous = this._snapshot
      if (previous && this.captureState === Form.prototype.captureState &&
        hasStandardGetters(this, Form.prototype, ['fieldsValue', 'allErrors']) &&
        previous.validationErrors === validationErrors && previous.isValid === isValid && previous.isTouched === isTouched && previous.isDirty === isDirty &&
        Object.keys(fields).length === Object.keys(previous.fields).length &&
        Object.entries(fields).every(([key, field]) => previous.fields[key] === field) &&
        Object.keys(globalErrors).length === Object.keys(previous.globalErrors).length &&
        Object.entries(globalErrors).every(([key, error]) => previous.globalErrors[key] === error) &&
        Object.values(this._snapshotFields).every(field => hasStandardGetters(field,
          field instanceof Field ? Field.prototype : field instanceof ArrayField ? ArrayField.prototype : ArrayFormField.prototype,
          field instanceof Field ? ['valueClear', 'errors'] : ['errors']))) return previous
      return this._snapshot = {fieldsValue: snapshotValue(this.fieldsValue) as FormSnapshot['fieldsValue'],
        allErrors: this.allErrors, globalErrors, validationErrors, fields, isValid, isTouched, isDirty}
    } finally {
      this._snapshotFields = undefined
    }
  }

  protected stateChildren(): readonly ObservableNode<unknown>[] {
    return Object.values(this._fields)
  }

  batch<TResult>(callback: () => TResult & (TResult extends PromiseLike<unknown> ? never : unknown)): TResult {
    return this.batchUpdate(callback, () => this.checkValid())
  }

  private readonly _globalErrorState = new ErrorState()
  private get _globalErrors(): Record<string, string> {
    return Object.fromEntries(this._globalErrorState.getErrors().map(error => [error.path.join('.'), errorMessage(error)]))
  }

  /** All errors in field order, then own global errors; paths are relative to this Form. */
  getErrors(): readonly ValidationError[] {
    return Object.freeze([...Object.entries(this._fields).flatMap(([key, field]) =>
      prefixErrors(field.getErrors(), [key])), ...this._globalErrorState.getErrors()])
  }

  /** Replace server errors using the lossless schema parser, or explicit typed paths. */
  setErrors(errors: Record<string, unknown> | readonly (ValidationErrorInput & {readonly path: ValidationPath})[]): void {
    this.update(() => {
      const parsed = Array.isArray(errors)
        ? errors.map(error => validationError(error, 'server', error.path))
        : this.errorsShema.parseValidationErrors(errors as Record<string, unknown>)
      this.clearErrorsRecursively()
      for (const error of parsed) this.applyValidationError(error, error.path)
    })
  }

  private applyValidationError(error: ValidationError, path: ValidationPath): void {
    const fields = this._fields
    const directKey = path.length === 1 ? String(path[0]) : undefined
    const direct = directKey !== undefined && Object.prototype.hasOwnProperty.call(fields, directKey) ? fields[directKey] : undefined
    if (direct) {
      direct.setErrors([...direct.getOwnErrors(), error], 'server')
      return
    }
    const [key, index, ...rest] = path
    const field = Object.prototype.hasOwnProperty.call(fields, String(key)) ? fields[String(key)] : undefined
    if (field instanceof ArrayFormField && typeof index === 'number' && Number.isInteger(index) && field.forms[index]) {
      const child = field.forms[index]
      if (rest.length) child.applyValidationError(error, rest)
      else child.appendGlobalError(validationError(error, 'server', []))
      return
    }
    if (field instanceof ArrayField && typeof index === 'number' && Number.isInteger(index) && field.items[index] && !rest.length) {
      const item = field.items[index]
      item.setErrors([...item.getErrors(), error], 'server')
      return
    }
    this.appendGlobalError(validationError(error, 'server', path))
  }

  private appendGlobalError(error: ValidationError): void {
    this.update(() => this._globalErrorState.replace([...this._globalErrorState.getErrors(), error]))
  }
  errorsShema: ErrorsSchema = DefaultErrorsSchema

  protected get _fields(): Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>> {
    if (this._snapshotFields) return this._snapshotFields
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
    const check = () => {
      let isFormValid = true
      const fields = this._fields

      for (const key of Object.keys(fields)) {
        const field = fields[key]
        if (!field.checkAndSetValid(form ?? this)) {
          isFormValid = false
        }
      }

      return isFormValid && this._globalErrorState.getErrors().length === 0
    }
    return this.update(() => this._dependencies?.isEnabled ? this._dependencies.check(check) : check())
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
    return this.update(() => {
      const fields = this._fields

      for (const key of Object.keys(data)) {
        const field = fields[key]
        if (field) {
          if (field instanceof Field) field.setRawValue(data[key], false)
          else if (field instanceof ArrayField) field.setItemsValue(data[key] as unknown[], false)
          else if (field instanceof ArrayFormField) field.setForms(data[key] as unknown[], false)
          else console.error(`Invalid field "${key}" type`)
        }
      }

      // Validate after assignment so conditional rules see the complete form.
      if (validate) {
        if (this._dependencies?.isEnabled && this._dependencies.selective) {
          for (const key of Object.keys(data)) {
            const field = fields[key]
            if (field instanceof Field) {
              this._dependencies.request(field)
            } else if (field) {
              // Collection rules remain local and retain their owning Form context.
              this.validateNodeAfterMutation(field, () => field.checkAndSetValid(this))
            }
          }
        } else this.validateAfterMutation(() => this.checkValid())
      }
      })
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
          errors[key] = [...fieldErrors]
        }
      }
    }

    // Add global errors.
    for (const error of this._globalErrorState.getErrors()) {
      const key = error.path.join('.')
      if (!errors[key]) errors[key] = []
      errors[key].push(errorMessage(error))
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
    return this._globalErrors
  }

  set errors(errors: Record<string, unknown>) {
    this.update(() => {
      this.clearErrorsRecursively()
      const fields = this._fields

      // Parse errors using the configured schema.
      const parsedErrors = this.errorsShema.parseErrors(errors)

      // Apply the parsed errors.
      withErrorSource('server', () => {
        for (const [fieldName, errorMessage] of Object.entries(parsedErrors)) {
          this.applyErrorToField(fieldName, errorMessage, fields, this)
        }
      })
      })
  }

  private clearErrorsRecursively(): void {
    this.update(() => {
      this._globalErrorState.replace([])

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
      })
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

  private replaceGlobalError(key: string, error: ValidationErrorInput, source: ValidationErrorSource): void {
    const current = this._globalErrorState.getErrors()
    const index = current.findIndex(item => item.path.join('.') === key)
    const errors = current.filter(item => item.path.join('.') !== key)
    errors.splice(index < 0 ? errors.length : index, 0, validationError(error, source, [key]))
    this._globalErrorState.replace(errors)
  }

  setGlobalError(key: string, message: string): void {
    return this.update(() => {
      this.replaceGlobalError(key, {code: manualErrorSource(), message}, manualErrorSource())
      })
  }

  clearGlobalErrors(): void {
    return this.update(() => {
      this._globalErrorState.replace([])
      })
  }

  reset(): void {
    return this.update(() => {
      const fields = this._fields
      for (const key of Object.keys(fields)) {
        fields[key].reset()
      }
      this._globalErrorState.replace([])
      })
  }

  get isDirty(): boolean {
    return Object.values(this._fields).some(field => field.isDirty)
  }

  commitBaseline(): void {
    return this.update(() => {
      for (const field of Object.values(this._fields)) field.commitBaseline()
      })
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
    return this._globalErrorState.getErrors().length === 0
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
