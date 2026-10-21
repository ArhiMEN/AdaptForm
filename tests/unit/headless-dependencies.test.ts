import {describe, expect, it, vi} from 'vitest'
import {
  ArrayField, ArrayFormField, DependencyConfigurationError, Field, Form, NumberType, StringType,
  ValidationMutationError, type DependencyRef,
} from '../../src'

class Credentials extends Form {
  password = new Field(StringType, 'old')
  confirmation = new Field(StringType, 'old', {
    dependsOn: [{path: ['password']}],
    validate: (value: string, form?: Credentials) => !form || value === form.password.valueClear || 'Passwords differ',
  })
  unrelated = new Field(StringType, 'untouched')
}

function graph() {
  const calls: string[] = []
  const options = (name: string, sources: string[] = []) => ({
    dependsOn: sources.map(source => ({path: [source] as const})),
    validate: () => { calls.push(name); return true },
  })
  class Diamond extends Form {
    // Traversal order deliberately differs from topological order.
    d = new Field(StringType, 'd', options('d', ['b', 'c']))
    b = new Field(StringType, 'b', options('b', ['a']))
    c = new Field(StringType, 'c', options('c', ['a']))
    a = new Field(StringType, 'a', options('a'))
    other = new Field(StringType, 'other', options('other'))
  }
  const form = new Diamond()
  calls.length = 0
  form.enableDependencies()
  return {form, calls}
}

describe('HF-013 dependent validation', () => {
  it('validates password confirmation without subscriptions or manual checks', () => {
    const form = new Credentials()
    const before = form.getSnapshot()
    const disable = form.enableDependencies()
    expect(form.getSnapshot()).toBe(before)
    expect(form.enableDependencies()).toBe(disable)
    const unrelated = vi.spyOn(form.unrelated, 'checkAndSetValid')
    form.password.rawValue = 'new'
    expect(form.confirmation.error).toBe('Passwords differ')
    expect(form.confirmation.isTouched).toBe(false)
    expect(form.confirmation.isDirty).toBe(false)
    expect(unrelated).not.toHaveBeenCalled()
    form.confirmation.rawValue = 'new'
    expect(form.confirmation.isValid).toBe(true)
  })

  it('runs country/postal rules with the owning Form and final values', () => {
    class Address extends Form {
      country = new Field(StringType, 'CA')
      postal = new Field(StringType, 'A1A', {
        dependsOn: [{path: ['country']}],
        validate: (value: string, form?: Address) => !form || form.country.valueClear !== 'US' || /^\d{5}$/.test(value) || 'Use five digits',
      })
    }
    const form = new Address()
    form.enableDependencies()
    form.country.rawValue = 'US'
    expect(form.postal.error).toBe('Use five digits')
    form.batch(() => { form.country.rawValue = 'CA'; form.country.rawValue = 'US'; form.postal.rawValue = '12345' })
    expect(form.postal.isValid).toBe(true)
  })

  it('runs chains and diamonds once in deterministic topological order', () => {
    const {form, calls} = graph()
    form.a.rawValue = 'changed'
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    calls.length = 0
    form.b.rawValue = 'changed'
    expect(calls).toEqual(['b', 'd'])
  })

  it('deduplicates repeated sources, overlapping closures and nested batches', () => {
    const {form, calls} = graph()
    form.batch(() => {
      form.b.rawValue = 'b2'
      form.batch(() => { form.a.rawValue = 'a2'; form.c.rawValue = 'c2' })
      form.a.rawValue = 'a3'
      form.d.rawValue = 'd2'
      expect(calls).toEqual([])
    })
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
  })

  it('uses changed cleaned values and still honors direct validation requests', () => {
    const calls: string[] = []
    class Numeric extends Form {
      a = new Field(NumberType, 1, {validate: () => { calls.push('a'); return true }})
      b = new Field(StringType, 'b', {dependsOn: [{path: ['a']}], validate: () => { calls.push('b'); return true }})
    }
    const form = new Numeric()
    form.enableDependencies()
    calls.length = 0
    form.a.rawValue = '1'
    expect(calls).toEqual(['a'])
    calls.length = 0
    form.batch(() => { form.a.rawValue = 2; form.a.rawValue = 1 })
    expect(calls).toEqual(['a'])
  })

  it('does not propagate suppressed writes, but a prior request validates final values', () => {
    const {form, calls} = graph()
    form.batch(() => { form.a.setRawValue('suppressed', false) })
    expect(calls).toEqual([])
    expect(form.a.isValid).toBeNull()
    form.batch(() => { form.a.rawValue = 'requested'; form.a.setRawValue('final', false) })
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    expect(form.a.valueClear).toBe('final')
  })

  it('can select a suppressed target through another real edge', () => {
    const {form, calls} = graph()
    form.batch(() => { form.a.rawValue = 'changed'; form.b.setRawValue('suppressed', false) })
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    expect(form.b.isValid).toBe(true)
  })

  it('updates comparison baselines after suppressed writes and reset without changing reset behavior', () => {
    const {form, calls} = graph()
    form.a.setRawValue('other', false)
    form.a.rawValue = 'a'
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    calls.length = 0
    form.a.rawValue = 'other'
    calls.length = 0
    form.reset()
    expect(calls).toEqual([])
    expect(form.a.isValid).toBeNull()
    expect(form.a.isTouched).toBe(false)
    form.a.rawValue = 'other'
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
  })

  it('selects only assigned setFields keys and their dependents', () => {
    const {form, calls} = graph()
    form.setFields({a: 'new', b: 'new', ignored: 'value'})
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    calls.length = 0
    form.setFields({a: 'later'}, false)
    expect(calls).toEqual([])
    form.setFields({missing: 'value'})
    expect(calls).toEqual([])
  })

  it('continues downstream after ordinary false/string results', () => {
    const {form, calls} = graph()
    form.a.options = {validate: () => { calls.push('a'); return false }}
    form.b.options = {validate: () => { calls.push('b'); return 'invalid' }}
    form.a.rawValue = 'changed'
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    expect(form.a.isValid).toBe(false)
    expect(form.b.error).toBe('invalid')
  })

  it('treats dependencies as covering required rules too, including empty targets', () => {
    class Required extends Form {
      source = new Field(StringType, 'optional')
      target = new Field(StringType, null, {
        dependsOn: [{path: ['source']}],
        isRequired: (form?: Required) => form?.source.valueClear === 'required',
      })
    }
    const form = new Required()
    form.enableDependencies()
    form.source.rawValue = 'required'
    expect(form.target.isValid).toBe(false)
    form.source.rawValue = 'optional'
    expect(form.target.isValid).toBe(true)
  })

  it('keeps explicit checks immediate and local, and full Form checks full', () => {
    const {form, calls} = graph()
    form.batch(() => {
      form.a.rawValue = 'changed'
      form.b.checkAndSetValid(form)
      expect(calls).toEqual(['b'])
    })
    expect(calls).toEqual(['b', 'a', 'b', 'c', 'd'])
    calls.length = 0
    form.checkValid()
    expect(calls).toEqual(['d', 'b', 'c', 'a', 'other'])
    calls.length = 0
    form.a.checkAndSetValid(form)
    expect(calls).toEqual(['a'])
  })

  it('deduplicates duplicate dependency declarations', () => {
    const {form, calls} = graph()
    form.b.options = {dependsOn: [{path: ['a']}, {path: ['a']}]}
    form.a.rawValue = 'changed'
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
  })

  it.each([
    [{path: ['missing']}], [{path: []}], [{path: ['a', 'b']}], [{path: [0]}],
    [{node: {}}], [{path: ['a'], scope: 'root'}], [null], 'a',
  ])('rejects unsupported dependency descriptors (%j) before installing links', refs => {
    const form = new Credentials()
    form.confirmation.options = {dependsOn: refs as unknown as readonly DependencyRef[]}
    expect(() => form.enableDependencies()).toThrow(DependencyConfigurationError)
    form.confirmation.options = {dependsOn: [{path: ['password']}]}
    form.enableDependencies()
    form.password.rawValue = 'new'
    expect(form.confirmation.isValid).toBe(false)
  })

  it('uses literal property names including dots', () => {
    class Literal extends Form {
      ['a.b'] = new Field(StringType, 'a')
      target = new Field(StringType, 'b', {dependsOn: [{path: ['a.b']}]})
    }
    const form = new Literal()
    form.enableDependencies()
    const check = vi.spyOn(form.target, 'checkAndSetValid')
    form['a.b'].rawValue = 'changed'
    expect(check).toHaveBeenCalledTimes(1)
  })

  it.each(['self', 'multi'])('rejects %s cycles without exposing field values', kind => {
    const form = new Credentials()
    form.password.options = {dependsOn: [{path: [kind === 'self' ? 'password' : 'confirmation']}]}
    expect(() => form.enableDependencies()).toThrow(DependencyConfigurationError)
    try { form.enableDependencies() } catch (error) {
      expect((error as Error).message).not.toContain('old')
    }
  })

  it('retains writes and notifications on invalid option updates, then recovers', () => {
    const {form, calls} = graph()
    const notify = vi.fn()
    form.subscribe(notify)
    expect(() => form.batch(() => {
      form.a.options = {dependsOn: [{path: ['d']}]}
      form.a.rawValue = 'retained'
    })).toThrow(DependencyConfigurationError)
    expect(calls).toEqual([])
    expect(form.getSnapshot().fieldsValue.a).toBe('retained')
    expect(notify).toHaveBeenCalledTimes(1)
    expect(() => form.checkValid()).toThrow(DependencyConfigurationError)
    form.a.options = {dependsOn: []}
    form.a.rawValue = 'recovered'
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
  })

  it('resolves final dependency options only once after a batch', () => {
    const {form, calls} = graph()
    form.batch(() => {
      form.a.options = {dependsOn: [{path: ['missing']}]}
      form.a.rawValue = 'changed'
      form.a.options = {dependsOn: []}
    })
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
  })

  it('routes already queued legacy requests when dependencies are added in a batch', () => {
    const calls: string[] = []
    class Dynamic extends Form {
      a = new Field(StringType, 'a', {validate: () => { calls.push('a'); return true }})
      b = new Field(StringType, 'b', {validate: () => { calls.push('b'); return true }})
    }
    const form = new Dynamic()
    form.enableDependencies()
    calls.length = 0
    form.batch(() => {
      form.a.rawValue = 'changed'
      form.b.options = {dependsOn: [{path: ['a']}]}
    })
    expect(calls).toEqual(['a', 'b'])
  })

  it('rejects async batches without leaving graph scheduling stuck', () => {
    const {form, calls} = graph()
    // @ts-expect-error Promise callbacks are excluded from the synchronous API.
    expect(() => form.batch(() => {
      form.a.rawValue = 'changed'
      return Promise.resolve()
    })).toThrow('batch callbacks must be synchronous')
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    calls.length = 0
    form.a.rawValue = 'again'
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
  })

  it('disposes idempotently and allows a fresh activation', () => {
    const form = new Credentials()
    const disable = form.enableDependencies()
    disable()
    disable()
    form.password.rawValue = 'new'
    expect(form.confirmation.isValid).toBe(true)
    const again = form.enableDependencies()
    expect(again).not.toBe(disable)
    form.password.rawValue = 'newer'
    expect(form.confirmation.isValid).toBe(false)
    disable()
    form.password.rawValue = 'old'
    expect(form.confirmation.isValid).toBe(true)
  })

  it('cancels graph work when disabled during a batch', () => {
    const {form, calls} = graph()
    const disable = form.enableDependencies()
    form.batch(() => { form.a.rawValue = 'changed'; disable() })
    expect(calls).toEqual([])
    form.a.rawValue = 'next'
    expect(calls).toEqual(['a'])
  })

  it('rejects shared fields and overlapping roots, releases ownership after disposal', () => {
    const form = new Credentials()
    const other = new Credentials()
    other.password = form.password
    const disable = form.enableDependencies()
    expect(() => other.enableDependencies()).toThrow(DependencyConfigurationError)
    disable()
    other.enableDependencies()()
    class Parent extends Form {
      rows = new ArrayFormField(Credentials, {}, [{}])
    }
    const parent = new Parent()
    const off = parent.enableDependencies()
    expect(() => parent.rows.forms[0].enableDependencies()).toThrow(DependencyConfigurationError)
    off()
    parent.rows.forms[0].enableDependencies()
    expect(() => parent.enableDependencies()).toThrow(DependencyConfigurationError)
  })

  it('rejects collection endpoints while allowing unrelated collections', () => {
    class Mixed extends Credentials {
      tags = new ArrayField(value => new Field(StringType, value))
    }
    const form = new Mixed()
    form.confirmation.options = {dependsOn: [{path: ['tags']}]}
    expect(() => form.enableDependencies()).toThrow(DependencyConfigurationError)
    form.confirmation.options = {dependsOn: [{path: ['password']}]}
    form.enableDependencies()
    const check = vi.spyOn(form.confirmation, 'checkAndSetValid')
    form.batch(() => { form.tags.add('tag'); form.password.rawValue = 'new' })
    expect(form.tags.itemsValue).toEqual(['tag'])
    expect(check).toHaveBeenCalledTimes(1)
  })

  it('validates multiple assigned collections once alongside the selective graph', () => {
    class Mixed extends Credentials {
      first = new ArrayField(value => new Field(StringType, value))
      second = new ArrayField(value => new Field(StringType, value))
    }
    const form = new Mixed()
    form.enableDependencies()
    const first = vi.spyOn(form.first, 'checkAndSetValid')
    const second = vi.spyOn(form.second, 'checkAndSetValid')
    const confirmation = vi.spyOn(form.confirmation, 'checkAndSetValid')
    form.batch(() => {
      form.setFields({password: 'new', first: ['one'], second: ['two']})
    })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(confirmation).toHaveBeenCalledTimes(1)
  })

  it('releases removed collection members and rejects internal sharing', () => {
    class Parent extends Credentials {
      rows = new ArrayFormField(Credentials, {}, [{}])
    }
    const form = new Parent()
    form.enableDependencies()
    const row = form.rows.forms[0]
    form.rows.remove(0)
    expect(() => row.enableDependencies()).not.toThrow()
    const duplicate = new Credentials()
    duplicate.unrelated = duplicate.password
    expect(() => duplicate.enableDependencies()).toThrow(DependencyConfigurationError)
  })

  it('does not run validators on snapshot reads or after the last unsubscribe', () => {
    const {form, calls} = graph()
    const off = form.subscribe(() => {})
    form.getSnapshot()
    form.getSnapshot()
    expect(calls).toEqual([])
    off()
    form.a.rawValue = 'changed'
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
  })

  it('finalizes callback errors with original exception precedence and recovers', () => {
    const {form, calls} = graph()
    const failure = new Error('callback')
    const notify = vi.fn()
    form.subscribe(notify)
    expect(() => form.batch(() => { form.a.rawValue = 'changed'; throw failure })).toThrow(failure)
    expect(calls).toEqual(['a', 'b', 'c', 'd'])
    expect(notify).toHaveBeenCalledTimes(1)
    form.a.options = {validate: () => { throw new Error('validator') }}
    const off = form.subscribe(() => { throw new Error('subscriber') })
    expect(() => form.batch(() => { form.a.rawValue = 'next'; throw failure })).toThrow(failure)
    off()
    form.a.options = {validate: () => true}
    form.a.rawValue = 'recovered'
    expect(form.a.isValid).toBe(true)
  })

  it('stops on validator exceptions, publishes final writes and recovers flags', () => {
    const {form, calls} = graph()
    form.b.options = {validate: () => { calls.push('b'); throw new Error('validator') }}
    const notify = vi.fn()
    form.subscribe(notify)
    expect(() => { form.a.rawValue = 'changed' }).toThrow('validator')
    expect(calls).toEqual(['a', 'b'])
    expect(form.getSnapshot().fieldsValue.a).toBe('changed')
    expect(notify).toHaveBeenCalledTimes(1)
    form.b.options = {validate: () => true}
    form.a.rawValue = 'recovered'
    expect(form.d.isValid).toBe(true)
  })

  it.each(['raw', 'options', 'error', 'touched', 'baseline', 'reset', 'form', 'activation', 'disposal'])('rejects validator mutations before applying them (%s)', kind => {
    const form = new Credentials()
    const disable = form.enableDependencies()
    const actions: Record<string, () => void> = {
      raw: () => { form.unrelated.rawValue = 'changed' },
      options: () => { form.unrelated.options = {isRequired: true} },
      error: () => { form.unrelated.error = 'changed' },
      touched: () => { form.unrelated.isTouched = true },
      baseline: () => { form.password.commitBaseline() },
      reset: () => { form.reset() },
      form: () => { form.setGlobalError('server', 'changed') },
      activation: () => { form.enableDependencies() },
      disposal: disable,
    }
    form.confirmation.options = {validate: () => { actions[kind](); return true }}
    expect(() => { form.password.rawValue = 'new' }).toThrow(ValidationMutationError)
    expect(form.unrelated.valueClear).toBe('untouched')
    expect(form.unrelated.error).toBe('')
    expect(form.unrelated.isTouched).toBe(false)
    expect(form.globalErrors).toEqual({})
    expect(form.password.isDirty).toBe(true)
  })

  it('guards required callbacks', () => {
    const form = new Credentials()
    form.enableDependencies()
    form.confirmation.options = {isRequired: () => { form.password.rawValue = 'bad'; return true }}
    form.confirmation.setRawValue(null, false)
    expect(() => { form.password.rawValue = 'new' }).toThrow(ValidationMutationError)
    expect(form.password.valueClear).toBe('new')
  })

  it('guards custom FieldType validation before it can mutate another node', () => {
    class MutatingType extends StringType {
      validate(value: string, form?: Form): string[] {
        form?.setGlobalError('forbidden', 'mutation')
        return super.validate(value)
      }
    }
    class Example extends Form {
      source = new Field(StringType, 'source')
      target = new Field(MutatingType, 'target', {dependsOn: [{path: ['source']}]})
    }
    const form = new Example()
    form.enableDependencies()
    expect(() => { form.source.rawValue = 'changed' }).toThrow(ValidationMutationError)
    expect(form.globalErrors).toEqual({})
  })

  it('continues dependent validation when a source cannot be cast', () => {
    const observed: unknown[] = []
    class Example extends Form {
      source = new Field(NumberType, 1)
      target = new Field(StringType, 'target', {
        dependsOn: [{path: ['source']}],
        validate: (_value: string, form?: Example) => {
          if (form) observed.push(form.source.valueClear)
          return form?.source.valueClear !== null || 'Invalid source'
        },
      })
    }
    const form = new Example()
    form.enableDependencies()
    form.source.rawValue = 'invalid number'
    expect(form.source.valueClear).toBeNull()
    expect(form.source.isValid).toBe(false)
    expect(form.target.error).toBe('Invalid source')
    expect(observed).toEqual([null])
  })

  it('preserves the legacy options receiver of required rule methods', () => {
    const options = {
      messages: {isRequired: 'required'},
      isRequired() { return this.messages.isRequired === 'required' },
    }
    const field = new Field(StringType, null, options)
    expect(field.checkAndSetValid()).toBe(false)
    expect(field.error).toBe('required')
  })

  it('commits all snapshots before notification and separates reentrant transactions', () => {
    const form = new Credentials()
    form.enableDependencies()
    const seen: unknown[] = []
    form.password.subscribe(() => {
      seen.push([form.getSnapshot().fieldsValue.password, form.confirmation.getSnapshot().isValid])
      if (form.password.valueClear === 'new') form.password.rawValue = 'old'
    })
    form.password.rawValue = 'new'
    expect(seen).toEqual([['new', false], ['old', true]])
  })

  it('retains legacy scheduling without activation, even with invalid declarations', () => {
    const form = new Credentials()
    form.confirmation.options = {dependsOn: [{path: ['missing']}]}
    form.password.rawValue = 'new'
    expect(form.confirmation.isValid).toBe(true)
    const checks = vi.spyOn(form.unrelated, 'checkAndSetValid')
    form.batch(() => { form.password.rawValue = 'another' })
    expect(checks).toHaveBeenCalledTimes(1)
    expect(form.confirmation.isValid).toBe(false)
  })

  it('keeps empty declarations on the legacy batch path', () => {
    const {form, calls} = graph()
    form.enableDependencies()()
    for (const field of [form.a, form.b, form.c, form.d]) field.options = {dependsOn: []}
    form.enableDependencies()
    form.batch(() => { form.a.rawValue = 'changed' })
    expect(calls).toEqual(['d', 'b', 'c', 'a', 'other'])
  })
})
