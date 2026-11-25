import {describe, expect, it, vi} from 'vitest'
import {ArrayField, ArrayFormField, Field, Form, NumberType, StringType, ErrorsSchema} from '../../src'

const accounts = new ErrorsSchema<Record<string, string>>({
  kind: 'adapter',
  extract: input => Object.entries(input).map(([key, message]) => ({
    path: key === 'form_error' ? [] : key.split('.').map(part => /^\d+$/.test(part) ? Number(part) : part),
    code: 'app.account', message: message.replace('Value error, ', ''),
  })),
})

class Account extends Form {
  login = new Field(StringType, 'default')
  game_ids = new ArrayField(value => new Field(NumberType, value), {isRequired: false})
}
class Root extends Form {
  email = new Field(StringType, 'test@example.com')
  password = new Field(StringType, 'password123')
  accounts = new ArrayFormField(Account, {}, [{}])
}

describe('Server parsing and Form ownership', () => {
  it('applies configured account errors to items, nested globals and Form globals', () => {
    const form = new Root()
    form.setFields({accounts: [{login: 'one', game_ids: [5]}, {login: 'two'}]}, false)
    const before = form.getSnapshot()
    const batch = accounts.parse({
      'accounts.0.login': 'Value error, Login',
      'accounts.0.game_ids.0': 'Item',
      'accounts.1': 'Global row',
      form_error: 'Value error, General',
    })
    expect(form.getSnapshot()).toBe(before)
    const result = form.applyServerErrors(batch, {operation: form.beginServerErrorOperation()})
    expect(result.applied).toBe(4)
    expect(form.getErrors().map(error => [error.path, error.message])).toEqual([
      [['accounts', 0, 'login'], 'Login'], [['accounts', 0, 'game_ids', 0], 'Item'],
      [['accounts', 1], 'Global row'], [[], 'General'],
    ])
  })

  it('reuses schemas without retaining earlier results, including a large ordered response', () => {
    const sample = accounts.parse({'accounts.0.login': 'First'})
    const repeated = accounts.parse(Object.fromEntries(Array.from({length: 500}, (_, index) =>
      [`accounts.${index}.login`, `Issue ${index}`])))
    expect(sample.entries).toHaveLength(1)
    expect(sample.entries[0].error.message).toBe('First')
    expect(repeated.entries).toHaveLength(500)
    expect(repeated.entries[499]).toMatchObject({path: ['accounts', 499, 'login'], error: {message: 'Issue 499'}})
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
