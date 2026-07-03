import { describe, it, expect } from 'vitest'
import { StringType } from '@core/types/StringType'

describe('StringType', () => {
  describe('cast', () => {
    it('should return string as is', () => {
      const type = new StringType()
      expect(type.cast('hello')).toBe('hello')
    })

    it('should convert number to string', () => {
      const type = new StringType()
      expect(type.cast(123)).toBe('123')
    })

    it('should convert boolean to string', () => {
      const type = new StringType()
      expect(type.cast(true)).toBe('true')
    })

    it('should return null for null', () => {
      const type = new StringType()
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new StringType()
      expect(type.cast(undefined)).toBeNull()
    })
  })

  describe('validate', () => {
    it('should return empty errors for valid string', () => {
      const type = new StringType()
      const errors = type.validate('hello')
      expect(errors).toEqual([])
    })

    it('should return error for string too short', () => {
      const type = new StringType({ minLength: 5 })
      const errors = type.validate('abc')
      expect(errors).toContain('Минимальная длина 5 символов')
    })

    it('should return custom error for string too short', () => {
      const type = new StringType({
        minLength: 5,
        messages: { minLength: 'Too short!' }
      })
      const errors = type.validate('abc')
      expect(errors).toContain('Too short!')
    })

    it('should return error for string too long', () => {
      const type = new StringType({ maxLength: 5 })
      const errors = type.validate('abcdef')
      expect(errors).toContain('Максимальная длина 5 символов')
    })

    it('should return custom error for string too long', () => {
      const type = new StringType({
        maxLength: 5,
        messages: { maxLength: 'Too long!' }
      })
      const errors = type.validate('abcdef')
      expect(errors).toContain('Too long!')
    })

    it('should return error for pattern mismatch', () => {
      const type = new StringType({ pattern: /^[a-z]+$/ })
      const errors = type.validate('ABC123')
      expect(errors).toContain('Неверный формат')
    })

    it('should return custom error for pattern mismatch', () => {
      const type = new StringType({
        pattern: /^[a-z]+$/,
        messages: { pattern: 'Only lowercase letters!' }
      })
      const errors = type.validate('ABC')
      expect(errors).toContain('Only lowercase letters!')
    })

    it('should handle both minLength and maxLength', () => {
      const type = new StringType({ minLength: 3, maxLength: 10 })
      
      // Valid
      expect(type.validate('hello')).toEqual([])
      
      // Too short
      expect(type.validate('ab').length).toBe(1)
      
      // Too long
      expect(type.validate('this is a very long string').length).toBe(1)
    })
  })

  describe('getTypeName', () => {
    it('should return correct type name', () => {
      const type = new StringType()
      expect(type.getTypeName()).toBe('строка')
    })
  })
})
