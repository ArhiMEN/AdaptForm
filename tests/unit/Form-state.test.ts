import {describe, expect, it} from 'vitest'
import {Form} from '@core/Form'
import {Field} from '@core/fields/Field'
import {ArrayField} from '@core/fields/ArrayField'
import {ArrayFormField} from '@core/fields/ArrayFormField'
import {StringType} from '@core/types/StringType'

class Child extends Form {
  name = new Field(StringType, 'default')
}
class Example extends Form {
  first = new Field(StringType, 'a')
  second = new Field(StringType, 'b')
  tags = new ArrayField(value => new Field(StringType, value), {}, ['tag'])
  children = new ArrayFormField(Child, {}, [{name: 'initial'}])
}

describe('HF-007 aggregate dirty state', () => {
  it('starts clean including hydrated nested forms', () => {
    const form = new Example()
    expect(form.isDirty).toBe(false)
    expect(form.children.forms[0].isDirty).toBe(false)
  })

  it('derives several direct edits and reverts without a separate mutable flag', () => {
    const form = new Example()
    form.first.rawValue = 'edit'
    form.second.rawValue = 'edit'
    expect(form.isDirty).toBe(true)
    form.first.rawValue = 'a'
    expect(form.isDirty).toBe(true)
    form.second.rawValue = 'b'
    expect(form.isDirty).toBe(false)
  })

  it('tracks direct collection items and nested form fields', () => {
    const form = new Example()
    form.tags.items[0].rawValue = 'edit'
    expect(form.isDirty).toBe(true)
    form.tags.items[0].rawValue = 'tag'
    expect(form.isDirty).toBe(false)
    form.children.forms[0].name.rawValue = 'edit'
    expect(form.isDirty).toBe(true)
    form.children.forms[0].name.rawValue = 'initial'
    expect(form.isDirty).toBe(false)
  })

  it('detects membership, ordered values, removal and equal replacement', () => {
    const form = new Example()
    form.tags.add('new')
    expect(form.isDirty).toBe(true)
    form.tags.remove(1)
    expect(form.isDirty).toBe(false)
    form.tags.remove(0)
    expect(form.isDirty).toBe(true)
    form.tags.itemsValue = ['tag']
    expect(form.isDirty).toBe(false)
    form.children.add({name: 'new'})
    expect(form.isDirty).toBe(true)
    form.children.remove(1)
    expect(form.isDirty).toBe(false)
    form.children.setForms([{name: 'initial'}])
    expect(form.children.forms[0].isDirty).toBe(false)
    expect(form.isDirty).toBe(false)
    form.commitBaseline()
    expect(form.isDirty).toBe(false)
  })

  it('retains reset membership and class defaults independently from committed baseline', () => {
    const form = new Example()
    const added = form.tags.add('new')
    form.first.rawValue = 'changed'
    form.reset()
    expect(form.tags.items).toContain(added)
    expect(form.tags.itemsValue).toEqual(['tag', 'new'])
    expect(form.children.formsFieldsValue).toEqual([{name: 'default'}])
    expect(form.isDirty).toBe(true)
    expect(form.isValid).toBe(false)
    expect(form.isTouched).toBe(false)
    form.commitBaseline()
    expect(form.isDirty).toBe(false)
    expect(form.isValid).toBe(false)
  })

  it('keeps validation and server errors independent from baseline commits', () => {
    const form = new Example()
    form.setFields({first: 'programmatic'}, false)
    expect(form.first.isTouched).toBe(true)
    expect(form.isDirty).toBe(true)
    form.setGlobalError('server', 'error')
    form.commitBaseline()
    expect(form.isDirty).toBe(false)
    expect(form.checkValid()).toBe(false)
    expect(form.isDirty).toBe(false)
    expect(form.globalErrors).toEqual({server: 'error'})
    form.clearGlobalErrors()
    expect(form.isValid).toBe(true)
  })

  it('distinguishes order even when all children are individually pristine', () => {
    const tags = new ArrayField(value => new Field(StringType, value), {}, ['a', 'b'])
    tags.itemsValue = ['b', 'a']
    expect(tags.items.every(item => !item.isDirty)).toBe(true)
    expect(tags.isDirty).toBe(true)
    tags.itemsValue = ['a', 'b']
    expect(tags.isDirty).toBe(false)
  })
})
