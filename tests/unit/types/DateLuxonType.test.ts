import { describe, it, expect } from 'vitest'
import { DateLuxonType } from '@core/types/DateLuxonType'
import { DateTime } from 'luxon'

describe('DateLuxonType', () => {
  describe('cast', () => {
    it('should return DateTime as is', () => {
      const type = new DateLuxonType({})
      const dt = DateTime.fromISO('2023-01-01')
      expect(type.cast(dt)).toEqual(dt)
    })

    it('should convert Date to DateTime', () => {
      const type = new DateLuxonType({})
      const result = type.cast(new Date('2023-01-01'))
      expect(result).toBeInstanceOf(DateTime)
    })

    it('should convert string to DateTime', () => {
      const type = new DateLuxonType({})
      const result = type.cast('2023-01-01')
      expect(result).toBeInstanceOf(DateTime)
    })

    it('should use inputFormat when provided', () => {
      const type = new DateLuxonType({ inputFormat: 'dd.MM.yyyy' })
      const result = type.cast('01.01.2023')
      expect(result).toBeInstanceOf(DateTime)
      expect(result?.year).toBe(2023)
    })

    it('should return null for invalid DateTime', () => {
      const type = new DateLuxonType({})
      expect(type.cast(DateTime.invalid('test'))).toBeNull()
    })

    it('should return null for null', () => {
      const type = new DateLuxonType({})
      expect(type.cast(null)).toBeNull()
    })

    it('should return null for undefined', () => {
      const type = new DateLuxonType({})
      expect(type.cast(undefined)).toBeNull()
    })

    it('should handle milliseconds', () => {
      const type = new DateLuxonType({})
      const result = type.cast(1672531200000)
      expect(result).toBeInstanceOf(DateTime)
    })
  })

  describe('validateErrors', () => {
    it('should return empty errors for valid DateTime', () => {
      const type = new DateLuxonType({})
      const errors = type.validateErrors(DateTime.fromISO('2023-01-01'))
      expect(errors).toEqual([])
    })

    it('should return error for invalid DateTime', () => {
      const type = new DateLuxonType({})
      const errors = type.validateErrors(DateTime.invalid('test'))
      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return error for minDate', () => {
      const type = new DateLuxonType({ minDate: DateTime.fromISO('2023-01-01') })
      const errors = type.validateErrors(DateTime.fromISO('2022-01-01'))
      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return error for maxDate', () => {
      const type = new DateLuxonType({ maxDate: DateTime.fromISO('2023-01-01') })
      const errors = type.validateErrors(DateTime.fromISO('2024-01-01'))
      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should ignore time when isDatetime is false', () => {
      const type = new DateLuxonType({ isDatetime: false })
      const dt = DateTime.fromISO('2023-01-01T12:00:00')
      const errors = type.validateErrors(dt)
      expect(errors).toEqual([])
    })

    it('should check time when isDatetime is true', () => {
      const type = new DateLuxonType({ isDatetime: true })
      const dt = DateTime.fromISO('2023-01-01T12:00:00')
      const errors = type.validateErrors(dt)
      expect(errors).toEqual([])
    })

    it('should validate year range', () => {
      const type = new DateLuxonType({})
      expect(type.validateErrors(DateTime.fromISO('1800-01-01')).length).toBeGreaterThan(0)
      expect(type.validateErrors(DateTime.fromISO('2200-01-01')).length).toBeGreaterThan(0)
    })
  })

  describe('typeId', () => {
    it('should return "date" when isDatetime is false', () => {
      const type = new DateLuxonType({})
      expect(type.typeId).toBe('luxon_date')
    })

    it('should return "datetime" when isDatetime is true', () => {
      const type = new DateLuxonType({ isDatetime: true })
      expect(type.typeId).toBe('luxon_datetime')
    })
  })
})
