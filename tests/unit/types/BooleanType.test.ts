import { describe, it, expect } from 'vitest'
import { BooleanType } from '@core/types/BooleanType'

describe('BooleanType', () => {
  describe('cast', () => {
    it('should return boolean as is', () => {
      const type = new BooleanType({})
      expect(type.cast(true)).toBe(true)
      expect(type.cast(false)).toBe(false)
    })

    it('should convert string "true" to true', () => {
      const type = new BooleanType({})
      expect(type.cast('true')).toBe(true)
    })

    it('should convert string "1" to true', () => {
      const type = new BooleanType({})
      expect(type.cast('1')).toBe(true)
    })

    it('should convert string "false" to false', () => {
      const type = new BooleanType({})
      expect(type.cast('false')).toBe(false)
    })

    it('should convert string "0" to false', () => {
      const type = new BooleanType({})
      expect(type.cast('0')).toBe(false)
    })

    it('should convert number 1 to true', () => {
      const type = new BooleanType({})
      expect(type.cast(1)).toBe(true)
    })

    it('should convert number 0 to false', () => {
      const type = new BooleanType({})
      expect(type.cast(0)).toBe(false)
    })

    it('should return null for null', () => {
      const type = new BooleanType({})
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new BooleanType({})
      expect(type.cast(undefined)).toBeNull()
    })

    it('should return null for invalid string', () => {
      const type = new BooleanType({})
      expect(type.cast('yes')).toBeNull()
    })
  })

  describe('validateErrors', () => {
    it('should return empty errors for valid boolean', () => {
      const type = new BooleanType({})
      const errors = type.validateErrors(true)
      expect(errors).toEqual([])
    })

    it('should return error for mustBeTrue', () => {
      const type = new BooleanType({ mustBeTrue: true })
      
      // Valid
      expect(type.validateErrors(true)).toEqual([])
      
      // Invalid
      const errors = type.validateErrors(false)
      expect(errors).toContainEqual({code: 'must_be_true'})
    })

    it('should return error for mustBeFalse', () => {
      const type = new BooleanType({ mustBeFalse: true })
      
      // Valid
      expect(type.validateErrors(false)).toEqual([])
      
      // Invalid
      const errors = type.validateErrors(true)
      expect(errors).toContainEqual({code: 'must_be_false'})
    })

    it('should emit structured data without generated messages', () => {
      const type = new BooleanType({
        mustBeTrue: true,
      })
      const errors = type.validateErrors(false)
      expect(errors).toContainEqual({code: 'must_be_true'})
    })
  })

  describe('typeId', () => {
    it('should return correct type name', () => {
      const type = new BooleanType({})
      expect(type.typeId).toBe('boolean')
    })
  })
})
