// Weak keys never retain a removed model node. IDs are process-local metadata,
// independent of values, indexes, baselines and serialized payloads.
const identities = new WeakMap<object, string>()
let nextIdentity = 0

export function collectionItemId(node: object): string {
  let identity = identities.get(node)
  if (identity === undefined) {
    identity = `adaptform-item-${++nextIdentity}`
    identities.set(node, identity)
  }
  return identity
}
