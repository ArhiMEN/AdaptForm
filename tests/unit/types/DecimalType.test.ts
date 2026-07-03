import { describe, it, expect } from 'vitest'
import { DecimalType } from '@core/types/DecimalType'

describe('DecimalType', () => {
  describe('cast', () => {
    it('should return number as is', () => {
      const type = new DecimalType()
      expect(type.cast(123.45)).toBe(123.45)
    })

    it('should convert string with dot to string', () => {
      const type = new DecimalType()
      expect(type.cast('123.45')).toBe('123.45')
    })

    it('should convert string with comma to string', () => {
      const type = new DecimalType()
      expect(type.cast('123,45')).toBe('123.45')
    })

    it('should return null for invalid string', () => {
      const type = new DecimalType()
      expect(type.cast('abc')).toBeNull()
    })

    it('should return null for null', () => {
      const type = new DecimalType()
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new DecimalType()
      expect(type.cast(undefined)).toBeNull()
    })

    it('should handle trailing dot', () => {
      const type = new DecimalType()
      expect(type.cast('123.')).toBe('123.')
    })
  })

  describe('validate', () => {
    it('should return empty errors for valid decimal', () => {
      const type = new DecimalType()
      const errors = type.validate('123.45')
      expect(errors).toEqual([])
    })

    it('should return error for invalid format', () => {
      const type = new DecimalType()
      const errors = type.validate('abc')
      expect(errors).toContain('Пример: 1.00')
    })

    it('should return error for too many decimal places', () => {
      const type = new DecimalType({ decimalPlaces: 2 })
      const errors = type.validate('123.456')
      expect(errors).toContain('Максимальное количество знаков после запятой 2')
    })

    it('should return error for too many digits', () => {
      const type = new DecimalType({ maxDigits: 5 })
      const errors = type.validate('12345.67')
      expect(errors).toContain('Максимальное количество знаков 5')
    })

    it('should return error for gt', () => {
      const type = new DecimalType({ gt: 10 })
      const errors = type.validate('5.00')
      expect(errors).toContain('Значение должно быть больше 10')
    })

    it('should return error for lt', () => {
      const type = new DecimalType({ lt: 10 })
      const errors = type.validate('15.00')
      expect(errors).toContain('Значение должно быть меньше 10')
    })

    it('should allow trailing dot during input', () => {
      const type = new DecimalType()
      const errors = type.validate('123.')
      expect(errors).toEqual([])
    })

    it('should return custom errors', () => {
      const type = new DecimalType({
        decimalPlaces: 2,
        messages: { decimalPlaces: 'Only 2 decimal places!' }
      })
      const errors = type.validate('123.456')
      expect(errors).toContain('Only 2 decimal places!')
    })

    it('should handle min/max conditions', () => {
      const type = new DecimalType({ gt: 0, lt: 1000 })
      
      // Valid
      expect(type.validate('500.00')).toEqual([])
      
      // Less than min
      expect(type.validate('-5.00').length).toBe(1)
      
      // Greater than max
      expect(type.validate('1500.00').length).toBe(1)
    })
  })

  describe('getTypeName', () => {
    it('should return correct type name', () => {
      const type = new DecimalType()
      expect(type.getTypeName()).toBe('десятичное число')
    })
  })
})
