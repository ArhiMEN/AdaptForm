import {Field} from "@core/fields/Field"
import {ArrayField} from "@core/fields/ArrayField"
import {ArrayFormField} from "@core/fields/ArrayFormField"
import {DefaultErrorsSchema, ErrorsSchema} from "@core/ErrorsShema"

export abstract class Form {
  private _globalErrors: Record<string, string> = {}
  errorsShema: ErrorsSchema = DefaultErrorsSchema

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

  checkValid(form?: this): boolean {
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
      const field = fields[key]

      if (field instanceof ArrayFormField) {
        // Для ArrayFormField собираем ошибки из всех вложенных форм
        const formErrors = this.collectArrayFormErrors(field)
        if (formErrors.length > 0) {
          errors[key] = formErrors
        }
      } else {
        // Для Field и ArrayField берем их собственные ошибки
        const fieldErrors = field.errors
        if (fieldErrors.length > 0) {
          errors[key] = fieldErrors
        }
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

  /**
   * Рекурсивно собирает все ошибки из ArrayFormField
   */
  private collectArrayFormErrors(arrayField: ArrayFormField): string[] {
    const allErrors: string[] = []

    // Ошибки самого ArrayFormField
    allErrors.push(...arrayField.errors)

    // Ошибки из каждой формы в массиве
    for (let i = 0; i < arrayField.forms.length; i++) {
      const form = arrayField.forms[i]
      const formAllErrors = form.allErrors

      for (const [fieldName, fieldErrors] of Object.entries(formAllErrors)) {
        for (const error of fieldErrors) {
          allErrors.push(`Форма ${i + 1}, ${fieldName}: ${error}`)
        }
      }
    }

    return allErrors
  }

  get globalErrors(): Record<string, string> {
    return {...this._globalErrors}
  }

  set errors(errors: Record<string, any>) {
    const fields = this._fields
    this._globalErrors = {}

    // Очищаем все ошибки полей перед установкой новых
    for (const key of Object.keys(fields)) {
      fields[key].error = null
    }

    // Используем схему для парсинга ошибок
    const parsedErrors = this.errorsShema.parseErrors(errors)

    // Обрабатываем распарсенные ошибки
    for (const [fieldName, errorMessage] of Object.entries(parsedErrors)) {
      this.applyErrorToField(fieldName, errorMessage, fields, this)
    }
  }

  /**
   * Применяет ошибку к соответствующему полю
   * Поддерживает вложенные поля через точечную нотацию
   */
  private applyErrorToField(
    fieldPath: string,
    errorMessage: string,
    fields: Record<string, Field<any> | ArrayField<any> | ArrayFormField<any>>,
    targetForm: Form
  ): void {
    // Защита от undefined targetForm
    if (!targetForm) {
      console.error('applyErrorToField: targetForm is undefined')
      return
    }

    // Сначала проверяем прямое совпадение с полем
    if (fieldPath in fields && fields[fieldPath]) {
      fields[fieldPath].error = errorMessage
      return
    }

    // Если прямого совпадения нет, разбираем как вложенный путь
    const parts = fieldPath.split('.')
    const rootField = parts[0]

    if (rootField in fields && fields[rootField]) {
      const field = fields[rootField]

      if (parts.length === 1) {
        field.error = errorMessage
      } else if (parts.length > 1) {
        this.applyNestedError(field, parts.slice(1), errorMessage, fieldPath, targetForm)
      }
    } else {
      // Если поле не найдено, добавляем в глобальные ошибки целевой формы
      targetForm.setGlobalError(fieldPath, errorMessage)
    }
  }

  private applyNestedError(
    field: Field<any> | ArrayField<any> | ArrayFormField<any>,
    pathParts: string[],
    errorMessage: string,
    fullPath: string,
    targetForm: Form
  ): void {
    // Защита от undefined targetForm
    if (!targetForm) {
      console.error('applyNestedError: targetForm is undefined')
      return
    }

    const [currentPart, ...remainingParts] = pathParts

    // Обработка ArrayFormField (массив форм)
    if (field instanceof ArrayFormField) {
      const index = parseInt(currentPart)
      if (!isNaN(index) && index >= 0 && index < field.forms.length) {
        const form = field.forms[index]
        if (remainingParts.length > 0) {
          // Рекурсивно применяем к полю внутри формы
          const formFields = form['_fields']
          // Передаем form как целевую форму для глобальных ошибок
          this.applyErrorToField(remainingParts.join('.'), errorMessage, formFields, form)
        } else {
          // Если это индекс без указания конкретного поля,
          // добавляем как глобальную ошибку формы
          form.setGlobalError(`index_${index}`, errorMessage)
        }
      } else {
        // Индекс вне диапазона - добавляем в глобальные ошибки целевой формы
        targetForm.setGlobalError(fullPath, errorMessage)
      }
    }
    // Для ArrayField и Field - добавляем в глобальные ошибки целевой формы
    else {
      targetForm.setGlobalError(fullPath, errorMessage)
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