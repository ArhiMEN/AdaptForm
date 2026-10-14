import { describe, it, expect, vi } from 'vitest'
import { Form } from '@core/Form'
import { Field } from '@core/fields/Field'
import { StringType } from '@core/types/StringType'
import { NumberType } from '@core/types/NumberType'
import { DateType } from '@core/types/DateType'
import { FieldType } from '@core/types/FieldType'
import { ArrayField } from '@core/fields/ArrayField'
import { ArrayFormField } from '@core/fields/ArrayFormField'

describe('Form', () => {
  class TestForm extends Form {
    name = new Field(StringType)
    age = new Field(NumberType)
  }

  describe('fieldsValue', () => {
    it('should get field values', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      const typedValues: { name: string | null; age: number | null } = form.fieldsValue
      expect(typedValues).toEqual({ name: 'John', age: 25 })
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

    it('should validate conditional required fields after bulk assignment', () => {
      class ConditionalForm extends Form {
        country = new Field(StringType)
        region = new Field(StringType, null, {
          isRequired: (form?: any) => form?.country?.valueClear === 'US'
        })
      }

      const form = new ConditionalForm()
      form.fields = { country: 'US', region: null }
      expect(form.isValid).toBe(false)

      form.country.rawValue = 'CA'
      expect(form.checkValid()).toBe(true)
      expect(form.isValid).toBe(true)
    })

    it('should run each field validator once during bulk assignment', () => {
      const validate = vi.fn(() => true)
      class ValidatedForm extends Form {
        name = new Field(StringType, null, { validate })
      }

      const form = new ValidatedForm()
      validate.mockClear()

      form.fields = { name: 'Ada' }

      expect(validate).toHaveBeenCalledTimes(1)
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

    it('should clear previous errors from nested array forms', () => {
      class ItemForm extends Form {
        name = new Field(StringType)
      }

      class CollectionForm extends Form {
        items = new ArrayFormField(ItemForm)
      }

      const form = new CollectionForm()
      form.fields = { items: [{ name: 'Ada' }] }
      form.errors = { 'items.0.name': 'Old server error' }
      expect(form.items.forms[0].allErrors.name).toContain('Old server error')

      form.errors = {}

      expect(form.items.forms[0].allErrors).toEqual({})
      expect(form.items.forms[0].globalErrors).toEqual({})
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

    it('should return false from checkValid when global errors exist', () => {
      const form = new TestForm()
      form.fields = { name: 'John', age: 25 }
      form.setGlobalError('server', 'Request rejected')

      expect(form.checkValid()).toBe(false)
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

    it('should serialize Date values as ISO strings', () => {
      class DateForm extends Form {
        date = new Field(DateType)
      }
      const form = new DateForm()
      const date = new Date('2023-01-01T00:00:00.000Z')
      form.fields = { date }
      expect(form.toJSON()).toEqual({ date: date.toISOString() })
    })

    it('should serialize Date values inside arrays and nested forms', () => {
      class ItemForm extends Form {
        date = new Field(DateType)
      }
      class DateCollectionForm extends Form {
        dates = new ArrayField((value?: Date) => new Field(DateType, value))
        items = new ArrayFormField(ItemForm)
      }
      const form = new DateCollectionForm()
      const date = new Date('2023-01-01T00:00:00.000Z')
      form.fields = { dates: [date], items: [{ date }] }

      expect(form.toJSON()).toEqual({
        dates: [date.toISOString()],
        items: [{ date: date.toISOString() }]
      })
    })

    it('should recursively serialize dates in plain object field values', () => {
      class MetadataType extends FieldType<{ createdAt: Date }> {
        cast(rawValue: unknown): { createdAt: Date } | null {
          if (
            rawValue !== null &&
            typeof rawValue === 'object' &&
            'createdAt' in rawValue &&
            rawValue.createdAt instanceof Date
          ) {
            return rawValue as { createdAt: Date }
          }
          return null
        }

        validate(): string[] {
          return []
        }

        getTypeName(): string {
          return 'metadata'
        }
      }

      class MetadataForm extends Form {
        metadata = new Field(MetadataType)
      }

      const form = new MetadataForm()
      const date = new Date('2023-01-01T00:00:00.000Z')
      form.fields = { metadata: { createdAt: date } }

      expect(form.toJSON()).toEqual({ metadata: { createdAt: date.toISOString() } })
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

    it('should serialize Date values as ISO strings', () => {
      class DateForm extends Form {
        date = new Field(DateType)
      }
      const form = new DateForm()
      const date = new Date('2023-01-01T00:00:00.000Z')
      form.fields = { date }
      expect(form.toFormData().get('date')).toBe(date.toISOString())
    })
    it('should preserve numeric timestamps as strings', () => {
      class DateForm extends Form {
        date = new Field(NumberType)
      }
      const form = new DateForm()
      form.fields = { date: 1672531200000 }
      const formData = form.toFormData()
      expect(formData.get('date')).toBe('1672531200000')
    })

    it('should JSON-encode arrays and nested form values', () => {
      class ItemForm extends Form {
        name = new Field(StringType)
      }

      class CollectionForm extends Form {
        tags = new ArrayField((value?: string) => new Field(StringType, value))
        items = new ArrayFormField(ItemForm)
      }

      const form = new CollectionForm()
      form.fields = {
        tags: ['alpha', 'beta'],
        items: [{ name: 'Ada' }],
      }
      const typedValues: {
        tags: (string | null)[]
        items: { name: string | null }[]
      } = form.fieldsValue
      expect(typedValues.items[0].name).toBe('Ada')
      expect(form.toJSON()).toEqual({ tags: ['alpha', 'beta'], items: [{ name: 'Ada' }] })

      const formData = form.toFormData()
      expect(formData.get('tags')).toBe('["alpha","beta"]')
      expect(formData.get('items')).toBe('[{"name":"Ada"}]')
    })

    it('should omit null and undefined values', () => {
      const form = new TestForm()
      form.fields = { name: null, age: null }

      const formData = form.toFormData()
      expect(formData.has('name')).toBe(false)
      expect(formData.has('age')).toBe(false)
    })

    it('should preserve Blob values in FormData', () => {
      class BlobType extends FieldType<Blob> {
        cast(rawValue: unknown): Blob | null {
          return rawValue instanceof Blob ? rawValue : null
        }

        validate(): string[] {
          return []
        }

        getTypeName(): string {
          return 'blob'
        }
      }

      class AttachmentForm extends Form {
        attachment = new Field(BlobType)
      }

      const form = new AttachmentForm()
      const blob = new Blob(['file contents'], { type: 'text/plain' })
      form.fields = { attachment: blob }

      const value = form.toFormData().get('attachment')
      expect(value).not.toBeNull()
      expect((value as Blob).size).toBe(blob.size)
      expect((value as Blob).type).toBe('text/plain')
    })

    it('should preserve File values and filenames in FormData', () => {
      class FileType extends FieldType<File> {
        cast(rawValue: unknown): File | null {
          return rawValue instanceof File ? rawValue : null
        }

        validate(): string[] {
          return []
        }

        getTypeName(): string {
          return 'file'
        }
      }

      class UploadForm extends Form {
        attachment = new Field(FileType)
      }

      const form = new UploadForm()
      const file = new File(['file contents'], 'avatar.txt', { type: 'text/plain' })
      form.fields = { attachment: file }

      const value = form.toFormData().get('attachment')
      expect(value).not.toBeNull()
      expect((value as File).name).toBe('avatar.txt')
      expect((value as File).size).toBe(file.size)
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
