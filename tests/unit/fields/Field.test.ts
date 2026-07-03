import { describe, it, expect } from 'vitest'
import { Field } from '@core/fields/Field'
import { StringType } from '@core/types/StringType'
import { NumberType } from '@core/types/NumberType'
import { BooleanType } from '@core/types/BooleanType'

describe('Field', () => {
  describe('construction', () => {
    it('should create field with default value', () => {
      const field = new Field(StringType, 'hello')
      expect(field.rawValue).toBe('hello')
    })

    it('should create field with null default', () => {
      const field = new Field(StringType, null)
      expect(field.rawValue).toBeNull()
    })

    it('should create field without default', () => {
      const field = new Field(StringType)
      expect(field.rawValue).toBeNull()
    })

    it('should initialize options', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      expect(field.options.minLength).toBe(5)
    })
  })

  describe('rawValue setter', () => {
    it('should update rawValue and valueClear', () => {
      const field = new Field(StringType)
      field.rawValue = 'hello'
      expect(field.rawValue).toBe('hello')
      expect(field.valueClear).toBe('hello')
    })

    it('should mark as touched', () => {
      const field = new Field(StringType)
      field.rawValue = 'hello'
      expect(field.isTouched).toBe(true)
    })

    it('should reset errors', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      field.rawValue = 'ab' // Invalid
      expect(field.errors.length).toBeGreaterThan(0)
      
      field.rawValue = 'hello' // Valid
      expect(field.errors).toEqual([])
    })

    it('should validate on set', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      field.rawValue = 'hello' // Valid
      expect(field.isValid).toBe(true)
      
      field.rawValue = 'ab' // Invalid
      expect(field.isValid).toBe(false)
    })
  })

  describe('valueClear getter', () => {
    it('should return casted value', () => {
      const field = new Field(NumberType)
      field.rawValue = '123'
      expect(field.valueClear).toBe(123)
    })

    it('should return null for invalid cast', () => {
      const field = new Field(NumberType)
      field.rawValue = 'abc'
      expect(field.valueClear).toBeNull()
    })
  })

  describe('isEmpty getter', () => {
    it('should return true for null', () => {
      const field = new Field(StringType)
      expect(field.isEmpty).toBe(true)
    })

    it('should return true for undefined', () => {
      const field = new Field(StringType)
      field.rawValue = undefined
      expect(field.isEmpty).toBe(true)
    })

    it('should return true for empty string', () => {
      const field = new Field(StringType)
      field.rawValue = ''
      expect(field.isEmpty).toBe(true)
    })

    it('should return true for empty array', () => {
      const field = new Field(StringType)
      field.rawValue = []
      expect(field.isEmpty).toBe(true)
    })

    it('should return false for non-empty value', () => {
      const field = new Field(StringType)
      field.rawValue = 'hello'
      expect(field.isEmpty).toBe(false)
    })
  })

  describe('validation', () => {
    describe('isRequired', () => {
      it('should validate required field', () => {
        const field = new Field(StringType, null, { isRequired: true })
        field.rawValue = null
        expect(field.isValid).toBe(false)
      })

      it('should skip validation for optional field', () => {
        const field = new Field(StringType, null, { isRequired: false })
        field.rawValue = null
        expect(field.isValid).toBe(true)
      })

      it('should support function for isRequired', () => {
        class TestForm {
          country = new Field(StringType)
        }
        
        const field = new Field(StringType, null, {
          isRequired: (form?: any) => form?.country?.valueClear === 'USA'
        })
        
        // Not required
        const form1 = { country: { valueClear: 'Canada' } }
        field.checkAndSetValid(form1)
        expect(field.isValid).toBe(true)
        
        // Required
        const form2 = { country: { valueClear: 'USA' } }
        field.checkAndSetValid(form2)
        expect(field.isValid).toBe(false)
      })
    })

    describe('custom validate', () => {
      it('should support custom validator returning boolean', () => {
        const field = new Field(StringType, null, {
          validate: (value) => value === 'admin' || false
        })
        
        field.rawValue = 'admin'
        expect(field.isValid).toBe(true)
        
        field.rawValue = 'user'
        expect(field.isValid).toBe(false)
      })

      it('should support custom validator returning string', () => {
        const field = new Field(StringType, null, {
          validate: (value) => value === 'admin' || 'Must be admin'
        })
        
        field.rawValue = 'user'
        expect(field.errors).toContain('Must be admin')
      })

      it('should pass form to validator', () => {
        const field = new Field(StringType)
        const field2 = new Field(StringType, null, {
          validate: (value, form) => {
            return value === (form as any)?.otherField?.valueClear || 'Must match'
          }
        })
        
        const form = { otherField: { valueClear: 'test' } }
        field2.rawValue = 'test'
        field2.checkAndSetValid(form)
        expect(field2.isValid).toBe(true)
      })
    })
  })

  describe('reset', () => {
    it('should reset to default value', () => {
      const field = new Field(StringType, 'hello')
      field.rawValue = 'world'
      field.reset()
      expect(field.rawValue).toBe('hello')
    })

    it('should clear isTouched', () => {
      const field = new Field(StringType)
      field.rawValue = 'hello'
      expect(field.isTouched).toBe(true)
      field.reset()
      expect(field.isTouched).toBe(false)
    })

    it('should clear errors', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      field.rawValue = 'ab'
      expect(field.errors.length).toBeGreaterThan(0)
      field.reset()
      expect(field.errors).toEqual([])
    })
  })

  describe('errors', () => {
    it('should have error getter', () => {
      const field = new Field(StringType, null, { minLength: 5 })
      field.rawValue = 'ab'
      expect(field.error).toBe(field.errors[0])
    })

    it('should have error setter', () => {
      const field = new Field(StringType)
      field.error = 'Custom error'
      expect(field.errors).toEqual(['Custom error'])
    })

    it('should clear errors when set null', () => {
      const field = new Field(StringType)
      field.error = 'Error'
      field.error = null
      expect(field.errors).toEqual([])
    })
  })
})
