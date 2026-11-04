import type {ValidationErrorInput} from '../ValidationError'
import type {BuiltinValidationErrorInput} from '../BuiltinValidationError'
import {FieldType} from "@core/types/FieldType"
import {BooleanOptions} from "@core/options"

export class BooleanType extends FieldType<boolean, BooleanOptions> {
  readonly typeId = 'boolean'

  cast(rawValue: unknown): boolean | null {
    if (rawValue === null || rawValue === undefined) return null
    if (typeof rawValue === 'boolean') return rawValue

    if (typeof rawValue === 'string') {
      if (rawValue === 'true' || rawValue === '1') return true
      if (rawValue === 'false' || rawValue === '0') return false
    }

    if (typeof rawValue === 'number') {
      if (rawValue === 1) return true
      if (rawValue === 0) return false
    }

    return null
  }

  validateErrors(value: boolean): ValidationErrorInput[] {
    const errors: BuiltinValidationErrorInput[] = []

    if (this.options.mustBeTrue && value !== true) {
      errors.push({code: 'must_be_true'})
    }

    if (this.options.mustBeFalse && value !== false) {
      errors.push({code: 'must_be_false'})
    }

    return errors
  }

}
