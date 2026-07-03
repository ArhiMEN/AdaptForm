import { expect } from 'vitest'
import type { Field } from '@core/fields/Field'
import type { ArrayField } from '@core/fields/ArrayField'
import type { ArrayFormField } from '@core/fields/ArrayFormField'
import type { Form } from '@core/Form'

/**
 * Утилита для проверки валидации поля
 */
export function expectValid(field: Field, form?: Form) {
  const isValid = field.checkAndSetValid(form)
  expect(isValid).toBe(true)
  expect(field.isValid).toBe(true)
  expect(field.errors).toEqual([])
  expect(field.error).toBe('')
}

/**
 * Утилита для проверки невалидности поля
 */
export function expectInvalid(field: Field, expectedErrors: string[] = [], form?: Form) {
  const isValid = field.checkAndSetValid(form)
  expect(isValid).toBe(false)
  expect(field.isValid).toBe(false)
  expect(field.errors).toEqual(expectedErrors)
}

/**
 * Утилита для проверки пустого поля
 */
export function expectEmpty(field: Field) {
  expect(field.isEmpty).toBe(true)
}

/**
 * Утилита для проверки непустого поля
 */
export function expectNotEmpty(field: Field) {
  expect(field.isEmpty).toBe(false)
}

/**
 * Утилита для проверки сброса поля
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
 * Утилита для проверки isTouched
 */
export function expectTouched(field: Field) {
  expect(field.isTouched).toBe(true)
}

/**
 * Утилита для проверки isTouched = false
 */
export function expectNotTouched(field: Field) {
  expect(field.isTouched).toBe(false)
}

/**
 * Утилита для создания формы в тестах
 */
export function createTestForm<T extends Form>(FormConstructor: new () => T): T {
  return new FormConstructor()
}

/**
 * Утилита для проверки формы как валидной
 */
export function expectFormValid(form: Form) {
  expect(form.isValid).toBe(true)
  expect(form.checkValid()).toBe(true)
}

/**
 * Утилита для проверки формы как невалидной
 */
export function expectFormInvalid(form: Form) {
  expect(form.isValid).toBe(false)
  expect(form.checkValid()).toBe(false)
}
