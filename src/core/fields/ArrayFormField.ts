import {prefixErrors, type LocatedValidationError, type ValidationResult} from '../ValidationError'
import {assertValidationAllowed, assertValidationMutationAllowed, duringValidationAssembly, evaluateRequired, validationCallback} from '../state/validationExecution'
import {ErrorNode} from '../state/ErrorNode'
import type {ObservableNode} from "@core/state/ObservableNode"
import {hasStandardGetters, snapshotValue, type ArrayFormSnapshot} from "@core/state/snapshot"
import {copyValue, equalValue} from "@core/state/value"
import {Form, type FormFieldsValue} from "@core/Form"
import {ArrayFormFieldOptions} from "@core/options"
import {collectionItemId} from "@core/fields/collectionIdentity"
import {assembleCollection, collectionTypeErrors, isValidArrayIndex} from "@core/fields/arrayUtils"

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
      itemIds.every((id, index) => previous.itemIds[index] === id)) return previous
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
    private options: ArrayFormFieldOptions<T> = {},
    initial: unknown[] = []
  ) {
    super()
    duringValidationAssembly(() => {
      this._forms = assembleCollection(initial, data => this.createForm(data))
      this.syncErrorChildren()
      this.commitBaseline()
    })
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
    this.update(() => {
      if (!this._forms.length && forms.length === 0) return
      this._forms = assembleCollection(forms, data => this.createForm(data, true))
      if (this._forms.length) this.isTouched = true
      this.syncErrorChildren(true, this._forms, true)
      this.inputChanged(validate, true)
      if (validate) this.validateAfterMutation(form => this.validate(form), undefined, true)
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
    assertValidationMutationAllowed()
    if (!isValidArrayIndex(index, this._forms.length + 1)) return undefined
    return this.insertAt(index, data, force_check)
  }

  private createForm(data: unknown, captureBaseline = false): T {
    const form = new this.FormConstructor()
    if (data != null) form.setFields(data as Record<string, unknown>, false)
    if (captureBaseline) form.commitBaseline()
    return form
  }

  private insertAt(index: number, data: unknown, validate: boolean): T {
    return this.update(() => {
      const form = duringValidationAssembly(() => this.createForm(data, true))
      this.isTouched = true
      this._forms.splice(index, 0, form)
      this.syncErrorChildren(true, this._forms, true)
      this.inputChanged(validate, true)
      if (validate) {
        this.requestOwnValidation()
        this.validateNodeAfterMutation(form, () => form.validate())
      }
      return form
    })
  }

  /** Move a retained node to its final index; invalid/equal indexes do nothing. */
  move(from: number, to: number): void {
    assertValidationMutationAllowed()
    if (!isValidArrayIndex(from, this._forms.length) ||
      !isValidArrayIndex(to, this._forms.length) || from === to) return
    this.update(() => {
      const [node] = this._forms.splice(from, 1)
      this._forms.splice(to, 0, node)
      this.syncErrorChildren(false, this._forms, true)
      this.inputChanged(true, true)
      this.requestOwnValidation()
    })
  }

  remove(index: number): void {
    assertValidationMutationAllowed()
    if (!isValidArrayIndex(index, this._forms.length)) return
    return this.update(() => {
      this._forms.splice(index, 1)
      this.syncErrorChildren(false, this._forms, true)
      this.inputChanged(true, true)
      this.requestOwnValidation()
      })
  }

  clear(): void {
    assertValidationMutationAllowed()
    if (!this._forms.length) return
    return this.update(() => {
      this._forms = []
      this.syncErrorChildren(false, this._forms, true)
      this.inputChanged(true, true)
      this.requestOwnValidation()
      })
  }

  reset(): void {
    return this.update(() => {
      this.resetErrorRevision()
      this._forms.forEach(form => form.reset())
      this.clearErrors()
      this.clientChecked = false
      this.isTouched = false
      })
  }

  // ===== validation =====

  validate(form?: Form): ValidationResult {
    return this.validateSelection(form, () => {
      for (const item of this._forms) item.validate()
    })
  }

  protected requestOwnValidation(): void {
    this.validateOwnAfterMutation((form, visitChildren) => this.validateSelection(form, visitChildren))
  }

  private validateSelection(form: Form | undefined, visitChildren: () => void): ValidationResult {
    assertValidationAllowed()
    return this.update(() => {
      this.clientChecked = false
      const type = collectionTypeErrors(this._forms.length, evaluateRequired(this.options, false, form),
        this.options.minForms, this.options.maxForms)
      visitChildren()
      const validate = this.options.validate
      const custom = !type.length && validate ? validationCallback(() => validate.call(this.options, [...this._forms], form)) : []
      this.completeClientCheck(type, custom)
      return {valid: this.isValid}
    })
  }

  get isValid(): boolean {
    if (this.clientChecked !== true) return false
    if (this.errors.length > 0) return false

    return this._forms.every(form => form.isValid)
  }


}
