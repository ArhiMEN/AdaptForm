import type {BuiltinValidationErrorInput} from '../BuiltinValidationError'

export function isValidArrayIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length
}

export function collectionTypeErrors(length: number, required: boolean, min?: number, max?: number):
readonly BuiltinValidationErrorInput[] {
  if (required && length === 0) return [{code: 'required'}]
  if (min != null && length < min) return [{code: 'min_items', params: {min}}]
  if (max != null && length > max) return [{code: 'max_items', params: {max}}]
  return []
}
