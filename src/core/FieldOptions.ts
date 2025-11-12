export interface FormFieldOptions {
  isRequired?: boolean
  validators?: Array<(value: any) => string | null>
}

export interface StringFieldOptions extends FormFieldOptions {
  minLength?: number
  maxLength?: number
  regex?: RegExp | string
  mask?: string
  example?: string
  returnWithMask?: boolean
}

export interface NumberFieldOptions extends FormFieldOptions {
  min?: number
  max?: number
  example?: string
}

export interface DateTimeFieldOptions extends FormFieldOptions {
  mode?: "date" | "datetime"
  min?: Date | string | number
  max?: Date | string | number
  example?: string
  format?: string
}
