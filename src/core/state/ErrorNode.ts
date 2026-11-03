import type {ValidationError, ValidationErrorInput, ValidationErrorSource} from '../ValidationError'
import {ObservableNode} from './ObservableNode'
import {ErrorStore} from './ErrorStore'

export interface ClearErrorsOptions {
  readonly sources?: readonly ValidationErrorSource[]
  readonly recursive?: boolean
}

// Internal ingress for the future server Apply owner; absent from package exports.
const sourceWriters = new WeakMap<object, (source: ValidationErrorSource, errors: readonly ValidationErrorInput[]) => void>()
export function replaceNodeErrors(node: object, source: ValidationErrorSource, errors: readonly ValidationErrorInput[]): void {
  const write = sourceWriters.get(node)
  if (!write) throw new TypeError('Unknown error node')
  write(source, errors)
}

/** Shared storage and client-check knowledge, independent of snapshot subscriptions. */
export abstract class ErrorNode<TSnapshot> extends ObservableNode<TSnapshot> {
  private readonly errorStore = new ErrorStore()
  protected clientChecked = false
  private errorParents = new Set<ErrorNode<unknown>>()
  private errorChildren = new Set<ErrorNode<unknown>>()
  protected clearsOnDescendantChange = false

  constructor() {
    super()
    sourceWriters.set(this, (source, errors) => this.update(() => {
      this.errorStore.replace(source, errors)
      if (source === 'type' || source === 'custom') this.clientChecked = false
    }))
  }

  get errors(): readonly ValidationError[] { return this.getOwnErrors() }
  getOwnErrors(): readonly ValidationError[] { return this.errorStore.read() }

  /** Replace only this node's manual errors. */
  setErrors(errors: readonly ValidationErrorInput[]): void {
    this.update(() => this.errorStore.replace('manual', errors))
  }

  clearErrors(options: ClearErrorsOptions = {}): void {
    this.update(() => {
      this.errorStore.clear(options.sources)
      if (!options.sources || options.sources.some(source => source === 'type' || source === 'custom')) {
        this.clientChecked = false
      }
      if (options.recursive) {
        for (const child of this.stateChildren()) {
          if (child instanceof ErrorNode) child.clearErrors(options)
        }
      }
    })
  }

  protected completeClientCheck(type: readonly ValidationErrorInput[] = [], custom: readonly ValidationErrorInput[] = []): void {
    this.errorStore.replaceClient(type, custom)
    this.clientChecked = true
  }

  /** Reconcile ownership after construction or a supported membership change. */
  protected syncErrorChildren(recursive = true, children = this.stateChildren()): void {
    const next = new Set(children.filter((child): child is ErrorNode<unknown> => child instanceof ErrorNode))
    for (const child of this.errorChildren) if (!next.has(child)) child.errorParents.delete(this)
    for (const child of next) {
      child.errorParents.add(this)
      if (recursive) child.syncErrorChildren()
    }
    this.errorChildren = next
  }

  protected inputChanged(): void {
    this.errorStore.clear()
    this.clientChecked = false
    if (this.errorParents.size) this.markStateChanged()
    this.propagateInputChange(new Set([this]))
  }

  private propagateInputChange(seen: Set<ErrorNode<unknown>>): void {
    for (const parent of this.errorParents) {
      if (seen.has(parent)) continue
      seen.add(parent)
      parent.update(() => {
        if (parent.clearsOnDescendantChange) {
          parent.errorStore.clear()
          parent.clientChecked = false
        }
        parent.propagateInputChange(seen)
      })
    }
  }
}
