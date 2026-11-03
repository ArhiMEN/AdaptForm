import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, Field, Form, NumberType, StringType, ErrorsSchema} from '../../src'

// Former Form import tests are split at the parser boundary. Public Form.setErrors
// now accepts only own manual DTOs; server routing belongs to tokenized Apply.
const login = () => new ErrorsSchema().staticKey('email', 'email').staticKey('password', 'password')
  .staticKey('server_error', 'password').fallback(key => key)
const profile = () => new ErrorsSchema().staticKey('user.email', 'email')
  .dynamicKey(/^user\.(.+)$/, match => match[1])
  .transformValue(value => Array.isArray(value) ? value[0] : value).fallback(key => key)
const survey = () => new ErrorsSchema().staticKey('title', 'title')
  .dynamicKey(/^questions\[(\d+)\]\.(.+)$/, match => `questions.${match[1]}.${match[2]}`, {priority: 100})
  .dynamicKey(/^questions\[(\d+)\]$/, match => `questions.${match[1]}`, {priority: 90}).fallback(key => key)
const accounts = () => new ErrorsSchema()
  .dynamicKey(/^accounts\.(\d+)\.(.+)$/, match => `accounts.${match[1]}.${match[2]}`, {priority: 100})
  .dynamicKey(/^accounts\.(\d+)$/, match => `accounts.${match[1]}`, {priority: 90})
  .staticKey('accounts', 'accounts')
  .transformValue(value => typeof value === 'string' ? value.replace('Value error, ', '') : value).fallback(key => key)

class Account extends Form {
  login = new Field(StringType, 'default')
  game_ids = new ArrayField(value => new Field(NumberType, value), {isRequired: false})
}
class Root extends Form {
  email = new Field(StringType, 'test@example.com')
  password = new Field(StringType, 'password123')
  accounts = new ArrayFormField(Account, {}, [{}])
}

describe('ErrorsSchema parsing boundary and explicit manual ownership', () => {
  it.each([
    [{email: 'Email is required', password: 'Too short'}, {email: 'Email is required', password: 'Too short'}],
    [{server_error: 'Server error'}, {password: 'Server error'}],
    [{unknown_error: 'Unknown'}, {unknown_error: 'Unknown'}],
    [{email: 'Required', password: null}, {email: 'Required'}],
    [{}, {}],
  ])('parses static login mappings without a Form write: %j', (input, expected) => {
    const form = new Root(), before = form.getSnapshot()
    expect(login().parseErrors(input)).toEqual(expected)
    expect(form.getSnapshot()).toBe(before)
  })

  it.each([
    [{'user.email': 'Invalid'}, {email: 'Invalid'}],
    [{'user.firstName': 'First', 'user.lastName': 'Last'}, {firstName: 'First', lastName: 'Last'}],
    [{'user.email': ['Invalid', 'Short']}, {email: 'Invalid'}],
    [{'unknown.field': 'Unknown'}, {'unknown.field': 'Unknown'}],
  ])('preserves static/dynamic priority, arrays and fallback: %j', (input, expected) => {
    expect(profile().parseErrors(input)).toEqual(expected)
  })

  it.each([
    [{'title': 'Title', 'questions.0.text': 'Text', 'questions.0.type': 'Type', 'questions.1.text': 'Second'},
      {title: 'Title', 'questions.0.text': 'Text', 'questions.0.type': 'Type', 'questions.1.text': 'Second'}],
    [{'questions[0]': 'First'}, {'questions.0': 'First'}],
    [{'questions[1].text': 'Second'}, {'questions.1.text': 'Second'}],
    [{'unknown_error': 'Unknown', 'questions.99.text': 'Missing'}, {'unknown_error': 'Unknown', 'questions.99.text': 'Missing'}],
  ])('parses nested survey paths without resolving indexes: %j', (input, expected) => {
    expect(survey().parseErrors(input)).toEqual(expected)
  })

  it.each([
    ['accounts.0.launcher_type', 'Value error, Select a launcher', 'Select a launcher'],
    ['accounts.0.login', 'Login is too long', 'Login is too long'],
    ['accounts.0.password', 'Value error, Too short', 'Too short'],
    ['accounts.1.email', 'Invalid email', 'Invalid email'],
    ['accounts.0.game_ids', 'Value error, Add a game', 'Add a game'],
    ['accounts.0.game_ids.0', 'Value error, Greater than 0', 'Greater than 0'],
    ['accounts', 'At least one account', 'At least one account'],
    ['accounts.0', 'Account error', 'Account error'],
    ['server_error', 'Value error, Server', 'Server'],
    ['network_error', 'Network', 'Network'],
  ])('retains configurable account mapping and transform for %s', (key, input, expected) => {
    expect(accounts().parseErrors({[key]: input})).toEqual({[key]: expected})
  })

  it('parses a complete multi-account response with globals and scalar item paths', () => {
    const input = {
      'accounts.0.launcher_type': 'Value error, Launcher', 'accounts.0.login': 'Login',
      'accounts.0.password': 'Value error, Password', 'accounts.0.game_ids': 'Value error, Games',
      'accounts.0.game_ids.0': 'Value error, Item', 'accounts.1.launcher_type': 'Value error, Launcher',
      'accounts.1.email': 'Email', form_error: 'Value error, General',
    }
    expect(accounts().parseErrors(input)).toEqual({
      'accounts.0.launcher_type': 'Launcher', 'accounts.0.login': 'Login', 'accounts.0.password': 'Password',
      'accounts.0.game_ids': 'Games', 'accounts.0.game_ids.0': 'Item', 'accounts.1.launcher_type': 'Launcher',
      'accounts.1.email': 'Email', form_error: 'General',
    })
  })

  it('does not retain previous parse results and allows application-owned schema replacement', () => {
    const first = login().parseErrors({email: 'First'})
    const second = login().parseErrors({password: 'Second'})
    expect(first).toEqual({email: 'First'})
    expect(second).toEqual({password: 'Second'})
    const changed = new ErrorsSchema().dynamicKey(/^(.+)_error$/, match => match[1]).fallback(key => key)
    expect(changed.parseErrors({email_error: 'Email', password_error: 'Password'})).toEqual({email: 'Email', password: 'Password'})
  })

  it('preserves a large response in deterministic input order', () => {
    const input = Object.fromEntries(Array.from({length: 10}, (_, index) => [`accounts.${index}.login`, `Error ${index}`]))
    expect(accounts().parseErrors(input)).toEqual(input)
    expect(accounts().parseValidationErrors(input).map(error => error.message)).toEqual(Object.values(input))
  })

  it('supports explicit field and Form manual errors without changing values or running checks', () => {
    const form = new Root(), validate = vi.fn(() => [])
    form.email.options = {validate}
    const values = form.fieldsValue
    form.email.setErrors([{code: 'app.email_taken', message: 'Email already in use'}])
    form.setErrors([{code: 'app.auth', message: 'Authentication failed'}])
    expect(form.fieldsValue).toEqual(values)
    expect(validate).not.toHaveBeenCalled()
    expect(form.getErrors().map(error => error.path)).toEqual([['email'], []])
    form.setErrors([])
    expect(form.email.errors).toHaveLength(1)
    form.reset()
    expect(form.getErrors()).toEqual([])
  })

  it('clears requested nested manual errors recursively and preserves unrelated sources', () => {
    const form = new Root()
    form.email.setErrors([{code: 'email'}])
    form.accounts.forms[0].login.setErrors([{code: 'login'}])
    form.accounts.forms[0].setErrors([{code: 'global'}])
    form.accounts.clearErrors({sources: ['manual'], recursive: true})
    expect(form.accounts.getErrors()).toEqual([])
    expect(form.getErrors()).toMatchObject([{code: 'email', path: ['email']}])
  })
})
