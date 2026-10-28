import type {ValidationErrorInput} from '../ValidationError'
import type {Form} from '../Form'
import {FieldType} from "@core/types/FieldType"
import {BooleanOptions} from "@core/options"

export class BooleanType extends FieldType<boolean, BooleanOptions> {
  cast(rawValue: any): boolean | null {
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

  validate(value: boolean): string[] {
    return this.validateRules(value).map(error => error.message!)
  }

  validateErrors(value: boolean, form?: Form): readonly ValidationErrorInput[] {
    // Preserve subclasses that override the historical string validator.
    return this.validate === BooleanType.prototype.validate
      ? this.validateRules(value) : super.validateErrors(value, form)
  }

  private validateRules(value: boolean): ValidationErrorInput[] {
    const errors: ValidationErrorInput[] = []

    if (this.options.mustBeTrue && value !== true) {
      errors.push({code: 'must_be_true', message: this.options.messages?.mustBeTrue ?? 'Значение должно быть true'})
    }

    if (this.options.mustBeFalse && value !== false) {
      errors.push({code: 'must_be_false', message: this.options.messages?.mustBeFalse ?? 'Значение должно быть false'})
    }

    return errors
  }

  getTypeName(): string {
    return 'логическое значение'
  }
}