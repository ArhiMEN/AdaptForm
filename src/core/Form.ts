import {prefixErrors, type LocatedValidationError, type ValidationResult} from './ValidationError'
import {ErrorNode} from './state/ErrorNode'
import {ancestors, notificationPaths, targetIndex, type RegisteredChild} from './server/nodes'
import {beginServerOperation, prepareApply} from './server/operations'
import {clearErrorReports, readErrorReports, subscribeErrorReports} from './server/notifications'
import type {ParsedServerErrors} from './server/schemaTypes'
import type {
  ApplyServerErrorsOptions, ApplyServerErrorsResult, BeginServerErrorsOptions, ErrorNotificationReport, ServerErrorOperation,
} from './server/applyTypes'
import {withServerPartitions} from './state/ErrorStore'
import {ObservableNode} from "@core/state/ObservableNode"
import {hasStandardGetters, snapshotValue, type FormSnapshot} from "@core/state/snapshot"
import {Field} from "@core/fields/Field"
import {ArrayField} from "@core/fields/ArrayField"
import {ArrayFormField} from "@core/fields/ArrayFormField"

import {DependencyGraph} from "@core/state/DependencyGraph"
import {assertValidationAllowed, assertValidationMutationAllowed, duringValidationAssembly, isAssemblingValidationNodes, validationCallback} from "@core/state/validationExecution"

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

export abstract class Form extends ErrorNode<FormSnapshot> {
  private _dependencies?: DependencyGraph

  /** Compile explicit dependencies after subclass fields have initialized. */
  enableDependencies(): () => void {
    assertValidationMutationAllowed()
    if (!this._dependencies?.isEnabled) {
      this._dependencies = new DependencyGraph(this, () => this._fields, () => this.dependencyTree(), () => this.update(() => {}))
    }
    return this._dependencies.disable
  }

  protected childValidationContext(): Form { return this }

  private _snapshot?: FormSnapshot
  private _snapshotFields?: Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>>

  protected captureState(): FormSnapshot {
    // Reuse field discovery only within this capture. Later reads must still
    // discover arbitrary class-property replacement/addition/removal.
    this._snapshotFields = this._fields
    this.syncErrorChildren(false, Object.values(this._snapshotFields))
    try {
      const fields = Object.fromEntries(Object.entries(this._fields).map(([key, field]) => [key, field.getSnapshot()]))
      const errors = this.getOwnErrors()
      const isValid = this.isValid, isTouched = this.isTouched, isDirty = this.isDirty
      const previous = this._snapshot
      if (previous && this.captureState === Form.prototype.captureState &&
        hasStandardGetters(this, Form.prototype, ['fieldsValue']) &&
        previous.errors === errors && previous.isValid === isValid && previous.isTouched === isTouched && previous.isDirty === isDirty &&
        Object.keys(fields).length === Object.keys(previous.fields).length &&
        Object.entries(fields).every(([key, field]) => previous.fields[key] === field) &&
        Object.values(this._snapshotFields).every(field => hasStandardGetters(field,
          field instanceof Field ? Field.prototype : field instanceof ArrayField ? ArrayField.prototype : ArrayFormField.prototype,
          field instanceof Field ? ['valueClear'] : []))) return previous
      return this._snapshot = {fieldsValue: snapshotValue(this.fieldsValue) as FormSnapshot['fieldsValue'],
        errors, fields, isValid, isTouched, isDirty}
    } finally {
      this._snapshotFields = undefined
    }
  }

  protected stateChildren(): readonly ObservableNode<unknown>[] {
    return Object.values(this._fields)
  }

  protected get isServerErrorForm(): boolean { return true }

  protected registeredErrorChildren(): readonly RegisteredChild[] {
    return Object.entries(this._fields)
  }

  batch<TResult>(callback: () => TResult & (TResult extends PromiseLike<unknown> ? never : unknown)): TResult {
    return this.batchUpdate(callback, () => this.validate())
  }

  beginServerErrorOperation(options?: BeginServerErrorsOptions): ServerErrorOperation {
    return beginServerOperation(this, options)
  }

  applyServerErrors(batch: ParsedServerErrors, options: ApplyServerErrorsOptions): ApplyServerErrorsResult {
    assertValidationAllowed()
    const commit = validationCallback(() => {
      const prepared = prepareApply(this, batch, options)
      const paths = notificationPaths(prepared.index)
      const affected = new Set([...prepared.changed].flatMap(node => [...ancestors(node)]))
      const publish = withServerPartitions(prepared.plans, () => this.prepareServerSnapshots(this, affected, paths,
        () => notificationPaths(targetIndex(this))))
      prepared.recheck()
      const {applied, ignored, unresolved} = prepared
      return () => {
        for (const plan of prepared.plans) plan.install()
        prepared.consume()
        return Object.freeze({committed: true as const, applied, ignored, unresolved, notification: publish()})
      }
    })
    return commit()
  }

  subscribeErrorNotifications(listener: (report: ErrorNotificationReport) => void): () => void {
    return subscribeErrorReports(this, listener)
  }

  getErrorNotificationReports(): readonly ErrorNotificationReport[] { return readErrorReports(this) }

  clearErrorNotificationReports(): void { clearErrorReports(this) }

  /** All errors in field order, then own global errors; paths are relative to this Form. */
  getErrors(): readonly LocatedValidationError[] {
    return Object.freeze([...Object.entries(this._fields).flatMap(([key, field]) =>
      prefixErrors(field.getErrors(), [key])), ...prefixErrors(this.getOwnErrors(), [])])
  }

  protected get _fields(): Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>> {
    if (this._snapshotFields) return this._snapshotFields
    const fields: Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>> = Object.create(null)

    for (const key of Object.keys(this)) {
      const descriptor = Object.getOwnPropertyDescriptor(this, key)
      const property: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined
      if (property instanceof Field || property instanceof ArrayField || property instanceof ArrayFormField) {
        fields[key] = property
      }
    }

    return fields
  }

  validate(_form?: Form): ValidationResult {
    assertValidationAllowed()
    const check = () => {
      const fields = Object.values(this._fields)
      this.syncErrorChildren(false, fields)
      for (const field of new Set(fields)) field.validate(this)
      this.clientChecked = true
      return {valid: this.isValid}
    }
    return this.update(() => {
      this.clientChecked = false
      try {
        return this._dependencies?.isEnabled
          ? this._dependencies.runFullCheck(check, this.isAutomaticFullCheck)
          : check()
      } catch (error) {
        this.clientChecked = 'failed'
        throw error
      }
    })
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
      Object.defineProperty(data, key, {value: valueClear, enumerable: true, writable: true, configurable: true})
    }

    return data as FormFieldsValue<this>
  }

  set fields(data: Record<string, unknown>) {
    this.setFields(data)
  }

  setFields(data: Record<string, unknown>, validate: boolean = true): void {
    return this.update(() => {
      const fields = this._fields
      const replacedCollections = new Set<ArrayField | ArrayFormField>()
      duringValidationAssembly(() => {
        for (const key of Object.keys(data)) {
          const field = fields[key]
          if (field) {
            if (field instanceof Field) field.setRawValue(data[key], false)
            else if (field instanceof ArrayField) {
              const previous = field.items
              field.setItemsValue(data[key] as unknown[], false)
              if (field.items !== previous) replacedCollections.add(field)
            } else if (field instanceof ArrayFormField) {
              const previous = field.forms
              field.setForms(data[key] as unknown[], false)
              if (field.forms !== previous) replacedCollections.add(field)
            }
          }
        }
      })

      this.syncErrorChildren()

      // Validate after assignment so conditional rules see the complete form.
      if (validate && !isAssemblingValidationNodes()) {
        if (this._dependencies?.isEnabled && this._dependencies.selective) {
          for (const key of Object.keys(data)) {
            const field = fields[key]
            if (field instanceof Field) {
              this._dependencies.request(field)
            }
          }
          for (const collection of replacedCollections) {
            this.validateNodeAfterMutation(collection, () => collection.validate(this))
          }
        } else this.validateAfterMutation(() => this.validate())
      }
      })
  }

  reset(): void {
    return this.update(() => {
      this.resetErrorRevision()
      const fields = this._fields
      for (const key of Object.keys(fields)) {
        fields[key].reset()
      }
      this.clearErrors()
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
    if (this.clientChecked === 'failed') return false
    const fields = this._fields
    for (const key of Object.keys(fields)) {
      if (fields[key].isValid !== true) return false
    }
    return (Object.keys(fields).length > 0 || this.clientChecked) && this.errors.length === 0
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
    return Object.fromEntries(Object.entries(this.fieldsValue).map(([key, value]) =>
      [key, this.serializeJsonValue(value)]))
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
