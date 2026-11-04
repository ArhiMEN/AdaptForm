import {ErrorContractError} from '../ErrorContractError'
import {customErrors, type ValidationError} from '../ValidationError'
import {ErrorNode} from '../state/ErrorNode'
import {snapshotValue, type FieldSnapshot} from "@core/state/snapshot"
import {FieldOptions} from "@core/options"
import type {FieldTypeContract, FieldTypeConstructor} from "@core/types/FieldType"
import {Form} from "@core/Form"
import {copyValue, equalValue} from "@core/state/value"

import {validationCallback} from '@core/state/dependencyScheduling'

export class Field<T = any, O extends object = FieldOptions> extends ErrorNode<FieldSnapshot> {
  protected _rawValue: any = null
  protected _valueClear: T | null = null
  protected fieldType: FieldTypeContract<T, O & FieldOptions>
  protected defaultValue: T | null
  private _baseline: T | null = null
  getErrors(): readonly ValidationError[] { return this.getOwnErrors() }

  get isValid(): boolean | null {
    return this.errors.length ? false : this.clientChecked ? true : null
  }
  private _isTouched: boolean = false

  get isTouched(): boolean { return this._isTouched }
  set isTouched(value: boolean) {
    this.update(() => { this._isTouched = value })
  }

  constructor(
    TypeConstructor: FieldTypeConstructor<T, O>,
    defaultValue?: T | null,
    options?: (O & FieldOptions) | null,
  ) {
    super()
    // Engine options are optional properties; preserve the implementation's options object.
    this.fieldType = new TypeConstructor({isRequired: true, ...options} as O) as FieldTypeContract<T, O & FieldOptions>
    if (typeof this.fieldType.typeId !== 'string' || !this.fieldType.typeId.length) {
      throw new ErrorContractError('invalid_type_id', ['typeId'])
    }
    this.defaultValue = defaultValue ?? null

    for (const plugin of this.options.plugins ?? []) {
      plugin.init?.(this)
    }

    if (defaultValue !== undefined && defaultValue !== null) {
      this.rawValue = defaultValue
    } else {
      this._rawValue = null
      this._valueClear = null
      // Keep isValid as null until checkValid has been called.
      this.clientChecked = false
    }

    // Constructor defaults are pristine values, not user edits.
    this.isTouched = false
    this.commitBaseline()
  }

  private _snapshot?: FieldSnapshot

  protected captureState(): FieldSnapshot {
    const errors = this.getOwnErrors()
    const previous = this._snapshot
    const isValid = this.isValid, isTouched = this.isTouched, isDirty = this.isDirty
    // Mutable inputs must still be described on public reads (Date, Map, etc.).
    const scalar = (value: unknown) => value === null || typeof value !== 'object' && typeof value !== 'function'
    if (previous && this.captureState === Field.prototype.captureState && scalar(this._rawValue) && scalar(this._valueClear) &&
      Object.is(previous.rawValue, this._rawValue) && Object.is(previous.valueClear, this._valueClear) &&
      previous.errors === errors && previous.isValid === isValid && previous.isTouched === isTouched && previous.isDirty === isDirty) {
      return previous
    }
    return this._snapshot = {rawValue: snapshotValue(this._rawValue), valueClear: snapshotValue(this._valueClear),
      errors, isValid, isTouched, isDirty}
  }

  // ========== Getters and setters ==========

  protected get plugins() {
    return [...(this.options.plugins ?? [])].sort((a, b) => {
      return (a.pluginOptions?.priority ?? 0) - (b.pluginOptions?.priority ?? 0)
    })
  }

  get options(): O & FieldOptions {
    return this.fieldType.options
  }

  set options(options: O) {
    this.update(() => {
      const typeId = this.fieldType.typeId
      const before = copyValue({...this.fieldType.options})
      this.fieldType.options = Object.assign(this.fieldType.options, options)
      const {dependsOn: _previousDependencies, ...oldRules} = before
      const {dependsOn: _nextDependencies, ...nextRules} = this.fieldType.options
      if (typeId !== this.fieldType.typeId || !equalValue(oldRules, nextRules)) {
        this.clearErrors({sources: ['type', 'custom']})
      }
      })
  }

  get rawValue(): T | null {
    return this._rawValue
  }

  set rawValue(input: any) {
    this.setRawValue(input)
  }

  setRawValue(input: any, validate: boolean = true): void {
    return this.update(() => {
      const raw = copyValue(this._rawValue), clean = copyValue(this._valueClear)
      this.assignRawValue(input)
      if (!equalValue(raw, this._rawValue) || !equalValue(clean, this._valueClear)) this.inputChanged()
      this.isTouched = true

      if (validate) {
        this.validateAfterMutation(() => this.checkAndSetValid())
      }
      })
  }

  private assignRawValue(input: any): void {
    let rawValue = input

    for (const plugin of this.plugins) {
      if (plugin.toRawValue) {
        rawValue = plugin.toRawValue(rawValue, this)
      }
    }

    let valueClear = rawValue

    for (const plugin of this.plugins) {
      if (plugin.toValueClear) {
        valueClear = plugin.toValueClear(valueClear, this)
      }
    }

    const cast = this.fieldType.cast(valueClear)
    this._rawValue = rawValue
    this._valueClear = cast
  }

  get valueClear(): T | null {
    return this._valueClear
  }

  get isDirty(): boolean {
    return !equalValue(this._valueClear, this._baseline)
  }

  commitBaseline(): void {
    return this.update(() => {
      this._baseline = copyValue(this._valueClear)
      })
  }

  // ========== Validation ==========

  private isRequired(form?: Form): boolean {
    let isRequired
    const rule = this.options.isRequired
    if (typeof rule === 'function') {
      isRequired = validationCallback(() => rule.call(this.options, form ?? null))
    } else {
      isRequired = rule ?? true
    }

    return isRequired
  }

  checkValid(form?: Form): boolean {
    return this.update(() => {
      this.clientChecked = false
      if (this.isEmpty) {
        this.completeClientCheck(this.isRequired(form)
          ? [{code: 'required'}] : [])
      } else if (this._valueClear === null) {
        this.completeClientCheck([{code: 'invalid_type', params: {expected: this.fieldType.typeId}}])
      } else {
        const type = validationCallback(() => this.fieldType.validateErrors(this._valueClear as T, form))
        if (type.length) this.completeClientCheck(type)
        else {
          const custom = this.options.validate
            ? customErrors(validationCallback(() => this.options.validate!(this._valueClear, form))) : []
          this.completeClientCheck(type, custom)
        }
      }
      return this.isValid === true
    })
  }

  checkAndSetValid(form?: Form): boolean { return this.checkValid(form) }

  get isEmpty(): boolean {
    let isEmpty = false
    if (this._rawValue === null || this._rawValue === undefined) isEmpty = true
    else if (typeof this._rawValue === 'string' && this._rawValue.trim() === '') isEmpty = true
    else if (Array.isArray(this._rawValue) && this._rawValue.length === 0) isEmpty = true
    return isEmpty
  }

  // ========== Helper methods ==========

  reset(): void {
    return this.update(() => {
      const raw = copyValue(this._rawValue), clean = copyValue(this._valueClear)
      if (this.defaultValue !== null && this.defaultValue !== undefined) {
        // Restore the default through the same plugin pipeline without validating it.
        this.assignRawValue(this.defaultValue)
      } else {
        this._rawValue = null
        this._valueClear = null
      }

      if (!equalValue(raw, this._rawValue) || !equalValue(clean, this._valueClear)) this.inputChanged()
      this.clearErrors()
      this.clientChecked = false
      this.isTouched = false
      })
  }
}
