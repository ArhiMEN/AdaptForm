import {FieldPlugin} from "@core/plugins";

// region messages

export interface messagesOptions {
  isRequired?: string
  validate?: string
  type?: string
  invalid?: string
}

export interface messagesStringOptions extends messagesOptions {
  minLength?: string
  maxLength?: string
  pattern?: string
}

export interface messagesNumberOptions extends messagesOptions {
  gt?: string
  ge?: string
  lt?: string
  le?: string
}

export interface messagesBooleanOptions extends messagesOptions {
  mustBeTrue?: string
  mustBeFalse?: string
}

export interface messagesDateOptions extends messagesOptions {
  minDate?: string
  maxDate?: string
}

export interface messagesDecimalOptions extends messagesOptions {
  gt?: string
  ge?: string
  lt?: string
  le?: string
  decimalPlaces?: string
  maxDigits?: string
}

export interface messagesArrayFieldOptions extends messagesOptions {
  minItems?: string
  maxItems?: string
}

export interface messagesArrayFormFieldOptions extends messagesOptions {
  minForms?: string
  maxForms?: string
}

// endregion

// region FieldTypes

export interface FieldOptions {
  isRequired?: boolean | ((form?: any) => boolean)
  messages?: messagesOptions
  validate?: (value: any, form?: any) => boolean | string
  plugins?: FieldPlugin[]
}

export interface StringOptions extends FieldOptions {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  messages?: messagesStringOptions
}

export interface NumberOptions extends FieldOptions {
  gt?: number // больше
  ge?: number // больше или равно
  lt?: number // меньше
  le?: number // меньше или равно
  messages?: messagesNumberOptions
}

export interface BooleanOptions extends FieldOptions {
  mustBeTrue?: boolean   // если true — значение должно быть true
  mustBeFalse?: boolean// если true — значение должно быть false
  messages?: messagesBooleanOptions
}

export interface DateOptions extends FieldOptions {
  minDate?: Date
  maxDate?: Date
  isDatetime?: boolean
  messages?: messagesDateOptions
}

export interface DecimalOptions extends FieldOptions {
  gt?: number
  ge?: number
  lt?: number
  le?: number
  decimalPlaces?: number  // количество знаков после запятой
  maxDigits?: number  // максимальное общее количество знаков
  messages?: messagesDecimalOptions
}

// endregion

// region additional fields

export interface ArrayFieldOptions {
  isRequired?: boolean | ((form?: any) => boolean)
  messages?: messagesArrayFieldOptions
  validate?: (value: any[], form?: any) => boolean | string
  minItems?: number
  maxItems?: number
}

export interface ArrayFormFieldOptions {
  isRequired?: boolean | ((form?: any) => boolean)
  messages?: messagesArrayFormFieldOptions
  validate?: (value: any[], form?: any) => boolean | string
  minForms?: number
  maxForms?: number
}

// endregion

// region plugins

export interface PluginOptions {
  priority?: number
}

export interface MaskPluginOptions{
  maskFormat: string
  maskPlaceholder: string
  digitPattern: RegExp
}

// endregion