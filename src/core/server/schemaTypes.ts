import type {ValidationError, ValidationErrorInput, ValidationPath} from '../ValidationError'
import type {ErrorsMapping} from './ErrorsMapping'

export interface ServerErrorInput extends ValidationErrorInput {
  readonly path: ValidationPath
}

export type ErrorSelector<T> =
  | {readonly at: ValidationPath}
  | {readonly read: (input: T) => unknown}
  | {readonly value: unknown}

export interface StaticErrorMapping {
  readonly kind: 'static'
  readonly from: ValidationPath
  readonly to: ValidationPath | ((error: ServerErrorInput) => ValidationPath | null)
}

export interface DynamicErrorMapping {
  readonly kind: 'dynamic'
  readonly pattern: RegExp
  readonly key: (path: ValidationPath) => string
  readonly to: (match: RegExpMatchArray, error: ServerErrorInput) => ValidationPath | null
  readonly priority?: number
}

export type ErrorTransform = (error: ValidationErrorInput, path: ValidationPath) => ValidationErrorInput

export interface ErrorsMappingConfig {
  readonly mappings?: readonly (StaticErrorMapping | DynamicErrorMapping)[]
  readonly fallback?: (error: ServerErrorInput) => ValidationPath | null
  readonly transform?: readonly ErrorTransform[]
}

export interface MappingMergeOptions {
  readonly staticConflict?: 'error' | 'left' | 'right'
  readonly fallbackConflict?: 'error' | 'left' | 'right'
}

export interface MappingPrefixOptions {
  readonly sourcePrefix: ValidationPath
  readonly targetPrefix?: ValidationPath
}

export interface ArrayMappingOptions extends MappingPrefixOptions {
  readonly index?: (segment: string | number) => number
}

export interface ErrorsSchemaLimits {
  readonly maxDepth: number
  readonly maxNodes: number
  readonly maxErrors: number
  readonly maxPathSegments: number
  readonly maxStringLength: number
  readonly maxBytes: number
}

export interface SchemaCommon {
  readonly mapping?: ErrorsMapping
  readonly limits?: Partial<ErrorsSchemaLimits>
}

export interface RecordsSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'records'
  readonly select?: ErrorSelector<R>
  readonly path: ErrorSelector<unknown>
  readonly code: ErrorSelector<unknown>
  readonly message?: ErrorSelector<unknown>
  readonly params?: ErrorSelector<unknown>
  readonly decodePath?: (value: unknown) => ValidationPath
}

export interface TreeSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'tree'
  readonly select?: ErrorSelector<R>
  readonly leaf: (value: unknown, path: ValidationPath) => readonly ValidationErrorInput[] | undefined
  readonly decodeKey?: (key: string) => ValidationPath
}

export interface AdapterSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'adapter'
  readonly extract: (response: R) => Iterable<ServerErrorInput>
}

export type ErrorsSchemaConfig<R> = RecordsSchemaConfig<R> | TreeSchemaConfig<R> | AdapterSchemaConfig<R>

export interface ErrorMappingTrace {
  readonly index: number
  readonly from: ValidationPath
  readonly to: ValidationPath | null
  readonly matchedBy: 'static' | 'dynamic' | 'fallback' | 'identity' | 'scope'
}

export interface ServerErrorEntry {
  readonly path: ValidationPath
  readonly error: ValidationError & {readonly source: 'server'}
}

declare const parsedErrorsBrand: unique symbol
export interface ParsedServerErrors {
  readonly [parsedErrorsBrand]: true
  readonly entries: readonly ServerErrorEntry[]
  readonly trace?: readonly ErrorMappingTrace[]
}
