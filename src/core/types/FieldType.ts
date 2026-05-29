import {FieldOptions} from "@core/options";
import {Form} from "@core/Form";

export abstract class FieldType<T, O extends FieldOptions = FieldOptions> {
  options: O

  constructor(options: O) {
    this.options = {
      isRequired: true,
      messages: {},
      ...options
    } as O
  }

  abstract cast(rawValue: any): T | null

  abstract validate(value: T, form?: Form): string[]

  abstract getTypeName(): string
}