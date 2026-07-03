import { describe, it, expect } from 'vitest'
import { Field } from '@core/fields/Field'
import { StringType } from '@core/types/StringType'
import { NumberType } from '@core/types/NumberType'
import { BooleanType } from '@core/types/BooleanType'

describe('Validation Tests', () => {
  describe('String Validation', () => {
    it('should validate minLength', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      
      field.rawValue = 'abc'
      expect(field.isValid).toBe(false)
      expect(field.errors).toContain('Минимальная длина 5 символов')
      
      field.rawValue = 'abcde'
      expect(field.isValid).toBe(true)
    })

    it('should validate maxLength', () => {
      const field = new Field(StringType, null, { maxLength: 10 })
      
      field.rawValue = 'this is a very long string'
      expect(field.isValid).toBe(false)
      
      field.rawValue = 'short'
      expect(field.isValid).toBe(true)
    })

    it('should validate pattern', () => {
      const field = new Field(StringType, null, { pattern: /^[a-zA-Z0-9]+$/ })
      
      field.rawValue = 'test123'
      expect(field.isValid).toBe(true)
      
      field.rawValue = 'test_123'
      expect(field.isValid).toBe(false)
    })
  })

  describe('Number Validation', () => {
    it('should validate gt (greater than)', () => {
      const field = new Field(NumberType, null, { gt: 10 })
      
      field.rawValue = 5
      expect(field.isValid).toBe(false)
      
      field.rawValue = 15
      expect(field.isValid).toBe(true)
    })

    it('should validate ge (greater or equal)', () => {
      const field = new Field(NumberType, null, { ge: 10 })
      
      field.rawValue = 9
      expect(field.isValid).toBe(false)
      
      field.rawValue = 10
      expect(field.isValid).toBe(true)
      
      field.rawValue = 11
      expect(field.isValid).toBe(true)
    })

    it('should validate lt (less than)', () => {
      const field = new Field(NumberType, null, { lt: 100 })
      
      field.rawValue = 105
      expect(field.isValid).toBe(false)
      
      field.rawValue = 99
      expect(field.isValid).toBe(true)
    })

    it('should validate le (less or equal)', () => {
      const field = new Field(NumberType, null, { le: 100 })
      
      field.rawValue = 101
      expect(field.isValid).toBe(false)
      
      field.rawValue = 100
      expect(field.isValid).toBe(true)
    })

    it('should validate integer', () => {
      const field = new Field(NumberType)
      
      field.rawValue = 10.5
      expect(field.isValid).toBe(false)
      
      field.rawValue = 10
      expect(field.isValid).toBe(true)
    })
  })

  describe('Boolean Validation', () => {
    it('should validate mustBeTrue', () => {
      const field = new Field(BooleanType, null, { mustBeTrue: true })
      
      field.rawValue = false
      expect(field.isValid).toBe(false)
      
      field.rawValue = true
      expect(field.isValid).toBe(true)
    })

    it('should validate mustBeFalse', () => {
      const field = new Field(BooleanType, null, { mustBeFalse: true })
      
      field.rawValue = true
      expect(field.isValid).toBe(false)
      
      field.rawValue = false
      expect(field.isValid).toBe(true)
    })
  })

  describe('Required Validation', () => {
    it('should require non-empty field', () => {
      const field = new Field(StringType, null, { isRequired: true })
      
      field.rawValue = null
      expect(field.isValid).toBe(false)
      
      field.rawValue = 'value'
      expect(field.isValid).toBe(true)
    })

    it('should skip validation for empty optional field', () => {
      const field = new Field(StringType, null, { isRequired: false })
      
      field.rawValue = null
      expect(field.isValid).toBe(true)
    })

    it('should support function for conditional required', () => {
      class TestForm {
        hasEmail = new Field(BooleanType, false)
        email = new Field(StringType, null, {
          isRequired: (form?: any) => form?.hasEmail?.valueClear === true
        })
      }
      
      const form = new TestForm() as any
      form.hasEmail.rawValue = false
      form.email.rawValue = null
      form.email.checkAndSetValid(form)
      expect(form.email.isValid).toBe(true)
      
      form.hasEmail.rawValue = true
      form.email.checkAndSetValid(form)
      expect(form.email.isValid).toBe(false)
    })
  })

  describe('Custom Validation', () => {
    it('should support validator returning boolean', () => {
      const field = new Field(StringType, null, {
        validate: (value) => value.length > 3 || false
      })
      
      field.rawValue = 'ab'
      expect(field.isValid).toBe(false)
      
      field.rawValue = 'abcd'
      expect(field.isValid).toBe(true)
    })

    it('should support validator returning string', () => {
      const field = new Field(StringType, null, {
        validate: (value) => value.length > 3 || 'Must be longer than 3 characters'
      })
      
      field.rawValue = 'ab'
      expect(field.errors).toContain('Must be longer than 3 characters')
    })

    it('should support async validation (mock)', () => {
      // В реальном приложении можно добавить async validation
      const field = new Field(StringType, null, {
        validate: async (value) => {
          // Имитация async проверки (например, проверка уникальности на сервере)
          return new Promise<boolean>((resolve) => {
            setTimeout(() => {
              resolve(value !== 'taken')
            }, 100)
          })
        }
      })
      
      // Тест для синхронной части
      field.rawValue = 'available'
      expect(field.isValid).toBe(true) // Так как validate возвращает true
    })

    it('should pass form context to validator', () => {
      const field = new Field(StringType)
      const field2 = new Field(StringType, null, {
        validate: (value, form) => {
          return value === (form as any)?.field?.valueClear || 'Must match field'
        }
      })
      
      const form = { field: { valueClear: 'test' } } as any
      field2.rawValue = 'test'
      field2.checkAndSetValid(form)
      expect(field2.isValid).toBe(true)
    })
  })

  describe('Validation Messages', () => {
    it('should support custom validation messages', () => {
      const field = new Field(StringType, null, {
        minLength: 5,
        maxLength: 10,
        messages: {
          minLength: 'Too short!',
          maxLength: 'Too long!'
        }
      })
      
      field.rawValue = 'ab'
      expect(field.errors).toContain('Too short!')
      
      field.rawValue = 'this is a very long string'
      expect(field.errors).toContain('Too long!')
    })

    it('should use default messages when no custom', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      
      field.rawValue = 'ab'
      expect(field.errors).toContain('Минимальная длина 5 символов')
    })
  })

  describe('Validation State', () => {
    it('should track isTouched', () => {
      const field = new Field(StringType)
      
      expect(field.isTouched).toBe(false)
      
      field.rawValue = 'value'
      expect(field.isTouched).toBe(true)
    })

    it('should reset isValid on reset', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      
      field.rawValue = 'ab'
      expect(field.isValid).toBe(false)
      
      field.reset()
      expect(field.isValid).toBe(null)
    })

    it('should clear errors on valid value', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      
      field.rawValue = 'ab'
      expect(field.errors.length).toBeGreaterThan(0)
      
      field.rawValue = 'abcdef'
      expect(field.errors).toEqual([])
    })
  })
})
