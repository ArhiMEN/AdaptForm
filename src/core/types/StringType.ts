import type {ValidationErrorInput} from '../ValidationError'
import type {BuiltinValidationErrorInput} from '../BuiltinValidationError'
import {FieldType} from "@core/types/FieldType"
import {StringOptions} from "@core/options"

export class StringType extends FieldType<string, StringOptions> {
  readonly typeId = 'string'

  cast(rawValue: unknown): string | null {
    if (rawValue === null || rawValue === undefined) return null
    if (typeof rawValue === 'string') return rawValue
    return String(rawValue)
  }

  validateErrors(value: string): ValidationErrorInput[] {
    const errors: BuiltinValidationErrorInput[] = []

    if (this.options.minLength != null && value.length < this.options.minLength) {
      errors.push({code: 'min_length', params: {min: this.options.minLength}})
    }

    if (this.options.maxLength != null && value.length > this.options.maxLength) {
      errors.push({code: 'max_length', params: {max: this.options.maxLength}})
    }

    if (this.options.pattern != null) {
      const {source, flags} = this.options.pattern
      const stablePattern = new RegExp(source, flags.replace(/[gy]/g, ''))
      if (!stablePattern.test(value)) {
        errors.push({code: 'pattern'})
      }
    }

    return errors
  }

}
