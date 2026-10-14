import {readFileSync} from 'node:fs'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const html = readFileSync('demo/index.html', 'utf8')
const element = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const result = document.querySelector<T>(selector)
  if (!result) throw new Error(`Missing test element: ${selector}`)
  return result
}
const click = (selector: string) => element(selector).click()
const input = (selector: string, value: string) => {
  const field = element<HTMLInputElement | HTMLSelectElement>(selector)
  field.value = value
  field.dispatchEvent(new Event('input', {bubbles: true}))
}
const switchLanguage = (language: string) => {
  element<HTMLSelectElement>('#language').value = language
  element('#language').dispatchEvent(new Event('change'))
}
const submit = () => element('#profile-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  window.history.replaceState({}, '', '/?lang=en')
  document.head.innerHTML = html.split('<head>')[1].split('</head>')[0]
  document.body.innerHTML = html.split('<body>')[1].split('</body>')[0]
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

async function boot() { await import('../../demo/main') }

describe('Bilingual interactive demo', () => {
  it('translates all sections and restores English without changing values or markup', async () => {
    await boot()
    input('#name', 'Full name')
    input('#email', 'alice@example.com')
    input('#age', '32')
    input('#birthDate', '1994-02-03')
    input('#region', 'California')
    element<HTMLInputElement>('#terms').checked = true
    element('#terms').dispatchEvent(new Event('change', {bubbles: true}))
    submit()
    click('#add-address')
    input('[data-address-city="0"]', 'City')
    input('[data-address-postal="0"]', '10115')
    input('#masked-phone', '4155550134')
    const values = element('#profile-values').textContent
    const phone = element<HTMLInputElement>('#masked-phone').value
    switchLanguage('ru')
    expect(document.documentElement.lang).toBe('ru')
    expect(document.title).toBe('AdaptForm — интерактивное демо')
    expect(element('h1').textContent).toContain('проверить в деле.')
    expect(element('label[for="name"]').textContent).toContain('Полное имя')
    expect(element('#profile-result').textContent).toContain('Проверка пройдена')
    expect(element('.nested-form-heading').textContent).toContain('Адрес 1')
    expect(element('.phone-demo h3').textContent).toContain('маска ввода')
    expect(element('#profile-values').textContent).toBe(values)
    expect(element<HTMLInputElement>('#name').value).toBe('Full name')
    expect(element<HTMLInputElement>('[data-address-city="0"]').value).toBe('City')
    expect(element<HTMLInputElement>('#masked-phone').value).toBe(phone)
    expect(element('#profile-form button[type="submit"] span').textContent).toBe('→')
    expect(element<HTMLAnchorElement>('[data-document="README"]').href).toContain('/master/README.ru.md')
    expect(element<HTMLInputElement>('#name').placeholder).toContain('Алексей')
    expect(localStorage.getItem('adaptform-demo-language')).toBe('ru')
    switchLanguage('en')
    expect(document.title).toBe('AdaptForm — Interactive Demo')
    expect(element('label[for="name"]').textContent).toContain('Full name')
    expect(element('#profile-result').textContent).toContain('Validation passed')
    expect(element<HTMLAnchorElement>('[data-document="README"]').href).toContain('/master/README.md')
    expect(element<HTMLInputElement>('#name').placeholder).toBe('e.g. Alex Morgan')
  })

  it('switches existing validation and server errors without revalidating or losing input', async () => {
    await boot()
    submit()
    expect(element('#error-name').textContent).toBe('Enter your full name.')
    switchLanguage('ru')
    expect(element('#error-name').textContent).toBe('Введите полное имя.')
    expect(element('#profile-status').textContent).toContain('В форме есть ошибки')
    expect(element('#profile-errors').textContent).toContain('Введите возраст.')
    input('#name', 'Alex')
    click('#apply-server-errors')
    expect(element('#mapped-errors').textContent).toContain('уже зарегистрирован')
    expect(element('#server-payload').textContent).toContain('Не удалось обновить профиль.')
    switchLanguage('en')
    expect(element('#error-email').textContent).toBe('This email is already registered.')
    expect(element('#server-result').textContent).toContain('Server errors applied')
    expect(element('#mapped-errors').textContent).toContain('The profile could not be updated.')
    expect(element<HTMLInputElement>('#name').value).toBe('Alex')
    click('#clear-server-errors')
    expect(element('#mapped-errors').textContent).toContain('Apply the example')
    switchLanguage('ru')
    expect(element('#server-result').textContent).toContain('Серверные ошибки очищены')
    click('#reset-profile')
    expect(element('#server-result').textContent).toContain('ещё не применены')
    expect(element('#profile-status').textContent).toContain('Ещё не проверено')
    expect(element<HTMLInputElement>('#name').value).toBe('')
    expect(element<HTMLInputElement>('#terms').checked).toBe(false)
  })

  it('keeps both collection editors, limits, removal, errors, and serialization localized', async () => {
    await boot()
    switchLanguage('ru')
    input('[data-tag-index="0"]', 'x')
    expect(element('.inline-error').textContent).toContain('не менее 2 символов')
    click('#add-tag')
    click('#add-tag')
    expect(element<HTMLButtonElement>('#add-tag').disabled).toBe(true)
    click('[data-remove-tag="0"]')
    click('#clear-tags')
    expect(element('#tags-error').textContent).toBe('Добавьте хотя бы один тег.')
    click('#add-tag')
    expect(element<HTMLInputElement>('[data-tag-index="0"]').getAttribute('aria-label')).toBe('Тег 1')
    expect(element('[data-remove-tag="0"]').getAttribute('aria-label')).toBe('Удалить тег 1')
    click('#validate-addresses')
    expect(element('#addresses-error').textContent).toBe('Добавьте хотя бы один адрес.')
    click('#add-address')
    input('[data-address-city="0"]', 'x')
    input('[data-address-postal="0"]', '12')
    expect(element('.nested-form').textContent).toContain('Введите ровно 5 цифр.')
    click('#add-address')
    click('#add-address')
    expect(element<HTMLButtonElement>('#add-address').disabled).toBe(true)
    click('[data-remove-address="1"]')
    expect(document.querySelectorAll('.nested-form')).toHaveLength(2)
    click('[data-tab="formdata"]')
    expect(element('#serialization-note').textContent).toContain('пары ключ/значение')
    expect(element('[data-tab="formdata"]').getAttribute('aria-selected')).toBe('true')
    switchLanguage('en')
    expect(element('#serialization-note').textContent).toContain('FormData values shown')
    expect(element<HTMLInputElement>('[data-tag-index="0"]').getAttribute('aria-label')).toBe('Tag 1')
    click('[data-tab="json"]')
    expect(element('#serialization-note').textContent).toContain('JSON-compatible')
  })

  it('localizes clipboard success and failure and resets feedback in the current language', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {language: 'en', clipboard: {writeText}})
    await boot()
    click('#copy-output')
    await vi.advanceTimersByTimeAsync(0)
    expect(element('#copy-output').textContent).toBe('Copied!')
    switchLanguage('ru')
    expect(element('#copy-output').textContent).toBe('Скопировано!')
    await vi.advanceTimersByTimeAsync(1600)
    expect(element('#copy-output').textContent).toBe('Скопировать результат')
    writeText.mockRejectedValue(new Error('Clipboard denied'))
    click('#copy-output')
    await vi.advanceTimersByTimeAsync(0)
    expect(element('#copy-output').textContent).toBe('Выделите и скопируйте')
    await vi.advanceTimersByTimeAsync(1600)
    expect(writeText).toHaveBeenCalledWith(element('#serialization-output').textContent)
    vi.unstubAllGlobals()
  })
})

describe('Language selection and storage', () => {
  it.each(['en', 'ru'] as const)('gives the explicit %s URL precedence over saved preference', async language => {
    localStorage.setItem('adaptform-demo-language', language === 'en' ? 'ru' : 'en')
    window.history.replaceState({}, '', `/?lang=${language}`)
    await boot()
    expect(document.documentElement.lang).toBe(language)
    expect(element<HTMLSelectElement>('#language').value).toBe(language)
  })

  it.each(['en', 'ru'] as const)('restores saved %s preference', async language => {
    window.history.replaceState({}, '', '/')
    localStorage.setItem('adaptform-demo-language', language)
    await boot()
    expect(document.documentElement.lang).toBe(language)
  })

  it.each([['ru-RU', 'ru'], ['de-DE', 'en']])('uses browser language %s without a saved preference', async (browser, expected) => {
    window.history.replaceState({}, '', '/?lang=unsupported')
    localStorage.setItem('adaptform-demo-language', 'unsupported')
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browser)
    await boot()
    expect(document.documentElement.lang).toBe(expected)
  })

  it('works when storage reads and writes are denied', async () => {
    window.history.replaceState({}, '', '/')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied') })
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en')
    await boot()
    switchLanguage('ru')
    expect(document.documentElement.lang).toBe('ru')
    expect(element('h1').textContent).toContain('проверить в деле.')
  })
})

describe('Demo interaction boundaries', () => {
  it('ignores unrelated collection events and enforces item limits in handlers', async () => {
    await boot()
    input('#country', 'CA')
    input('#birthDate', '')
    submit()
    expect(element('#error-region').textContent).toBe('')
    input('[data-tag-index="0"]', '<script>&"\'</script>')
    expect(element<HTMLInputElement>('[data-tag-index="0"]').value).toBe('<script>&"\'</script>')
    expect(element('#tags-list').querySelector('script')).toBe(null)
    const value = element('#tags-values').textContent
    element('#tags-list').dispatchEvent(new Event('input', {bubbles: true}))
    click('#tags-list')
    expect(element('#tags-values').textContent).toBe(value)
    const unrelated = document.createElement('input')
    element('#tags-list').append(unrelated)
    unrelated.dispatchEvent(new Event('input', {bubbles: true}))
    const detached = document.createElement('input')
    detached.dataset.tagIndex = '99'
    element('#tags-list').append(detached)
    detached.dispatchEvent(new Event('input', {bubbles: true}))
    click('#add-tag')
    click('#add-tag')
    element('#add-tag').dispatchEvent(new Event('click'))
    expect(element<HTMLButtonElement>('#add-tag').disabled).toBe(true)
    element('#addresses-list').dispatchEvent(new Event('input', {bubbles: true}))
    click('#addresses-list')
    click('#add-address')
    click('#add-address')
    click('#add-address')
    element('#add-address').dispatchEvent(new Event('click'))
    expect(document.querySelectorAll('.nested-form')).toHaveLength(3)
    const invalidAddress = document.createElement('input')
    invalidAddress.dataset.addressCity = '99'
    element('#addresses-list').append(invalidAddress)
    invalidAddress.dispatchEvent(new Event('input', {bubbles: true}))
    input('#masked-phone', '+1 (415) 555-0134')
    expect(element<HTMLInputElement>('#masked-phone').value).toBe('+1 (415) 555-0134')
  })

  it('reports a missing required page element during initialization', async () => {
    element('#serialization').remove()
    await expect(boot()).rejects.toThrow('Missing demo element: #serialization')
  })
})

it('ignores non-element collection click targets', async () => {
  await boot()
  for (const selector of ['#tags-list', '#addresses-list']) {
    const node = document.createTextNode('Unrelated content')
    element(selector).append(node)
    node.dispatchEvent(new Event('click', {bubbles: true}))
  }
  expect(document.querySelectorAll('[data-tag-index]')).toHaveLength(2)
  expect(document.querySelectorAll('.nested-form')).toHaveLength(0)
})

it('updates shareable language links without dropping unrelated URL state', async () => {
  window.history.replaceState({example: true}, '', '/?lang=en&example=1#collections')
  await boot()
  switchLanguage('ru')
  expect(window.location.search).toContain('lang=ru')
  expect(window.location.search).toContain('example=1')
  expect(window.location.hash).toBe('#collections')
  expect(window.history.state).toEqual({example: true})
  const {translate} = await import('../../demo/i18n')
  expect(translate('constructor')).toBe('constructor')
})
