import {FormField} from "../FormField";
import {NumberFieldOptions} from "@core/FieldOptions";

export class NumberField extends FormField<number> {
  min: number | null
  max: number | null
  example: string

  constructor(defaultValue: number | null = null, options: NumberFieldOptions = {}) {
    super(defaultValue, options)

    this.min = options.min ?? null
    this.max = options.max ?? null
    this.example = options.example ?? 'Enter a valid number'

    this.validators.push(this.typeValidator.bind(this))
    this.validators.push(this.minValidator.bind(this))
    this.validators.push(this.maxValidator.bind(this))
  }

  protected normalizeValue(value: any): number | null {
    if (this.fieldIsEmpty(value)) return null

    if (typeof value === 'number') return isNaN(value) ? null : value

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '') return null
      const parsed = Number(trimmed)
      return isNaN(parsed) ? null : parsed
    }

    return null
  }

  get valueClear(): number | null {
    return this._value
  }

  private typeValidator(value: number | null): string | null {
    if (value === null) return this.isRequired ? `Example: ${this.example}` : null
    if (typeof value !== 'number' || isNaN(value))
      return this.example
        ? `Example: ${this.example}`
        : 'Invalid number'
    return null
  }

  private minValidator(value: number | null): string | null {
    if (value === null || this.min === null) return null
    return value < this.min
      ? `Minimum value: ${this.min}`
      : null
  }

  private maxValidator(value: number | null): string | null {
    if (value === null || this.max === null) return null
    return value > this.max
      ? `Maximum value: ${this.max}`
      : null
  }
}