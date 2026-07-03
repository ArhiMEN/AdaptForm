import {Form} from "@core/Form";
import {ArrayFormFieldOptions} from "@core/options";

export class ArrayFormField<T extends Form = Form> {
  private _forms: T[] = []
  private _errors: string[] = []

  isTouched: boolean = false

  constructor(
    private FormConstructor: new () => T,
    private options: ArrayFormFieldOptions = {},
    initial: any[] = []
  ) {
    this._forms = initial.map(data => {
      const form = new this.FormConstructor()
      form.fields = data
      return form
    })
    this.checkValid()
  }


  // ===== value =====

  set forms(forms: any[]) {
    this.clear()

    for (const f of forms) {
      this.add(f, false)
    }

    this.checkValid()
  }

  get forms(): Form[] {
    return this._forms
  }

  get formsFieldsValue(): any[] {
    return this._forms.map(i => i.fieldsValue)
  }

  // ===== actions =====

  add(data?: any, force_check?: boolean): T {
    const form = new this.FormConstructor()

    if (data) form.fields = data

    this.isTouched = true
    this._forms.push(form)

    if (force_check) this.checkValid()

    return form
  }

  remove(index: number): void {
    this._forms.splice(index, 1)
    this.checkValid()
  }

  clear(): void {
    this._forms = []
    this.checkValid()
  }

  reset(): void {
    this._forms.forEach(f => f.reset())
    this._errors = []
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
    this._errors = []

    if (this.isRequired(form) && this.forms.length === 0) {
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

    for (const form of this.forms) {
      const ok = form.checkValid(form)
      if (!ok) valid = false
    }

    if (this.options.validate) {
      const result = this.options.validate(this.forms, form)

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
    // Если есть ошибки массива форм - не валиден
    if (this._errors.length > 0) return false
    
    // Проверяем, что все формы валидны (checkValid() === true)
    return this._forms.every(i => i.checkValid() === true)
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