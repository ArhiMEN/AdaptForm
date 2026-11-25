import type {ValidationPath} from './ValidationError'

/** A programming/input contract failure, never a user validation error. */
export class ErrorContractError extends TypeError {
  readonly path: ValidationPath

  constructor(readonly reason: string, path: ValidationPath = []) {
    super(`Invalid error contract: ${reason}`)
    this.name = 'ErrorContractError'
    this.path = Object.freeze([...path])
  }
}
