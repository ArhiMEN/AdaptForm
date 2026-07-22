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
    const errors: string[] = []

    if (this.options.mustBeTrue && value !== true) {
      errors.push(this.options.messages?.mustBeTrue ?? 'Значение должно быть true')
    }

    if (this.options.mustBeFalse && value !== false) {
      errors.push(this.options.messages?.mustBeFalse ?? 'Значение должно быть false')
    }

    return errors
  }

  getTypeName(): string {
    return 'логическое значение'
  }
}