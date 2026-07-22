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
    const errors: string[] = []

    if (isNaN(value.getTime())) {
      errors.push(this.options.messages?.invalid ?? 'Неверная дата')
      return errors
    }

    if (this.options.minDate) {
      if (!this.compareDates(value, this.options.minDate, 'min')) {
        errors.push(
          this.options.messages?.minDate ??
          `Дата должна быть не ранее ${this.options.minDate!.toLocaleDateString()}`
        )
      }
    }

    if (this.options.maxDate) {
      if (!this.compareDates(value, this.options.maxDate, 'max')) {
        errors.push(
          this.options.messages?.maxDate ??
          `Дата должна быть не позднее ${this.options.maxDate!.toLocaleDateString()}`
        )
      }
    }

    return errors
  }

  getTypeName(): string {
    return this.options.isDatetime ? 'дата и время' : 'дата'
  }

  // Сравнение дат с учётом времени
  private compareDates(value: Date, boundary: Date, type: 'min' | 'max'): boolean {
    if (this.options.isDatetime) {
      // Если время важно — сравниваем точно
      if (type === 'min') {
        return value >= boundary // value должен быть >= minDate
      } else {
        return value <= boundary // value должен быть <= maxDate
      }
    } else {
      // Если время не важно — сравниваем только даты
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