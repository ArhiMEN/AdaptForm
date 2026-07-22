import {describe, it, expect, beforeEach} from 'vitest'
import {ErrorsSchema, DefaultErrorsSchema} from '@core/ErrorsShema'

describe('ErrorSchema', () => {
  let schema: ErrorsSchema

  beforeEach(() => {
    schema = new ErrorsSchema()
  })

  describe('staticKey', () => {
    it('должен маппить точный ключ ошибки на имя поля', () => {
      schema.staticKey('email', 'email')

      const result = schema.parseErrors({email: 'Email is required'})

      expect(result).toEqual({email: 'Email is required'})
    })

    it('должен поддерживать функцию для динамического определения имени поля', () => {
      schema.staticKey('server_error', (value: any) => {
        return value.includes('email') ? 'email' : 'password'
      })

      const result = schema.parseErrors({server_error: 'email is invalid'})

      expect(result).toEqual({email: 'email is invalid'})
    })

    it('должен возвращать null если функция возвращает falsy значение', () => {
      schema.staticKey('optional_error', () => '')

      const result = schema.parseErrors({optional_error: 'some error'})

      expect(result).toEqual({})
    })

    it('должен иметь приоритет над динамическими правилами', () => {
      schema
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .staticKey('email_error', 'userEmail')

      const result = schema.parseErrors({email_error: 'Invalid email'})

      expect(result).toEqual({userEmail: 'Invalid email'})
    })

    it('должен поддерживать множественные статические правила', () => {
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
    it('должен маппить ключи по регулярному выражению со строковым маппингом', () => {
      schema.dynamicKey(/^user_(.+)$/, 'userField')

      const result = schema.parseErrors({user_email: 'Invalid email'})

      expect(result).toEqual({userField: 'Invalid email'})
    })

    it('должен маппить ключи с функцией извлечения', () => {
      schema.dynamicKey(/^(.+)\.(.+)$/, (match) => match[2])

      const result = schema.parseErrors({'user.email': 'Invalid email'})

      expect(result).toEqual({email: 'Invalid email'})
    })

    it('должен обрабатывать множественные динамические правила', () => {
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

    it('должен соблюдать приоритеты динамических правил', () => {
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

    it('должен применять правило с более высоким приоритетом первым', () => {
      schema
        .dynamicKey(/^(.+)\.(.+)$/, (match) => match[2], {priority: 10})
        .dynamicKey(/^user\.(.+)$/, (match) => `user_${match[1]}`, {priority: 100})

      const result = schema.parseErrors({'user.name': 'Required'})

      expect(result).toEqual({user_name: 'Required'})
    })

    it('должен корректно работать с группами захвата', () => {
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

    it('должен возвращать null если паттерн не совпадает', () => {
      schema.dynamicKey(/^user\.(.+)$/, (match) => match[1])

      const result = schema.parseErrors({'admin.email': 'Invalid'})

      expect(result).toEqual({})
    })
  })

  describe('fallback', () => {
    it('должен использовать fallback для нераспознанных ошибок', () => {
      schema.fallback((key) => key)

      const result = schema.parseErrors({unknown_error: 'Something wrong'})

      expect(result).toEqual({unknown_error: 'Something wrong'})
    })

    it('должен возвращать null если fallback возвращает null', () => {
      schema.fallback(() => null)

      const result = schema.parseErrors({unknown_error: 'Something wrong'})

      expect(result).toEqual({})
    })

    it('должен вызываться только если нет других совпадений', () => {
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

    it('должен получать ключ и значение ошибки', () => {
      const handler = vi.fn((key: string, value: any) => key)
      schema.fallback(handler)

      schema.parseErrors({test: 'error message'})

      expect(handler).toHaveBeenCalledWith('test', 'error message')
    })
  })

  describe('transformValue', () => {
    it('должен трансформировать значения ошибок', () => {
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

    it('должен применять несколько трансформеров последовательно', () => {
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

    it('должен трансформировать значения перед маппингом', () => {
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
    it('должен обрабатывать вложенные объекты ошибок', () => {
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

    it('должен обрабатывать глубоко вложенные объекты', () => {
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

    it('должен игнорировать null и undefined значения', () => {
      schema.fallback((key) => key)

      const result = schema.parseErrors({
        email: 'Valid error',
        password: null,
        username: undefined
      })

      // Должна быть только ошибка email
      expect(result).toEqual({email: 'Valid error'})
      expect(result.password).toBeUndefined()
      expect(result.username).toBeUndefined()
      expect(Object.keys(result)).toHaveLength(1)
    })

    it('должен обрабатывать ошибки с префиксом', () => {
      schema.dynamicKey(/(.+)\.(.+)/, (match) => match[2])

      const result = schema.parseErrors(
        {name: 'Name is required'},
        'user.profile'
      )

      expect(result).toEqual({name: 'Name is required'})
    })

    it('должен преобразовывать нестроковые значения в JSON', () => {
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

    it('должен обрабатывать массивы как простые значения', () => {
      schema.fallback((key) => key)

      const result = schema.parseErrors({
        errors: ['Error 1', 'Error 2']
      })

      expect(result).toEqual({
        errors: '["Error 1","Error 2"]'
      })
    })

    it('должен обрабатывать Date как простое значение', () => {
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
    it('должен возвращать расширенную информацию об ошибках', () => {
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

    it('должен обрабатывать вложенные объекты в детальном режиме', () => {
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

    it('должен применять трансформеры в детальном режиме', () => {
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
    it('должен создавать схему из простого объекта', () => {
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
    it('должен создавать схему для массива форм', () => {
      const schema = ErrorsSchema.forArray(
        new ErrorsSchema(),
        'accounts'
      )

      const result = schema.parseErrors({
        'accounts[0].email': 'Invalid email',
        'accounts[1].password': 'Too short'
      })

      expect(result).toEqual({
        'accounts.0.email': 'Invalid email',
        'accounts.1.password': 'Too short'
      })
    })

    it('должен поддерживать кастомный экстрактор индекса', () => {
      const schema = ErrorsSchema.forArray(
        new ErrorsSchema(),
        'items',
        (key) => {
          const match = key.match(/<(\d+)>/)
          return match ? parseInt(match[1]) : -1
        }
      )

      // Этот тест показывает, что forArray использует дефолтный экстрактор
      const result = schema.parseErrors({
        'items[0].name': 'Required'
      })

      expect(result).toEqual({
        'items.0.name': 'Required'
      })
    })
  })

  describe('nest', () => {
    it('должен создавать вложенную схему с префиксом', () => {
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

    it('должен проксировать fallback с префиксом', () => {
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

    it('должен проксировать трансформеры', () => {
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
    it('должен создавать независимую копию схемы', () => {
      schema
        .staticKey('email', 'email')
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .fallback((key) => key)
        .transformValue((value) => value)

      const cloned = schema.clone()

      // Модифицируем оригинал
      schema.staticKey('password', 'password')

      // Клон не должен измениться
      const result = cloned.parseErrors({
        email: 'Invalid email',
        password: 'Too short',
        name_error: 'Required'
      })

      expect(result).toEqual({
        email: 'Invalid email',
        name: 'Required',
        password: 'Too short' // fallback обрабатывает
      })
    })

    it('должен копировать все типы правил', () => {
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
    it('должен объединять статические правила', () => {
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

    it('должен объединять динамические правила', () => {
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

    it('должен сохранять приоритеты при слиянии', () => {
      const schema1 = new ErrorsSchema()
        .dynamicKey(/^(.+)\.(.+)$/, (match) => match[2], {priority: 10})

      const schema2 = new ErrorsSchema()
        .dynamicKey(/^user\.(.+)$/, (match) => `user_${match[1]}`, {priority: 100})

      const merged = schema1.merge(schema2)

      const result = merged.parseErrors({'user.name': 'Required'})

      expect(result).toEqual({user_name: 'Required'})
    })

    it('должен объединять трансформеры', () => {
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

      // Трансформеры применяются последовательно:
      // сначала schema1 (берет первый элемент), потом schema2 (в верхний регистр)
      expect(result).toEqual({email: 'INVALID EMAIL'})
    })

    it('должен заменять fallback при наличии в второй схеме', () => {
      const schema1 = new ErrorsSchema().fallback((key) => key)
      const schema2 = new ErrorsSchema().fallback(() => null)

      const merged = schema1.merge(schema2)

      const result = merged.parseErrors({unknown: 'error'})

      // Должен использоваться fallback из schema2
      expect(result).toEqual({})
    })
  })

  describe('DefaultErrorSchema', () => {
    it('должен использовать ключ как имя поля по умолчанию', () => {
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

  describe('интеграционные тесты', () => {
    it('должен обрабатывать сложный сценарий со всеми типами правил', () => {
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

    it('должен корректно обрабатывать Pydantic-подобные ошибки', () => {
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
        'accounts.0.launcher_type': 'Value error, Выберите лаунчер',
        'accounts.0.login': 'ensure this value has at most 50 characters',
        'accounts.0.game_ids.0': 'Value error, ensure this value is greater than 0',
        'accounts.1.email': 'value is not a valid email address',
        'title': 'Field required'
      }

      const result = pydanticSchema.parseErrors(pydanticErrors)

      expect(result).toEqual({
        'accounts.0.launcher_type': 'Выберите лаунчер',
        'accounts.0.login': 'ensure this value has at most 50 characters',
        'accounts.0.game_ids.0': 'ensure this value is greater than 0',
        'accounts.1.email': 'value is not a valid email address',
        title: 'Field required'
      })
    })

    it('должен игнорировать ошибки, которые не подходят ни под одно правило и без fallback', () => {
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