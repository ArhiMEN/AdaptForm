import { strict as assert } from 'node:assert'
import { execFileSync } from 'node:child_process'

const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
})

const [packageManifest] = JSON.parse(output)
assert.ok(packageManifest, 'npm pack did not return a package manifest')

const files = new Set(packageManifest.files.map(file => file.path))
const requiredFiles = [
  'README.md',
  'LICENSE.md',
  'CHANGELOG.md',
  'dist/index.mjs',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/luxon.mjs',
  'dist/luxon.cjs',
  'dist/luxon.d.ts',
]
const missingFiles = requiredFiles.filter(path => !files.has(path))
const forbiddenFiles = [...files].filter(path => /^(src|tests|docs|\.github)\//.test(path))

assert.deepEqual(missingFiles, [], `Package is missing required files: ${missingFiles.join(', ')}`)
assert.deepEqual(forbiddenFiles, [], `Package contains development files: ${forbiddenFiles.join(', ')}`)

console.log(`Package contents verified: ${files.size} files; required entry points and declarations are present.`)
