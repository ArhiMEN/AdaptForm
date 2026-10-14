import {FieldType} from "@core/types/FieldType"
import {DecimalOptions} from "@core/options"

export class DecimalType extends FieldType<number | string, DecimalOptions> {
  constructor(options: DecimalOptions = {} as DecimalOptions) {
    super({
      decimalPlaces: 2,
      maxDigits: 8,
      ...options
    } as DecimalOptions)
  }

  cast(rawValue: any): number | string | null {
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

  validate(value: number | string): string[] {
    const errors: string[] = []
    value = typeof value === 'number' ? this.numberToString(value) : value

    // Check whether the input matches the numeric format.
    if (!this.isValidNumberString(value)) {
      errors.push(this.options.messages?.invalid ?? 'Пример: 1.00')
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

    // Handle a trailing decimal point while the user is still typing.
    if (normalizedValue.endsWith('.')) {
      // Validate only the integer part.
      if (intPart.length > maxIntDigits) {
        errors.push(
          this.options.messages?.maxDigits ??
          `Максимальное количество знаков перед запятой ${maxIntDigits}`
        )
      }
      return errors
    }

    // Validate the integer part.
    if (intPart.length === 0) {
      errors.push(this.options.messages?.invalid ?? 'Пример: 1.00')
      return errors
    }

    if (intPart.length > maxIntDigits) {
      errors.push(
        this.options.messages?.maxDigits ??
        `Максимальное количество знаков перед запятой ${maxIntDigits}`
      )
    }

    // Validate the decimal part.
    if (parts.length === 2) {
      // Check the total number of digits.
      if (intPart.length + decPart.length > maxDigits) {
        errors.push(
          this.options.messages?.maxDigits ??
          `Максимальное количество знаков ${maxDigits}`
        )
      }

      // Check the number of digits after the decimal point.
      if (decPart.length === 0) {
        errors.push(
          this.options.messages?.invalid ??
          'После точки должен быть минимум 1 знак'
        )
      } else if (decPart.length > decimalPlaces) {
        errors.push(
          this.options.messages?.decimalPlaces ??
          `Максимальное количество знаков после запятой ${decimalPlaces}`
        )
      }
    }

    // Stop further validation when the format is invalid.
    if (errors.length > 0) return errors

    // Check min/max constraints only when the value is not mid-entry.
    if (!value.endsWith('.')) {
      const numValue = parseFloat(value)

      if (!isNaN(numValue)) {
        if (this.options.gt != null && numValue <= this.options.gt) {
          errors.push(
            this.options.messages?.gt ??
            `Значение должно быть больше ${this.options.gt}`
          )
        }

        if (this.options.ge != null && numValue < this.options.ge) {
          errors.push(
            this.options.messages?.ge ??
            `Значение должно быть не менее ${this.options.ge}`
          )
        }

        if (this.options.lt != null && numValue >= this.options.lt) {
          errors.push(
            this.options.messages?.lt ??
            `Значение должно быть меньше ${this.options.lt}`
          )
        }

        if (this.options.le != null && numValue > this.options.le) {
          errors.push(
            this.options.messages?.le ??
            `Значение должно быть не более ${this.options.le}`
          )
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

  private numberToString(value: number): string {
    const decimalPlaces = this.options.decimalPlaces

    return String(value)
  }

  getTypeName(): string {
    return 'десятичное число'
  }
}