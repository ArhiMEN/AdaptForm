import {ObservableNode} from "@core/state/ObservableNode"
import {snapshotValue, type ArrayFieldSnapshot} from "@core/state/snapshot"
import {copyValue, equalValue} from "@core/state/value"
import {ArrayFieldOptions} from "@core/options"
import {Field} from "@core/fields/Field"
import {Form} from "@core/Form"
import {isValidArrayIndex} from "@core/fields/arrayUtils"

export class ArrayField<T = any> extends ObservableNode<ArrayFieldSnapshot> {
  protected captureState(): ArrayFieldSnapshot {
    return {itemsValue: snapshotValue(this.itemsValue) as ArrayFieldSnapshot['itemsValue'],
      items: this._items.map(item => item.getSnapshot()), errors: [...this._errors],
      isValid: this.isValid, isTouched: this.isTouched, isDirty: this.isDirty}
  }

  protected options: ArrayFieldOptions
  protected _items: Field<T>[] = []
  protected _errors: string[] = []
  protected stateChildren(): readonly ObservableNode<unknown>[] {
    return this._items
  }

  private _baseline: unknown = []
  private _hasValidationResult = false

  private _isTouched: boolean = false

  get isTouched(): boolean { return this._isTouched }
  set isTouched(value: boolean) {
    this.update(() => { this._isTouched = value })
  }

  constructor(
    protected factory: (value?: T) => Field<T>,
    options: ArrayFieldOptions = {},
    initial: (T | null)[] = []
  ) {
    super()
    this.options = {
      isRequired: true,
      messages: {},
      ...options
    } as ArrayFieldOptions
    this._items = initial.map(value => this.factory(value as T))
    this.validateAfterMutation(() => this.checkValid())
    this.commitBaseline()
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
    return this.update(() => {
      this._items = []
      this.error = null

      for (const item of items) {
        this.add(item as T, false)
      }

      if (validate) this.validateAfterMutation(() => this.checkValid())
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
    return this.update(() => {
      const field = this.factory(value)
      this.isTouched = true
      this._items.push(field)

      if (force_check) this.validateAfterMutation(() => this.checkValid())

      return field
      })
  }

  remove(index: number): void {
    return this.update(() => {
      if (!isValidArrayIndex(index, this._items.length)) return

      this._items.splice(index, 1)
      this.checkValid()
      })
  }

  clear(): void {
    return this.update(() => {
      this._items = []
      this.checkValid()
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
      this._hasValidationResult = true
      this._errors = []

      if (this.isRequired(form) && this._items.length === 0) {
        this._errors.push(
          this.options.messages?.isRequired ??
          "Добавьте хотя бы один элемент"
        )
        return false
      }

      if (this.options.minItems != null && this._items.length < this.options.minItems) {
        this._errors.push(
          this.options.messages?.minItems ??
          `Значений должно быть не меньше ${this.options.minItems}`
        )
        return false
      }

      if (this.options.maxItems != null && this._items.length > this.options.maxItems) {
        this._errors.push(
          this.options.messages?.maxItems ??
          `Значений должно быть не больше ${this.options.maxItems}`
        )
        return false
      }

      let valid = true

      for (const field of this._items) {
        const ok = field.checkAndSetValid(form)
        if (!ok) valid = false
      }

      if (this.options.validate) {
        const values = this._items.map(item => item.valueClear)
        const result = this.options.validate(values, form)

        if (result === false) {
          this._errors.push(
            this.options.messages?.validate ?? "Ошибка валидации"
          )
          return false
        }

        if (typeof result === "string") {
          this._errors.push(result)
          return false
        }
      }

      return valid && this._errors.length === 0
      })
  }

  checkAndSetValid(form?: Form): boolean {
    return this.checkValid(form)
  }

  get isValid(): boolean {
    if (!this._hasValidationResult) return false
    if (this._errors.length > 0) return false

    return this._items.every(item => item.isValid === true)
  }

  get error(): string {
    return this._errors[0] ?? ''
  }

  set error(message: string | null) {
    this.update(() => {
      if (message) {
        this._errors = [message]
        this._hasValidationResult = true
      } else {
        this._errors = []
        this._hasValidationResult = false
      }
      })
  }

  get errors(): string[] {
    return this._errors
  }

  reset(): void {
    return this.update(() => {
      this._items.forEach(item => item.reset())
      this._errors = []
      this._hasValidationResult = false
      this.isTouched = false
      })
  }
}
