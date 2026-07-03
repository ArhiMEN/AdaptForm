import { describe, it, expect } from 'vitest'
import { ArrayField } from '@core/fields/ArrayField'
import { Field } from '@core/fields/Field'
import { StringType } from '@core/types/StringType'
import { NumberType } from '@core/types/NumberType'

describe('ArrayField', () => {
  describe('construction', () => {
    it('should create array field with factory', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory)
      expect(arrayField.items).toEqual([])
    })

    it('should initialize with values', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, {}, ['a', 'b', 'c'])
      expect(arrayField.itemsValue).toEqual(['a', 'b', 'c'])
    })

    it('should set options', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, { minItems: 1 })
      expect(arrayField['options'].minItems).toBe(1)
    })
  })

  describe('itemsValue setter', () => {
    it('should replace all items', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, {}, ['a'])
      arrayField.itemsValue = ['b', 'c']
      expect(arrayField.itemsValue).toEqual(['b', 'c'])
      expect(arrayField.items.length).toBe(2)
    })

    it('should validate on set', () => {
      const factory = (value?: number) => new Field(NumberType, value, { gt: 0 })
      const arrayField = new ArrayField(factory, {}, [1, 2])
      expect(arrayField.isValid).toBe(true)
      
      arrayField.itemsValue = [-1, 2]
      expect(arrayField.isValid).toBe(false)
    })
  })

  describe('add', () => {
    it('should add item', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory)
      arrayField.add('hello')
      expect(arrayField.itemsValue).toEqual(['hello'])
    })

    it('should mark as touched', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory)
      arrayField.add('hello')
      expect(arrayField.isTouched).toBe(true)
    })

    it('should return added field', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory)
      const field = arrayField.add('hello')
      expect(field).toBeInstanceOf(Field)
    })
  })

  describe('remove', () => {
    it('should remove item by index', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, {}, ['a', 'b', 'c'])
      arrayField.remove(1)
      expect(arrayField.itemsValue).toEqual(['a', 'c'])
    })

    it('should validate after remove', () => {
      const factory = (value?: number) => new Field(NumberType, value, { gt: 0 })
      const arrayField = new ArrayField(factory, { minItems: 2 }, [1, 2, 3])
      arrayField.remove(2)
      expect(arrayField.isValid).toBe(true)
    })
  })

  describe('clear', () => {
    it('should remove all items', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, {}, ['a', 'b'])
      arrayField.clear()
      expect(arrayField.itemsValue).toEqual([])
    })

    it('should validate after clear', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, { minItems: 1 })
      arrayField.clear()
      expect(arrayField.isValid).toBe(false)
    })
  })

  describe('validation', () => {
    it('should validate all items', () => {
      const factory = (value?: number) => new Field(NumberType, value, { gt: 0 })
      const arrayField = new ArrayField(factory, {}, [1, 2])
      expect(arrayField.isValid).toBe(true)
      
      arrayField.add(-1)
      expect(arrayField.isValid).toBe(false)
    })

    it('should validate minItems', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, { minItems: 2 })
      // При создании пустого массива isValid = false из-за minItems
      expect(arrayField.isValid).toBe(false)
      
      arrayField.add('a')
      arrayField.checkValid()
      expect(arrayField.isValid).toBe(false)
      
      arrayField.add('b')
      arrayField.checkValid()
      expect(arrayField.isValid).toBe(true)
    })

    it('should validate maxItems', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, { maxItems: 2 })
      arrayField.itemsValue = ['a', 'b', 'c']
      expect(arrayField.isValid).toBe(false)
    })

    it('should support custom validation', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, {
        validate: (values) => values.includes('admin') || 'Must contain admin'
      })
      
      arrayField.add('user')
      arrayField.checkValid()
      expect(arrayField.isValid).toBe(false)
      
      arrayField.add('admin')
      arrayField.checkValid()
      expect(arrayField.isValid).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset all items', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory, {}, ['a', 'b'])
      arrayField.add('c')
      arrayField.reset()
      expect(arrayField.itemsValue).toEqual(['a', 'b', 'c'])
    })

    it('should clear isTouched', () => {
      const factory = (value?: string) => new Field(StringType, value)
      const arrayField = new ArrayField(factory)
      arrayField.add('a')
      expect(arrayField.isTouched).toBe(true)
      arrayField.reset()
      expect(arrayField.isTouched).toBe(false)
    })
  })
})
