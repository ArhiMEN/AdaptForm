import {execFileSync} from 'node:child_process'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('node:child_process', () => ({execFileSync: vi.fn()}))
const required = ['README.md', 'README.ru.md', 'LICENSE.md', 'LICENSE.ru.md', 'CHANGELOG.md', 'CHANGELOG.ru.md', 'dist/index.mjs', 'dist/index.cjs', 'dist/index.d.ts', 'dist/luxon.mjs', 'dist/luxon.cjs', 'dist/luxon.d.ts']
const manifest = (paths = required) => ({files: paths.map(path => ({path}))})
const run = () => import('../../scripts/check-package-content.mjs')
beforeEach(() => { vi.resetModules(); vi.spyOn(console, 'log').mockImplementation(() => {}) })
afterEach(() => vi.restoreAllMocks())

describe('Bilingual package content contract', () => {
  it.each(['array', 'object'])('accepts npm pack manifests in %s format', async format => {
    vi.mocked(execFileSync).mockReturnValue(JSON.stringify(format === 'array' ? [manifest()] : {adaptform: manifest()}))
    await expect(run()).resolves.toBeDefined()
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('12 files'))
  })
  it('rejects a package missing translated documentation', async () => {
    vi.mocked(execFileSync).mockReturnValue(JSON.stringify([manifest(required.filter(path => path !== 'README.ru.md'))]))
    await expect(run()).rejects.toThrow('Package is missing required files: README.ru.md')
  })
  it('rejects development sources inside the package', async () => {
    vi.mocked(execFileSync).mockReturnValue(JSON.stringify([manifest([...required, 'src/index.ts'])]))
    await expect(run()).rejects.toThrow('Package contains development files: src/index.ts')
  })
  it('rejects an absent package manifest', async () => {
    vi.mocked(execFileSync).mockReturnValue('{}')
    await expect(run()).rejects.toThrow('npm pack did not return a package manifest')
  })
})
