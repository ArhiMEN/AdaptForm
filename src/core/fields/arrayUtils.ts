import type {BuiltinValidationErrorInput} from '../BuiltinValidationError'
import {duringValidationAssembly} from '../state/validationExecution'

export function isValidArrayIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length
}

export function assembleCollection<T, TItem>(values: readonly T[], create: (value: T) => TItem): TItem[] {
  return duringValidationAssembly(() => {
    const items: TItem[] = []
    for (const value of values) items.push(create(value))
    return items
  })
}

export function collectionTypeErrors(
  length: number, required: boolean, min?: number, max?: number,
): readonly BuiltinValidationErrorInput[] {
  if (required && length === 0) return [{code: 'required'}]
  if (min != null && length < min) return [{code: 'min_items', params: {min}}]
  if (max != null && length > max) return [{code: 'max_items', params: {max}}]
  return []
}
