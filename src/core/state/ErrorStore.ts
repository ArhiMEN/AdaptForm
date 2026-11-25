import {ErrorContractError} from '../ErrorContractError'
import {validationError, type ValidationError, type ValidationErrorInput, type ValidationErrorSource} from '../ValidationError'
import {equalValue} from './value'

const sources: readonly ValidationErrorSource[] = Object.freeze(['type', 'custom', 'server', 'manual'])
const empty: readonly ValidationError[] = Object.freeze([])

export interface ServerPartitionPlan {
  readonly store: ErrorStore
  readonly view: readonly ValidationError[]
  readonly install: () => void
}

let overlay: ReadonlyMap<ErrorStore, readonly ValidationError[]> | undefined

export function withServerPartitions<TResult>(plans: readonly ServerPartitionPlan[], read: () => TResult): TResult {
  const previous = overlay
  overlay = new Map(plans.map(plan => [plan.store, plan.view]))
  try { return read() } finally { overlay = previous }
}

/** Each source owns its entries. The merged view is derived, never writable truth. */
export class ErrorStore {
  private readonly partitions: Record<ValidationErrorSource, readonly ValidationError[]> = {
    type: empty, custom: empty, server: empty, manual: empty,
  }
  private view?: readonly ValidationError[]

  read(): readonly ValidationError[] {
    const staged = overlay?.get(this)
    return staged ?? (this.view ??= Object.freeze(sources.flatMap(source => this.partitions[source])))
  }

  prepareServer(entries: readonly ValidationError[], mode: 'replace' | 'append'): ServerPartitionPlan | undefined {
    if (mode === 'append' && !entries.length) return
    const server = mode === 'append' ? Object.freeze([...this.partitions.server, ...entries]) : entries
    if (equalValue(this.partitions.server, server)) return
    const view = Object.freeze(sources.flatMap(source => source === 'server' ? server : this.partitions[source]))
    return {store: this, view, install: () => {
      this.partitions.server = server
      this.view = view
    }}
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
