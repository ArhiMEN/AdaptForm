import type {ValidationErrorInput} from './ValidationError'
import {FieldPlugin} from "@core/plugins"

// Region: field types

/** A literal, direct Field property of the enabled Form. No dot-path parsing. */
export type DependencyPath = readonly [string]
export interface DependencyRef {
  readonly path: DependencyPath
}

export interface FieldOptions {
  readonly dependsOn?: readonly DependencyRef[]
  isRequired?: boolean | ((form?: any) => boolean)
  validate?: (value: any, form?: any) => boolean | string | ValidationErrorInput | readonly ValidationErrorInput[]
  plugins?: FieldPlugin[]
}

export interface StringOptions extends FieldOptions {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}

export interface NumberOptions extends FieldOptions {
  gt?: number // greater than
  ge?: number // greater than or equal to
  lt?: number // less than
  le?: number // less than or equal to
}

export interface BooleanOptions extends FieldOptions {
  mustBeTrue?: boolean   // when true, the value must be true
  mustBeFalse?: boolean// when true, the value must be false
}

export interface DateOptions extends FieldOptions {
  minDate?: Date
  maxDate?: Date
  isDatetime?: boolean
}

export interface DecimalOptions extends FieldOptions {
  gt?: number
  ge?: number
  lt?: number
  le?: number
  decimalPlaces?: number  // number of decimal places
  maxDigits?: number  // maximum total number of digits
}

// End region

// Region: additional fields

export interface ArrayFieldOptions {
  isRequired?: boolean | ((form?: any) => boolean)
  validate?: (value: any[], form?: any) => boolean | string | ValidationErrorInput | readonly ValidationErrorInput[]
  minItems?: number
  maxItems?: number
}

export interface ArrayFormFieldOptions {
  isRequired?: boolean | ((form?: any) => boolean)
  validate?: (value: any[], form?: any) => boolean | string | ValidationErrorInput | readonly ValidationErrorInput[]
  minForms?: number
  maxForms?: number
}

// End region

// Region: plugins

export interface PluginOptions {
  priority?: number
}

export interface MaskPluginOptions{
  maskFormat: string
  maskPlaceholder: string
  digitPattern: RegExp
}

// End region