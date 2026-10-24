import type {ValidationErrorInput} from '../ValidationError'
import type {Form} from '../Form'
import {FieldType} from "@core/types/FieldType"
import {DateOptions} from "@core/options"

export class DateType extends FieldType<Date, DateOptions> {
  constructor(options: DateOptions = {}) {
    super(options)
  }

  cast(rawValue: any): Date | null {
    if (rawValue === null || rawValue === undefined) return null

    if (rawValue instanceof Date) {
      return isNaN(rawValue.getTime()) ? null : rawValue
    }

    if (typeof rawValue === 'string') {
      const date = new Date(rawValue)
      return isNaN(date.getTime()) ? null : date
    }

    return null
  }

  validate(value: Date): string[] {
    return this.validateRules(value).map(error => error.message!)
  }

  validateErrors(value: Date, form?: Form): readonly ValidationErrorInput[] {
    // Preserve subclasses that override the historical string validator.
    return this.validate === DateType.prototype.validate
      ? this.validateRules(value) : super.validateErrors(value, form)
  }

  private validateRules(value: Date): ValidationErrorInput[] {
    const errors: ValidationErrorInput[] = []

    if (isNaN(value.getTime())) {
      errors.push({code: 'invalid_type', message: this.options.messages?.invalid ?? 'Неверная дата', params: {expected: 'date'}})
      return errors
    }

    if (this.options.minDate) {
      if (!this.compareDates(value, this.options.minDate, 'min')) {
        errors.push({code: 'min_date', message: this.options.messages?.minDate ??
          `Дата должна быть не ранее ${this.options.minDate!.toLocaleDateString()}`, params: {min: this.options.minDate.getTime()}})
      }
    }

    if (this.options.maxDate) {
      if (!this.compareDates(value, this.options.maxDate, 'max')) {
        errors.push({code: 'max_date', message: this.options.messages?.maxDate ??
          `Дата должна быть не позднее ${this.options.maxDate!.toLocaleDateString()}`, params: {max: this.options.maxDate.getTime()}})
      }
    }

    return errors
  }

  getTypeName(): string {
    return this.options.isDatetime ? 'дата и время' : 'дата'
  }

  // Compare dates with optional time precision.
  private compareDates(value: Date, boundary: Date, type: 'min' | 'max'): boolean {
    if (this.options.isDatetime) {
      // Compare exact timestamps when time matters.
      if (type === 'min') {
        return value >= boundary // value must be >= minDate
      } else {
        return value <= boundary // value must be <= maxDate
      }
    } else {
      // Compare calendar dates only when time does not matter.
      const valueDate = this.toDateOnly(value)
      const boundaryDate = this.toDateOnly(boundary)

      if (type === 'min') {
        return valueDate >= boundaryDate
      } else {
        return valueDate <= boundaryDate
      }
    }
  }

  private toDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }
}