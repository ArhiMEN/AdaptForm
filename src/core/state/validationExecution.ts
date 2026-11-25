import {ErrorContractError} from '../ErrorContractError'
import type {Form} from '../Form'
import type {RequiredRule} from '../options'

let callbackDepth = 0

export class ValidationMutationError extends Error {
  constructor() {
    super('Validation callbacks must not mutate library state')
    this.name = 'ValidationMutationError'
  }
}

export function assertValidationMutationAllowed(): void {
  if (callbackDepth) throw new ValidationMutationError()
}

/** User rules run under the guard. Engine writes occur after they return. */
export function validationCallback<TResult>(callback: () => TResult): TResult {
  callbackDepth++
  try {
    return callback()
  } finally {
    callbackDepth--
  }
}

export function evaluateRequired(options: {isRequired?: RequiredRule}, fallback: boolean, form?: Form): boolean {
  const rule = options.isRequired
  const required = typeof rule === 'function' ? validationCallback(() => rule.call(options, form)) : rule ?? fallback
  if (typeof required !== 'boolean') throw new ErrorContractError('invalid_required')
  return required
}

let assemblyDepth = 0

export function duringValidationAssembly<TResult>(assemble: () => TResult): TResult {
  assemblyDepth++
  try {
    return assemble()
  } finally {
    assemblyDepth--
  }
}

export function isAssemblingValidationNodes(): boolean {
  return assemblyDepth > 0
}

export function assertValidationAllowed(): void {
  assertValidationMutationAllowed()
  if (isAssemblingValidationNodes()) throw new TypeError('Validation requires completed node assembly')
}
