import {describe, it, expect, beforeEach} from 'vitest'
import {Form} from "@core/Form";
import {ArrayField, ArrayFormField, Field} from "@core/fields";
import {NumberType, StringType} from "@core/types";
import {ErrorsSchema} from "@core/ErrorsShema";


// Helper form classes used in tests.
class LoginForm extends Form {
  email = new Field(StringType, 'test@example.com')  // Default value.
  password = new Field(StringType, 'password123')     // Default value.

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
  describe('LoginForm - static rules', () => {
    let form: LoginForm

    beforeEach(() => {
      form = new LoginForm()
    })

    it('should assign field errors using static keys', () => {
      form.errors = {
        email: 'Email is required',
        password: 'Password is too short'
      }

      expect(form['_fields'].email.error).toBe('Email is required')
      expect(form['_fields'].password.error).toBe('Password is too short')
    })

    it('should map server_error to password', () => {
      form.errors = {
        server_error: 'Server error'
      }

      expect(form['_fields'].password.error).toBe('Server error')
      // Assigning errors does not trigger validation automatically.
      expect(form['_fields'].email.errors).toEqual([])
    })

    it('should add unknown errors to globalErrors', () => {
      form.errors = {
        email: 'Email is required',
        unknown_error: 'Unknown error'
      }

      expect(form.globalErrors).toEqual({
        unknown_error: 'Unknown error'
      })
      expect(form['_fields'].email.error).toBe('Email is required')
    })

    it('should clear previous global errors before applying new ones', () => {
      form.errors = {
        unknown_error: 'Previous error'
      }
      expect(form.globalErrors).toHaveProperty('unknown_error')

      form.errors = {
        email: 'New error'
      }
      expect(form.globalErrors).toEqual({})
    })

    it('should clear field errors when an empty object is assigned', () => {
      form.errors = {
        email: 'There was an error'
      }
      expect(form['_fields'].email.error).toBe('There was an error')

      form.errors = {}
      expect(form['_fields'].email.error).toBe('')
      expect(form.globalErrors).toEqual({})
    })

    it('should support setGlobalError', () => {
      form.setGlobalError('form_error', 'Form-level error')

      expect(form.globalErrors).toEqual({
        form_error: 'Form-level error'
      })
    })

    it('should clear global errors with clearGlobalErrors', () => {
      form.setGlobalError('error1', 'Error 1')
      form.setGlobalError('error2', 'Error 2')

      form.clearGlobalErrors()

      expect(form.globalErrors).toEqual({})
    })

    it('should return all errors through allErrors', () => {
      form.errors = {
        email: 'Email is required',
        unknown_error: 'Unknown error'
      }

      const allErrors = form.allErrors

      expect(allErrors).toHaveProperty('email')
      expect(allErrors.email).toContain('Email is required')
      expect(allErrors).toHaveProperty('unknown_error')
      expect(allErrors.unknown_error).toContain('Unknown error')
    })

    it('should clear errors on reset', () => {
      form.errors = {
        email: 'Email is required'
      }
      form.setGlobalError('global', 'Global error')

      form.reset()

      expect(form['_fields'].email.error).toBe('')
      expect(form.globalErrors).toEqual({})
    })
  })

  describe('ProfileForm - dynamic rules and transformers', () => {
    let form: ProfileForm

    beforeEach(() => {
      form = new ProfileForm()
    })

    it('should process static keys', () => {
      form.errors = {
        'user.email': 'Invalid email'
      }

      expect(form['_fields'].email.error).toBe('Invalid email')
    })

    it('should process dynamic keys', () => {
      form.errors = {
        'user.firstName': 'First name is required',
        'user.lastName': 'Last name is required'
      }

      expect(form['_fields'].firstName.error).toBe('First name is required')
      expect(form['_fields'].lastName.error).toBe('Last name is required')
    })

    it('should transform array values', () => {
      form.errors = {
        'user.email': ['Invalid email', 'Email is too short']
      }

      expect(form['_fields'].email.error).toBe('Invalid email')
    })

    it('should process unknown keys through the fallback', () => {
      form.errors = {
        'unknown.field': 'Unknown error'
      }

      expect(form.globalErrors).toEqual({
        'unknown.field': 'Unknown error'
      })
    })
  })

  describe('SurveyForm - ArrayFormField with nested forms', () => {
    let form: SurveyForm

    beforeEach(() => {
      form = new SurveyForm()
      form.questions.add()
      form.questions.add()
    })

    it('should assign errors to fields in nested forms', () => {
      form.errors = {
        'title': 'Title is required',
        'questions.0.text': 'Question text is required',
        'questions.0.type': 'Question type is required',
        'questions.1.text': 'Second question text is required'
      }

      expect(form['_fields'].title.error).toBe('Title is required')
      expect(form.questions.forms[0]['_fields'].text.error).toBe('Question text is required')
      expect(form.questions.forms[0]['_fields'].type.error).toBe('Question type is required')
      expect(form.questions.forms[1]['_fields'].text.error).toBe('Second question text is required')
    })

    it('should process errors at a form index', () => {
      form.errors = {
        'questions[0]': 'Error in the first question'
      }

      const form0 = form.questions.forms[0] as QuestionForm
      expect(form0.globalErrors).toHaveProperty('index_0')
      expect(form0.globalErrors.index_0).toBe('Error in the first question')
    })

    it('should process unknown keys as global errors', () => {
      form.errors = {
        'unknown_error': 'Unknown error',
        'questions.99.text': 'Error for a nonexistent form'
      }

      expect(form.globalErrors).toEqual({
        'unknown_error': 'Unknown error',
        'questions.99.text': 'Error for a nonexistent form'
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

  describe('MultiAccountDialogForm - complex nesting', () => {
    let form: MultiAccountDialogForm

    beforeEach(() => {
      form = new MultiAccountDialogForm()
      form.accounts.add()
      form.accounts.add()
    })

    it('should process Pydantic errors for nested accounts', () => {
      const pydanticErrors = {
        'accounts.0.launcher_type': 'Value error, Select a launcher',
        'accounts.0.login': 'Login is too long',
        'accounts.0.password': 'Value error, Password is too short',
        'accounts.1.launcher_type': 'Value error, Select a launcher',
        'accounts.1.email': 'Invalid email'
      }

      form.errors = pydanticErrors

      const account0 = form.accounts.forms[0] as AccountForm
      const account1 = form.accounts.forms[1] as AccountForm

      expect(account0['_fields'].launcher_type.error).toBe('Select a launcher')
      expect(account0['_fields'].login.error).toBe('Login is too long')
      expect(account0['_fields'].password.error).toBe('Password is too short')
      expect(account1['_fields'].launcher_type.error).toBe('Select a launcher')
    })

    it('should process game_ids errors within an account', () => {
      form.errors = {
        'accounts.0.game_ids': 'Add at least one game',
        'accounts.0.game_ids.0': 'Value must be greater than 0',
        'accounts.0.game_ids.1': 'Value must be greater than 0'
      }

      const account0 = form.accounts.forms[0] as AccountForm

      expect(account0['_fields'].game_ids.error).toBe('Add at least one game')

      // game_ids is an ArrayField, so index-level errors are added to global errors.
      const account0GlobalErrors = account0.globalErrors
      expect(account0GlobalErrors).toHaveProperty('game_ids.0', 'Value must be greater than 0')
      expect(account0GlobalErrors).toHaveProperty('game_ids.1', 'Value must be greater than 0')
    })

    it('should process errors for the entire accounts array', () => {
      form.errors = {
        'accounts': 'At least one account is required'
      }

      expect(form['_fields'].accounts.error).toBe('At least one account is required')
    })

    it('should process errors for a specific account', () => {
      form.errors = {
        'accounts.0': 'Error in the first account'
      }

      const account0 = form.accounts.forms[0] as AccountForm
      expect(account0.globalErrors).toHaveProperty('index_0')
      expect(account0.globalErrors.index_0).toBe('Error in the first account')
    })

    it('should add unknown errors to global errors', () => {
      form.errors = {
        'server_error': 'Internal server error',
        'network_error': 'Network issues'
      }

      expect(form.globalErrors).toEqual({
        'server_error': 'Internal server error',
        'network_error': 'Network issues'
      })
    })

    it('should return all errors, including nested errors', () => {
      form.errors = {
        'accounts.0.launcher_type': 'Select a launcher',
        'accounts.0.login': 'Login is required',
        'global_error': 'Global error'
      }

      const allErrors = form.allErrors

      expect(allErrors).toHaveProperty('accounts')
      expect(allErrors).toHaveProperty('global_error')
      expect(allErrors.global_error).toContain('Global error')
    })
  })

  describe('Integration tests', () => {
    it('should handle repeated error assignments', () => {
      const form = new LoginForm()

      form.errors = {
        email: 'Email is required'
      }
      expect(form['_fields'].email.error).toBe('Email is required')

      form.errors = {
        password: 'Password is too short'
      }
      expect(form['_fields'].email.error).toBe('')
      expect(form['_fields'].password.error).toBe('Password is too short')
    })

    it('should support changing the schema at runtime', () => {
      const form = new LoginForm()

      form.errorsShema = new ErrorsSchema()
        .dynamicKey(/^(.+)_error$/, (match) => match[1])
        .fallback((key) => key)

      form.errors = {
        'email_error': 'Email is required',
        'password_error': 'Password is too short'
      }

      expect(form['_fields'].email.error).toBe('Email is required')
      expect(form['_fields'].password.error).toBe('Password is too short')
    })

    it('should handle a complex scenario with Pydantic errors', () => {
      const form = new MultiAccountDialogForm()
      form.accounts.add()
      form.accounts.add()

      const pydanticResponse = {
        'accounts.0.launcher_type': 'Value error, Select a launcher',
        'accounts.0.login': 'ensure this value has at most 50 characters',
        'accounts.0.password': 'Value error, ensure this value has at least 8 characters',
        'accounts.0.game_ids': 'Value error, Add at least one game',
        'accounts.0.game_ids.0': 'Value error, ensure this value is greater than 0',
        'accounts.1.launcher_type': 'Value error, Select a launcher',
        'accounts.1.email': 'value is not a valid email address',
        'form_error': 'Value error, General form error'
      }

      form.errors = pydanticResponse

      const account0 = form.accounts.forms[0] as AccountForm
      const account1 = form.accounts.forms[1] as AccountForm

      expect(account0['_fields'].launcher_type.error).toBe('Select a launcher')
      expect(account0['_fields'].login.error).toBe('ensure this value has at most 50 characters')
      expect(account0['_fields'].password.error).toBe('ensure this value has at least 8 characters')
      expect(account0['_fields'].game_ids.error).toBe('Add at least one game')

      expect(account0.globalErrors).toHaveProperty('game_ids.0')
      expect(account0.globalErrors['game_ids.0']).toBe('ensure this value is greater than 0')

      expect(account1['_fields'].launcher_type.error).toBe('Select a launcher')

      expect(form.globalErrors).toEqual({
        'form_error': 'General form error'
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
        email: 'Email is required',
        password: null
      } as any

      expect(form['_fields'].email.error).toBe('Email is required')
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
        manyErrors[`accounts.${i}.login`] = `Login is required ${i}`
      }

      form.errors = manyErrors

      for (let i = 0; i < 5; i++) {
        const account = form.accounts.forms[i] as AccountForm
        expect(account['_fields'].launcher_type.error).toBe(`Ошибка в аккаунте ${i}`)
        expect(account['_fields'].login.error).toBe(`Login is required ${i}`)
      }
    })
  })
})