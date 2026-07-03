import { describe, it, expect } from 'vitest'
import { Form } from '@core/Form'
import { Field } from '@core/fields/Field'
import { StringType } from '@core/types/StringType'
import { NumberType } from '@core/types/NumberType'
import { ArrayField } from '@core/fields/ArrayField'

class RegistrationForm extends Form {
  login = new Field(StringType, null, { minLength: 3, maxLength: 50 })
  email = new Field(StringType, null, { pattern: /^[^@]+@[^@.]+\.[^@.]+$/ })
  password = new Field(StringType, null, { minLength: 8 })
  passwordConfirm = new Field(StringType, null)
  age = new Field(NumberType, null, { gt: 0, lt: 120 })
  agreed = new Field(StringType, null)
}

class OrderForm extends Form {
  items = new ArrayField((value?: string) => new Field(StringType, value), { minItems: 1 })
  total = new Field(NumberType, null, { isRequired: false, gt: 0 })
}

describe('Integration Tests', () => {
  describe('Registration Form', () => {
    it('should be valid with correct data', () => {
      const form = new RegistrationForm()
      form.fields = {
        login: 'john_doe',
        email: 'john@example.com',
        password: 'securepass123',
        passwordConfirm: 'securepass123',
        age: 25,
        agreed: 'true'
      }
      
      form.checkValid()
      expect(form.isValid).toBe(true)
    })

    it('should be invalid with short login', () => {
      const form = new RegistrationForm()
      form.fields = {
        login: 'ab',
        email: 'john@example.com',
        password: 'securepass123',
        age: 25,
        agreed: 'true'
      }
      
      form.checkValid()
      expect(form.isValid).toBe(false)
      expect(form.allErrors.login).toBeDefined()
      expect(form.allErrors.login!.length).toBeGreaterThan(0)
    })

    it('should be invalid with invalid email', () => {
      const form = new RegistrationForm()
      form.fields = {
        login: 'john_doe',
        email: 'invalid-email',
        password: 'securepass123',
        age: 25,
        agreed: 'true'
      }
      
      form.checkValid()
      expect(form.isValid).toBe(false)
      expect(form.allErrors.email).toContain('Неверный формат')
    })

    it('should be invalid with short password', () => {
      const form = new RegistrationForm()
      form.fields = {
        login: 'john_doe',
        email: 'john@example.com',
        password: 'short',
        age: 25,
        agreed: 'true'
      }
      
      form.checkValid()
      expect(form.isValid).toBe(false)
      expect(form.allErrors.password).toBeDefined()
      expect(form.allErrors.password!.length).toBeGreaterThan(0)
    })

    it('should validate password confirmation', () => {
      const form = new RegistrationForm()
      form.fields = {
        login: 'john_doe',
        email: 'john@example.com',
        password: 'securepass123',
        passwordConfirm: 'different',
        age: 25,
        agreed: 'true'
      }
      
      // Custom validation
      form.passwordConfirm.options.validate = (value, form) => {
        return value === form?.password?.valueClear || 'Passwords do not match'
      }
      
      form.checkValid()
      expect(form.isValid).toBe(false)
      expect(form.allErrors.passwordConfirm).toContain('Passwords do not match')
    })

    it('should be invalid with invalid age', () => {
      const form = new RegistrationForm()
      form.fields = {
        login: 'john_doe',
        email: 'john@example.com',
        password: 'securepass123',
        age: 150,
        agreed: 'true'
      }
      
      form.checkValid()
      expect(form.isValid).toBe(false)
      expect(form.allErrors.age).toBeDefined()
      expect(form.allErrors.age!.length).toBeGreaterThan(0)
    })

    it('should serialize to JSON', () => {
      const form = new RegistrationForm()
      form.fields = {
        login: 'john_doe',
        email: 'john@example.com',
        password: 'securepass123',
        age: 25,
        agreed: 'true'
      }
      
      form.checkValid()
      const json = form.toJSON()
      
      expect(json).toEqual({
        login: 'john_doe',
        email: 'john@example.com',
        password: 'securepass123',
        age: 25,
        agreed: 'true',
        passwordConfirm: null
      })
    })
  })

  describe('Order Form with ArrayField', () => {
    it('should be valid with correct data', () => {
      const form = new OrderForm()
      form.fields = {
        items: ['Item 1', 'Item 2', 'Item 3'],
        total: 1000
      }
      
      form.checkValid()
      expect(form.isValid).toBe(true)
    })

    it('should be invalid with empty items', () => {
      const form = new OrderForm()
      form.checkValid()
      expect(form.isValid).toBe(false)
      expect(form.allErrors.items).toContain('Добавьте хотя бы один элемент')
    })

    it('should be invalid with negative total', () => {
      const form = new OrderForm()
      form.fields = {
        items: ['Item 1'],
        total: -100
      }
      
      form.checkValid()
      expect(form.isValid).toBe(false)
      expect(form.allErrors.total).toContain('Значение должно быть больше 0')
    })

    it('should add items dynamically', () => {
      const form = new OrderForm()
      
      form.items.add('New Item')
      form.checkValid()
      expect(form.isValid).toBe(true)
      expect(form.items.itemsValue.length).toBe(1)
      expect(form.items.itemsValue).toEqual(['New Item'])
    })

    it('should remove items', () => {
      const form = new OrderForm()
      form.fields = {
        items: ['Item 1', 'Item 2', 'Item 3'],
        total: 1000
      }
      
      form.checkValid()
      expect(form.isValid).toBe(true)
      
      form.items.remove(1)
      form.checkValid()
      expect(form.items.itemsValue).toEqual(['Item 1', 'Item 3'])
      expect(form.isValid).toBe(true)
    })
  })

  describe('Form with global errors', () => {
    class ServerErrorForm extends Form {
      login = new Field(StringType)
      password = new Field(StringType)
    }

    it('should handle server errors', () => {
      const form = new ServerErrorForm()
      form.fields = {
        login: 'john_doe',
        password: 'password123'
      }
      
      // Simulate server error
      form.errors = {
        login: 'Account not found',
        password: 'Invalid password'
      }
      
      expect(form.isValid).toBe(false)
      expect(form.allErrors.login).toContain('Account not found')
      expect(form.allErrors.password).toContain('Invalid password')
    })

    it('should use setGlobalError', () => {
      const form = new ServerErrorForm()
      form.setGlobalError('auth', 'Authentication failed')
      
      expect(form.globalErrors['auth']).toBe('Authentication failed')
      expect(form.isValid).toBe(false)
    })

    it('should clear global errors', () => {
      const form = new ServerErrorForm()
      form.setGlobalError('auth', 'Error')
      form.clearGlobalErrors()
      
      expect(form.globalErrors).toEqual({})
    })
  })

  describe('Form reset', () => {
    class ResetForm extends Form {
      name = new Field(StringType, 'default')
      age = new Field(NumberType, 18)
    }

    it('should reset all fields', () => {
      const form = new ResetForm()
      form.fields = {
        name: 'John',
        age: 25
      }
      
      form.reset()
      
      expect(form.fieldsValue).toEqual({
        name: 'default',
        age: 18
      })
      
      expect(form.isTouched).toBe(false)
    })
  })
})
