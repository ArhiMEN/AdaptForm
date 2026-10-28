import {equalValue} from './state/value'
import {freezeSnapshot, snapshotValue} from './state/snapshot'

export type ValidationErrorSource = 'client' | 'custom' | 'server' | 'external'
export type ValidationPath = readonly (string | number)[]

/** Validator input. Ownership and provenance are assigned by the engine. */
export interface ValidationErrorInput {
  readonly code: string
  readonly message?: string
  readonly params?: Readonly<Record<string, unknown>>
}

export interface ValidationError extends ValidationErrorInput {
  readonly path: ValidationPath
  readonly source: ValidationErrorSource
}

export type ValidationResult = boolean | string | ValidationErrorInput | readonly ValidationErrorInput[]

export function isValidationError(value: unknown): value is ValidationErrorInput {
  return value !== null && typeof value === 'object' &&
    'code' in value && typeof value.code === 'string' && value.code.length > 0
}

interface ErrorSourceContext {
  readonly target: object
  readonly key?: string
  readonly source: ValidationErrorSource
}
let manualContext: ErrorSourceContext | undefined

/** Only the addressed legacy setter inherits provenance, not other receivers or keys. */
export function manualErrorSource(target: object, key?: string): ValidationErrorSource {
  return manualContext?.target === target && manualContext.key === key ? manualContext.source : 'external'
}

/** Preserve synchronous subclass dispatch; nested scopes restore even on exceptions. */
export function withErrorSource<T>(target: object, source: ValidationErrorSource, callback: () => T, key?: string): T {
  const previous = manualContext
  manualContext = {target, source, key}
  try { return callback() } finally { manualContext = previous }
}

export function errorMessage(error: ValidationErrorInput): string {
  return error.message ?? error.code
}

export function validationError(input: ValidationErrorInput, source: ValidationErrorSource,
  path: ValidationPath = []): ValidationError {
  if (!isValidationError(input)) throw new TypeError('A validation error requires a non-empty code')
  return freezeSnapshot({code: input.code,
    ...(typeof input.message === 'string' ? {message: input.message} : {}),
    ...(input.params === undefined ? {} : {params: snapshotValue(input.params) as Readonly<Record<string, unknown>>}),
    path: [...path], source})
}

export function prefixErrors(errors: readonly ValidationError[], prefix: ValidationPath): ValidationError[] {
  return errors.map(error => Object.freeze({...error, path: Object.freeze([...prefix, ...error.path])}))
}

const noErrors: readonly ValidationError[] = Object.freeze([])

/** Ordered structured truth with the historical mutable string-array facade. */
export class ErrorState {
  private entries: readonly ValidationError[] = noErrors

  constructor(public messages: string[] = []) {}

  getErrors(messages: string[] = this.messages): readonly ValidationError[] {
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
        return validationError({code: 'external', message}, 'external')
      }))
    }
    return this.entries
  }

  replace(errors: readonly ValidationError[]): string[] {
    if (!errors.length) this.entries = noErrors
    else if (!equalValue(this.entries, errors)) this.entries = Object.freeze([...errors])
    return this.messages = this.entries.map(errorMessage)
  }

  set(errors: readonly ValidationErrorInput[], source: ValidationErrorSource): string[] {
    return this.replace(errors.length ? errors.map(error => validationError(error, source)) : noErrors)
  }

  add(error: ValidationErrorInput, source: ValidationErrorSource): string[] {
    return this.replace([...this.getErrors(), validationError(error, source)])
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
