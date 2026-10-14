import { expect } from 'vitest'
import type { Field } from '@core/fields/Field'
import type { Form } from '@core/Form'

/**
 * Assert that a field is valid.
 */
export function expectValid(field: Field, form?: Form) {
  const isValid = field.checkAndSetValid(form)
  expect(isValid).toBe(true)
  expect(field.isValid).toBe(true)
  expect(field.errors).toEqual([])
  expect(field.error).toBe('')
}

/**
 * Assert that a field is invalid.
 */
export function expectInvalid(field: Field, expectedErrors: string[] = [], form?: Form) {
  const isValid = field.checkAndSetValid(form)
  expect(isValid).toBe(false)
  expect(field.isValid).toBe(false)
  expect(field.errors).toEqual(expectedErrors)
}

/**
 * Utility to assert that a field is empty
 */
export function expectEmpty(field: Field) {
  expect(field.isEmpty).toBe(true)
}

/**
 * Utility to assert that a field is not empty
 */
export function expectNotEmpty(field: Field) {
  expect(field.isEmpty).toBe(false)
}

/**
 * Utility to assert that a field was reset
 */
export function expectReset(field: Field, defaultValue?: any) {
  field.reset()
  expect(field.isTouched).toBe(false)
  expect(field.isValid).toBe(null)
  expect(field.errors).toEqual([])
  if (defaultValue !== undefined) {
    expect(field.rawValue).toBe(defaultValue)
  }
}

/**
 * Utility to assert the isTouched state
 */
export function expectTouched(field: Field) {
  expect(field.isTouched).toBe(true)
}

/**
 * Utility to assert the isTouched state = false
 */
export function expectNotTouched(field: Field) {
  expect(field.isTouched).toBe(false)
}

/**
 * Utility to create a form for tests
 */
export function createTestForm<T extends Form>(FormConstructor: new () => T): T {
  return new FormConstructor()
}

/**
 * Utility to assert that a form is valid
 */
export function expectFormValid(form: Form) {
  expect(form.isValid).toBe(true)
  expect(form.checkValid()).toBe(true)
}

/**
 * Utility to assert that a form is invalid
 */
export function expectFormInvalid(form: Form) {
  expect(form.isValid).toBe(false)
  expect(form.checkValid()).toBe(false)
}
