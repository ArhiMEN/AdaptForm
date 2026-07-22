import {FieldType} from "@core/types/FieldType"
import {NumberOptions} from "@core/options"

export class NumberType extends FieldType<number, NumberOptions> {
  cast(rawValue: any): number | null {
    if (rawValue === null || rawValue === undefined) return null
    if (typeof rawValue === 'number' && !isNaN(rawValue)) return rawValue

    if (typeof rawValue === 'string') {
      const num = Number(rawValue)
      return isNaN(num) ? null : num
    }

    return null
  }

    validate(value: number): string[] {
    const errors: string[] = []

    if (!Number.isInteger(value)) {
      errors.push(this.options.messages?.invalid ?? 'Значение должно быть целым числом')
    }

    if (this.options.gt != null && value <= this.options.gt) {
      errors.push(
        this.options.messages?.gt ??
        `Значение должно быть больше ${this.options.gt}`
      )
    }

    if (this.options.ge != null && value < this.options.ge) {
      errors.push(
        this.options.messages?.ge ??
        `Значение должно быть не менее ${this.options.ge}`
      )
    }

    if (this.options.lt != null && value >= this.options.lt) {
      errors.push(
        this.options.messages?.lt ??
        `Значение должно быть меньше ${this.options.lt}`
      )
    }

    if (this.options.le != null && value > this.options.le) {
      errors.push(
        this.options.messages?.le ??
        `Значение должно быть не более ${this.options.le}`
      )
    }

    return errors
  }

  getTypeName(): string {
    return 'число'
  }
}