import type {ValidationErrorInput} from '../ValidationError'
import type {BuiltinValidationErrorInput} from '../BuiltinValidationError'
import {FieldType} from "@core/types/FieldType"
import {NumberOptions} from "@core/options"

export class NumberType extends FieldType<number, NumberOptions> {
  readonly typeId = 'number'

  cast(rawValue: unknown): number | null {
    if (rawValue === null || rawValue === undefined) return null
    if (typeof rawValue === 'number') return Number.isFinite(rawValue) ? rawValue : null

    if (typeof rawValue === 'string') {
      const normalized = rawValue.trim()
      if (normalized.length === 0) return null
      const num = Number(normalized)
      return Number.isFinite(num) ? num : null
    }

    return null
  }

  validateErrors(value: number): ValidationErrorInput[] {
    const errors: BuiltinValidationErrorInput[] = []

    if (!Number.isFinite(value)) {
      errors.push({code: 'invalid_type', params: {expected: this.typeId}})
      return errors
    }

    if (!Number.isInteger(value)) {
      errors.push({code: 'integer'})
    }

    if (this.options.gt != null && value <= this.options.gt) {
      errors.push({code: 'min_value', params: {min: this.options.gt, exclusive: true}})
    }

    if (this.options.ge != null && value < this.options.ge) {
      errors.push({code: 'min_value', params: {min: this.options.ge, exclusive: false}})
    }

    if (this.options.lt != null && value >= this.options.lt) {
      errors.push({code: 'max_value', params: {max: this.options.lt, exclusive: true}})
    }

    if (this.options.le != null && value > this.options.le) {
      errors.push({code: 'max_value', params: {max: this.options.le, exclusive: false}})
    }

    return errors
  }

}
