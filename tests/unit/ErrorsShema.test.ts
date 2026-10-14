import {describe, it, expect, beforeEach} from 'vitest'
import {ErrorsSchema, DefaultErrorsSchema} from '@core/ErrorsShema'
import {ErrorsSchema as ExportedErrorsSchema} from '@core'

describe('ErrorSchema', () => {
  it('should export ErrorsSchema from the public core entry point', () => {
    expect(new ExportedErrorsSchema()).toBeInstanceOf(ErrorsSchema)
  })

  let schema: ErrorsSchema

  beforeEach(() => {
    schema = new ErrorsSchema()
  })

  describe('staticKey', () => {
    it('should map an exact error key to a field name', () => {
      schema.staticKey('email', 'email')

      const result = schema.parseErrors({email: 'Email is required'})

      expect(result).toEqual({email: 'Email is required'})
    })

    it('should support a function that dynamically resolves a field name', () => {
      schema.staticKey('server_error', (value: any) => {
        return value.includes('email') ? 'email' : 'password'
      })

      const result = schema.parseErrors({server_error: 'email is invalid'})

      expect(result).toEqual({email: 'email is invalid'})
    })

    it('should ignore a mapping function that returns a falsy value', () => {
      schema.staticKey('optional_error', () => '')

      const result = schema.parseErrors({optional_error: 'some error'})

      expect(result).toEqual({})
    })

    it('should take precedence over dynamic rules', () => {
      schema
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .staticKey('email_error', 'userEmail')

      const result = schema.parseErrors({email_error: 'Invalid email'})

      expect(result).toEqual({userEmail: 'Invalid email'})
    })

    it('should support multiple static rules', () => {
      schema
        .staticKey('email', 'email')
        .staticKey('password', 'password')
        .staticKey('username', 'username')

      const result = schema.parseErrors({
        email: 'Invalid email',
        password: 'Too short',
        username: 'Taken'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        password: 'Too short',
        username: 'Taken'
      })
    })
  })

  describe('dynamicKey', () => {
    it('should map keys with a regular expression and a string mapping', () => {
      schema.dynamicKey(/^user_(.+)$/, 'userField')

      const result = schema.parseErrors({user_email: 'Invalid email'})

      expect(result).toEqual({userField: 'Invalid email'})
    })

    it('should map keys using an extraction function', () => {
      schema.dynamicKey(/^(.+)\.(.+)$/, (match) => match[2])

      const result = schema.parseErrors({'user.email': 'Invalid email'})

      expect(result).toEqual({email: 'Invalid email'})
    })

    it('should process multiple dynamic rules', () => {
      schema
        .dynamicKey(/^field_(.+)_error$/, (match) => match[1])
        .dynamicKey(/^(.+)_error$/, (match) => match[1])

      const result = schema.parseErrors({
        field_email_error: 'Invalid email',
        password_error: 'Too short'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        password: 'Too short'
      })
    })

    it('should respect dynamic rule priorities', () => {
      schema
        .dynamicKey(/^(.+)_error$/, (match) => match[1], {priority: 10})
        .dynamicKey(/^custom_(.+)$/, (match) => `custom_${match[1]}`, {priority: 100})

      const result = schema.parseErrors({
        custom_email: 'Invalid email',
        password_error: 'Too short'
      })

      expect(result).toEqual({
        custom_email: 'Invalid email',
        password: 'Too short'
      })
    })

    it('should apply the highest-priority rule first', () => {
      schema
        .dynamicKey(/^(.+)\.(.+)$/, (match) => match[2], {priority: 10})
        .dynamicKey(/^user\.(.+)$/, (match) => `user_${match[1]}`, {priority: 100})

      const result = schema.parseErrors({'user.name': 'Required'})

      expect(result).toEqual({user_name: 'Required'})
    })

    it('should work correctly with capture groups', () => {
      schema.dynamicKey(/^items\[(\d+)\]\.(.+)$/, (match) => {
        return `items.${match[1]}.${match[2]}`
      })

      const result = schema.parseErrors({
        'items[0].name': 'Required',
        'items[1].price': 'Invalid price'
      })

      expect(result).toEqual({
        'items.0.name': 'Required',
        'items.1.price': 'Invalid price'
      })
    })

    it('should ignore a pattern that does not match', () => {
      schema.dynamicKey(/^user\.(.+)$/, (match) => match[1])

      const result = schema.parseErrors({'admin.email': 'Invalid'})

      expect(result).toEqual({})
    })
  })

  describe('fallback', () => {
    it('should use the fallback for unrecognized errors', () => {
      schema.fallback((key) => key)

      const result = schema.parseErrors({unknown_error: 'Something wrong'})

      expect(result).toEqual({unknown_error: 'Something wrong'})
    })

    it('should ignore errors when the fallback returns null', () => {
      schema.fallback(() => null)

      const result = schema.parseErrors({unknown_error: 'Something wrong'})

      expect(result).toEqual({})
    })

    it('should call a declining fallback only once', () => {
      const fallback = vi.fn(() => null)
      schema.fallback(fallback)

      expect(schema.parseErrors({unknown_error: 'Something went wrong'})).toEqual({})
      expect(fallback).toHaveBeenCalledTimes(1)
    })
    it('should run only when no other rule matches', () => {
      schema
        .staticKey('email', 'email')
        .fallback((key) => key)

      const result = schema.parseErrors({
        email: 'Invalid email',
        unknown: 'Unknown error'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        unknown: 'Unknown error'
      })
    })

    it('should receive the error key and value', () => {
      const handler = vi.fn((key: string, _value: any) => key
      schema.fallback(handler)

      schema.parseErrors({test: 'error message'})

      expect(handler).toHaveBeenCalledWith('test', 'error message')
    })
  })

  describe('transformValue', () => {
    it('should transform error values', () => {
      schema
        .fallback((key) => key)
        .transformValue((value) => {
          if (Array.isArray(value)) return value[0]
          return value
        })

      const result = schema.parseErrors({
        email: ['Email is required', 'Email is invalid']
      })

      expect(result).toEqual({email: 'Email is required'})
    })

    it('should apply multiple transformers in sequence', () => {
      schema
        .fallback((key) => key)
        .transformValue((value) => {
          if (Array.isArray(value)) return value[0]
          return value
        })
        .transformValue((value) => {
          if (typeof value === 'object' && value.message) {
            return value.message
          }
          return value
        })

      const result = schema.parseErrors({
        email: [{message: 'Email is required'}]
      })

      expect(result).toEqual({email: 'Email is required'})
    })

    it('should transform values before mapping', () => {
      schema
        .staticKey('email', 'email')
        .transformValue((value) => {
          if (typeof value === 'string') return value.toUpperCase()
          return value
        })

      const result = schema.parseErrors({email: 'invalid email'})

      expect(result).toEqual({email: 'INVALID EMAIL'})
    })
  })

  describe('parseErrors', () => {
    it('should process nested error objects', () => {
      schema
        .staticKey('email', 'email')
        .dynamicKey(/(.+)\.(.+)/, (match) => match[2])

      const result = schema.parseErrors({
        user: {
          name: 'Name is required',
          email: 'Email is invalid'
        }
      })

      expect(result).toEqual({
        name: 'Name is required',
        email: 'Email is invalid'
      })
    })

    it('should process deeply nested objects', () => {
      schema.fallback((key) => key)

      const result = schema.parseErrors({
        form: {
          user: {
            profile: {
              name: 'Name is required'
            }
          }
        }
      })

      expect(result).toEqual({
        'form.user.profile.name': 'Name is required'
      })
    })

    it('should ignore null and undefined values', () => {
      schema.fallback((key) => key)

      const result = schema.parseErrors({
        email: 'Valid error',
        password: null,
        username: undefined
      })

      // Only the email error should remain.
      expect(result).toEqual({email: 'Valid error'})
      expect(result.password).toBeUndefined()
      expect(result.username).toBeUndefined()
      expect(Object.keys(result)).toHaveLength(1)
    })

    it('should process errors with a prefix', () => {
      schema.dynamicKey(/(.+)\.(.+)/, (match) => match[2])

      const result = schema.parseErrors(
        {name: 'Name is required'},
        'user.profile'
      )

      expect(result).toEqual({name: 'Name is required'})
    })

    it('should convert non-string values to JSON', () => {
      schema.fallback((key) => key)

      const result = schema.parseErrors({
        count: 42,
        valid: true
      })

      expect(result).toEqual({
        count: '42',
        valid: 'true'
      })
    })

    it('should treat arrays as simple values', () => {
      schema.fallback((key) => key)

      const result = schema.parseErrors({
        errors: ['Error 1', 'Error 2']
      })

      expect(result).toEqual({
        errors: '["Error 1","Error 2"]'
      })
    })

    it('should treat Date values as simple values', () => {
      schema.fallback((key) => key)
      const date = new Date('2024-01-01')

      const result = schema.parseErrors({
        timestamp: date
      })

      expect(result).toEqual({
        timestamp: JSON.stringify(date)
      })
    })
  })

  describe('parseErrorsDetailed', () => {
    it('should return detailed error information', () => {
      schema
        .staticKey('email', 'email')
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .fallback((key) => key)

      const result = schema.parseErrorsDetailed({
        email: 'Invalid email',
        password_error: 'Too short',
        unknown: 'Unknown error'
      })

      expect(result).toEqual({
        email: {
          fieldName: 'email',
          message: 'Invalid email',
          sourceKey: 'email',
          matchedBy: 'static'
        },
        password: {
          fieldName: 'password',
          message: 'Too short',
          sourceKey: 'password_error',
          matchedBy: 'dynamic'
        },
        unknown: {
          fieldName: 'unknown',
          message: 'Unknown error',
          sourceKey: 'unknown',
          matchedBy: 'fallback'
        }
      })
    })

    it('should process nested objects in detailed mode', () => {
      schema.dynamicKey(/(.+)\.(.+)/, (match) => match[2])

      const result = schema.parseErrorsDetailed({
        user: {
          email: 'Invalid email'
        }
      })

      expect(result).toEqual({
        email: {
          fieldName: 'email',
          message: 'Invalid email',
          sourceKey: 'user.email',
          matchedBy: 'dynamic'
        }
      })
    })

    it('should apply transformers in detailed mode', () => {
      schema
        .fallback((key) => key)
        .transformValue((value) => {
          if (Array.isArray(value)) return value[0]
          return value
        })

      const result = schema.parseErrorsDetailed({
        email: ['Email is required']
      })

      expect(result.email.message).toBe('Email is required')
      expect(result.email.matchedBy).toBe('fallback')
    })
  })

  describe('fromObject', () => {
    it('should create a schema from a simple object', () => {
      const schema = ErrorsSchema.fromObject({
        'email': 'email',
        'password': 'password',
        'username': 'name'
      })

      const result = schema.parseErrors({
        email: 'Invalid email',
        password: 'Too short',
        username: 'Name taken'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        password: 'Too short',
        name: 'Name taken'
      })
    })
  })

  describe('forArray', () => {
    it('should create a schema for array-form errors', () => {
      const schema = ErrorsSchema.forArray(
        new ErrorsSchema(),
        'accounts'
      )

      const result = schema.parseErrors({
        'accounts[0].email': 'Invalid email',
        'accounts[1].password': 'Too short',
        'accounts.2.username': 'Taken',
        'accounts2.email': 'Must not be mapped'
      })

      expect(result).toEqual({
        'accounts.0.email': 'Invalid email',
        'accounts.1.password': 'Too short',
        'accounts.2.username': 'Taken'
      })
    })

    it('should apply item-schema mappings to array errors', () => {
      const itemSchema = new ErrorsSchema()
        .staticKey('email', 'emailAddress')
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .transformValue((value) => typeof value === 'string' ? value.toUpperCase() : value)

      const schema = ErrorsSchema.forArray(itemSchema, 'accounts')
      const result = schema.parseErrors({
        'accounts[0].email': 'Invalid email',
        'accounts[1].password_error': 'Too short'
      })

      expect(result).toEqual({
        'accounts.0.emailAddress': 'INVALID EMAIL',
        'accounts.1.password': 'TOO SHORT'
      })
    })

    it('should use a custom index extractor for non-standard index notation', () => {
      const schema = ErrorsSchema.forArray(
        new ErrorsSchema(),
        'items',
        (key) => {
          const match = key.match(/<(\d+)>/)
          return match ? parseInt(match[1]) : -1
        }
      )

      const result = schema.parseErrors({
        'items<7>.name': 'Required'
      })

      expect(result).toEqual({
        'items.7.name': 'Required'
      })
    })
  })

  describe('nest', () => {
    it('should create a nested schema with a prefix', () => {
      schema
        .staticKey('email', 'email')
        .dynamicKey(/^(.+)_error$/, (match) => match[1])

      const nested = schema.nest('user')

      const result = nested.parseErrors({
        'user.email': 'Invalid email',
        'user.name_error': 'Name required',
        'other.field': 'Other error'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        name: 'Name required'
      })
    })

    it('should forward the fallback handler with a prefix', () => {
      schema.fallback((key) => key)
      const nested = schema.nest('user')

      const result = nested.parseErrors({
        'user.unknown': 'Unknown error',
        'other.field': 'Other error'
      })

      expect(result).toEqual({
        unknown: 'Unknown error'
      })
    })

    it('should forward value transformers', () => {
      schema
        .fallback((key) => key)
        .transformValue((value) => {
          if (Array.isArray(value)) return value[0]
          return value
        })

      const nested = schema.nest('user')

      const result = nested.parseErrors({
        'user.email': ['Invalid email']
      })

      expect(result).toEqual({
        email: 'Invalid email'
      })
    })
  })

  describe('clone', () => {
    it('should create an independent schema clone', () => {
      schema
        .staticKey('email', 'email')
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .fallback((key) => key)
        .transformValue((value) => value)

      const cloned = schema.clone()

      // Modify the original schema.
      schema.staticKey('password', 'password')

      // The clone must remain unchanged.
      const result = cloned.parseErrors({
        email: 'Invalid email',
        password: 'Too short',
        name_error: 'Required'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        name: 'Required',
        password: 'Too short' // handled by fallback
      })
    })

    it('should copy all rule types', () => {
      schema
        .staticKey('email', 'email')
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .fallback((key) => key)
        .transformValue((value) => value)

      const cloned = schema.clone()

      const result = cloned.parseErrorsDetailed({
        email: 'Invalid email',
        name_error: 'Required',
        unknown: 'Unknown'
      })

      expect(result.email.matchedBy).toBe('static')
      expect(result.name.matchedBy).toBe('dynamic')
      expect(result.unknown.matchedBy).toBe('fallback')
    })
  })

  describe('merge', () => {
    it('should merge static rules', () => {
      const schema1 = new ErrorsSchema().staticKey('email', 'email')
      const schema2 = new ErrorsSchema().staticKey('password', 'password')

      const merged = schema1.merge(schema2)

      const result = merged.parseErrors({
        email: 'Invalid email',
        password: 'Too short'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        password: 'Too short'
      })
    })

    it('should merge dynamic rules', () => {
      const schema1 = new ErrorsSchema().dynamicKey(/^(.+)_error$/, (match) => match[1])
      const schema2 = new ErrorsSchema().dynamicKey(/^(.+)\.(.+)$/, (match) => match[2])

      const merged = schema1.merge(schema2)

      const result = merged.parseErrors({
        email_error: 'Invalid email',
        'user.name': 'Required'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        name: 'Required'
      })
    })

    it('should preserve priorities when merging schemas', () => {
      const schema1 = new ErrorsSchema()
        .dynamicKey(/^(.+)\.(.+)$/, (match) => match[2], {priority: 10})

      const schema2 = new ErrorsSchema()
        .dynamicKey(/^user\.(.+)$/, (match) => `user_${match[1]}`, {priority: 100})

      const merged = schema1.merge(schema2)

      const result = merged.parseErrors({'user.name': 'Required'})

      expect(result).toEqual({user_name: 'Required'})
    })

    it('should merge value transformers', () => {
      const schema1 = new ErrorsSchema()
        .fallback((key) => key)
        .transformValue((value) => {
          if (Array.isArray(value)) return value[0]
          return value
        })

      const schema2 = new ErrorsSchema()
        .transformValue((value) => {
          if (typeof value === 'string') return value.toUpperCase()
          return value
        })

      const merged = schema1.merge(schema2)

      const result = merged.parseErrors({
        email: ['invalid email']
      })

      // Transformers are applied in sequence:
      // schema1 selects the first item, then schema2 converts it to uppercase.
      expect(result).toEqual({email: 'INVALID EMAIL'})
    })

    it('should replace the fallback when the other schema defines one', () => {
      const schema1 = new ErrorsSchema().fallback((key) => key)
      const schema2 = new ErrorsSchema().fallback(() => null)

      const merged = schema1.merge(schema2)

      const result = merged.parseErrors({unknown: 'error'})

      // The fallback from schema2 should be used.
      expect(result).toEqual({})
    })
  })

  describe('DefaultErrorSchema', () => {
    it('should use the key as the default field name', () => {
      const result = DefaultErrorsSchema.parseErrors({
        email: 'Invalid email',
        password: 'Too short',
        'user.name': 'Required'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        password: 'Too short',
        'user.name': 'Required'
      })
    })
  })

  describe('integration tests', () => {
    it('should handle a complex scenario with all rule types', () => {
      const schema = new ErrorsSchema()
        .staticKey('server_error', 'global')
        .dynamicKey(
          /^accounts\.(\d+)\.(.+)$/,
          (match) => `accounts.${match[1]}.${match[2]}`,
          {priority: 100}
        )
        .dynamicKey(
          /^(.+)\.(.+)$/,
          (match) => match[2],
          {priority: 50}
        )
        .transformValue((value) => {
          if (Array.isArray(value)) return value[0]
          return value
        })
        .transformValue((value) => {
          if (typeof value === 'string') {
            return value.replace('Value error, ', '')
          }
          return value
        })
        .fallback((key) => key)

      const result = schema.parseErrors({
        server_error: 'Internal server error',
        'accounts.0.email': ['Value error, Invalid email format'],
        'accounts.0.password': 'Value error, Too short',
        'user.profile.name': 'Required',
        'unknown_error': 'Something went wrong'
      })

      expect(result).toEqual({
        global: 'Internal server error',
        'accounts.0.email': 'Invalid email format',
        'accounts.0.password': 'Too short',
        name: 'Required',
        'unknown_error': 'Something went wrong'
      })
    })

    it('should handle Pydantic-style errors', () => {
      const pydanticSchema = new ErrorsSchema()
        .dynamicKey(
          /^(\w+)\.(\d+)\.(.+)$/,
          (match) => `${match[1]}.${match[2]}.${match[3]}`,
          {priority: 100}
        )
        .dynamicKey(
          /^(\w+)\.(\w+)$/,
          (match) => match[2],
          {priority: 50}
        )
        .transformValue((value) => {
          if (typeof value === 'string') {
            return value.replace('Value error, ', '')
          }
          return value
        })
        .fallback((key) => key)

      const pydanticErrors = {
        'accounts.0.launcher_type': 'Value error, Select a launcher',
        'accounts.0.login': 'ensure this value has at most 50 characters',
        'accounts.0.game_ids.0': 'Value error, ensure this value is greater than 0',
        'accounts.1.email': 'value is not a valid email address',
        'title': 'Field required'
      }

      const result = pydanticSchema.parseErrors(pydanticErrors)

      expect(result).toEqual({
        'accounts.0.launcher_type': 'Select a launcher',
        'accounts.0.login': 'ensure this value has at most 50 characters',
        'accounts.0.game_ids.0': 'ensure this value is greater than 0',
        'accounts.1.email': 'value is not a valid email address',
        title: 'Field required'
      })
    })

    it('should ignore unmatched errors when no fallback is configured', () => {
      const schema = new ErrorsSchema()
        .staticKey('email', 'email')

      const result = schema.parseErrors({
        email: 'Invalid email',
        unknown: 'Unknown error'
      })

      expect(result).toEqual({
        email: 'Invalid email'
      })
      expect(result.unknown).toBeUndefined()
    })
  })
})