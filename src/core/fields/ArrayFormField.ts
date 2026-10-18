import {ObservableNode} from "@core/state/ObservableNode"
import {snapshotValue, type ArrayFormSnapshot} from "@core/state/snapshot"
import {copyValue, equalValue} from "@core/state/value"
import {Form, type FormFieldsValue} from "@core/Form"
import {ArrayFormFieldOptions} from "@core/options"
import {isValidArrayIndex} from "@core/fields/arrayUtils"

export class ArrayFormField<T extends Form = Form> extends ObservableNode<ArrayFormSnapshot> {
  protected captureState(): ArrayFormSnapshot {
    return {formsFieldsValue: snapshotValue(this.formsFieldsValue) as ArrayFormSnapshot['formsFieldsValue'],
      forms: this._forms.map(form => form.getSnapshot()), errors: [...this._errors],
      isValid: this.isValid, isTouched: this.isTouched, isDirty: this.isDirty}
  }

  private _forms: T[] = []
  private _errors: string[] = []
  protected stateChildren(): readonly ObservableNode<unknown>[] {
    return this._forms
  }

  private _baseline: unknown = []
  private _hasValidationResult = false

  private _isTouched: boolean = false

  get isTouched(): boolean { return this._isTouched }
  set isTouched(value: boolean) {
    this.update(() => { this._isTouched = value })
  }

  constructor(
    private FormConstructor: new () => T,
    private options: ArrayFormFieldOptions = {},
    initial: unknown[] = []
  ) {
    super()
    this._forms = initial.map(data => {
      const form = new this.FormConstructor()
      form.setFields(data as Record<string, unknown>, false)
      return form
    })
    this.validateAfterMutation(() => this.checkValid())
    this.commitBaseline()
  }

  get isDirty(): boolean {
    return !equalValue(this.formsFieldsValue, this._baseline) || this._forms.some(child => child.isDirty)
  }

  commitBaseline(): void {
    return this.update(() => {
      for (const child of this._forms) child.commitBaseline()
      this._baseline = copyValue(this.formsFieldsValue)
      })
  }

  // ===== value =====

  set forms(forms: unknown[]) {
    this.setForms(forms)
  }

  setForms(forms: unknown[], validate: boolean = true): void {
    return this.update(() => {
      this._forms = []

      for (const formData of forms) {
        this.add(formData, false)
      }

      if (validate) this.validateAfterMutation(() => this.checkValid())
      })
  }

  get forms(): T[] {
    return this._forms
  }

  get formsFieldsValue(): FormFieldsValue<T>[] {
    return this._forms.map(form => form.fieldsValue)
  }

  // ===== actions =====

  add(data?: unknown, force_check: boolean = true): T {
    return this.update(() => {
      const form = new this.FormConstructor()

      if (data !== undefined && data !== null) {
        form.setFields(data as Record<string, unknown>, false)
      }

      form.commitBaseline()
      this.isTouched = true
      this._forms.push(form)

      if (force_check) this.validateAfterMutation(() => this.checkValid())

      return form
      })
  }

  remove(index: number): void {
    return this.update(() => {
      if (!isValidArrayIndex(index, this._forms.length)) return

      this._forms.splice(index, 1)
      this.checkValid()
      })
  }

  clear(): void {
    return this.update(() => {
      this._forms = []
      this.checkValid()
      })
  }

  reset(): void {
    return this.update(() => {
      this._forms.forEach(form => form.reset())
      this._errors = []
      this._hasValidationResult = false
      this.isTouched = false
      })
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
    return this.update(() => {
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
      })
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
    this.update(() => {
      if (message) {
        this._errors = [message]
        this._hasValidationResult = true
      } else {
        this._errors = []
        this._hasValidationResult = false
      }
      })
  }
}
