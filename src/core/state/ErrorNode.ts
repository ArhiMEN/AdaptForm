import type {ValidationError, ValidationErrorInput, ValidationErrorSource} from '../ValidationError'
import {ObservableNode} from './ObservableNode'
import {ErrorStore} from './ErrorStore'
import {advanceServerRevision, refreshChildPositions, registerServerNode, resetServerRevision, type RegisteredChild} from '../server/nodes'

export interface ClearErrorsOptions {
  readonly sources?: readonly ValidationErrorSource[]
  readonly recursive?: boolean
}

/** Shared storage and client-check knowledge, independent of snapshot subscriptions. */
export abstract class ErrorNode<TSnapshot> extends ObservableNode<TSnapshot> {
  private readonly errorStore = new ErrorStore()
  protected clientChecked: boolean | 'failed' = false
  private errorParents = new Set<ErrorNode<unknown>>()
  private errorChildren = new Set<ErrorNode<unknown>>()
  protected clearsOnDescendantChange = false

  constructor() {
    super()
    registerServerNode(this, {
      errors: this.errorStore,
      children: () => this.registeredErrorChildren(),
      parents: () => this.errorParents,
      connect: () => this.syncErrorChildren(false, this.registeredErrorChildren().map(([, node]) => node)),
      form: () => this.isServerErrorForm,
    })
  }

  protected get isServerErrorForm(): boolean { return false }

  protected registeredErrorChildren(): readonly RegisteredChild[] {
    const nodes = this.stateChildren()
    const children: RegisteredChild[] = []
    for (let index = 0; index < nodes.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(nodes, index)
      if (descriptor && 'value' in descriptor && descriptor.value instanceof ErrorNode) children.push([index, descriptor.value])
    }
    return children
  }

  protected resetErrorRevision(): void { resetServerRevision(this) }

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

  protected completeClientCheck(type: readonly ValidationErrorInput[], custom: readonly ValidationErrorInput[]): void {
    this.errorStore.replaceClient(type, custom)
    this.clientChecked = true
  }

  /** Reconcile ownership after construction or a supported membership change. */
  protected syncErrorChildren(recursive = true, children = this.stateChildren(), structural = false): void {
    const next = new Set(children.filter((child): child is ErrorNode<unknown> => child instanceof ErrorNode))
    if (structural) refreshChildPositions(this.errorChildren, next)
    for (const child of this.errorChildren) if (!next.has(child)) child.errorParents.delete(this)
    for (const child of next) {
      child.errorParents.add(this)
      if (recursive) child.syncErrorChildren()
    }
    this.errorChildren = next
  }

  protected requestOwnValidation(): void {}

  protected inputChanged(validateStructure = false, structural = false): void {
    const kind = structural ? 'structure' : 'input'
    advanceServerRevision(this, kind)
    this.errorStore.clear()
    this.clientChecked = false
    if (this.errorParents.size) this.markStateChanged()
    this.propagateInputChange(new Set([this]), validateStructure, kind)
  }

  private propagateInputChange(seen: Set<ErrorNode<unknown>>, validateStructure: boolean, kind: 'input' | 'structure'): void {
    for (const parent of this.errorParents) {
      if (seen.has(parent)) continue
      seen.add(parent)
      parent.update(() => {
        advanceServerRevision(parent, kind)
        if (parent.clearsOnDescendantChange) {
          parent.errorStore.clear()
          parent.clientChecked = false
          if (validateStructure) parent.requestOwnValidation()
        }
        parent.propagateInputChange(seen, validateStructure, kind)
      })
    }
  }
}
