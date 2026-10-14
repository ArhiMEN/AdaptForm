import { readFile } from 'node:fs/promises'
import { appendFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export async function checkNpmRelease(manifest, lockfile, fetchRegistry = fetch) {
  if (!manifest.name || !manifest.version || manifest.private) {
    throw new Error('The package must have a name and version and must not be private')
  }
  if (manifest.name !== lockfile.name || manifest.version !== lockfile.version ||
      manifest.name !== lockfile.packages?.['']?.name ||
      manifest.version !== lockfile.packages?.['']?.version) {
    throw new Error('package.json and package-lock.json have different package names or versions')
  }

  const packageName = encodeURIComponent(manifest.name)
  const version = encodeURIComponent(manifest.version)
  const response = await fetchRegistry(`https://registry.npmjs.org/${packageName}/${version}`)
  if (response.status === 200) return false
  if (response.status === 404) return true
  throw new Error(`npm registry lookup failed with HTTP ${response.status}`)
}

export async function main({ fetchRegistry = fetch, outputFile = process.env.GITHUB_OUTPUT, log = console.log } = {}) {
  const manifest = JSON.parse(await readFile('package.json', 'utf8'))
  const lockfile = JSON.parse(await readFile('package-lock.json', 'utf8'))
  const shouldPublish = await checkNpmRelease(manifest, lockfile, fetchRegistry)
  if (outputFile) {
    await appendFile(outputFile, `publish=${shouldPublish}\n`)
  }
  log(shouldPublish
    ? `${manifest.name}@${manifest.version} is unpublished; publishing is needed.`
    : `${manifest.name}@${manifest.version} is already published; skipping.`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main()
}
