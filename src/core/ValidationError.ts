import {equalValue} from './state/value'
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

interface ErrorSourceContext {
  readonly target: object
  readonly key?: string
  readonly source: ValidationErrorSource
}
let manualContext: ErrorSourceContext | undefined

/** Only the addressed legacy setter inherits provenance, not other receivers or keys. */
export function manualErrorSource(target: object, key?: string): ValidationErrorSource {
  return manualContext?.target === target && manualContext.key === key ? manualContext.source : 'manual'
}

/** Preserve synchronous subclass dispatch; nested scopes restore even on exceptions. */
export function withErrorSource<T>(target: object, source: ValidationErrorSource, callback: () => T, key?: string): T {
  const previous = manualContext
  manualContext = {target, source, key}
  try { return callback() } finally { manualContext = previous }
}

export function errorMessage(error: ValidationErrorInput): string {
  return error.message ?? ''
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

const noErrors = Object.freeze([])

/** Ordered structured truth with the historical mutable string-array facade. */
export class ErrorState<E extends ValidationError = ValidationError> {
  private entries: readonly E[] = noErrors

  constructor(private readonly create: (input: ValidationErrorInput, source: ValidationErrorSource) => E,
    public messages: string[] = []) {}

  getErrors(messages: string[] = this.messages): readonly E[] {
    this.messages = messages
    if (messages.length === 0 && this.entries.length === 0) return this.entries
    if (messages.length !== this.entries.length ||
      messages.some((message, index) => message !== errorMessage(this.entries[index]))) {
      // Discover legacy in-place edits on reads, as with values and collection arrays.
      const available = new Set(this.entries)
      this.entries = Object.freeze(messages.map((message, index) => {
        const candidate = this.entries[index]
        const retained = candidate && available.has(candidate) && errorMessage(candidate) === message
          ? candidate : this.entries.find(error => available.has(error) && errorMessage(error) === message)
        if (retained) { available.delete(retained); return retained }
        return this.create({code: 'manual', message}, 'manual')
      }))
    }
    return this.entries
  }

  replace(errors: readonly E[]): string[] {
    if (!errors.length) this.entries = noErrors
    else if (!equalValue(this.entries, errors)) this.entries = Object.freeze([...errors])
    return this.messages = this.entries.map(errorMessage)
  }

  set(errors: readonly ValidationErrorInput[], source: ValidationErrorSource): string[] {
    return this.replace(errors.length ? errors.map(error => this.create(error, source)) : noErrors)
  }

  add(error: ValidationErrorInput, source: ValidationErrorSource): string[] {
    return this.replace([...this.getErrors(), this.create(error, source)])
  }
}

/** Preserve legacy success rules: only false and strings used to fail. */
export function customErrors(result: unknown, message: string): readonly ValidationErrorInput[] {
  if (result === false) return [{code: 'custom', message}]
  if (typeof result === 'string') return [{code: 'custom', message: result}]
  if (isValidationError(result)) return [result]
  if (Array.isArray(result) && result.length > 0 && result.every(isValidationError)) return result
  return []
}
