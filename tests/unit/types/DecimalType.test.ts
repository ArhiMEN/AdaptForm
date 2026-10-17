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

    it('should reject numeric values with excess decimal places instead of rounding them', () => {
      const type = new DecimalType({ decimalPlaces: 2 })
      expect(type.validate(1.234)).toContain('Максимальное количество знаков после запятой 2')
    })

    it('should respect zero decimal places', () => {
      const type = new DecimalType({ decimalPlaces: 0, maxDigits: 3 })
      expect(type.validate('123')).toEqual([])
      expect(type.validate('1.2')).toContain('Максимальное количество знаков после запятой 0')
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

    it.each(['123.', '0.', '-123.'])('should retain %s for editing but reject it on validation', (input) => {
      const type = new DecimalType()
      expect(type.cast(input)).toBe(input)
      expect(type.validate(input)).toEqual(['После точки должен быть минимум 1 знак'])
    })

    it('should normalize incomplete comma input without completing it', () => {
      const type = new DecimalType()
      expect(type.cast('123,')).toBe('123.')
      expect(type.validate(type.cast('123,')!)).toEqual(['После точки должен быть минимум 1 знак'])
    })

    it.each([
      { gt: 123 }, { ge: 124 }, { lt: 123 }, { le: 122 },
      { gt: 0 }, { ge: 0 }, { lt: 124 }, { le: 123 },
    ])(
      'should reject incomplete input as a format error with bounds %j', (options) => {
        const type = new DecimalType(options)
        expect(type.validate('123.')).toEqual(['После точки должен быть минимум 1 знак'])
      },
    )

    it.each([
      [{ gt: 0 }, '-0.01', false], [{ gt: 0 }, '0', false], [{ gt: 0 }, '0.01', true],
      [{ ge: 0 }, '-0.01', false], [{ ge: 0 }, '0', true], [{ ge: 0 }, '0.01', true],
      [{ lt: 0 }, '-0.01', true], [{ lt: 0 }, '0', false], [{ lt: 0 }, '0.01', false],
      [{ le: 0 }, '-0.01', true], [{ le: 0 }, '0', true], [{ le: 0 }, '0.01', false],
      [{ gt: -1 }, '-1', false], [{ ge: -1 }, '-1', true],
      [{ lt: -1 }, '-1', false], [{ le: -1 }, '-1', true],
    ] as const)('should enforce bounds %j for %s with validity %s', (options, input, valid) => {
      const type = new DecimalType(options)
      expect(type.validate(input).length === 0).toBe(valid)
      expect(type.validate(Number(input)).length === 0).toBe(valid)
    })

    it.each(['123', '123.0', '123.45', '-123.45', '0', 123, 123.45, -123.45, 0])(
      'should accept complete input %j within bounds', (input) => {
        const type = new DecimalType({ ge: -123.45, le: 123.45 })
        expect(type.validate(input)).toEqual([])
      },
    )

    it('should validate complete comma input after casting', () => {
      const type = new DecimalType({ gt: 123, le: 123.5 })
      const value = type.cast('123,5')
      expect(value).toBe('123.5')
      expect(type.validate(value!)).toEqual([])
      expect(type.validate(type.cast('123,51')!)).toEqual(['Значение должно быть не более 123.5'])
    })

    it.each(['abc', '.5', '-.', '1.2.3', '1,2,3', '12x', '1e2', ''])('should reject malformed input %j', (input) => {
      const type = new DecimalType()
      expect(type.cast(input)).toBeNull()
      expect(type.validate(input)).toEqual(['Пример: 1.00'])
    })

    it('should preserve integer, total digit, and precision limits without rounding', () => {
      const type = new DecimalType({ maxDigits: 5, decimalPlaces: 2 })
      expect(type.validate('-123.45')).toEqual([])
      expect(type.validate('-1234')).toEqual(['Максимальное количество знаков перед запятой 3'])
      expect(type.validate('-1234.56')).toContain('Максимальное количество знаков 5')
      expect(type.validate('1234.')).toEqual([
        'Максимальное количество знаков перед запятой 3', 'После точки должен быть минимум 1 знак',
      ])
      expect(type.cast(1.234)).toBe(1.234)
      expect(type.validate(1.234)).toEqual(['Максимальное количество знаков после запятой 2'])
    })

    it.each(['1.0', '1.', '-1.', 1.2])('should reject fractional or incomplete input %j with zero decimal places', (input) => {
      const type = new DecimalType({ decimalPlaces: 0, maxDigits: 3 })
      expect(type.validate(input)).not.toEqual([])
      expect(type.validate(-123)).toEqual([])
      expect(type.validate('1234')).toEqual(['Максимальное количество знаков перед запятой 3'])
    })

    it('should use custom format and digit messages', () => {
      const type = new DecimalType({
        maxDigits: 5,
        messages: { invalid: 'Complete the number', maxDigits: 'Too many digits' },
      })
      expect(type.validate('123.')).toEqual(['Complete the number'])
      expect(type.validate('abc')).toEqual(['Complete the number'])
      expect(type.validate('1234')).toEqual(['Too many digits'])
    })

    it.each([
      [{ gt: 0 }, 'gt'], [{ ge: 1 }, 'ge'], [{ lt: 0 }, 'lt'], [{ le: -1 }, 'le'],
    ] as const)('should preserve custom bound messages for %j', (options, key) => {
      const type = new DecimalType({ ...options, messages: { [key]: 'Outside the allowed range' } })
      expect(type.validate('0')).toEqual(['Outside the allowed range'])
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
