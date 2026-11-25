import { strict as assert } from 'node:assert'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
})

const manifests = JSON.parse(output)
const packageManifest = Array.isArray(manifests) ? manifests[0] : manifests.adaptform
assert.ok(packageManifest, 'npm pack did not return a package manifest')

const files = new Set(packageManifest.files.map(file => file.path))
const requiredFiles = [
  'README.md',
  'LICENSE.md',
  'CHANGELOG.md',
  'README.ru.md',
  'LICENSE.ru.md',
  'CHANGELOG.ru.md',
  'dist/index.mjs',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/index.d.cts',
  'dist/luxon.mjs',
  'dist/luxon.cjs',
  'dist/luxon.d.ts',
  'dist/luxon.d.cts',
]
const missingFiles = requiredFiles.filter(path => !files.has(path))
const forbiddenFiles = [...files].filter(path => /^(src|tests|docs|\.github)\//.test(path))

assert.deepEqual(missingFiles, [], `Package is missing required files: ${missingFiles.join(', ')}`)
assert.deepEqual(forbiddenFiles, [], `Package contains development files: ${forbiddenFiles.join(', ')}`)

// Evaluate the package surface produced by the build, including shared declarations.
const removedV2 = /\b(?:checkValid|checkAndSetValid|customErrors|getTypeName|outputFormat|DefaultErrorsSchema|parseErrors|parseErrorsDetailed|parseValidationErrors|staticKey|dynamicKey|transformValue|setGlobalError|clearGlobalErrors|allErrors|globalErrors|validationErrors|errorsShema|ErrorFieldMapping|ParsedError|DynamicRule|messages\w*Options)\b/
for (const file of files) {
  if (/^dist\/.+\.d\.(?:c?ts)$/.test(file)) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), removedV2, `Legacy V2 API in ${file}`)
  }
}

console.log(`Package contents verified: ${files.size} files; required entry points and declarations are present.`)
