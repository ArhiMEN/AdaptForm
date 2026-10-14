import {readFileSync, existsSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {russian} from '../../demo/translations'

const documents = ['README.md', 'CHANGELOG.md', 'LICENSE.md', 'AGENTS.md', 'docs/DEMO.md', 'docs/roadmap/v2.1.0/PLAN.md', 'docs/roadmap/v2.1.0/STATUS.md']

describe('Bilingual documentation', () => {
  it.each(documents)('provides a discoverable complete companion for %s', path => {
    const companion = path.replace('.md', '.ru.md')
    const english = readFileSync(path, 'utf8')
    const translated = readFileSync(companion, 'utf8')
    expect(english).toContain(companion.split('/').pop())
    expect(translated).toContain(path.split('/').pop())
    expect(translated).toMatch(/[А-Яа-яЁё]/)
    if (path !== 'LICENSE.md') {
      expect(translated.match(/^#{1,6} /gm)?.length).toBe(english.match(/^#{1,6} /gm)?.length)
      expect(translated.match(/^- /gm)?.length).toBe(english.match(/^- /gm)?.length)
    }
    expect(translated.match(/```[^\n]*\n[\s\S]*?```/g) ?? []).toEqual(english.match(/```[^\n]*\n[\s\S]*?```/g) ?? [])
    for (const document of [path, companion]) {
      for (const link of readFileSync(document, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
        const target = link[1].split('#')[0]
        if (target && !target.includes('://')) expect(existsSync(resolve(dirname(document), target))).toBe(true)
      }
    }
  })

  it('covers all translatable initial page text with the shared catalog', () => {
    document.body.innerHTML = readFileSync('demo/index.html', 'utf8').split('<body>')[1].split('</body>')[0]
    const neutral = new Set(['A', 'AdaptForm', 'GitHub', 'English', 'ArrayField', 'ArrayFormField', 'toJSON()', 'toFormData()', 'Source', 'Changelog', 'profile-form.ts', 'npm'])
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const missing: string[] = []
    let node = walker.nextNode()
    while (node) {
      const value = node.textContent?.trim() ?? ''
      if (/[a-z]/i.test(value) && !node.parentElement?.closest('pre, code, [data-no-translate]') && !neutral.has(value) && !russian[value]) missing.push(value)
      node = walker.nextNode()
    }
    expect(missing).toEqual([])
    expect(Object.values(russian).every(value => value.length > 0)).toBe(true)
  })
})
