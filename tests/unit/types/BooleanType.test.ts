import { describe, it, expect } from 'vitest'
import { BooleanType } from '@core/types/BooleanType'

describe('BooleanType', () => {
  describe('cast', () => {
    it('should return boolean as is', () => {
      const type = new BooleanType()
      expect(type.cast(true)).toBe(true)
      expect(type.cast(false)).toBe(false)
    })

    it('should convert string "true" to true', () => {
      const type = new BooleanType()
      expect(type.cast('true')).toBe(true)
    })

    it('should convert string "1" to true', () => {
      const type = new BooleanType()
      expect(type.cast('1')).toBe(true)
    })

    it('should convert string "false" to false', () => {
      const type = new BooleanType()
      expect(type.cast('false')).toBe(false)
    })

    it('should convert string "0" to false', () => {
      const type = new BooleanType()
      expect(type.cast('0')).toBe(false)
    })

    it('should convert number 1 to true', () => {
      const type = new BooleanType()
      expect(type.cast(1)).toBe(true)
    })

    it('should convert number 0 to false', () => {
      const type = new BooleanType()
      expect(type.cast(0)).toBe(false)
    })

    it('should return null for null', () => {
      const type = new BooleanType()
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new BooleanType()
      expect(type.cast(undefined)).toBeNull()
    })

    it('should return null for invalid string', () => {
      const type = new BooleanType()
      expect(type.cast('yes')).toBeNull()
    })
  })

  describe('validate', () => {
    it('should return empty errors for valid boolean', () => {
      const type = new BooleanType()
      const errors = type.validate(true)
      expect(errors).toEqual([])
    })

    it('should return error for mustBeTrue', () => {
      const type = new BooleanType({ mustBeTrue: true })
      
      // Valid
      expect(type.validate(true)).toEqual([])
      
      // Invalid
      const errors = type.validate(false)
      expect(errors).toContain('Значение должно быть true')
    })

    it('should return error for mustBeFalse', () => {
      const type = new BooleanType({ mustBeFalse: true })
      
      // Valid
      expect(type.validate(false)).toEqual([])
      
      // Invalid
      const errors = type.validate(true)
      expect(errors).toContain('Значение должно быть false')
    })

    it('should return custom errors', () => {
      const type = new BooleanType({
        mustBeTrue: true,
        messages: { mustBeTrue: 'Must agree!' }
      })
      const errors = type.validate(false)
      expect(errors).toContain('Must agree!')
    })
  })

  describe('getTypeName', () => {
    it('should return correct type name', () => {
      const type = new BooleanType()
      expect(type.getTypeName()).toBe('логическое значение')
    })
  })
})
