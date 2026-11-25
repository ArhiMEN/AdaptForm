import { describe, it, expect } from 'vitest'
import { NumberType } from '@core/types/NumberType'

describe('NumberType', () => {
  describe('cast', () => {
    it('should return number as is', () => {
      const type = new NumberType({})
      expect(type.cast(123)).toBe(123)
    })

    it('should convert string to number', () => {
      const type = new NumberType({})
      expect(type.cast('456')).toBe(456)
    })

    it('should return null for NaN string', () => {
      const type = new NumberType({})
      expect(type.cast('abc')).toBeNull()
    })

    it('should return null for null', () => {
      const type = new NumberType({})
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new NumberType({})
      expect(type.cast(undefined)).toBeNull()
    })

    it('should return null for blank numeric strings', () => {
      const type = new NumberType({})
      expect(type.cast('')).toBeNull()
      expect(type.cast('   ')).toBeNull()
    })

    it('should reject non-finite numbers', () => {
      const type = new NumberType({})
      expect(type.cast(Infinity)).toBeNull()
      expect(type.cast(-Infinity)).toBeNull()
      expect(type.cast('Infinity')).toBeNull()
      expect(type.validateErrors(Infinity)).not.toEqual([])
    })
    it('should return null for NaN', () => {
      const type = new NumberType({})
      expect(type.cast(NaN)).toBeNull()
    })
  })

  describe('validateErrors', () => {
    it('should return empty errors for valid integer', () => {
      const type = new NumberType({})
      const errors = type.validateErrors(10)
      expect(errors).toEqual([])
    })

    it('should return error for float', () => {
      const type = new NumberType({})
      const errors = type.validateErrors(10.5)
      expect(errors).toContainEqual({code: 'integer'})
    })

    it('should return error for gt', () => {
      const type = new NumberType({ gt: 10 })
      const errors = type.validateErrors(5)
      expect(errors).toContainEqual({code: 'min_value', params: {min: 10, exclusive: true}})
    })

    it('should return error for lt', () => {
      const type = new NumberType({ lt: 10 })
      const errors = type.validateErrors(15)
      expect(errors).toContainEqual({code: 'max_value', params: {max: 10, exclusive: true}})
    })

    it('should return error for ge', () => {
      const type = new NumberType({ ge: 10 })
      const errors = type.validateErrors(5)
      expect(errors).toContainEqual({code: 'min_value', params: {min: 10, exclusive: false}})
    })

    it('should return error for le', () => {
      const type = new NumberType({ le: 10 })
      const errors = type.validateErrors(15)
      expect(errors).toContainEqual({code: 'max_value', params: {max: 10, exclusive: false}})
    })

    it('should emit structured data without generated messages', () => {
      const type = new NumberType({
        gt: 10,
      })
      const errors = type.validateErrors(5)
      expect(errors).toContainEqual({code: 'min_value', params: {min: 10, exclusive: true}})
    })

    it('should handle multiple conditions', () => {
      const type = new NumberType({ gt: 0, lt: 100 })
      
      // Valid
      expect(type.validateErrors(50)).toEqual([])
      
      // Less than min
      expect(type.validateErrors(-5).length).toBe(1)
      
      // Greater than max
      expect(type.validateErrors(150).length).toBe(1)
    })
  })

  describe('typeId', () => {
    it('should return correct type name', () => {
      const type = new NumberType({})
      expect(type.typeId).toBe('number')
    })
  })
})
