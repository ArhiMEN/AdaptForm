export type BuiltinTypeId =
  | 'string' | 'number' | 'decimal' | 'boolean'
  | 'date' | 'datetime' | 'luxon_date' | 'luxon_datetime'

export interface BuiltinErrorParams {
  required: undefined
  invalid_type: {readonly expected: BuiltinTypeId}
  min_length: {readonly min: number}
  max_length: {readonly max: number}
  pattern: undefined
  integer: undefined
  min_value: {readonly min: number; readonly exclusive: boolean}
  max_value: {readonly max: number; readonly exclusive: boolean}
  max_digits: {readonly max: number; readonly scope: 'integer' | 'total'}
  decimal_places: {readonly max: number}
  must_be_true: undefined
  must_be_false: undefined
  min_date: {readonly min: number}
  max_date: {readonly max: number}
  invalid_year: {readonly min: 1900; readonly max: 2100}
  min_items: {readonly min: number}
  max_items: {readonly max: number}
}

export type BuiltinValidationErrorInput = {
  [C in keyof BuiltinErrorParams]: {
    readonly code: C
    readonly message?: never
  } & (BuiltinErrorParams[C] extends undefined
    ? {readonly params?: never}
    : {readonly params: BuiltinErrorParams[C]})
}[keyof BuiltinErrorParams]
