import {Form} from "@core/Form"
import {ArrayFormFieldOptions} from "@core/options"
import {isValidArrayIndex} from "@core/fields/arrayUtils"

export class ArrayFormField<T extends Form = Form> {
  private _forms: T[] = []
  private _errors: string[] = []
  private _hasValidationResult = false

  isTouched: boolean = false

  constructor(
    private FormConstructor: new () => T,
    private options: ArrayFormFieldOptions = {},
    initial: unknown[] = []
  ) {
    this._forms = initial.map(data => {
      const form = new this.FormConstructor()
      form.fields = data as Record<string, unknown>
      return form
    })
    this.checkValid()
  }

  // ===== value =====

  set forms(forms: unknown[]) {
    this.clear()

    for (const formData of forms) {
      this.add(formData, false)
    }

    this.checkValid()
  }

  get forms(): T[] {
    return this._forms
  }

  get formsFieldsValue(): unknown[] {
    return this._forms.map(form => form.fieldsValue)
  }

  // ===== actions =====

  add(data?: unknown, force_check: boolean = true): T {
    const form = new this.FormConstructor()

    if (data !== undefined && data !== null) {
      form.fields = data as Record<string, unknown>
    }

    this.isTouched = true
    this._forms.push(form)

    if (force_check) this.checkValid()

    return form
  }

  remove(index: number): void {
    if (!isValidArrayIndex(index, this._forms.length)) return

    this._forms.splice(index, 1)
    this.checkValid()
  }

  clear(): void {
    this._forms = []
    this.checkValid()
  }

  reset(): void {
    this._forms.forEach(form => form.reset())
    this._errors = []
    this._hasValidationResult = false
    this.isTouched = false
  }

  // ===== validation =====

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
    this._hasValidationResult = true
    this._errors = []

    if (this.isRequired(form) && this._forms.length === 0) {
      this._errors.push(
        this.options.messages?.isRequired ??
        "Добавьте хотя бы один элемент"
      )
      return false
    }

    if (this.options.minForms != null && this._forms.length < this.options.minForms) {
      this._errors.push(
        this.options.messages?.minForms ??
        `Значений должно быть не меньше ${this.options.minForms}`
      )
      return false
    }

    if (this.options.maxForms != null && this._forms.length > this.options.maxForms) {
      this._errors.push(
        this.options.messages?.maxForms ??
        `Значений должно быть не больше ${this.options.maxForms}`
      )
      return false
    }

    let valid = true

    for (const nestedForm of this._forms) {
      const ok = nestedForm.checkValid(nestedForm)
      if (!ok) valid = false
    }

    if (this.options.validate) {
      const result = this.options.validate(this._forms, form)

      if (result === false) {
        this._errors.push(
          this.options.messages?.validate ??
          "Ошибка валидации"
        )
        return false
      }

      if (typeof result === "string") {
        this._errors.push(result)
        return false
      }
    }

    return valid && this._errors.length === 0
  }

  checkAndSetValid(form?: Form): boolean {
    return this.checkValid(form)
  }

  get isValid(): boolean {
    if (!this._hasValidationResult) return false
    if (this._errors.length > 0) return false

    return this._forms.every(form => form.isValid)
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
  }
}
