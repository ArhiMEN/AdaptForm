import {Field} from "@core/fields/Field";
import {ArrayField} from "@core/fields/ArrayField";
import {ArrayFormField} from "@core/fields/ArrayFormField";

export abstract class Form {
  private _globalErrors: Record<string, string> = {}

  protected get _fields(): Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>> {
    const fields: Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>> = {}

    for (const key of Object.keys(this)) {
      const property = (this as any)[key]
      if (property instanceof Field || property instanceof ArrayField || property instanceof ArrayFormField) {
        fields[key] = property
      }
    }

    return fields
  }

  checkValid(form?: this): boolean {  // ✅ Form → this
    let isFormValid = true
    const fields = this._fields

    for (const key of Object.keys(fields)) {
      const field = fields[key]
      if (!field.checkAndSetValid(form ?? this)) {
        isFormValid = false
      }
    }

    return isFormValid
  }

  get fieldsValue(): Record<string, any> {
    const data: Record<string, any> = {}
    const fields = this._fields

    for (const key of Object.keys(fields)) {
      let valueClear = null
      const field = fields[key]
      if (field instanceof Field) valueClear = field.valueClear
      else if (field instanceof ArrayField) valueClear = field.itemsValue
      else if (field instanceof ArrayFormField) valueClear = field.formsFieldsValue
      else console.error(`Invalid field "${key}" type`)
      data[key] = valueClear
    }

    return data
  }

  set fields(data: Record<string, any>) {
    const fields = this._fields

    for (const key of Object.keys(data)) {
      const field = fields[key]
      if (field) {
        if (field instanceof Field) field.rawValue = data[key]
        else if (field instanceof ArrayField) field.itemsValue = data[key]
        else if (field instanceof ArrayFormField) field.forms = data[key]
        else console.error(`Invalid field "${key}" type`)
      }
    }
  }

  get allErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {}
    const fields = this._fields

    for (const key of Object.keys(fields)) {
      const fieldErrors = fields[key].errors
      if (fieldErrors.length > 0) {
        errors[key] = fieldErrors
      }
    }

    // Добавляем глобальные ошибки
    for (const key of Object.keys(this._globalErrors)) {
      if (!errors[key]) {
        errors[key] = []
      }
      errors[key].push(this._globalErrors[key])
    }

    return errors
  }

  get globalErrors(): Record<string, string> {
    return {...this._globalErrors}
  }

  set errors(errors: Record<string, string>) {
    const fields = this._fields
    this._globalErrors = {}

    for (const key of Object.keys(errors)) {
      const keys = key.split('.')
      const cleanKey = keys.length > 1 ? keys[1] : key

      if (cleanKey in fields && fields[cleanKey]) {
        fields[cleanKey].error = errors[key]
      } else {
        this._globalErrors[key] = errors[key]
      }
    }
  }

  setGlobalError(key: string, message: string): void {
    this._globalErrors[key] = message
  }

  clearGlobalErrors(): void {
    this._globalErrors = {}
  }

  reset(): void {
    const fields = this._fields
    for (const key of Object.keys(fields)) {
      fields[key].reset()
    }
    this._globalErrors = {}
  }

  get isTouched(): boolean {
    const fields = this._fields
    for (const key of Object.keys(fields)) {
      if (fields[key].isTouched) return true
    }
    return false
  }

  // Проверить, валидна ли форма
  get isValid(): boolean {
    const fields = this._fields
    for (const key of Object.keys(fields)) {
      if (fields[key].isValid !== true) return false
    }
    return Object.keys(this._globalErrors).length === 0
  }

  // Получить все значения в виде FormData (для отправки на сервер)
  toFormData(): FormData {
    const formData = new FormData()
    const data = this.fieldsValue

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        formData.append(key, value.toISOString())
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value))
      }
    }

    return formData
  }

  // Получить все значения в виде JSON
  toJSON(): Record<string, any> {
    const data = this.fieldsValue

    // Преобразуем даты в строки для JSON
    const json: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        json[key] = value.toISOString()
      } else {
        json[key] = value
      }
    }

    return json
  }
}