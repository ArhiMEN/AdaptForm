import {DateTime} from "luxon";
import {FieldType} from "@core/types/FieldType";
import {FieldOptions, messagesOptions} from "@core/options";

export interface messagesDateLuxonOptions extends messagesOptions {
  minDate?: string
  maxDate?: string
}

export interface DateLuxonOptions extends FieldOptions {
  minDate?: DateTime
  maxDate?: DateTime
  inputFormat?: string
  outputFormat?: string
  isDatetime?: boolean
  messages?: messagesDateLuxonOptions
}

export class DateLuxonType extends FieldType<DateTime, DateLuxonOptions> {
  cast(rawValue: any): DateTime | null {
    if (rawValue === null || rawValue === undefined) return null

    if (rawValue instanceof DateTime) {
      return rawValue.isValid ? this.normalize(rawValue) : null
    }

    if (rawValue instanceof Date) {
      if (isNaN(rawValue.getTime())) return null
      return DateTime.fromJSDate(rawValue)
    }

    if (typeof rawValue === 'number') {
      const dt = DateTime.fromMillis(rawValue)
      return dt.isValid ? this.normalize(dt) : null
    }

    if (typeof rawValue === 'string') {
      return this.parseString(rawValue)
    }

    return null
  }

  private parseString(dateString: string): DateTime | null {
    if (!dateString || !dateString.trim()) return null

    const trimmed = dateString.trim()

    if (this.options.inputFormat) {
      const dt = DateTime.fromFormat(trimmed, this.options.inputFormat)
      return dt.isValid ? this.normalize(dt) : null
    }

    const isoDt = DateTime.fromISO(trimmed)
    if (isoDt.isValid) return this.normalize(isoDt)

    const httpDt = DateTime.fromHTTP(trimmed)
    if (httpDt.isValid) return this.normalize(httpDt)

    const rfcDt = DateTime.fromRFC2822(trimmed)
    if (rfcDt.isValid) return this.normalize(rfcDt)

    return null
  }

  private normalize(date: DateTime): DateTime {
    let normalize_dt = date
    if (!this.options.isDatetime) {
      normalize_dt = DateTime.fromObject({
        day: date.day,
        month: date.month,
        year: date.year,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0
      })
    }

    return normalize_dt
  }

  validate(value: DateTime): string[] {
    const errors: string[] = []

    if (!value.isValid) {
      errors.push(
        this.options.messages?.invalid ??
        `Неверная дата: ${value.invalidExplanation}`
      )
      return errors
    }

    if (this.options.minDate) {
      const minDate = this.normalizeForComparison(this.options.minDate)
      const compareValue = this.normalizeForComparison(value)

      if (compareValue < minDate) {
        errors.push(
          this.options.messages?.minDate ??
          `Дата должна быть не ранее ${this.formatDateTime(this.options.minDate)}`
        )
      }
    }

    if (this.options.maxDate) {
      const maxDate = this.normalizeForComparison(this.options.maxDate)
      const compareValue = this.normalizeForComparison(value)

      if (compareValue > maxDate) {
        errors.push(
          this.options.messages?.maxDate ??
          `Дата должна быть не позднее ${this.formatDateTime(this.options.maxDate)}`
        )
      }
    }

    const year = value.year
    if (year < 1900 || year > 2100) {
      errors.push(this.options.messages?.invalid ?? 'Некорректный год')
    }

    return errors
  }

  getTypeName(): string {
    return this.options.isDatetime ? 'дата и время' : 'дата'
  }

  private normalizeForComparison(dt: DateTime): DateTime {
    if (this.options.isDatetime) {
      return dt
    }
    return dt.startOf('day')
  }

  private formatDateTime(dt: DateTime): string {
    if (this.options.outputFormat) {
      return dt.toFormat(this.options.outputFormat)
    }

    if (this.options.isDatetime) {
      return dt.toFormat('dd.MM.yyyy HH:mm')
    }

    return dt.toFormat('dd.MM.yyyy')
  }
}