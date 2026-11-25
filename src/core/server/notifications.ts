import type {Form} from '../Form'
import type {ValidationPath} from '../ValidationError'
import {assertValidationMutationAllowed} from '../state/validationExecution'
import type {ErrorNotificationReport, NotificationFailure} from './applyTypes'

type Listener = (report: ErrorNotificationReport) => void
interface Channel {readonly listeners: Set<Listener>; reports: readonly ErrorNotificationReport[]}
const channels = new WeakMap<Form, Channel>()
const emptyReports: readonly ErrorNotificationReport[] = Object.freeze([])
const emptyFailures: readonly NotificationFailure[] = Object.freeze([])

function channel(form: Form): Channel {
  let state = channels.get(form)
  if (!state) {
    state = {listeners: new Set(), reports: emptyReports}
    channels.set(form, state)
  }
  return state
}

export function subscribeErrorReports(form: Form, listener: Listener): () => void {
  assertValidationMutationAllowed()
  if (typeof listener !== 'function') throw new TypeError('Expected a notification listener')
  const state = channel(form)
  const registration = (report: ErrorNotificationReport) => listener(report)
  state.listeners.add(registration)
  return () => { assertValidationMutationAllowed(); state.listeners.delete(registration) }
}

export function readErrorReports(form: Form): readonly ErrorNotificationReport[] {
  return channels.get(form)?.reports ?? emptyReports
}

export function clearErrorReports(form: Form): void {
  assertValidationMutationAllowed()
  const state = channels.get(form)
  if (state) state.reports = emptyReports
}

export class ErrorNotificationCycle {
  private readonly receivers = new Map<Form, ValidationPath>()
  private failures: NotificationFailure[] = []
  private view: readonly NotificationFailure[] | undefined = emptyFailures
  private delivered = false
  readonly report: ErrorNotificationReport

  constructor() {
    this.report = Object.freeze(Object.defineProperties({} as ErrorNotificationReport, {
      status: {enumerable: true, get: () => this.delivered ? 'delivered' : 'pending'},
      failures: {enumerable: true, get: () => this.read()},
    }))
  }

  add(receiver: Form, path: ValidationPath): void { this.receivers.set(receiver, path) }

  record(phase: NotificationFailure['phase'], path: ValidationPath, error: unknown, subscriber?: number): void {
    this.failures.push(Object.freeze({phase, path, error, ...(subscriber === undefined ? {} : {subscriber})}))
    this.view = undefined
  }

  private read(): readonly NotificationFailure[] { return this.view ??= Object.freeze([...this.failures]) }

  deliver(): void {
    for (const [receiver, path] of this.receivers) {
      const listeners = channels.get(receiver)?.listeners
      if (!listeners?.size) continue
      for (const [index, listener] of [...listeners].entries()) {
        if (!listeners.has(listener)) continue
        try { listener(this.report) } catch (error) { this.record('diagnostic', path, error, index) }
      }
    }
    this.view = Object.freeze(this.failures)
    this.delivered = true
    if (this.failures.length) {
      for (const receiver of this.receivers.keys()) {
        const state = channel(receiver)
        state.reports = Object.freeze([...state.reports, this.report])
      }
    }
    this.receivers.clear()
  }
}
