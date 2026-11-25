import type {ValidationPath} from '../ValidationError'
import type {ParsedServerErrors} from './schemaTypes'

declare const serverOperationBrand: unique symbol
export interface ServerErrorOperation {
  readonly [serverOperationBrand]: true
}

export interface BeginServerErrorsOptions {
  readonly scope?: ValidationPath
}

export interface ApplyServerErrorsOptions {
  readonly operation: ServerErrorOperation
  readonly mode?: 'replace' | 'append'
  readonly unknownPath?: 'error' | 'global' | 'ignore'
}

export interface NotificationFailure {
  readonly phase: 'subscriber' | 'diagnostic' | 'finalization'
  readonly path: ValidationPath
  readonly subscriber?: number
  readonly error: unknown
}

export interface ErrorNotificationReport {
  readonly status: 'pending' | 'delivered'
  readonly failures: readonly NotificationFailure[]
}

export interface ApplyServerErrorsResult {
  readonly committed: true
  readonly applied: number
  readonly ignored: number
  readonly unresolved: readonly ValidationPath[]
  readonly notification: ErrorNotificationReport
}

export interface FormServerErrorApi {
  beginServerErrorOperation(options?: BeginServerErrorsOptions): ServerErrorOperation
  applyServerErrors(batch: ParsedServerErrors, options: ApplyServerErrorsOptions): ApplyServerErrorsResult
  subscribeErrorNotifications(listener: (report: ErrorNotificationReport) => void): () => void
  getErrorNotificationReports(): readonly ErrorNotificationReport[]
  clearErrorNotificationReports(): void
}
