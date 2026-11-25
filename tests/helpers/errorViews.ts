import type {ValidationError, LocatedValidationError} from '../../src'

/** Test-owned display projections. They never write back into the model. */
export function errorMessages(node: {readonly errors: readonly ValidationError[]}): string[] {
  return node.errors.map(error => error.message ?? '')
}

export function errorsByPath(node: {getErrors(): readonly LocatedValidationError[]}): Record<string, string[]> {
  const groups: Record<string, string[]> = Object.create(null)
  for (const error of node.getErrors()) (groups[error.path.join('.')] ??= []).push(error.message ?? '')
  return groups
}

export function ownMessagesByCode(node: {getOwnErrors(): readonly ValidationError[]}): Record<string, string | undefined> {
  return Object.fromEntries(node.getOwnErrors().map(error => [error.code, error.message]))
}
