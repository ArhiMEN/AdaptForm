import {russian} from './translations'

export type Language = 'en' | 'ru'
const storageKey = 'adaptform-demo-language'
const messages = new Map(Object.entries(russian))
const textSources = new WeakMap<Text, {source: string; rendered: string}>()
const attributeSources = new WeakMap<Element, Map<string, string>>()

function initialLanguage(): Language {
  const query = new URLSearchParams(window.location.search).get('lang')
  if (query === 'en' || query === 'ru') return query
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'en' || saved === 'ru') return saved
  } catch {
    // The demo also works when browser storage is unavailable.
  }
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

let language = initialLanguage()
export const getLanguage = (): Language => language
export const translate = (source: string): string => language === 'ru' ? messages.get(source) ?? source : source

export function setLanguage(next: Language): void {
  language = next
  const url = new URL(window.location.href)
  url.searchParams.set('lang', next)
  window.history.replaceState(window.history.state, '', url)
  try {
    localStorage.setItem(storageKey, next)
  } catch {
    // Keep the current selection even if it cannot be persisted.
  }
}

/** Translate presentation text while preserving markup, API names, and user data. */
export function translatePage(): void {
  document.documentElement.lang = language
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    if (!text.parentElement?.closest('pre, code, script, style, [data-no-translate]')) {
      const previous = textSources.get(text)
      const source = previous && previous.rendered === text.data ? previous.source : text.data
      const trimmed = source.trim()
      const rendered = source.replace(trimmed, translate(trimmed))
      text.data = rendered
      textSources.set(text, {source, rendered})
    }
    node = walker.nextNode()
  }
  document.querySelectorAll('[placeholder], [aria-label], [title], meta[name="description"]').forEach(element => {
    let sources = attributeSources.get(element)
    if (!sources) {
      sources = new Map()
      attributeSources.set(element, sources)
    }
    for (const attribute of ['placeholder', 'aria-label', 'title', 'content']) {
      const value = element.getAttribute(attribute)
      if (value === null) continue
      const source = sources.get(attribute) ?? value
      sources.set(attribute, source)
      element.setAttribute(attribute, translate(source))
    }
  })
  document.querySelectorAll<HTMLAnchorElement>('[data-document]').forEach(link => {
    const name = link.dataset.document
    link.href = `https://github.com/ArhiMEN/AdaptForm/blob/master/${name}${language === 'ru' ? '.ru' : ''}.md`
  })
}
