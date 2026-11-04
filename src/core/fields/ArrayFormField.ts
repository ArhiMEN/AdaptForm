import {customErrors, prefixErrors, type LocatedValidationError} from '../ValidationError'
import {ErrorNode} from '../state/ErrorNode'
import type {ObservableNode} from "@core/state/ObservableNode"
import {hasStandardGetters, snapshotValue, type ArrayFormSnapshot} from "@core/state/snapshot"
import {copyValue, equalValue} from "@core/state/value"
import {Form, type FormFieldsValue} from "@core/Form"
import {ArrayFormFieldOptions} from "@core/options"
import {collectionItemId} from "@core/fields/collectionIdentity"
import {isValidArrayIndex} from "@core/fields/arrayUtils"

export class ArrayFormField<T extends Form = Form> extends ErrorNode<ArrayFormSnapshot> {
  private _snapshot?: ArrayFormSnapshot

  protected captureState(): ArrayFormSnapshot {
    this.syncErrorChildren(false, this._forms)
    const forms = this._forms.map(child => child.getSnapshot())
    const itemIds = this._forms.map(collectionItemId)
    const isValid = this.isValid, isTouched = this.isTouched, isDirty = this.isDirty
    const errors = this.getOwnErrors()
    const previous = this._snapshot
    if (previous && this.captureState === ArrayFormField.prototype.captureState &&
      hasStandardGetters(this, ArrayFormField.prototype, ['formsFieldsValue']) &&
      previous.errors === errors && previous.isValid === isValid && previous.isTouched === isTouched && previous.isDirty === isDirty &&
      previous.forms.length === forms.length && forms.every((child, index) => previous.forms[index] === child) &&
      itemIds.every((id, index) => previous.itemIds?.[index] === id)) return previous
    return this._snapshot = {formsFieldsValue: snapshotValue(this.formsFieldsValue) as ArrayFormSnapshot['formsFieldsValue'],
      itemIds, forms, errors, isValid, isTouched, isDirty}
  }

  private _forms: T[] = []
  protected clearsOnDescendantChange = true

  /** Structured errors relative to this node; collection indexes reflect current order. */
  getErrors(): readonly LocatedValidationError[] {
    return Object.freeze([...prefixErrors(this.getOwnErrors(), []),
      ...this._forms.flatMap((child, index) => prefixErrors(child.getErrors(), [index]))])
  }

  protected stateChildren(): readonly ObservableNode<unknown>[] {
    return this._forms
  }

  private _baseline: unknown = []

  private _isTouched: boolean = false

  get isTouched(): boolean { return this._isTouched }
  set isTouched(value: boolean) {
    this.update(() => { this._isTouched = value })
  }

  constructor(
    private FormConstructor: new () => T,
    private options: ArrayFormFieldOptions = {},
    initial: unknown[] = []
  ) {
    super()
    this._forms = initial.map(data => {
      const form = new this.FormConstructor()
      form.setFields(data as Record<string, unknown>, false)
      return form
    })
    this.syncErrorChildren()
    this.validateAfterMutation(() => this.checkValid())
    this.commitBaseline()
  }

  get isDirty(): boolean {
    return !equalValue(this.formsFieldsValue, this._baseline) || this._forms.some(child => child.isDirty)
  }

  commitBaseline(): void {
    return this.update(() => {
      for (const child of this._forms) child.commitBaseline()
      this._baseline = copyValue(this.formsFieldsValue)
      })
  }

  // ===== value =====

  set forms(forms: unknown[]) {
    this.setForms(forms)
  }

  setForms(forms: unknown[], validate: boolean = true): void {
    return this.update(() => {
      this._forms = []
      this.syncErrorChildren()
      this.inputChanged()

      for (const formData of forms) {
        this.add(formData, false)
      }

      if (validate) this.validateAfterMutation(() => this.checkValid())
      })
  }

  get forms(): T[] {
    return this._forms
  }

  get formsFieldsValue(): FormFieldsValue<T>[] {
    return this._forms.map(form => form.fieldsValue)
  }

  // ===== actions =====

  add(data?: unknown, force_check: boolean = true): T {
    return this.insertAt(this._forms.length, data, force_check)
  }

  /** Insert before index (length appends). Invalid indexes do nothing. */
  insert(index: number, data?: unknown, force_check: boolean = true): T | undefined {
    if (!isValidArrayIndex(index, this._forms.length + 1)) return undefined
    return this.insertAt(index, data, force_check)
  }

  private insertAt(index: number, data: unknown, force_check: boolean): T {
    return this.update(() => {
      const form = new this.FormConstructor()

      if (data !== undefined && data !== null) {
        form.setFields(data as Record<string, unknown>, false)
      }

      form.commitBaseline()
      this.isTouched = true
      this._forms.splice(index, 0, form)
      this.syncErrorChildren()
      this.inputChanged()

      if (force_check) this.validateAfterMutation(() => this.checkValid())

      return form
      })
  }

  /** Move a retained node to its final index; invalid/equal indexes do nothing. */
  move(from: number, to: number): void {
    if (!isValidArrayIndex(from, this._forms.length) ||
      !isValidArrayIndex(to, this._forms.length) || from === to) return
    this.update(() => {
      const [node] = this._forms.splice(from, 1)
      this._forms.splice(to, 0, node)
      this.syncErrorChildren()
      this.inputChanged()
      this.validateAfterMutation(() => this.checkValid())
    })
  }

  remove(index: number): void {
    return this.update(() => {
      if (!isValidArrayIndex(index, this._forms.length)) return

      this._forms.splice(index, 1)
      this.syncErrorChildren()
      this.inputChanged()
      this.validateAfterMutation(() => this.checkValid())
      })
  }

  clear(): void {
    if (!this._forms.length) return
    return this.update(() => {
      this._forms = []
      this.syncErrorChildren()
      this.inputChanged()
      this.validateAfterMutation(() => this.checkValid())
      })
  }

  reset(): void {
    return this.update(() => {
      this._forms.forEach(form => form.reset())
      this.clearErrors()
      this.clientChecked = false
      this.isTouched = false
      })
  }

  // ===== validation =====

  private isRequired(form?: Form): boolean {
    let isRequired
    if (typeof this.options.isRequired === 'function') {
      isRequired = this.options.isRequired(form ?? null)
    } else {
      isRequired = this.options.isRequired ?? false
    }

    return isRequired
  }

  checkValid(form?: Form): boolean {
    return this.update(() => {
      this.clientChecked = false
      if (this.isRequired(form) && this._forms.length === 0) {
        this.completeClientCheck([{code: 'required'}])
        return false
      }

      if (this.options.minForms != null && this._forms.length < this.options.minForms) {
        this.completeClientCheck([{code: 'min_items', params: {min: this.options.minForms}}])
        return false
      }

      if (this.options.maxForms != null && this._forms.length > this.options.maxForms) {
        this.completeClientCheck([{code: 'max_items', params: {max: this.options.maxForms}}])
        return false
      }

      let valid = true

      for (const nestedForm of this._forms) {
        const ok = nestedForm.checkValid(nestedForm)
        if (!ok) valid = false
      }

      if (this.options.validate) {
        const result = this.options.validate(this._forms, form)

        const errors = customErrors(result)
        if (errors.length) {
          this.completeClientCheck([], errors)
          return false
        }
      }

      this.completeClientCheck()
      return valid && this.isValid
      })
  }

  checkAndSetValid(form?: Form): boolean {
    return this.checkValid(form)
  }

  get isValid(): boolean {
    if (!this.clientChecked) return false
    if (this.errors.length > 0) return false

    return this._forms.every(form => form.isValid)
  }


}
