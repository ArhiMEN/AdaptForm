import {FieldOptions} from "@core/options";
import {FieldType} from "@core/types/FieldType";
import {Form} from "@core/Form";
type FieldTypeConstructor<T, O extends FieldOptions = FieldOptions> = new (options: O) => FieldType<T, O>

export class Field<T = any, O extends FieldOptions = FieldOptions> {
  protected _rawValue: any = null
  protected _valueClear: T | null = null
  protected fieldType: FieldType<T, O>
  protected defaultValue: T | null
  protected _errors: string[] = []

  isValid: boolean | null = null
  isTouched: boolean = false

  constructor(
    TypeConstructor: FieldTypeConstructor<T, O>,
    defaultValue?: T | null,
    options?: O | null,
  ) {
    this.fieldType = new TypeConstructor(options ?? {} as O)
    this.defaultValue = defaultValue ?? null

    for (const plugin of this.options.plugins ?? []) {
      plugin.init?.(this)
    }

    if (defaultValue !== undefined && defaultValue !== null) {
      this.rawValue = defaultValue
    } else {
      this._rawValue = null
      this._valueClear = null
      this.isValid = null
    }
  }

  // ========== Геттеры/сеттеры ==========

  protected get plugins() {
    return [...(this.options.plugins ?? [])].sort((a, b) => {
      return (a.pluginOptions?.priority ?? 0) - (b.pluginOptions?.priority ?? 0)
    })
  }

  get options() {
    return this.fieldType.options
  }

  set options(options: O) {
    let cur_options = this.fieldType.options
    this.fieldType.options = Object.assign(cur_options, options)
  }

  get rawValue(): T | null {
    return this._rawValue
  }

  set rawValue(input: any) {
    let rawValue = input

    for (const plugin of this.plugins) {
      if (plugin.toRawValue) {
        rawValue = plugin.toRawValue(rawValue, this)
      }
    }

    let valueClear = rawValue

    for (const plugin of this.plugins) {
      if (plugin.toValueClear) {
        valueClear = plugin.toValueClear(valueClear, this)
      }
    }

    this._rawValue = rawValue
    this._valueClear = this.fieldType.cast(valueClear)

    this._errors = []
    this.isTouched = true
    this.checkAndSetValid()
  }

  get errors(): string[] {
    return this._errors
  }

  get error(): string {
    return this._errors[0] ?? ''
  }

  set error(message: string | null) {
    if (message) {
      this._errors = [message]
    } else {
      this._errors = []
    }
    this.isValid = message ? false : null
  }

  get valueClear(): any {
    return this._valueClear
  }

  // ========== Валидация ==========

  private isRequired(form?: Form): boolean {
    let isRequired
    if (typeof this.options.isRequired === 'function') {
      isRequired = this.options.isRequired(form ?? null)
    } else {
      isRequired = this.options.isRequired ?? false
    }

    return isRequired
  }

  checkValid(form?: Form): boolean {
    this._errors = []

    // 1. Проверка на пустоту и обязательность
    if (this.isEmpty) {
      if (this.isRequired(form)) {
        this._errors.push(this.options.messages?.isRequired ?? 'Поле обязательно для заполнения')
        return false
      }
      return true
    }

    // 2. Проверка, что значение привелось к нужному типу
    if (this._valueClear === null) {
      this._errors.push(
        this.options.messages?.type ??
        `Ожидается ${this.fieldType.getTypeName()}`
      )
      return false
    }

    // 3. Специфичная валидация типа
    const typeErrors = this.fieldType.validate(this._valueClear, form)
    if (typeErrors.length > 0) {
      this._errors.push(...typeErrors)
      return false
    }

    // 4. Кастомная валидация
    if (this.options.validate) {
      const result = this.options.validate(this._valueClear, form)
      if (result === false) {
        this._errors.push(this.options.messages?.validate ?? 'Значение не прошло валидацию')
        return false
      }
      if (typeof result === 'string') {
        this._errors.push(result)
        return false
      }
    }

    return true
  }

  checkAndSetValid(form?: Form): boolean {
    this.isValid = this.checkValid(form)
    return this.isValid
  }

  get isEmpty(): boolean {
    let isEmpty = false
    if (this._rawValue === null || this._rawValue === undefined) isEmpty = true
    else if (this._rawValue === '') isEmpty = true
    else if (Array.isArray(this._rawValue) && this._rawValue.length === 0) isEmpty = true
    return isEmpty
  }

  // ========== Вспомогательные методы ==========

  reset(): void {
    if (this.defaultValue !== null && this.defaultValue !== undefined) {
      this.rawValue = this.defaultValue
    } else {
      this._rawValue = null
      this._valueClear = null
      this.isValid = null
    }
    this._errors = []
    this.isTouched = false
  }
}