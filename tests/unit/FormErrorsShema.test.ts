import {describe, it, expect, beforeEach} from 'vitest'
import {Form} from "@core/Form";
import {ArrayField, ArrayFormField, Field} from "@core/fields";
import {NumberType, StringType} from "@core/types";
import {ErrorsSchema} from "@core/ErrorsShema";


// Вспомогательные классы форм для тестов
class LoginForm extends Form {
  email = new Field(StringType, 'test@example.com')  // Значение по умолчанию
  password = new Field(StringType, 'password123')     // Значение по умолчанию

  constructor() {
    super()
    this.errorsShema = new ErrorsSchema()
      .staticKey('email', 'email')
      .staticKey('password', 'password')
      .staticKey('server_error', 'password')
      .fallback((key) => key)
  }
}

class ProfileForm extends Form {
  firstName = new Field(StringType, 'John')
  lastName = new Field(StringType, 'Doe')
  email = new Field(StringType, 'john@example.com')

  constructor() {
    super()
    this.errorsShema = new ErrorsSchema()
      .staticKey('user.email', 'email')
      .dynamicKey(/^user\.(.+)$/, (match) => match[1])
      .transformValue((value) => {
        if (Array.isArray(value)) return value[0]
        return value
      })
      .fallback((key) => key)
  }
}

class QuestionForm extends Form {
  text = new Field(StringType, 'Default question')
  type = new Field(StringType, 'text')

  constructor() {
    super()
    this.errorsShema = new ErrorsSchema()
      .staticKey('text', 'text')
      .staticKey('type', 'type')
      .fallback((key) => key)
  }
}

class SurveyForm extends Form {
  title = new Field(StringType, 'Default title')
  questions = new ArrayFormField(QuestionForm)

  constructor() {
    super()
    this.errorsShema = new ErrorsSchema()
      .staticKey('title', 'title')
      .dynamicKey(
        /^questions\[(\d+)\]\.(.+)$/,
        (match) => `questions.${match[1]}.${match[2]}`,
        { priority: 100 }
      )
      .dynamicKey(
        /^questions\[(\d+)\]$/,
        (match) => `questions.${match[1]}`,
        { priority: 90 }
      )
      .fallback((key) => key)
  }
}

class AccountForm extends Form {
  launcher_type = new Field(NumberType, 1)
  login = new Field(StringType, 'default_login')
  password = new Field(StringType, 'default_password')
  game_ids = new ArrayField((value?: number) => new Field(NumberType, value))

  constructor() {
    super()
    this.errorsShema = new ErrorsSchema()
      .staticKey('launcher_type', 'launcher_type')
      .staticKey('login', 'login')
      .staticKey('password', 'password')
      .staticKey('game_ids', 'game_ids')
      .dynamicKey(
        /^game_ids\.(\d+)$/,
        (match) => `game_ids.${match[1]}`,
        {priority: 100}
      )
      .fallback((key) => key)
  }
}

class MultiAccountDialogForm extends Form {
  accounts = new ArrayFormField(AccountForm, {
    minForms: 1,
    maxForms: 100
  })

  constructor() {
    super()
    this.errorsShema = new ErrorsSchema()
      .dynamicKey(
        /^accounts\.(\d+)\.(.+)$/,
        (match) => `accounts.${match[1]}.${match[2]}`,
        {priority: 100}
      )
      .dynamicKey(
        /^accounts\.(\d+)$/,
        (match) => `accounts.${match[1]}`,
        {priority: 90}
      )
      .staticKey('accounts', 'accounts')
      .transformValue((value) => {
        if (typeof value === 'string') {
          return value.replace('Value error, ', '')
        }
        return value
      })
      .fallback((key) => key)
  }
}

describe('Form with ErrorsSchema', () => {
  describe('LoginForm - статические правила', () => {
    let form: LoginForm

    beforeEach(() => {
      form = new LoginForm()
    })

    it('should assign field errors using static keys', () => {
      form.errors = {
        email: 'Email обязателен',
        password: 'Пароль слишком короткий'
      }

      expect(form['_fields'].email.error).toBe('Email обязателен')
      expect(form['_fields'].password.error).toBe('Пароль слишком короткий')
    })

    it('should map server_error to password', () => {
      form.errors = {
        server_error: 'Ошибка сервера'
      }

      expect(form['_fields'].password.error).toBe('Ошибка сервера')
      // После установки ошибок, валидация не запускается автоматически
      expect(form['_fields'].email.errors).toEqual([])
    })

    it('should add unknown errors to globalErrors', () => {
      form.errors = {
        email: 'Email обязателен',
        unknown_error: 'Неизвестная ошибка'
      }

      expect(form.globalErrors).toEqual({
        unknown_error: 'Неизвестная ошибка'
      })
      expect(form['_fields'].email.error).toBe('Email обязателен')
    })

    it('should clear previous global errors before applying new ones', () => {
      form.errors = {
        unknown_error: 'Старая ошибка'
      }
      expect(form.globalErrors).toHaveProperty('unknown_error')

      form.errors = {
        email: 'Новая ошибка'
      }
      expect(form.globalErrors).toEqual({})
    })

    it('should clear field errors when an empty object is assigned', () => {
      form.errors = {
        email: 'Была ошибка'
      }
      expect(form['_fields'].email.error).toBe('Была ошибка')

      form.errors = {}
      expect(form['_fields'].email.error).toBe('')
      expect(form.globalErrors).toEqual({})
    })

    it('should support setGlobalError', () => {
      form.setGlobalError('form_error', 'Ошибка всей формы')

      expect(form.globalErrors).toEqual({
        form_error: 'Ошибка всей формы'
      })
    })

    it('should clear global errors with clearGlobalErrors', () => {
      form.setGlobalError('error1', 'Ошибка 1')
      form.setGlobalError('error2', 'Ошибка 2')

      form.clearGlobalErrors()

      expect(form.globalErrors).toEqual({})
    })

    it('should return all errors through allErrors', () => {
      form.errors = {
        email: 'Email обязателен',
        unknown_error: 'Неизвестная ошибка'
      }

      const allErrors = form.allErrors

      expect(allErrors).toHaveProperty('email')
      expect(allErrors.email).toContain('Email обязателен')
      expect(allErrors).toHaveProperty('unknown_error')
      expect(allErrors.unknown_error).toContain('Неизвестная ошибка')
    })

    it('should clear errors on reset', () => {
      form.errors = {
        email: 'Email обязателен'
      }
      form.setGlobalError('global', 'Global error')

      form.reset()

      expect(form['_fields'].email.error).toBe('')
      expect(form.globalErrors).toEqual({})
    })
  })

  describe('ProfileForm - динамические правила и трансформеры', () => {
    let form: ProfileForm

    beforeEach(() => {
      form = new ProfileForm()
    })

    it('should process static keys', () => {
      form.errors = {
        'user.email': 'Email неверный'
      }

      expect(form['_fields'].email.error).toBe('Email неверный')
    })

    it('should process dynamic keys', () => {
      form.errors = {
        'user.firstName': 'Имя обязательно',
        'user.lastName': 'Фамилия обязательна'
      }

      expect(form['_fields'].firstName.error).toBe('Имя обязательно')
      expect(form['_fields'].lastName.error).toBe('Фамилия обязательна')
    })

    it('should transform array values', () => {
      form.errors = {
        'user.email': ['Email неверный', 'Email слишком короткий']
      }

      expect(form['_fields'].email.error).toBe('Email неверный')
    })

    it('should process unknown keys through the fallback', () => {
      form.errors = {
        'unknown.field': 'Неизвестная ошибка'
      }

      expect(form.globalErrors).toEqual({
        'unknown.field': 'Неизвестная ошибка'
      })
    })
  })

  describe('SurveyForm - ArrayFormField с вложенными формами', () => {
    let form: SurveyForm

    beforeEach(() => {
      form = new SurveyForm()
      form.questions.add()
      form.questions.add()
    })

    it('should assign errors to fields in nested forms', () => {
      form.errors = {
        'title': 'Заголовок обязателен',
        'questions.0.text': 'Текст вопроса обязателен',
        'questions.0.type': 'Тип вопроса обязателен',
        'questions.1.text': 'Текст второго вопроса обязателен'
      }

      expect(form['_fields'].title.error).toBe('Заголовок обязателен')
      expect(form.questions.forms[0]['_fields'].text.error).toBe('Текст вопроса обязателен')
      expect(form.questions.forms[0]['_fields'].type.error).toBe('Тип вопроса обязателен')
      expect(form.questions.forms[1]['_fields'].text.error).toBe('Текст второго вопроса обязателен')
    })

    it('should process errors at a form index', () => {
      form.errors = {
        'questions[0]': 'Ошибка в первом вопросе'
      }

      const form0 = form.questions.forms[0] as QuestionForm
      expect(form0.globalErrors).toHaveProperty('index_0')
      expect(form0.globalErrors.index_0).toBe('Ошибка в первом вопросе')
    })

    it('should process unknown keys as global errors', () => {
      form.errors = {
        'unknown_error': 'Неизвестная ошибка',
        'questions.99.text': 'Ошибка для несуществующей формы'
      }

      expect(form.globalErrors).toEqual({
        'unknown_error': 'Неизвестная ошибка',
        'questions.99.text': 'Ошибка для несуществующей формы'
      })
    })

    it('should handle an empty array of forms', () => {
      const emptyForm = new SurveyForm()

      emptyForm.errors = {
        'questions.0.text': 'Ошибка'
      }

      expect(emptyForm.globalErrors).toHaveProperty('questions.0.text')
      expect(emptyForm.globalErrors['questions.0.text']).toBe('Ошибка')
    })
  })

  describe('MultiAccountDialogForm - сложная вложенность', () => {
    let form: MultiAccountDialogForm

    beforeEach(() => {
      form = new MultiAccountDialogForm()
      form.accounts.add()
      form.accounts.add()
    })

    it('should process Pydantic errors for nested accounts', () => {
      const pydanticErrors = {
        'accounts.0.launcher_type': 'Value error, Выберите лаунчер',
        'accounts.0.login': 'Логин слишком длинный',
        'accounts.0.password': 'Value error, Пароль слишком короткий',
        'accounts.1.launcher_type': 'Value error, Выберите лаунчер',
        'accounts.1.email': 'Email неверный'
      }

      form.errors = pydanticErrors

      const account0 = form.accounts.forms[0] as AccountForm
      const account1 = form.accounts.forms[1] as AccountForm

      expect(account0['_fields'].launcher_type.error).toBe('Выберите лаунчер')
      expect(account0['_fields'].login.error).toBe('Логин слишком длинный')
      expect(account0['_fields'].password.error).toBe('Пароль слишком короткий')
      expect(account1['_fields'].launcher_type.error).toBe('Выберите лаунчер')
    })

    it('should process game_ids errors within an account', () => {
      form.errors = {
        'accounts.0.game_ids': 'Добавьте хотя бы одну игру',
        'accounts.0.game_ids.0': 'Значение должно быть больше 0',
        'accounts.0.game_ids.1': 'Значение должно быть больше 0'
      }

      const account0 = form.accounts.forms[0] as AccountForm

      expect(account0['_fields'].game_ids.error).toBe('Добавьте хотя бы одну игру')

      // game_ids - это ArrayField, ошибки на индексы попадают в глобальные
      const account0GlobalErrors = account0.globalErrors
      expect(account0GlobalErrors).toHaveProperty('game_ids.0', 'Значение должно быть больше 0')
      expect(account0GlobalErrors).toHaveProperty('game_ids.1', 'Значение должно быть больше 0')
    })

    it('should process errors for the entire accounts array', () => {
      form.errors = {
        'accounts': 'Минимум один аккаунт обязателен'
      }

      expect(form['_fields'].accounts.error).toBe('Минимум один аккаунт обязателен')
    })

    it('should process errors for a specific account', () => {
      form.errors = {
        'accounts.0': 'Ошибка в первом аккаунте'
      }

      const account0 = form.accounts.forms[0] as AccountForm
      expect(account0.globalErrors).toHaveProperty('index_0')
      expect(account0.globalErrors.index_0).toBe('Ошибка в первом аккаунте')
    })

    it('should add unknown errors to global errors', () => {
      form.errors = {
        'server_error': 'Внутренняя ошибка сервера',
        'network_error': 'Проблемы с сетью'
      }

      expect(form.globalErrors).toEqual({
        'server_error': 'Внутренняя ошибка сервера',
        'network_error': 'Проблемы с сетью'
      })
    })

    it('should return all errors, including nested errors', () => {
      form.errors = {
        'accounts.0.launcher_type': 'Выберите лаунчер',
        'accounts.0.login': 'Логин обязателен',
        'global_error': 'Глобальная ошибка'
      }

      const allErrors = form.allErrors

      expect(allErrors).toHaveProperty('accounts')
      expect(allErrors).toHaveProperty('global_error')
      expect(allErrors.global_error).toContain('Глобальная ошибка')
    })
  })

  describe('Интеграционные тесты', () => {
    it('should handle repeated error assignments', () => {
      const form = new LoginForm()

      form.errors = {
        email: 'Email обязателен'
      }
      expect(form['_fields'].email.error).toBe('Email обязателен')

      form.errors = {
        password: 'Пароль слишком короткий'
      }
      expect(form['_fields'].email.error).toBe('')
      expect(form['_fields'].password.error).toBe('Пароль слишком короткий')
    })

    it('should support changing the schema at runtime', () => {
      const form = new LoginForm()

      form.errorsShema = new ErrorsSchema()
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .fallback((key) => key)

      form.errors = {
        'email_error': 'Email обязателен',
        'password_error': 'Пароль слишком короткий'
      }

      expect(form['_fields'].email.error).toBe('Email обязателен')
      expect(form['_fields'].password.error).toBe('Пароль слишком короткий')
    })

    it('should handle a complex scenario with Pydantic errors', () => {
      const form = new MultiAccountDialogForm()
      form.accounts.add()
      form.accounts.add()

      const pydanticResponse = {
        'accounts.0.launcher_type': 'Value error, Выберите лаунчер',
        'accounts.0.login': 'ensure this value has at most 50 characters',
        'accounts.0.password': 'Value error, ensure this value has at least 8 characters',
        'accounts.0.game_ids': 'Value error, Добавьте хотя бы одну игру',
        'accounts.0.game_ids.0': 'Value error, ensure this value is greater than 0',
        'accounts.1.launcher_type': 'Value error, Выберите лаунчер',
        'accounts.1.email': 'value is not a valid email address',
        'form_error': 'Value error, Общая ошибка формы'
      }

      form.errors = pydanticResponse

      const account0 = form.accounts.forms[0] as AccountForm
      const account1 = form.accounts.forms[1] as AccountForm

      expect(account0['_fields'].launcher_type.error).toBe('Выберите лаунчер')
      expect(account0['_fields'].login.error).toBe('ensure this value has at most 50 characters')
      expect(account0['_fields'].password.error).toBe('ensure this value has at least 8 characters')
      expect(account0['_fields'].game_ids.error).toBe('Добавьте хотя бы одну игру')

      expect(account0.globalErrors).toHaveProperty('game_ids.0')
      expect(account0.globalErrors['game_ids.0']).toBe('ensure this value is greater than 0')

      expect(account1['_fields'].launcher_type.error).toBe('Выберите лаунчер')

      expect(form.globalErrors).toEqual({
        'form_error': 'Общая ошибка формы'
      })
    })

    it('should preserve field values when assigning errors', () => {
      const form = new LoginForm()

      form.fields = {
        email: 'test@example.com',
        password: 'password123'
      }

      form.errors = {
        email: 'Email уже используется'
      }

      expect(form.fieldsValue).toEqual({
        email: 'test@example.com',
        password: 'password123'
      })
      expect(form['_fields'].email.error).toBe('Email уже используется')
    })
  })

  describe('Краевые случаи', () => {
    it('should handle null values in errors', () => {
      const form = new LoginForm()

      form.errors = {
        email: 'Email обязателен',
        password: null
      } as any

      expect(form['_fields'].email.error).toBe('Email обязателен')
      expect(form['_fields'].password.errors).toEqual([])
      expect(form.globalErrors).toEqual({})
    })

    it('should handle errors for nonexistent fields', () => {
      const form = new LoginForm()

      form.errors = {
        'non_existent_field': 'Ошибка'
      }

      expect(form.globalErrors).toEqual({
        'non_existent_field': 'Ошибка'
      })
    })

    it('should handle a large number of errors', () => {
      const form = new MultiAccountDialogForm()

      for (let i = 0; i < 5; i++) {
        form.accounts.add()
      }

      const manyErrors: Record<string, string> = {}
      for (let i = 0; i < 5; i++) {
        manyErrors[`accounts.${i}.launcher_type`] = `Ошибка в аккаунте ${i}`
        manyErrors[`accounts.${i}.login`] = `Логин обязателен ${i}`
      }

      form.errors = manyErrors

      for (let i = 0; i < 5; i++) {
        const account = form.accounts.forms[i] as AccountForm
        expect(account['_fields'].launcher_type.error).toBe(`Ошибка в аккаунте ${i}`)
        expect(account['_fields'].login.error).toBe(`Логин обязателен ${i}`)
      }
    })
  })
})