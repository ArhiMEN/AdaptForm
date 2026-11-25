import {prefixErrors, type LocatedValidationError, type ValidationResult} from '../ValidationError'
import {assertValidationAllowed, assertValidationMutationAllowed, duringValidationAssembly, evaluateRequired, validationCallback} from '../state/validationExecution'
import {ErrorNode} from '../state/ErrorNode'
import type {ObservableNode} from "@core/state/ObservableNode"
import {hasStandardGetters, snapshotValue, type ArrayFieldSnapshot} from "@core/state/snapshot"
import {copyValue, equalValue} from "@core/state/value"
import {ArrayFieldOptions} from "@core/options"
import {Field} from "@core/fields/Field"
import {Form} from "@core/Form"
import {collectionItemId} from "@core/fields/collectionIdentity"
import {assembleCollection, collectionTypeErrors, isValidArrayIndex} from "@core/fields/arrayUtils"

export class ArrayField<T = any> extends ErrorNode<ArrayFieldSnapshot> {
  private _snapshot?: ArrayFieldSnapshot

  protected captureState(): ArrayFieldSnapshot {
    this.syncErrorChildren(false, this._items)
    const items = this._items.map(child => child.getSnapshot())
    const itemIds = this._items.map(collectionItemId)
    const isValid = this.isValid, isTouched = this.isTouched, isDirty = this.isDirty
    const errors = this.getOwnErrors()
    const previous = this._snapshot
    if (previous && this.captureState === ArrayField.prototype.captureState &&
      hasStandardGetters(this, ArrayField.prototype, ['itemsValue']) &&
      previous.errors === errors && previous.isValid === isValid && previous.isTouched === isTouched && previous.isDirty === isDirty &&
      previous.items.length === items.length && items.every((child, index) => previous.items[index] === child) &&
      itemIds.every((id, index) => previous.itemIds[index] === id) &&
      this._items.every(child => hasStandardGetters(child, Field.prototype, ['valueClear']))) return previous
    return this._snapshot = {itemsValue: snapshotValue(this.itemsValue) as ArrayFieldSnapshot['itemsValue'],
      itemIds, items, errors, isValid, isTouched, isDirty}
  }

  protected options: ArrayFieldOptions<T>
  protected _items: Field<T>[] = []
  protected clearsOnDescendantChange = true

  /** Structured errors relative to this node; collection indexes reflect current order. */
  getErrors(): readonly LocatedValidationError[] {
    return Object.freeze([...prefixErrors(this.getOwnErrors(), []),
      ...this._items.flatMap((child, index) => prefixErrors(child.getErrors(), [index]))])
  }

  protected stateChildren(): readonly ObservableNode<unknown>[] {
    return this._items
  }

  private _baseline: unknown = []

  private _isTouched: boolean = false

  get isTouched(): boolean { return this._isTouched }
  set isTouched(value: boolean) {
    this.update(() => { this._isTouched = value })
  }

  constructor(
    protected factory: (value?: T) => Field<T>,
    options: ArrayFieldOptions<T> = {},
    initial: (T | null)[] = []
  ) {
    super()
    this.options = {
      isRequired: true,
      ...options
    }
    duringValidationAssembly(() => {
      this._items = assembleCollection(initial, value => this.factory(value as T))
      this.syncErrorChildren()
      this.commitBaseline()
    })
  }

  get isDirty(): boolean {
    return !equalValue(this.itemsValue, this._baseline) || this._items.some(child => child.isDirty)
  }

  commitBaseline(): void {
    return this.update(() => {
      for (const child of this._items) child.commitBaseline()
      this._baseline = copyValue(this.itemsValue)
      })
  }

  // ===== value =====

  set itemsValue(items: (T | null)[]) {
    this.setItemsValue(items)
  }

  setItemsValue(items: (T | null)[], validate: boolean = true): void {
    this.update(() => {
      if (!this._items.length && items.length === 0) return
      this._items = assembleCollection(items, value => this.createItem(value as T))
      if (this._items.length) this.isTouched = true
      this.syncErrorChildren()
      this.inputChanged(validate)
      if (validate) this.validateAfterMutation(form => this.validate(form), undefined, true)
    })
  }

  get itemsValue(): (T | null)[] {
    return this._items.map(item => item.valueClear)
  }

  get items(): Field<T>[] {
    return this._items
  }

  // ===== actions =====

  add(value?: T, force_check: boolean = true): Field<T> {
    return this.insertAt(this._items.length, value, force_check)
  }

  /** Insert before index (length appends). Invalid indexes do nothing. */
  insert(index: number, value?: T, force_check: boolean = true): Field<T> | undefined {
    assertValidationMutationAllowed()
    if (!isValidArrayIndex(index, this._items.length + 1)) return undefined
    return this.insertAt(index, value, force_check)
  }

  private createItem(value?: T): Field<T> {
    const field = this.factory(value)
    field.commitBaseline()
    return field
  }

  private insertAt(index: number, value: T | undefined, validate: boolean): Field<T> {
    return this.update(() => {
      const field = duringValidationAssembly(() => this.createItem(value))
      this.isTouched = true
      this._items.splice(index, 0, field)
      this.syncErrorChildren()
      this.inputChanged(validate)
      if (validate) {
        this.requestOwnValidation()
        this.validateNodeAfterMutation(field, context => field.validate(context))
      }
      return field
    })
  }

  /** Move a retained node to its final index; invalid/equal indexes do nothing. */
  move(from: number, to: number): void {
    assertValidationMutationAllowed()
    if (!isValidArrayIndex(from, this._items.length) ||
      !isValidArrayIndex(to, this._items.length) || from === to) return
    this.update(() => {
      const [node] = this._items.splice(from, 1)
      this._items.splice(to, 0, node)
      this.syncErrorChildren()
      this.inputChanged(true)
      this.requestOwnValidation()
    })
  }

  remove(index: number): void {
    assertValidationMutationAllowed()
    if (!isValidArrayIndex(index, this._items.length)) return
    return this.update(() => {
      this._items.splice(index, 1)
      this.syncErrorChildren()
      this.inputChanged(true)
      this.requestOwnValidation()
      })
  }

  clear(): void {
    assertValidationMutationAllowed()
    if (!this._items.length) return
    return this.update(() => {
      this._items = []
      this.syncErrorChildren()
      this.inputChanged(true)
      this.requestOwnValidation()
      })
  }

  // ===== validation =====

  validate(form?: Form): ValidationResult {
    return this.validateSelection(form, () => {
      for (const item of this._items) item.validate(form)
    })
  }

  protected requestOwnValidation(): void {
    this.validateOwnAfterMutation((form, visitChildren) => this.validateSelection(form, visitChildren))
  }

  private validateSelection(form: Form | undefined, visitChildren: () => void): ValidationResult {
    assertValidationAllowed()
    return this.update(() => {
      this.clientChecked = false
      const type = collectionTypeErrors(this._items.length, evaluateRequired(this.options, false, form),
        this.options.minItems, this.options.maxItems)
      visitChildren()
      const validate = this.options.validate
      const custom = !type.length && validate ? validationCallback(() => validate.call(this.options, this.itemsValue, form)) : []
      this.completeClientCheck(type, custom)
      return {valid: this.isValid}
    })
  }

  get isValid(): boolean {
    if (this.clientChecked !== true) return false
    if (this.errors.length > 0) return false

    return this._items.every(item => item.isValid === true)
  }

  reset(): void {
    return this.update(() => {
      this._items.forEach(item => item.reset())
      this.clearErrors()
      this.clientChecked = false
      this.isTouched = false
      })
  }
}
