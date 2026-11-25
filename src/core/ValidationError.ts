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

function inputData(input: object, key: string): PropertyDescriptor | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(input, key)
  if (descriptor && !('value' in descriptor)) throw new ErrorContractError('unsafe_descriptor', [key])
  return descriptor
}

export function normalizePath(path: unknown, maxSegments = Infinity, at: ValidationPath = ['path']): ValidationPath {
  if (!Array.isArray(path) || Object.getPrototypeOf(path) !== Array.prototype) {
    throw new ErrorContractError('invalid_path', at)
  }
  if (path.length > maxSegments) throw new ErrorContractError('limit_exceeded', at)
  if (Reflect.ownKeys(path).length !== path.length + 1) throw new ErrorContractError('unsafe_descriptor', at)
  const copy: (string | number)[] = []
  for (let index = 0; index < path.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(path, String(index))
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new ErrorContractError('unsafe_descriptor', [...at, index])
    }
    const segment: unknown = descriptor.value
    if (typeof segment !== 'string' && !(typeof segment === 'number' && Number.isSafeInteger(segment) && segment >= 0)) {
      throw new ErrorContractError('invalid_path', [...at, index])
    }
    copy.push(typeof segment === 'number' && segment === 0 ? 0 : segment as string | number)
  }
  return Object.freeze(copy)
}

export function validationError(input: ValidationErrorInput, source: ValidationErrorSource): ValidationError {
  if (input === null || typeof input !== 'object') throw new ErrorContractError('invalid_code', ['code'])
  const code = inputData(input, 'code')?.value as unknown
  if (typeof code !== 'string' || !code.length) throw new ErrorContractError('invalid_code', ['code'])
  const message = inputData(input, 'message')
  if (message && typeof message.value !== 'string') throw new ErrorContractError('invalid_message', ['message'])
  const params = inputData(input, 'params')
  if (!['type', 'custom', 'server', 'manual'].includes(source)) throw new ErrorContractError('invalid_source', ['source'])
  return Object.freeze({code,
    ...(message ? {message: message.value as string} : {}),
    ...(params ? {params: normalizeErrorParams(params.value)} : {}), source})
}

export function prefixErrors(errors: readonly ValidationError[], prefix: ValidationPath): LocatedValidationError[] {
  return errors.map(error => Object.freeze({...error, path: Object.freeze([
    ...prefix, ...('path' in error ? (error as LocatedValidationError).path : []),
  ])}))
}
