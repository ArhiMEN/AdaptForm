import type {ValidationErrorInput} from '../ValidationError'
import type {Form} from '../Form'
import {FieldType} from "@core/types/FieldType"
import {NumberOptions} from "@core/options"

export class NumberType extends FieldType<number, NumberOptions> {
  cast(rawValue: any): number | null {
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

  validate(value: number): string[] {
    return this.validateRules(value).map(error => error.message!)
  }

  validateErrors(value: number, form?: Form): readonly ValidationErrorInput[] {
    // Preserve subclasses that override the historical string validator.
    return this.validate === NumberType.prototype.validate
      ? this.validateRules(value) : super.validateErrors(value, form)
  }

  private validateRules(value: number): ValidationErrorInput[] {
    const errors: ValidationErrorInput[] = []

    if (!Number.isFinite(value)) {
      errors.push({code: 'invalid_type', message: this.options.messages?.invalid ?? 'Значение должно быть конечным числом', params: {expected: 'finite_number'}})
      return errors
    }

    if (!Number.isInteger(value)) {
      errors.push({code: 'integer', message: this.options.messages?.invalid ?? 'Значение должно быть целым числом'})
    }

    if (this.options.gt != null && value <= this.options.gt) {
      errors.push({code: 'min_value', message: this.options.messages?.gt ??
        `Значение должно быть больше ${this.options.gt}`, params: {min: this.options.gt, exclusive: true}})
    }

    if (this.options.ge != null && value < this.options.ge) {
      errors.push({code: 'min_value', message: this.options.messages?.ge ??
        `Значение должно быть не менее ${this.options.ge}`, params: {min: this.options.ge, exclusive: false}})
    }

    if (this.options.lt != null && value >= this.options.lt) {
      errors.push({code: 'max_value', message: this.options.messages?.lt ??
        `Значение должно быть меньше ${this.options.lt}`, params: {max: this.options.lt, exclusive: true}})
    }

    if (this.options.le != null && value > this.options.le) {
      errors.push({code: 'max_value', message: this.options.messages?.le ??
        `Значение должно быть не более ${this.options.le}`, params: {max: this.options.le, exclusive: false}})
    }

    return errors
  }

  getTypeName(): string {
    return 'число'
  }
}