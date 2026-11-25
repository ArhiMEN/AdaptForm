import { describe, it, expect } from 'vitest'
import { DateType } from '@core/types/DateType'

describe('DateType', () => {
  describe('cast', () => {
    it('should return Date as is', () => {
      const type = new DateType()
      const date = new Date('2023-01-01')
      expect(type.cast(date)).toEqual(date)
    })

    it('should convert string to Date', () => {
      const type = new DateType()
      const result = type.cast('2023-01-01')
      expect(result).toBeInstanceOf(Date)
    })

    it('should return null for invalid Date', () => {
      const type = new DateType()
      expect(type.cast(new Date('invalid'))).toBeNull()
    })

    it('should return null for null', () => {
      const type = new DateType()
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new DateType()
      expect(type.cast(undefined)).toBeNull()
    })
  })

  describe('validateErrors', () => {
    it('should return empty errors for valid date', () => {
      const type = new DateType()
      const errors = type.validateErrors(new Date('2023-01-01'))
      expect(errors).toEqual([])
    })

    it('should return error for invalid date', () => {
      const type = new DateType()
      const errors = type.validateErrors(new Date('invalid'))
      expect(errors).toContainEqual({code: 'invalid_type', params: {expected: 'date'}})
    })

    it('should return error for minDate', () => {
      const type = new DateType({ minDate: new Date('2023-01-01') })
      const errors = type.validateErrors(new Date('2022-01-01'))
      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return error for maxDate', () => {
      const type = new DateType({ maxDate: new Date('2023-01-01') })
      const errors = type.validateErrors(new Date('2024-01-01'))
      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should emit structured data without generated messages', () => {
      const type = new DateType({
        minDate: new Date('2023-01-01'),
      })
      const errors = type.validateErrors(new Date('2022-01-01'))
      expect(errors).toContainEqual({code: 'min_date', params: {min: new Date('2023-01-01').getTime()}})
    })

    it('should ignore time when isDatetime is false', () => {
      const type = new DateType({ isDatetime: false })
      const errors = type.validateErrors(new Date('2023-01-01 12:00:00'))
      expect(errors).toEqual([])
    })

    it('should check time when isDatetime is true', () => {
      const type = new DateType({
        isDatetime: true,
        minDate: new Date('2023-01-01T11:00:00')
      })
      const date1 = new Date('2023-01-01T10:00:00')
      const date2 = new Date('2023-01-01T12:00:00')
      expect(type.validateErrors(date1).length).toBeGreaterThan(0)
      expect(type.validateErrors(date2)).toEqual([])
    })
  })

  describe('typeId', () => {
    it('should return "date" when isDatetime is false', () => {
      const type = new DateType()
      expect(type.typeId).toBe('date')
    })

    it('should return "datetime" when isDatetime is true', () => {
      const type = new DateType({ isDatetime: true })
      expect(type.typeId).toBe('datetime')
    })
  })
})
