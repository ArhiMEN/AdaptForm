import {FormField} from "../FormField";
import {StringFieldOptions} from "@core/FieldOptions";

export class StringField extends FormField<string> {
  minLength: number | null
  maxLength: number | null
  regex: RegExp
  example: string
  mask: string | null
  returnWithMask: boolean

  constructor(defaultValue: string = '', options: StringFieldOptions = {}) {
    super(defaultValue, options)

    this.minLength = options.minLength ?? null
    this.maxLength = options.maxLength ?? null
    this.regex = options.regex instanceof RegExp ? options.regex : new RegExp(options.regex || '.*')
    this.example = options.example ?? 'Enter a valid string'
    this.mask = options.mask ?? null
    this.returnWithMask = options.returnWithMask ?? false

    this.validators.push(this.minLengthValidator.bind(this))
    this.validators.push(this.maxLengthValidator.bind(this))
    this.validators.push(this.regexValidator.bind(this))
  }

  protected normalizeValue(value: string | null): string | null {
    if (this.fieldIsEmpty(value)) return ''
    return String(value)
  }

  get valueClear(): string | null {
    if (this.returnWithMask) {
      return this._value === '' ? null : this._value
    }

    if (!this.mask) return this._value || null

    const mask_replace = this.mask.split(/_/g).join('')
    return (this._value || '').replace(new RegExp(`[${mask_replace}]`, 'g'), '')
  }

  get value(): string | null {
    return this._value
  }

  set value(value: string | null) {
    if (!this.mask || !value) {
      super.value = value
      return
    }

    const maskChars = this.mask.replace(/_/g, '')
    const clearValue = value.replace(new RegExp(`[${maskChars}]`, 'g'), '')

    if (!clearValue) {
      super.value = ''
      return
    }

    let i = 0;
    const masked = this.mask.replace(/_/g, () => clearValue[i++] ?? '_');

    const cutAt = masked.indexOf('_');
    super.value = cutAt === -1 ? masked : masked.slice(0, cutAt);
  }

  private minLengthValidator(value: string | null): string | null {
    if (this.minLength === null || !value) return null
    return value.length < this.minLength
      ? `Minimum ${this.minLength} characters`
      : null
  }

  private maxLengthValidator(value: string | null): string | null {
    if (this.maxLength === null || !value) return null
    return value.length > this.maxLength
      ? `Maximum ${this.maxLength} characters`
      : null
  }

  private regexValidator(value: string | null): string | null {
    if (!value) return null
    return this.regex.test(value)
      ? null
      : this.example
        ? `Example: ${this.example}`
        : 'Invalid format'
  }
}
