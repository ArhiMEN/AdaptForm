import {FormField} from "../FormField";
import {DateTimeFieldOptions} from "@core/FieldOptions";

type DateValue = Date | string | number | null

export class DateTimeField extends FormField<Date, string> {
  mode: "date" | "datetime"
  min: Date | null
  max: Date | null
  example: string
  format: string | null

  constructor(defaultValue: DateValue = null, options: DateTimeFieldOptions = {}) {
    const normalizedDefault =
      defaultValue instanceof Date
        ? defaultValue
        : defaultValue
          ? new Date(defaultValue)
          : null

    super(normalizedDefault, options)

    this.mode = options.mode ?? "datetime"
    this.min = options.min ? new Date(options.min) : null
    this.max = options.max ? new Date(options.max) : null
    this.example =
      options.example ??
      (this.mode === "date" ? "YYYY-MM-DD" : "YYYY-MM-DD HH:mm")
    this.format = options.format ?? null

    this.validators.push(this.typeValidator.bind(this))
    this.validators.push(this.minValidator.bind(this))
    this.validators.push(this.maxValidator.bind(this))
  }

  protected normalizeValue(value: any): Date | null {
    if (this.fieldIsEmpty(value)) return null

    if (value instanceof Date) return isNaN(value.getTime()) ? null : value

    if (typeof value === "string" && this.format) {
      return this.parseByFormat(value, this.format)
    }

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value)
      return isNaN(parsed.getTime()) ? null : parsed
    }

    return null
  }

  protected parseByFormat(value: string, format: string): Date | null {
    const separators = format.match(/[^A-Z]/gi)
    if (!separators) return null

    const parts = value.split(new RegExp(`[${separators.join("")}]`))
    const formatParts = format.split(new RegExp(`[^A-Z]+`))

    if (parts.length !== formatParts.length) return null

    let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0

    for (let i = 0; i < formatParts.length; i++) {
      const p = parseInt(parts[i], 10)
      if (isNaN(p)) return null

      switch (formatParts[i]) {
        case "YYYY":
          year = p
          break
        case "MM":
          month = p - 1
          break
        case "DD":
          day = p
          break
        case "HH":
          hour = p
          break
        case "mm":
          minute = p
          break
        case "ss":
          second = p
          break
        default:
          break
      }
    }

    const date = new Date(year, month, day, hour, minute, second)
    if (isNaN(date.getTime())) return null
    return date
  }

  get valueClear(): string | null {
    if (!this._value) return null

    const pad = (n: number) => String(n).padStart(2, "0")

    const y = this._value.getFullYear()
    const m = pad(this._value.getMonth() + 1)
    const d = pad(this._value.getDate())

    if (this.mode === "date") return `${y}-${m}-${d}`

    return this._value.toISOString()
  }

  private typeValidator(value: Date | null): string | null {
    if (value === null) return this.isRequired ? `Example: ${this.example}` : null
    if (!(value instanceof Date) || isNaN(value.getTime()))
      return this.example
        ? `Example: ${this.example}`
        : "Invalid date format"
    return null
  }

  private minValidator(value: Date | null): string | null {
    if (!value || !this.min) return null
    return value < this.min
      ? `Date must be after ${this.formatDate(this.min)}`
      : null
  }

  /** 🔹 Максимальная дата */
  private maxValidator(value: Date | null): string | null {
    if (!value || !this.max) return null
    return value > this.max
      ? `Date must be before ${this.formatDate(this.max)}`
      : null
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    return this.mode === "date" ? `${y}-${m}-${d}` : `${y}-${m}-${d} ${h}:${min}`
  }
}