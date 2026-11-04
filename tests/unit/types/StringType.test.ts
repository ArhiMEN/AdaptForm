import { describe, it, expect } from 'vitest'
import { StringType } from '@core/types/StringType'

describe('StringType', () => {
  describe('cast', () => {
    it('should return string as is', () => {
      const type = new StringType({})
      expect(type.cast('hello')).toBe('hello')
    })

    it('should convert number to string', () => {
      const type = new StringType({})
      expect(type.cast(123)).toBe('123')
    })

    it('should convert boolean to string', () => {
      const type = new StringType({})
      expect(type.cast(true)).toBe('true')
    })

    it('should return null for null', () => {
      const type = new StringType({})
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new StringType({})
      expect(type.cast(undefined)).toBeNull()
    })
  })

  describe('validateErrors', () => {
    it('should return empty errors for valid string', () => {
      const type = new StringType({})
      const errors = type.validateErrors('hello')
      expect(errors).toEqual([])
    })

    it('should return error for string too short', () => {
      const type = new StringType({ minLength: 5 })
      const errors = type.validateErrors('abc')
      expect(errors).toContainEqual({code: 'min_length', params: {min: 5}})
    })

    it('should emit structured data without generated messages for string too short', () => {
      const type = new StringType({
        minLength: 5,
      })
      const errors = type.validateErrors('abc')
      expect(errors).toContainEqual({code: 'min_length', params: {min: 5}})
    })

    it('should return error for string too long', () => {
      const type = new StringType({ maxLength: 5 })
      const errors = type.validateErrors('abcdef')
      expect(errors).toContainEqual({code: 'max_length', params: {max: 5}})
    })

    it('should emit structured data without generated messages for string too long', () => {
      const type = new StringType({
        maxLength: 5,
      })
      const errors = type.validateErrors('abcdef')
      expect(errors).toContainEqual({code: 'max_length', params: {max: 5}})
    })

    it('should return error for pattern mismatch', () => {
      const type = new StringType({ pattern: /^[a-z]+$/ })
      const errors = type.validateErrors('ABC123')
      expect(errors).toContainEqual({code: 'pattern'})
    })

    it('should validate global patterns consistently across repeated calls', () => {
      const type = new StringType({ pattern: /^abc$/g })

      expect(type.validateErrors('abc')).toEqual([])
      expect(type.validateErrors('abc')).toEqual([])
      expect(type.validateErrors('xabc')).toContainEqual({code: 'pattern'})
    })
    it('should emit structured data without generated messages for pattern mismatch', () => {
      const type = new StringType({
        pattern: /^[a-z]+$/,
      })
      const errors = type.validateErrors('ABC')
      expect(errors).toContainEqual({code: 'pattern'})
    })

    it('should handle both minLength and maxLength', () => {
      const type = new StringType({ minLength: 3, maxLength: 10 })
      
      // Valid
      expect(type.validateErrors('hello')).toEqual([])
      
      // Too short
      expect(type.validateErrors('ab').length).toBe(1)
      
      // Too long
      expect(type.validateErrors('this is a very long string').length).toBe(1)
    })
  })

  describe('typeId', () => {
    it('should return correct type name', () => {
      const type = new StringType({})
      expect(type.typeId).toBe('string')
    })
  })
})
