import type {ValidationErrorInput} from '../ValidationError'
import type {Form} from '../Form'
import {FieldType} from "@core/types/FieldType"
import {StringOptions} from "@core/options"

export class StringType extends FieldType<string, StringOptions> {
  cast(rawValue: any): string | null {
    if (rawValue === null || rawValue === undefined) return null
    if (typeof rawValue === 'string') return rawValue
    return String(rawValue)
  }

  validate(value: string): string[] {
    return this.validateRules(value).map(error => error.message!)
  }

  validateErrors(value: string, form?: Form): readonly ValidationErrorInput[] {
    // Preserve subclasses that override the historical string validator.
    return this.validate === StringType.prototype.validate
      ? this.validateRules(value) : super.validateErrors(value, form)
  }

  private validateRules(value: string): ValidationErrorInput[] {
    const errors: ValidationErrorInput[] = []

    if (this.options.minLength != null && value.length < this.options.minLength) {
      errors.push({code: 'min_length', message: this.options.messages?.minLength ??
        `Минимальная длина ${this.options.minLength} символов`, params: {min: this.options.minLength}})
    }

    if (this.options.maxLength != null && value.length > this.options.maxLength) {
      errors.push({code: 'max_length', message: this.options.messages?.maxLength ??
        `Максимальная длина ${this.options.maxLength} символов`, params: {max: this.options.maxLength}})
    }

    if (this.options.pattern != null) {
      const {source, flags} = this.options.pattern
      const stablePattern = new RegExp(source, flags.replace(/[gy]/g, ''))
      if (!stablePattern.test(value)) {
        errors.push({code: 'pattern', message: this.options.messages?.pattern ?? 'Неверный формат'})
      }
    }

    return errors
  }

  getTypeName(): string {
    return 'строка'
  }
}