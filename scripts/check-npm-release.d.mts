interface PackageIdentity {
  name?: string
  version?: string
  private?: boolean
}
interface ReleaseLockfile extends PackageIdentity {
  packages?: Record<string, PackageIdentity>
}
type RegistryLookup = (url: string) => Promise<{status: number}>
export function checkNpmRelease(manifest: PackageIdentity, lockfile: ReleaseLockfile, fetchRegistry?: RegistryLookup): Promise<boolean>
export function main(options?: {
  fetchRegistry?: RegistryLookup
  outputFile?: string
  log?: (message: string) => void
}): Promise<void>
