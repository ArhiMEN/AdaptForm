import { describe, it, expect } from 'vitest'
import { NumberType } from '@core/types/NumberType'

describe('NumberType', () => {
  describe('cast', () => {
    it('should return number as is', () => {
      const type = new NumberType()
      expect(type.cast(123)).toBe(123)
    })

    it('should convert string to number', () => {
      const type = new NumberType()
      expect(type.cast('456')).toBe(456)
    })

    it('should return null for NaN string', () => {
      const type = new NumberType()
      expect(type.cast('abc')).toBeNull()
    })

    it('should return null for null', () => {
      const type = new NumberType()
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new NumberType()
      expect(type.cast(undefined)).toBeNull()
    })

    it('should return null for NaN', () => {
      const type = new NumberType()
      expect(type.cast(NaN)).toBeNull()
    })
  })

  describe('validate', () => {
    it('should return empty errors for valid integer', () => {
      const type = new NumberType()
      const errors = type.validate(10)
      expect(errors).toEqual([])
    })

    it('should return error for float', () => {
      const type = new NumberType()
      const errors = type.validate(10.5)
      expect(errors).toContain('Значение должно быть целым числом')
    })

    it('should return error for gt', () => {
      const type = new NumberType({ gt: 10 })
      const errors = type.validate(5)
      expect(errors).toContain('Значение должно быть больше 10')
    })

    it('should return error for lt', () => {
      const type = new NumberType({ lt: 10 })
      const errors = type.validate(15)
      expect(errors).toContain('Значение должно быть меньше 10')
    })

    it('should return error for ge', () => {
      const type = new NumberType({ ge: 10 })
      const errors = type.validate(5)
      expect(errors).toContain('Значение должно быть не менее 10')
    })

    it('should return error for le', () => {
      const type = new NumberType({ le: 10 })
      const errors = type.validate(15)
      expect(errors).toContain('Значение должно быть не более 10')
    })

    it('should return custom errors', () => {
      const type = new NumberType({
        gt: 10,
        messages: { gt: 'Must be greater than 10' }
      })
      const errors = type.validate(5)
      expect(errors).toContain('Must be greater than 10')
    })

    it('should handle multiple conditions', () => {
      const type = new NumberType({ gt: 0, lt: 100 })
      
      // Valid
      expect(type.validate(50)).toEqual([])
      
      // Less than min
      expect(type.validate(-5).length).toBe(1)
      
      // Greater than max
      expect(type.validate(150).length).toBe(1)
    })
  })

  describe('getTypeName', () => {
    it('should return correct type name', () => {
      const type = new NumberType()
      expect(type.getTypeName()).toBe('число')
    })
  })
})
