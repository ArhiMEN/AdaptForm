import {ErrorContractError} from './ErrorContractError'
import {normalizeErrorParams, type ErrorParams} from './ErrorParams'

export type ValidationErrorSource = 'type' | 'custom' | 'server' | 'manual'
export type ValidationPath = readonly (string | number)[]

/** Validator input. Ownership and provenance are assigned by the engine. */
export interface ValidationErrorInput {
  readonly code: string
  readonly message?: string
  readonly params?: ErrorParams
}

export interface ValidationError extends ValidationErrorInput {
  readonly source: ValidationErrorSource
}

export interface LocatedValidationError extends ValidationError {
  readonly path: ValidationPath
}

export interface ValidationResult {
  readonly valid: boolean
}

export function isValidationError(value: unknown): value is ValidationErrorInput {
  if (value === null || typeof value !== 'object') return false
  const descriptor = Object.getOwnPropertyDescriptor(value, 'code')
  return !!descriptor && 'value' in descriptor && typeof descriptor.value === 'string' && descriptor.value.length > 0
}

function inputData(input: object, key: string): PropertyDescriptor | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(input, key)
  if (descriptor && !('value' in descriptor)) throw new ErrorContractError('unsafe_descriptor', [key])
  return descriptor
}

function normalizePath(path: ValidationPath): ValidationPath {
  if (!Array.isArray(path) || Object.getPrototypeOf(path) !== Array.prototype) {
    throw new ErrorContractError('invalid_path', ['path'])
  }
  if (Reflect.ownKeys(path).length !== path.length + 1) throw new ErrorContractError('unsafe_descriptor', ['path'])
  const copy: (string | number)[] = []
  for (let index = 0; index < path.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(path, String(index))
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new ErrorContractError('unsafe_descriptor', ['path', index])
    }
    const segment: unknown = descriptor.value
    if (typeof segment !== 'string' && !(typeof segment === 'number' && Number.isSafeInteger(segment) && segment >= 0)) {
      throw new ErrorContractError('invalid_path', ['path', index])
    }
    copy.push(segment as string | number)
  }
  return Object.freeze(copy)
}

export function validationError(input: ValidationErrorInput, source: ValidationErrorSource): ValidationError
export function validationError(input: ValidationErrorInput, source: ValidationErrorSource, path: ValidationPath): LocatedValidationError
export function validationError(input: ValidationErrorInput, source: ValidationErrorSource,
  path?: ValidationPath): ValidationError | LocatedValidationError {
  if (input === null || typeof input !== 'object') throw new ErrorContractError('invalid_code', ['code'])
  const code = inputData(input, 'code')?.value as unknown
  if (typeof code !== 'string' || !code.length) throw new ErrorContractError('invalid_code', ['code'])
  const message = inputData(input, 'message')
  if (message && typeof message.value !== 'string') throw new ErrorContractError('invalid_message', ['message'])
  const params = inputData(input, 'params')
  if (!['type', 'custom', 'server', 'manual'].includes(source)) throw new ErrorContractError('invalid_source', ['source'])
  const error: ValidationError = Object.freeze({code,
    ...(message ? {message: message.value as string} : {}),
    ...(params ? {params: normalizeErrorParams(params.value)} : {}), source})
  return path === undefined ? error : Object.freeze({...error, path: normalizePath(path)})
}

export function prefixErrors(errors: readonly ValidationError[], prefix: ValidationPath): LocatedValidationError[] {
  return errors.map(error => Object.freeze({...error, path: Object.freeze([
    ...prefix, ...('path' in error ? (error as LocatedValidationError).path : []),
  ])}))
}

/** Retain legacy result interpretation until the array-only runner; never supply display text. */
export function customErrors(result: unknown): readonly ValidationErrorInput[] {
  if (result === false) return [{code: 'custom'}]
  if (typeof result === 'string') return [{code: 'custom', message: result}]
  if (isValidationError(result)) return [result]
  if (Array.isArray(result) && result.length > 0 && result.every(isValidationError)) return result
  return []
}
