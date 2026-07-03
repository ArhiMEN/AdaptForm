import { describe, it, expect } from 'vitest'
import { ArrayFormField } from '@core/fields/ArrayFormField'
import { Form } from '@core/Form'
import { Field } from '@core/fields/Field'
import { StringType } from '@core/types/StringType'

class TestForm extends Form {
  name = new Field(StringType)
}

describe('ArrayFormField', () => {
  describe('construction', () => {
    it('should create array form field', () => {
      const arrayFormField = new ArrayFormField(TestForm)
      expect(arrayFormField.forms).toEqual([])
    })

    it('should initialize with data', () => {
      const arrayFormField = new ArrayFormField(TestForm, {}, [
        { name: 'John' },
        { name: 'Jane' }
      ])
      expect(arrayFormField.formsFieldsValue).toEqual([
        { name: 'John' },
        { name: 'Jane' }
      ])
    })
  })

  describe('forms setter', () => {
    it('should replace all forms', () => {
      const arrayFormField = new ArrayFormField(TestForm, {}, [{ name: 'John' }])
      arrayFormField.forms = [{ name: 'Jane' }, { name: 'Bob' }]
      expect(arrayFormField.formsFieldsValue).toEqual([
        { name: 'Jane' },
        { name: 'Bob' }
      ])
    })

    it('should validate on set', () => {
      const arrayFormField = new ArrayFormField(TestForm, {}, [{ name: 'John' }])
      arrayFormField.forms = [{ name: null }]
      expect(arrayFormField.isValid).toBe(false)
    })
  })

  describe('add', () => {
    it('should add form', () => {
      const arrayFormField = new ArrayFormField(TestForm)
      const form = arrayFormField.add({ name: 'John' })
      expect(arrayFormField.formsFieldsValue).toEqual([{ name: 'John' }])
      expect(form).toBeInstanceOf(TestForm)
    })

    it('should mark as touched', () => {
      const arrayFormField = new ArrayFormField(TestForm)
      arrayFormField.add()
      expect(arrayFormField.isTouched).toBe(true)
    })

    it('should return added form', () => {
      const arrayFormField = new ArrayFormField(TestForm)
      const form = arrayFormField.add()
      expect(form).toBeInstanceOf(TestForm)
    })
  })

  describe('remove', () => {
    it('should remove form by index', () => {
      const arrayFormField = new ArrayFormField(TestForm, {}, [
        { name: 'John' },
        { name: 'Jane' },
        { name: 'Bob' }
      ])
      arrayFormField.remove(1)
      expect(arrayFormField.formsFieldsValue).toEqual([
        { name: 'John' },
        { name: 'Bob' }
      ])
    })
  })

  describe('clear', () => {
    it('should remove all forms', () => {
      const arrayFormField = new ArrayFormField(TestForm, {}, [
        { name: 'John' },
        { name: 'Jane' }
      ])
      arrayFormField.clear()
      expect(arrayFormField.formsFieldsValue).toEqual([])
    })
  })

  describe('validation', () => {
    it('should validate all forms', () => {
      const arrayFormField = new ArrayFormField(TestForm, {}, [
        { name: 'John' },
        { name: 'Jane' }
      ])
      expect(arrayFormField.isValid).toBe(true)
      
      arrayFormField.add({ name: null })
      expect(arrayFormField.isValid).toBe(false)
    })

    it('should validate minForms', () => {
      const arrayFormField = new ArrayFormField(TestForm, { minForms: 2 })
      // При создании пустой массив isValid = false из-за minForms
      expect(arrayFormField.isValid).toBe(false)
      
      arrayFormField.add({ name: 'John' })
      arrayFormField.checkValid()
      expect(arrayFormField.isValid).toBe(false)
      
      arrayFormField.add({ name: 'Jane' })
      arrayFormField.checkValid()
      expect(arrayFormField.isValid).toBe(true)
    })

    it('should validate maxForms', () => {
      const arrayFormField = new ArrayFormField(TestForm, { maxForms: 2 })
      arrayFormField.forms = [{ name: 'John' }, { name: 'Jane' }, { name: 'Bob' }]
      expect(arrayFormField.isValid).toBe(false)
    })

    it('should support custom validation', () => {
      const arrayFormField = new ArrayFormField(TestForm, {
        validate: (forms) => forms.length > 1 || 'Need more than 1 form'
      })
      
      arrayFormField.add({ name: 'John' })
      arrayFormField.checkValid()
      expect(arrayFormField.isValid).toBe(false)
      
      arrayFormField.add({ name: 'Jane' })
      arrayFormField.checkValid()
      expect(arrayFormField.isValid).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset all forms', () => {
      const arrayFormField = new ArrayFormField(TestForm, {}, [
        { name: 'John' },
        { name: 'Jane' }
      ])
      arrayFormField.add({ name: 'Bob' })
      arrayFormField.reset()
      // После reset() формы должны вернуться к значениям по умолчанию (null)
      expect(arrayFormField.formsFieldsValue).toEqual([
        { name: null },
        { name: null },
        { name: null }
      ])
    })
  })
})
