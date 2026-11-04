import {ErrorContractError} from '../ErrorContractError'
import {validationError, type ValidationError, type ValidationErrorInput, type ValidationErrorSource} from '../ValidationError'
import {equalValue} from './value'

const sources: readonly ValidationErrorSource[] = Object.freeze(['type', 'custom', 'server', 'manual'])
const empty: readonly ValidationError[] = Object.freeze([])

/** Each source owns its entries. The merged view is derived, never writable truth. */
export class ErrorStore {
  private readonly partitions: Record<ValidationErrorSource, readonly ValidationError[]> = {
    type: empty, custom: empty, server: empty, manual: empty,
  }
  private view?: readonly ValidationError[]

  read(): readonly ValidationError[] {
    return this.view ??= Object.freeze(sources.flatMap(source => this.partitions[source]))
  }

  replace(source: ValidationErrorSource, inputs: readonly ValidationErrorInput[]): void {
    const entries = this.normalize(source, inputs)
    this.install(source, entries)
  }

  /** Normalize both client partitions before either is installed. */
  replaceClient(type: readonly ValidationErrorInput[], custom: readonly ValidationErrorInput[]): void {
    const nextType = this.normalize('type', type)
    const nextCustom = this.normalize('custom', custom)
    this.install('type', nextType)
    this.install('custom', nextCustom)
  }

  clear(selected: readonly ValidationErrorSource[] = sources): void {
    for (const source of selected) {
      if (!sources.includes(source)) throw new ErrorContractError('invalid_source', ['sources'])
    }
    for (const source of selected) this.install(source, empty)
  }

  private normalize(source: ValidationErrorSource, inputs: readonly ValidationErrorInput[]): readonly ValidationError[] {
    if (!sources.includes(source)) throw new ErrorContractError('invalid_source', ['source'])
    if (!Array.isArray(inputs)) throw new ErrorContractError('invalid_errors', [])
    const entries: ValidationError[] = []
    for (let index = 0; index < inputs.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(inputs, String(index))
      if (!descriptor || !('value' in descriptor)) throw new ErrorContractError('unsafe_descriptor', [index])
      entries.push(validationError(descriptor.value as ValidationErrorInput, source))
    }
    return Object.freeze(entries)
  }

  private install(source: ValidationErrorSource, entries: readonly ValidationError[]): void {
    if (equalValue(this.partitions[source], entries)) return
    this.partitions[source] = entries
    this.view = undefined
  }
}
