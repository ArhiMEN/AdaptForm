import {
  ArrayField,
  ArrayFormField,
  BooleanType,
  DateType,
  ErrorsSchema,
  Field,
  Form,
  MaskPlugin,
  NumberType,
  StringType,
} from '../src/index'

type ProfileKey = 'name' | 'email' | 'age' | 'birthDate' | 'country' | 'region' | 'terms'

class ProfileForm extends Form {
  name = new Field(StringType, null, {
    isRequired: true,
    minLength: 3,
    maxLength: 40,
    messages: {
      isRequired: 'Enter your full name.',
      minLength: 'Use at least 3 characters.',
      maxLength: 'Use no more than 40 characters.',
    },
  })

  email = new Field(StringType, null, {
    isRequired: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    messages: {
      isRequired: 'Enter your email address.',
      pattern: 'Enter a valid email address.',
    },
  })

  age = new Field(NumberType, null, {
    isRequired: true,
    ge: 18,
    le: 120,
    messages: {
      isRequired: 'Enter your age.',
      invalid: 'Enter a whole number.',
      ge: 'You must be at least 18.',
      le: 'Enter an age of 120 or less.',
    },
  })

  birthDate = new Field(DateType, null, {
    isDatetime: false,
    maxDate: new Date(),
    messages: { maxDate: 'The date of birth cannot be in the future.' },
  })

  country = new Field(StringType, 'US', { isRequired: true })

  region = new Field(StringType, null, {
    isRequired: (form?: ProfileForm) => form?.country.valueClear === 'US',
    messages: { isRequired: 'Enter a state or region when the country is United States.' },
  })

  terms = new Field(BooleanType, false, {
    mustBeTrue: true,
    messages: { mustBeTrue: 'You must accept the terms to continue.' },
  })
}

class AddressForm extends Form {
  city = new Field(StringType, null, {
    isRequired: true,
    minLength: 2,
    messages: { isRequired: 'Enter a city.', minLength: 'Use at least 2 characters.' },
  })

  postalCode = new Field(StringType, null, {
    isRequired: true,
    pattern: /^\d{5}$/,
    messages: { isRequired: 'Enter a postal code.', pattern: 'Use exactly 5 digits.' },
  })
}

const $ = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing demo element: ${selector}`)
  return element
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] ?? char)

const pretty = (value: unknown): string => JSON.stringify(value, null, 2)
const profile = new ProfileForm()
const tags = new ArrayField(
  (value?: string) => new Field(StringType, value ?? null, {
    isRequired: true,
    minLength: 2,
    messages: {
      isRequired: 'A tag cannot be empty.',
      minLength: 'Each tag needs at least 2 characters.',
    },
  }),
  {
    isRequired: true,
    minItems: 1,
    maxItems: 4,
    messages: {
      isRequired: 'Add at least one tag.',
      minItems: 'Add at least one tag.',
      maxItems: 'Use no more than 4 tags.',
    },
  },
  ['typescript', 'forms'],
)
const addresses = new ArrayFormField(AddressForm, {
  isRequired: true,
  minForms: 1,
  maxForms: 3,
  messages: {
    isRequired: 'Add at least one address.',
    minForms: 'Add at least one address.',
    maxForms: 'Use no more than 3 addresses.',
  },
})
const phone = new Field(StringType, null, {
  plugins: [new MaskPlugin({
    maskFormat: '+1 (___) ___-____',
    maskPlaceholder: '_',
    digitPattern: /\d/,
  })],
})
const phoneSection = document.createElement('section')
phoneSection.className = 'phone-demo panel'
phoneSection.innerHTML = `
  <div class="panel-heading"><div><h3>Bonus: input mask</h3><p>Try typing digits into the masked phone field.</p></div><span class="panel-icon">#</span></div>
  <div class="form-field"><label for="masked-phone">Phone number</label><input id="masked-phone" inputmode="tel" placeholder="+1 (___) ___-____" autocomplete="tel" /><div class="field-meta"><small>MaskPlugin transforms raw input.</small></div></div>
  <div class="inspector-block"><div class="inspector-label">RAW VALUE / VALUE CLEAR</div><pre class="output-code" id="phone-output">{ }</pre></div>
`
$('#serialization').insertAdjacentElement('afterend', phoneSection)

let validatedProfile = false
let serverErrorsApplied = false
let activeSerializationTab: 'json' | 'formdata' = 'json'
const profileKeys: ProfileKey[] = ['name', 'email', 'age', 'birthDate', 'country', 'region', 'terms']

const getField = (key: ProfileKey): Field<any> => profile[key] as Field<any>
const formFieldError = (key: ProfileKey): string[] => getField(key).errors

function updateProfileInspector(): void {
  $('#profile-values').textContent = pretty(profile.fieldsValue)
  $('#profile-errors').textContent = pretty(profile.allErrors)

  const valid = profile.isValid
  const status = $('#profile-status')
  const stateLabel = !validatedProfile ? 'Not validated yet' : valid ? 'Form is valid' : 'Form has errors'
  const stateDescription = !validatedProfile
    ? 'Enter values and validate to see the result.'
    : valid ? 'All configured rules passed.' : 'Review the fields marked below.'
  status.innerHTML = `<span class="status-dot ${!validatedProfile ? 'status-dot-muted' : valid ? '' : 'status-dot-error'}"></span><div><strong>${stateLabel}</strong><small>${stateDescription}</small></div>`

  $('#field-states').innerHTML = profileKeys.map(key => {
    const field = getField(key)
    const state = field.isValid === null ? 'pending' : field.isValid ? 'valid' : 'invalid'
    const label = field.isValid === null ? 'Pending' : field.isValid ? 'Valid' : 'Invalid'
    return `<div class="state-row"><code>${key}</code><span class="state-badge state-${state}">${label}</span><span class="state-touched">${field.isTouched ? 'Touched' : 'Pristine'}</span></div>`
  }).join('')
  renderSerialization()
}

function renderFieldError(key: ProfileKey): void {
  const errors = formFieldError(key)
  const field = document.querySelector<HTMLElement>(`[data-field="${key}"]`)
  const error = document.querySelector<HTMLElement>(`#error-${key}`)
  if (error) error.textContent = errors.join(' ')
  if (field) {
    field.classList.toggle('has-error', errors.length > 0)
    field.classList.toggle('is-valid', validatedProfile && errors.length === 0 && getField(key).isValid === true)
  }
  const state = document.querySelector<HTMLElement>(`[data-state="${key}"]`)
  if (state) {
    const current = getField(key)
    state.textContent = current.isTouched ? 'Touched' : 'Pristine'
    state.classList.toggle('state-valid', current.isValid === true)
    state.classList.toggle('state-invalid', current.isValid === false)
  }
}

function renderProfile(): void {
  for (const key of profileKeys) renderFieldError(key)
  const result = $('#profile-result')
  if (!validatedProfile) {
    result.className = 'form-result'
    result.textContent = 'Fill in a few fields, then validate.'
  } else if (profile.isValid) {
    result.className = 'form-result result-success'
    result.textContent = 'Validation passed. This form is ready to submit.'
  } else {
    result.className = 'form-result result-error'
    result.textContent = 'Validation found issues. Review the messages above.'
  }
  updateProfileInspector()
  renderMappedErrors()
}

function syncProfileFromInputs(): void {
  profile.setFields({
    name: $('#name').value,
    email: $('#email').value,
    age: $('#age').value,
    birthDate: $('#birthDate').value || null,
    country: $('#country').value,
    region: $('#region').value,
    terms: $('#terms').checked,
  }, false)
  if (validatedProfile) profile.checkValid()
  renderProfile()
}

$('#profile-form').addEventListener('input', syncProfileFromInputs)
$('#profile-form').addEventListener('change', syncProfileFromInputs)
$('#profile-form').addEventListener('submit', event => {
  event.preventDefault()
  validatedProfile = true
  profile.checkValid()
  renderProfile()
})
$('#reset-profile').addEventListener('click', () => {
  profile.reset()
  for (const key of profileKeys) {
    const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${key}`)
    if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = false
    else if (input) input.value = key === 'country' ? 'US' : ''
  }
  ($('#country') as HTMLSelectElement).value = 'US'
  validatedProfile = false
  serverErrorsApplied = false
  renderProfile()
  $('#server-result').textContent = 'No simulated server errors applied.'
  $('#server-result').className = 'form-result'
})

function renderTags(): void {
  $('#tags-list').innerHTML = tags.items.map((item, index) => `
    <div class="dynamic-item ${item.errors.length ? 'has-error' : ''}">
      <span class="item-index">${String(index + 1).padStart(2, '0')}</span>
      <div class="dynamic-input-wrap"><input aria-label="Tag ${index + 1}" data-tag-index="${index}" value="${escapeHtml(item.rawValue)}" placeholder="Enter a tag" /><small class="inline-error">${escapeHtml(item.errors.join(' '))}</small></div>
      <button type="button" class="icon-button" data-remove-tag="${index}" aria-label="Remove tag ${index + 1}" title="Remove tag">×</button>
    </div>
  `).join('')
  $('#tags-error').textContent = tags.errors.join(' ')
  $('#tags-values').textContent = pretty(tags.itemsValue)
  const addButton = $('#add-tag') as HTMLButtonElement
  addButton.disabled = tags.items.length >= 4
}

$('#tags-list').addEventListener('input', event => {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || !target.dataset.tagIndex) return
  const index = Number(target.dataset.tagIndex)
  tags.items[index]?.setRawValue(target.value, false)
  tags.checkValid()
  renderTags()
  const next = document.querySelector<HTMLInputElement>(`[data-tag-index="${index}"]`)
  next?.focus()
  if (next) next.setSelectionRange(next.value.length, next.value.length)
})
$('#tags-list').addEventListener('click', event => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const button = target.closest<HTMLElement>('[data-remove-tag]')
  if (!button) return
  tags.remove(Number(button.dataset.removeTag))
  renderTags()
})
$('#add-tag').addEventListener('click', () => {
  if (tags.items.length < 4) tags.add('')
  renderTags()
})
$('#clear-tags').addEventListener('click', () => {
  tags.clear()
  renderTags()
})

function renderAddresses(): void {
  $('#addresses-list').innerHTML = addresses.forms.map((form, index) => `
    <div class="nested-form">
      <div class="nested-form-heading"><strong>Address ${index + 1}</strong><button type="button" class="text-button" data-remove-address="${index}">Remove</button></div>
      <div class="form-field ${form.city.errors.length ? 'has-error' : ''}"><label for="address-city-${index}">City</label><input id="address-city-${index}" data-address-city="${index}" value="${escapeHtml(form.city.rawValue)}" placeholder="e.g. Berlin" /><p class="field-error">${escapeHtml(form.city.errors.join(' '))}</p></div>
      <div class="form-field ${form.postalCode.errors.length ? 'has-error' : ''}"><label for="address-postal-${index}">Postal code</label><input id="address-postal-${index}" data-address-postal="${index}" value="${escapeHtml(form.postalCode.rawValue)}" inputmode="numeric" placeholder="12345" /><p class="field-error">${escapeHtml(form.postalCode.errors.join(' '))}</p></div>
    </div>
  `).join('')
  $('#addresses-error').textContent = addresses.errors.join(' ')
  $('#addresses-values').textContent = pretty(addresses.formsFieldsValue)
  ;($('#add-address') as HTMLButtonElement).disabled = addresses.forms.length >= 3
}

$('#addresses-list').addEventListener('input', event => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const cityIndex = target.dataset.addressCity
  const postalIndex = target.dataset.addressPostal
  const index = Number(cityIndex ?? postalIndex)
  const form = addresses.forms[index]
  if (!form) return
  if (cityIndex !== undefined) form.city.setRawValue(target.value, false)
  if (postalIndex !== undefined) form.postalCode.setRawValue(target.value, false)
  addresses.checkValid()
  renderAddresses()
  const selector = cityIndex !== undefined ? `[data-address-city="${index}"]` : `[data-address-postal="${index}"]`
  const next = document.querySelector<HTMLInputElement>(selector)
  next?.focus()
  if (next) next.setSelectionRange(next.value.length, next.value.length)
})
$('#addresses-list').addEventListener('click', event => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const button = target.closest<HTMLElement>('[data-remove-address]')
  if (!button) return
  addresses.remove(Number(button.dataset.removeAddress))
  renderAddresses()
})
$('#add-address').addEventListener('click', () => {
  if (addresses.forms.length < 3) addresses.add()
  renderAddresses()
})
$('#validate-addresses').addEventListener('click', () => {
  addresses.checkValid()
  renderAddresses()
})

$('#apply-server-errors').addEventListener('click', () => {
  syncProfileFromInputs()
  profile.errors = {
    email: 'This email is already registered.',
    region: 'This region is not available.',
    profile_id: 'The profile could not be updated.',
  }
  serverErrorsApplied = true
  renderProfile()
  $('#server-result').className = 'form-result result-error'
  $('#server-result').textContent = 'Server errors applied to the live form instance.'
})
$('#clear-server-errors').addEventListener('click', () => {
  profile.errors = {}
  serverErrorsApplied = false
  renderProfile()
  $('#server-result').className = 'form-result result-success'
  $('#server-result').textContent = 'Server errors cleared. Run validation to refresh field validity.'
})

function renderMappedErrors(): void {
  const container = $('#mapped-errors')
  const errors = profile.allErrors
  const entries = Object.entries(errors).filter(([, messages]) => messages.length > 0)
  if (!serverErrorsApplied || entries.length === 0) {
    container.innerHTML = '<div class="empty-state">Apply the example payload to see mapped field and global errors.</div>'
    return
  }
  container.innerHTML = entries.map(([key, messages]) => `
    <div class="mapped-error-row"><span class="mapped-error-key">${escapeHtml(key)}</span><div>${messages.map(message => `<p>${escapeHtml(message)}</p>`).join('')}</div></div>
  `).join('')
}

function renderSerialization(): void {
  const output = $('#serialization-output')
  if (activeSerializationTab === 'json') {
    output.textContent = pretty(profile.toJSON())
    $('#serialization-note').textContent = 'JSON-compatible values, including ISO date strings.'
  } else {
    const entries = [...profile.toFormData().entries()].map(([key, value]) => [
      key,
      value instanceof File ? { name: value.name, size: value.size, type: value.type } : value,
    ])
    output.textContent = pretty(Object.fromEntries(entries))
    $('#serialization-note').textContent = 'FormData values shown as a readable key/value preview; null and undefined values are omitted.'
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => {
  button.addEventListener('click', () => {
    activeSerializationTab = button.dataset.tab === 'formdata' ? 'formdata' : 'json'
    document.querySelectorAll('[data-tab]').forEach(tab => {
      tab.classList.toggle('is-active', tab === button)
      tab.setAttribute('aria-selected', String(tab === button))
    })
    renderSerialization()
  })
})

$('#copy-output').addEventListener('click', async () => {
  const button = $('#copy-output') as HTMLButtonElement
  try {
    await navigator.clipboard.writeText($('#serialization-output').textContent ?? '')
    button.textContent = 'Copied!'
  } catch {
    button.textContent = 'Select and copy'
  }
  window.setTimeout(() => { button.textContent = 'Copy output' }, 1600)
})

$('#masked-phone').addEventListener('input', event => {
  const input = event.currentTarget as HTMLInputElement
  phone.rawValue = input.value
  if (input.value !== phone.rawValue) input.value = String(phone.rawValue ?? '')
  $('#phone-output').textContent = pretty({
    rawValue: phone.rawValue,
    valueClear: phone.valueClear,
  })
})

renderProfile()
renderTags()
renderAddresses()
$('#masked-phone').dispatchEvent(new Event('input'))
