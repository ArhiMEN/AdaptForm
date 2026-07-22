import {FieldType} from "@core/types/FieldType"
import {StringOptions} from "@core/options"

export class StringType extends FieldType<string, StringOptions> {
  cast(rawValue: any): string | null {
    if (rawValue === null || rawValue === undefined) return null
    if (typeof rawValue === 'string') return rawValue
    return String(rawValue)
  }

  validate(value: string): string[] {
    const errors: string[] = []

    if (this.options.minLength != null && value.length < this.options.minLength) {
      errors.push(
        this.options.messages?.minLength ??
        `Минимальная длина ${this.options.minLength} символов`
      )
    }

    if (this.options.maxLength != null && value.length > this.options.maxLength) {
      errors.push(
        this.options.messages?.maxLength ??
        `Максимальная длина ${this.options.maxLength} символов`
      )
    }

    if (this.options.pattern != null && !this.options.pattern.test(value)) {
      errors.push(this.options.messages?.pattern ?? 'Неверный формат')
    }

    return errors
  }

  getTypeName(): string {
    return 'строка'
  }
}