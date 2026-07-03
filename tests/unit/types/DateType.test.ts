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

  describe('validate', () => {
    it('should return empty errors for valid date', () => {
      const type = new DateType()
      const errors = type.validate(new Date('2023-01-01'))
      expect(errors).toEqual([])
    })

    it('should return error for invalid date', () => {
      const type = new DateType()
      const errors = type.validate(new Date('invalid'))
      expect(errors).toContain('Неверная дата')
    })

    it('should return error for minDate', () => {
      const type = new DateType({ minDate: new Date('2023-01-01') })
      const errors = type.validate(new Date('2022-01-01'))
      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return error for maxDate', () => {
      const type = new DateType({ maxDate: new Date('2023-01-01') })
      const errors = type.validate(new Date('2024-01-01'))
      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return custom errors', () => {
      const type = new DateType({
        minDate: new Date('2023-01-01'),
        messages: { minDate: 'Date must be after 2023' }
      })
      const errors = type.validate(new Date('2022-01-01'))
      expect(errors).toContain('Date must be after 2023')
    })

    it('should ignore time when isDatetime is false', () => {
      const type = new DateType({ isDatetime: false })
      const errors = type.validate(new Date('2023-01-01 12:00:00'))
      expect(errors).toEqual([])
    })

    it('should check time when isDatetime is true', () => {
      const type = new DateType({ isDatetime: true })
      const date1 = new Date('2023-01-01 10:00:00')
      const date2 = new Date('2023-01-01 12:00:00')
      expect(type.validate(date1)).toEqual([])
    })
  })

  describe('getTypeName', () => {
    it('should return "date" when isDatetime is false', () => {
      const type = new DateType()
      expect(type.getTypeName()).toBe('дата')
    })

    it('should return "datetime" when isDatetime is true', () => {
      const type = new DateType({ isDatetime: true })
      expect(type.getTypeName()).toBe('дата и время')
    })
  })
})
