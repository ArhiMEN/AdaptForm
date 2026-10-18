import {ObservableNode} from "@core/state/ObservableNode"
import {snapshotValue, type FieldSnapshot} from "@core/state/snapshot"
import {FieldOptions} from "@core/options"
import {FieldType} from "@core/types/FieldType"
import {Form} from "@core/Form"
import {copyValue, equalValue} from "@core/state/value"

type FieldTypeConstructor<T, O extends FieldOptions = FieldOptions> = new (options: O) => FieldType<T, O>

export class Field<T = any, O extends FieldOptions = FieldOptions> extends ObservableNode<FieldSnapshot> {
  protected _rawValue: any = null
  protected _valueClear: T | null = null
  protected fieldType: FieldType<T, O>
  protected defaultValue: T | null
  private _baseline: T | null = null
  protected _errors: string[] = []

  private _isValid: boolean | null = null

  get isValid(): boolean | null { return this._isValid }
  set isValid(value: boolean | null) {
    this.update(() => { this._isValid = value })
  }
  private _isTouched: boolean = false

  get isTouched(): boolean { return this._isTouched }
  set isTouched(value: boolean) {
    this.update(() => { this._isTouched = value })
  }

  constructor(
    TypeConstructor: FieldTypeConstructor<T, O>,
    defaultValue?: T | null,
    options?: O | null,
  ) {
    super()
    this.fieldType = new TypeConstructor(options ?? {} as O)
    this.defaultValue = defaultValue ?? null

    for (const plugin of this.options.plugins ?? []) {
      plugin.init?.(this)
    }

    if (defaultValue !== undefined && defaultValue !== null) {
      this.rawValue = defaultValue
    } else {
      this._rawValue = null
      this._valueClear = null
      // Keep isValid as null until checkValid has been called.
      this.isValid = null
    }

    // Constructor defaults are pristine values, not user edits.
    this.isTouched = false
    this.commitBaseline()
  }

  protected captureState(): FieldSnapshot {
    return {rawValue: snapshotValue(this._rawValue), valueClear: snapshotValue(this._valueClear),
      errors: [...this._errors], isValid: this.isValid, isTouched: this.isTouched, isDirty: this.isDirty}
  }

  // ========== Getters and setters ==========

  protected get plugins() {
    return [...(this.options.plugins ?? [])].sort((a, b) => {
      return (a.pluginOptions?.priority ?? 0) - (b.pluginOptions?.priority ?? 0)
    })
  }

  get options() {
    return this.fieldType.options
  }

  set options(options: O) {
    this.update(() => {
      const currentOptions = this.fieldType.options
      this.fieldType.options = Object.assign(currentOptions, options)
      })
  }

  get rawValue(): T | null {
    return this._rawValue
  }

  set rawValue(input: any) {
    this.setRawValue(input)
  }

  setRawValue(input: any, validate: boolean = true): void {
    return this.update(() => {
      this.assignRawValue(input)
      this._errors = []
      this.isTouched = true

      if (validate) {
        this.checkAndSetValid()
      } else {
        this.isValid = null
      }
      })
  }

  private assignRawValue(input: any): void {
    let rawValue = input

    for (const plugin of this.plugins) {
      if (plugin.toRawValue) {
        rawValue = plugin.toRawValue(rawValue, this)
      }
    }

    let valueClear = rawValue

    for (const plugin of this.plugins) {
      if (plugin.toValueClear) {
        valueClear = plugin.toValueClear(valueClear, this)
      }
    }

    this._rawValue = rawValue
    this._valueClear = this.fieldType.cast(valueClear)
  }

  get errors(): string[] {
    return this._errors
  }

  get error(): string {
    return this._errors[0] ?? ''
  }

  set error(message: string | null) {
    this.update(() => {
      if (message) {
        this._errors = [message]
      } else {
        this._errors = []
      }
      this.isValid = message ? false : null
      })
  }

  get valueClear(): T | null {
    return this._valueClear
  }

  get isDirty(): boolean {
    return !equalValue(this._valueClear, this._baseline)
  }

  commitBaseline(): void {
    return this.update(() => {
      this._baseline = copyValue(this._valueClear)
      })
  }

  // ========== Validation ==========

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
      this._errors = []

      // 1. Check emptiness and required status.
      if (this.isEmpty) {
        if (this.isRequired(form)) {
          this._errors.push(this.options.messages?.isRequired ?? 'Поле обязательно для заполнения')
          return false
        }
        return true
      }

      // 2. Check whether the value could be cast to the expected type.
      if (this._valueClear === null) {
        this._errors.push(
          this.options.messages?.type ??
          `Ожидается ${this.fieldType.getTypeName()}`
        )
        return false
      }

      // 3. Run type-specific validation.
      const typeErrors = this.fieldType.validate(this._valueClear, form)
      if (typeErrors.length > 0) {
        this._errors.push(...typeErrors)
        return false
      }

      // 4. Run custom validation.
      if (this.options.validate) {
        const result = this.options.validate(this._valueClear, form)
        if (result === false) {
          this._errors.push(this.options.messages?.validate ?? 'Значение не прошло валидацию')
          return false
        }
        if (typeof result === 'string') {
          this._errors.push(result)
          return false
        }
      }

      return true
      })
  }

  checkAndSetValid(form?: Form): boolean {
    return this.update(() => {
      this.isValid = this.checkValid(form)
      return this.isValid
      })
  }

  get isEmpty(): boolean {
    let isEmpty = false
    if (this._rawValue === null || this._rawValue === undefined) isEmpty = true
    else if (typeof this._rawValue === 'string' && this._rawValue.trim() === '') isEmpty = true
    else if (Array.isArray(this._rawValue) && this._rawValue.length === 0) isEmpty = true
    return isEmpty
  }

  // ========== Helper methods ==========

  reset(): void {
    return this.update(() => {
      if (this.defaultValue !== null && this.defaultValue !== undefined) {
        // Restore the default through the same plugin pipeline without validating it.
        this.assignRawValue(this.defaultValue)
      } else {
        this._rawValue = null
        this._valueClear = null
      }

      this._errors = []
      this.isValid = null
      this.isTouched = false
      })
  }
}
