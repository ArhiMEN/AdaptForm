import type {Form} from './Form'
import type {ValidationErrorInput} from './ValidationError'
import {FieldPlugin} from "@core/plugins"

// Region: field types

/** A literal, direct Field property of the enabled Form. No dot-path parsing. */
export type DependencyPath = readonly [string]
export interface DependencyRef {
  readonly path: DependencyPath
}

export type FieldValidator<T, F extends Form = Form> = (
  value: T,
  form?: F,
) => readonly ValidationErrorInput[]

export type RequiredRule<F extends Form = Form> = boolean | ((form?: F) => boolean)

// Options also accept callbacks annotated with a specific owning Form class.
// Standalone validation still supplies undefined as the custom callback context.
type ValidatorOption<T, F extends Form> = {
  validate(value: T, form?: F): ReturnType<FieldValidator<T, F>>
}['validate']
type RequiredOption<F extends Form> = boolean | { required(form?: F): boolean }['required']

export interface FieldOptions<T = any, F extends Form = Form> {
  readonly dependsOn?: readonly DependencyRef[]
  isRequired?: RequiredOption<F>
  validate?: ValidatorOption<T, F>
  plugins?: FieldPlugin[]
}

export interface StringOptions extends FieldOptions<string> {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}

export interface NumberOptions extends FieldOptions<number> {
  gt?: number // greater than
  ge?: number // greater than or equal to
  lt?: number // less than
  le?: number // less than or equal to
}

export interface BooleanOptions extends FieldOptions<boolean> {
  mustBeTrue?: boolean   // when true, the value must be true
  mustBeFalse?: boolean// when true, the value must be false
}

export interface DateOptions extends FieldOptions<Date> {
  minDate?: Date
  maxDate?: Date
  isDatetime?: boolean
}

export interface DecimalOptions extends FieldOptions<number | string> {
  gt?: number
  ge?: number
  lt?: number
  le?: number
  decimalPlaces?: number  // number of decimal places
  maxDigits?: number  // maximum total number of digits
}

// End region

// Region: additional fields

export interface ArrayFieldOptions<T = any, F extends Form = Form> {
  isRequired?: RequiredOption<F>
  validate?: ValidatorOption<(T | null)[], F>
  minItems?: number
  maxItems?: number
}

export interface ArrayFormFieldOptions<T extends Form = Form, F extends Form = Form> {
  isRequired?: RequiredOption<F>
  validate?: ValidatorOption<T[], F>
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