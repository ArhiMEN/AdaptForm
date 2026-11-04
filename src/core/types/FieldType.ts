import type {ValidationErrorInput} from '../ValidationError'
import type {FieldOptions} from '../options'
import type {Form} from '../Form'

export interface FieldTypeContract<T, O extends object> {
  readonly typeId: string
  options: O
  cast(rawValue: unknown): T | null
  validateErrors(value: T, form?: Form): readonly ValidationErrorInput[]
}

export type FieldTypeConstructor<T, O extends object> = new (options: O) => FieldTypeContract<T, O>

/** Optional base class; structural implementations use the same contract. */
export abstract class FieldType<T, O extends object = FieldOptions> implements FieldTypeContract<T, O> {
  abstract readonly typeId: string
  options: O

  constructor(options: O) {
    this.options = {isRequired: true, ...options}
  }

  abstract cast(rawValue: unknown): T | null
  abstract validateErrors(value: T, form?: Form): readonly ValidationErrorInput[]
}
