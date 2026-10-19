import { describe, expect, it, vi } from 'vitest'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkNpmRelease, main } from '../../scripts/check-npm-release.mjs'

const manifest = { name: 'adaptform', version: '2.1.0' }
const lockfile = { ...manifest, packages: { '': { ...manifest } } }

async function currentPackageId(): Promise<string> {
  const { name, version } = JSON.parse(await readFile('package.json', 'utf8')) as { name: string; version: string }
  return `${name}@${version}`
}

describe('npm release preflight', () => {
  it('builds publish artifacts before checking dist contents', async () => {
    const workflow = await readFile('.github/workflows/publish-npm.yml', 'utf8')
    const install = workflow.indexOf('name: Install dependencies')
    const build = workflow.indexOf('name: Build release artifacts')
    const verify = workflow.indexOf('name: Verify package contents')
    const publish = workflow.indexOf('name: Publish package')
    expect(install).toBeGreaterThan(-1)
    expect(build).toBeGreaterThan(install)
    expect(verify).toBeGreaterThan(build)
    expect(publish).toBeGreaterThan(verify)
    expect(workflow.slice(build, verify)).toContain('run: npm run build')
    expect(workflow.slice(verify, publish)).toContain('run: npm run check:package')
  })

  it('publishes a version that is absent from the registry', async () => {
    const lookup = vi.fn().mockResolvedValue({ status: 404 })
    await expect(checkNpmRelease(manifest, lockfile, lookup)).resolves.toBe(true)
    expect(lookup).toHaveBeenCalledWith('https://registry.npmjs.org/adaptform/2.1.0')
  })

  it('skips a version that is already published', async () => {
    await expect(checkNpmRelease(manifest, lockfile, async () => ({ status: 200 }))).resolves.toBe(false)
  })

  it('fails closed when the registry lookup fails', async () => {
    await expect(checkNpmRelease(manifest, lockfile, async () => ({ status: 503 })))
      .rejects.toThrow('HTTP 503')
  })

  it('rejects mismatched lockfile versions before contacting the registry', async () => {
    const lookup = vi.fn()
    await expect(checkNpmRelease(manifest, { ...lockfile, version: '2.0.5' }, lookup))
      .rejects.toThrow('different package names or versions')
    await expect(checkNpmRelease(manifest, { ...lockfile, packages: { '': { ...manifest, version: '2.0.5' } } }, lookup))
      .rejects.toThrow('different package names or versions')
    expect(lookup).not.toHaveBeenCalled()
  })

  it('rejects private packages', async () => {
    await expect(checkNpmRelease({ ...manifest, private: true }, lockfile))
      .rejects.toThrow('must not be private')
  })

  it('writes the GitHub Actions decision for an unpublished version', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'adaptform-release-'))
    const outputFile = join(directory, 'output')
    const log = vi.fn()
    try {
      await main({ fetchRegistry: async () => ({ status: 404 }), outputFile, log })
      expect(await readFile(outputFile, 'utf8')).toBe('publish=true\n')
      expect(log).toHaveBeenCalledWith(`${await currentPackageId()} is unpublished; publishing is needed.`)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('reports an already published version without writing output outside Actions', async () => {
    const log = vi.fn()
    await main({ fetchRegistry: async () => ({ status: 200 }), outputFile: '', log })
    expect(log).toHaveBeenCalledWith(`${await currentPackageId()} is already published; skipping.`)
  })
})
