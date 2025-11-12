import {FormFieldOptions} from "@core/FieldOptions";

export abstract class FormField<Value = any, ClearValue = Value> {
  protected _value: Value | null
  protected defaultValue: Value | null
  protected _error: string | null = null

  isRequired: boolean
  isValid: boolean | null
  validators: Array<(value: Value | null) => string | null>

  protected constructor(defaultValue?: Value | null, options: FormFieldOptions = {}) {
    this._value = defaultValue ?? null
    this.defaultValue = defaultValue ?? null
    this.isValid = defaultValue === null ? null : true
    this.isRequired = options.isRequired ?? true
    this.validators = options.validators ?? []
  }

  get value(): Value | null {
    return this._value
  }

  set value(value: Value | null) {
    this._value = this.normalizeValue(value)
    this.checkValid()
  }

  get error(): string {
    return this._error ?? ''
  }

  set error(value: string | null) {
    this._error = value
  }

  set __valid_error(value: string | null) {
    const [valid_error_text = "", error_text = ""] = (this.error || "").split(" | ");
    if (value) {
      if (!valid_error_text) {
        this.error = error_text ? `${value} | ${this.error}` : value;
      }
    } else {
      this.error = error_text || null
    }
  }

  reset(): void {
    this._value = this.defaultValue ?? null
    this._error = null
    this.isValid = this.defaultValue === null ? null : true
  }

  protected normalizeValue(value: Value | null): Value | null {
    return value
  }

  protected fieldIsEmpty(value: Value | null): boolean {
    if (value === null || value === undefined || value === '') return true
    return typeof value === 'object' && Object.keys(value).length === 0
  }

  get isEmpty(): boolean {
    return this.fieldIsEmpty(this._value)
  }

  protected fieldIsZero(value: Value | null) {
    return value === 0 || value === "0"
  }

  get isZero(): boolean {
    return this.fieldIsZero(this._value)
  }

  checkValid(): boolean {
    if (this.isEmpty && !this.isZero) {
      this.isValid = !this.isRequired
      return this.isValid
    }

    this.isValid = true

    for (const validator of this.validators) {
      const error = validator(this._value)
      if (error) {
        this._error = error
        this.isValid = false
        return false
      }
    }

    this._error = null
    return this.isValid
  }

  abstract get valueClear(): ClearValue | null
}