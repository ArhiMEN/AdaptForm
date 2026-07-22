import {FieldType} from "@core/types/FieldType"
import {DecimalOptions} from "@core/options"

export class DecimalType extends FieldType<number | string, DecimalOptions> {
  constructor(options: DecimalOptions = {} as DecimalOptions) {
    super({
      decimalPlaces: 2,
      maxDigits: 8,
      ...options
    } as DecimalOptions)
  }

  cast(rawValue: any): number | string | null {
    if (rawValue === null || rawValue === undefined) return null

    if (typeof rawValue === 'string') {
      return this.castString(rawValue)
    }

    if (typeof rawValue === 'number' && !isNaN(rawValue)) {
      return rawValue
    }

    return null
  }

  private castString(value: string): string | null {
    const trimmed = value.trim()

    if (!trimmed) return null

    // Заменяем запятую на точку
    const normalized = trimmed.replace(',', '.')

    // Проверяем, что строка похожа на число
    if (!this.isValidNumberString(normalized)) {
      return null
    }

    return normalized
  }

  validate(value: number | string): string[] {
    const errors: string[] = []
    value = typeof value === 'number' ? this.numberToString(value) : value

    // Проверяем, что строка соответствует формату числа
    if (!this.isValidNumberString(value)) {
      errors.push(this.options.messages?.invalid ?? 'Пример: 1.00')
      return errors
    }

    const maxDigits = this.options.maxDigits || 8
    const decimalPlaces = this.options.decimalPlaces || 2
    const maxIntDigits = maxDigits - decimalPlaces

    // Разбираем строку на части
    const isNegative = value.startsWith('-')
    const normalizedValue = isNegative ? value.substring(1) : value
    const parts = normalizedValue.split('.')
    const intPart = parts[0]
    const decPart = parts.length > 1 ? parts[1] : ''

    // Проверка на точку в конце (пользователь ещё вводит)
    if (normalizedValue.endsWith('.')) {
      // Проверяем только целую часть
      if (intPart.length > maxIntDigits) {
        errors.push(
          this.options.messages?.maxDigits ??
          `Максимальное количество знаков перед запятой ${maxIntDigits}`
        )
      }
      return errors
    }

    // Проверка целой части
    if (intPart.length === 0) {
      errors.push(this.options.messages?.invalid ?? 'Пример: 1.00')
      return errors
    }

    if (intPart.length > maxIntDigits) {
      errors.push(
        this.options.messages?.maxDigits ??
        `Максимальное количество знаков перед запятой ${maxIntDigits}`
      )
    }

    // Проверка десятичной части
    if (parts.length === 2) {
      // Общее количество знаков
      if (intPart.length + decPart.length > maxDigits) {
        errors.push(
          this.options.messages?.maxDigits ??
          `Максимальное количество знаков ${maxDigits}`
        )
      }

      // Количество знаков после запятой
      if (decPart.length === 0) {
        errors.push(
          this.options.messages?.invalid ??
          'После точки должен быть минимум 1 знак'
        )
      } else if (decPart.length > decimalPlaces) {
        errors.push(
          this.options.messages?.decimalPlaces ??
          `Максимальное количество знаков после запятой ${decimalPlaces}`
        )
      }
    }

    // Если есть ошибки формата — дальше не проверяем
    if (errors.length > 0) return errors

    // Проверка min/max (только если значение не в процессе ввода)
    if (!value.endsWith('.')) {
      const numValue = parseFloat(value)

      if (!isNaN(numValue)) {
        if (this.options.gt != null && numValue <= this.options.gt) {
          errors.push(
            this.options.messages?.gt ??
            `Значение должно быть больше ${this.options.gt}`
          )
        }

        if (this.options.ge != null && numValue < this.options.ge) {
          errors.push(
            this.options.messages?.ge ??
            `Значение должно быть не менее ${this.options.ge}`
          )
        }

        if (this.options.lt != null && numValue >= this.options.lt) {
          errors.push(
            this.options.messages?.lt ??
            `Значение должно быть меньше ${this.options.lt}`
          )
        }

        if (this.options.le != null && numValue > this.options.le) {
          errors.push(
            this.options.messages?.le ??
            `Значение должно быть не более ${this.options.le}`
          )
        }
      }
    }

    return errors
  }

  private isValidNumberString(value: string): boolean {
    // Разрешаем: 123, 123.45, -123.45, 123.
    const pattern = /^-?\d+\.?\d*$/

    // Проверяем, что нет больше одной точки
    const dotCount = (value.match(/\./g) || []).length
    if (dotCount > 1) return false

    // Проверяем формат
    return pattern.test(value)
  }

  private numberToString(value: number): string {
    const decimalPlaces = this.options.decimalPlaces

    return value.toFixed(decimalPlaces)
  }

  getTypeName(): string {
    return 'десятичное число'
  }
}