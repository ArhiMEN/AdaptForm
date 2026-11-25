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
