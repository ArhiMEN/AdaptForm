import { describe, it, expect } from 'vitest'
import { Form } from '@core/Form'
import { Field } from '@core/fields/Field'
import { StringType } from '@core/types/StringType'
import { NumberType } from '@core/types/NumberType'
import { ArrayField } from '@core/fields/ArrayField'

describe('Form', () => {
  class TestForm extends Form {
    name = new Field(StringType)
    age = new Field(NumberType)
  }

  describe('fieldsValue', () => {
    it('should get field values', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      expect(form.fieldsValue).toEqual({ name: 'John', age: 25 })
    })

    it('should handle null values', () => {
      const form = new TestForm()
      expect(form.fieldsValue).toEqual({ name: null, age: null })
    })
  })

  describe('fields setter', () => {
    it('should set field values', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      expect(form.name.rawValue).toBe('John')
      expect(form.age.rawValue).toBe(25)
    })

    it('should ignore unknown fields', () => {
      const form = new TestForm()
      form.fields = { name: 'John', unknown: 'value' }
      expect(form.name.rawValue).toBe('John')
    })
  })

  describe('checkValid', () => {
    it('should check all fields', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      expect(form.checkValid()).toBe(true)
    })

    it('should return false if any field is invalid', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: null }
      expect(form.checkValid()).toBe(false)
    })
  })

  describe('allErrors', () => {
    it('should get all errors', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 'not a number' }
      const errors = form.allErrors
      expect(errors.age).toBeDefined()
      expect(errors.age).toContain('Ожидается число')
    })

    it('should include global errors', () => {
      const form = new TestForm()
      form.setGlobalError('name', 'Server error')
      const errors = form.allErrors
      expect(errors.name).toBeDefined()
      expect(errors.name).toContain('Server error')
    })

    it('should merge global and field errors', () => {
      const form = new TestForm()
      form.fields = { age: null }
      form.setGlobalError('name', 'Server error')
      const errors = form.allErrors
      expect(errors.age).toBeDefined()
      expect(errors.name).toBeDefined()
    })
  })

  describe('globalErrors', () => {
    it('should get global errors', () => {
      const form = new TestForm()
      form.setGlobalError('name', 'Error 1')
      form.setGlobalError('age', 'Error 2')
      expect(form.globalErrors).toEqual({ name: 'Error 1', age: 'Error 2' })
    })

    it('should be immutable', () => {
      const form = new TestForm()
      form.setGlobalError('name', 'Error')
      const errors = form.globalErrors
      errors['name'] = 'Changed'
      expect(form.globalErrors['name']).toBe('Error')
    })
  })

  describe('errors setter', () => {
    it('should set field errors', () => {
      const form = new TestForm()
      form.errors = { name: 'Custom error' }
      expect(form.name.error).toBe('Custom error')
    })

    it('should set global errors', () => {
      const form = new TestForm()
      form.errors = { global: 'Global error' }
      expect(form.globalErrors['global']).toBe('Global error')
    })

    it('should clear previous errors', () => {
      const form = new TestForm()
      form.setGlobalError('name', 'Error 1')
      form.errors = { name: 'Error 2' }
      expect(form.name.error).toBe('Error 2')
    })
  })

  describe('setGlobalError', () => {
    it('should add global error', () => {
      const form = new TestForm()
      form.setGlobalError('auth', 'Authentication failed')
      expect(form.globalErrors['auth']).toBe('Authentication failed')
    })
  })

  describe('clearGlobalErrors', () => {
    it('should clear all global errors', () => {
      const form = new TestForm()
      form.setGlobalError('name', 'Error')
      form.clearGlobalErrors()
      expect(form.globalErrors).toEqual({})
    })
  })

  describe('reset', () => {
    it('should reset all fields', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      form.reset()
      expect(form.fieldsValue).toEqual({ name: null, age: null })
    })

    it('should clear global errors', () => {
      const form = new TestForm()
      form.setGlobalError('name', 'Error')
      form.reset()
      expect(form.globalErrors).toEqual({})
    })
  })

  describe('isTouched', () => {
    it('should return true if any field is touched', () => {
      const form = new TestForm()
      expect(form.isTouched).toBe(false)
      form.name.rawValue = 'John'
      expect(form.isTouched).toBe(true)
    })

    it('should return false for untouched form', () => {
      const form = new TestForm()
      expect(form.isTouched).toBe(false)
    })
  })

  describe('isValid', () => {
    it('should be true when all fields valid and no global errors', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      expect(form.isValid).toBe(true)
    })

    it('should be false when any field invalid', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: null }
      expect(form.isValid).toBe(false)
    })

    it('should be false when has global errors', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      form.setGlobalError('name', 'Error')
      expect(form.isValid).toBe(false)
    })
  })

  describe('toJSON', () => {
    it('should convert to JSON', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      expect(form.toJSON()).toEqual({ name: 'John', age: 25 })
    })

    it('should handle Date objects', () => {
      class DateForm extends Form {
        date = new Field(NumberType)
      }
      const form = new DateForm()
      form.fields = { date: 1672531200000 }
      const json = form.toJSON()
      expect(json).toEqual({ date: 1672531200000 })
    })
  })

  describe('toFormData', () => {
    it('should convert to FormData', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      const formData = form.toFormData()
      expect(formData.get('name')).toBe('John')
      expect(formData.get('age')).toBe('25')
    })

    it('should handle Date objects as numbers', () => {
      class DateForm extends Form {
        date = new Field(NumberType)
      }
      const form = new DateForm()
      form.fields = { date: 1672531200000 }
      const formData = form.toFormData()
      expect(formData.get('date')).toBe('1672531200000')
    })
  })

  describe('nested ArrayField', () => {
    class NestedForm extends Form {
      tags = new ArrayField((value?: string) => new Field(StringType, value))
    }

    it('should handle array field', () => {
      const form = new NestedForm()
      form.fields = { tags: ['tag1', 'tag2'] }
      expect(form.fieldsValue).toEqual({ tags: ['tag1', 'tag2'] })
    })
  })
})
