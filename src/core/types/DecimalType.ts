import type {ValidationErrorInput} from '../ValidationError'
import type {BuiltinValidationErrorInput} from '../BuiltinValidationError'
import {FieldType} from "@core/types/FieldType"
import {DecimalOptions} from "@core/options"

export class DecimalType extends FieldType<number | string, DecimalOptions> {
  readonly typeId = 'decimal'

  constructor(options: DecimalOptions = {} as DecimalOptions) {
    super({
      decimalPlaces: 2,
      maxDigits: 8,
      ...options
    } as DecimalOptions)
  }

  cast(rawValue: unknown): number | string | null {
    if (rawValue === null || rawValue === undefined) return null

    if (typeof rawValue === 'string') {
      return this.castString(rawValue)
    }

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return rawValue
    }

    return null
  }

  private castString(value: string): string | null {
    const trimmed = value.trim()

    if (!trimmed) return null

    // Replace commas with decimal points.
    const normalized = trimmed.replace(',', '.')

    // Check whether the input resembles a number.
    if (!this.isValidNumberString(normalized)) {
      return null
    }

    return normalized
  }

  validateErrors(value: number | string): ValidationErrorInput[] {
    const errors: BuiltinValidationErrorInput[] = []
    value = typeof value === 'number' ? String(value) : value

    // Check whether the input matches the numeric format.
    if (!this.isValidNumberString(value)) {
      errors.push({code: 'pattern'})
      return errors
    }

    const maxDigits = this.options.maxDigits ?? 8
    const decimalPlaces = this.options.decimalPlaces ?? 2
    const maxIntDigits = maxDigits - decimalPlaces

    // Split the input into integer and decimal parts.
    const isNegative = value.startsWith('-')
    const normalizedValue = isNegative ? value.substring(1) : value
    const parts = normalizedValue.split('.')
    const intPart = parts[0]
    const decPart = parts.length > 1 ? parts[1] : ''

    // Validate the integer part.
    if (intPart.length === 0) {
      errors.push({code: 'pattern'})
      return errors
    }

    if (intPart.length > maxIntDigits) {
      errors.push({code: 'max_digits', params: {max: maxIntDigits, scope: 'integer'}})
    }

    // Validate the decimal part.
    if (parts.length === 2) {
      // Check the total number of digits.
      if (intPart.length + decPart.length > maxDigits) {
        errors.push({code: 'max_digits', params: {max: maxDigits, scope: 'total'}})
      }

      // Check the number of digits after the decimal point.
      if (decPart.length === 0) {
        errors.push({code: 'pattern'})
      } else if (decPart.length > decimalPlaces) {
        errors.push({code: 'decimal_places', params: {max: decimalPlaces}})
      }
    }

    // Stop further validation when the format is invalid.
    if (errors.length > 0) return errors

    // Check min/max constraints only when the value is not mid-entry.
    if (!value.endsWith('.')) {
      const numValue = parseFloat(value)

      if (!isNaN(numValue)) {
        if (this.options.gt != null && numValue <= this.options.gt) {
          errors.push({code: 'min_value', params: {min: this.options.gt, exclusive: true}})
        }

        if (this.options.ge != null && numValue < this.options.ge) {
          errors.push({code: 'min_value', params: {min: this.options.ge, exclusive: false}})
        }

        if (this.options.lt != null && numValue >= this.options.lt) {
          errors.push({code: 'max_value', params: {max: this.options.lt, exclusive: true}})
        }

        if (this.options.le != null && numValue > this.options.le) {
          errors.push({code: 'max_value', params: {max: this.options.le, exclusive: false}})
        }
      }
    }

    return errors
  }

  private isValidNumberString(value: string): boolean {
    // Accept values such as 123, 123.45, -123.45, and 123.
    const pattern = /^-?\d+\.?\d*$/

    // Ensure there is at most one decimal point.
    const dotCount = (value.match(/\./g) || []).length
    if (dotCount > 1) return false

    // Validate the format.
    return pattern.test(value)
  }

}
