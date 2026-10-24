# HF-013 — dependent validation

[English](HEADLESS_DEPENDENCIES_USAGE.md) · [Русский](HEADLESS_DEPENDENCIES_USAGE.ru.md)

Accepted and merged in [PR #27](https://github.com/ArhiMEN/AdaptForm/pull/27). HF-015 adds [structured errors](HEADLESS_ERRORS.md): selected dependent rules can return error objects/arrays without changing scheduling, touched/dirty or existing invalidation.

Implemented source API for the 2.3.0 milestone; package version stays **2.2.0**, with no new npm publication. This is the deliberately limited implementation of [HF-012](HEADLESS_DEPENDENCIES.md): ordinary `Field` properties of one `Form`, with explicit activation.

## API and examples

```ts
import {Field, Form, StringType} from 'adaptform'

class Registration extends Form {
  password = new Field(StringType)
  confirmation = new Field(StringType, null, {
    dependsOn: [{path: ['password']}],
    validate: (value: string, form?: Registration) =>
      !form || value === form.password.valueClear || 'Passwords differ',
  })
}

const form = new Registration()
const disable = form.enableDependencies() // After all subclass fields initialize; no validation
form.confirmation.rawValue = 'secret'
form.password.rawValue = 'different' // Automatically checks password and confirmation

form.batch(() => {
  form.password.rawValue = 'final'
  form.confirmation.rawValue = 'final'
}) // Each selected field's validation pipeline once, using final values

disable() // Idempotent; removes graph ownership, indexes and pending requests
```

`FieldOptions.dependsOn` has type `readonly DependencyRef[]`, where `DependencyRef` is `{readonly path: DependencyPath}` and `DependencyPath` is `readonly [string]`. A path contains exactly one literal property name: `['a.b']` means the property named `a.b`, not a nested path. Names are checked at runtime against actual ordinary Fields. Duplicate edges are deduplicated. Dependencies cover the target's entire existing rule pipeline, including `isRequired` and type-specific rules; validators and messages retain their existing order.

For country/postal validation:

```ts
class Address extends Form {
  country = new Field(StringType, 'CA')
  postalCode = new Field(StringType, null, {
    dependsOn: [{path: ['country']}],
    validate: (value: string, form?: Address) =>
      !form || form.country.valueClear !== 'US' || /^\d{5}$/.test(value) || 'Use five digits',
  })
}
const address = new Address()
address.enableDependencies()
address.setFields({country: 'US', postalCode: '12345'})
```

Repeated activation returns the same disable callback without reference counting. After disposal, activation compiles a fresh graph and returns a new callback; an old callback cannot disable the new graph. No subscriptions are required. Subscription disposal does not disable the graph.

## Scheduling and state

- Automatic assignments validate the source and targets reachable through source → target edges. Chains and diamonds use a stable topological order, with Form property order breaking ties. Unrelated ordinary fields are not checked. False/string validation results do not skip downstream fields.
- Only changed **cleaned values** with an automatic validation request originate propagation. Equal cleaned values and writes returning to their original cleaned value need no dependent checks; the direct requested check still runs. Validation metadata changes are not dependency sources.
- Nested synchronous batches produce one graph pass at the outer commit. `setFields()` assigns all data first, then selects assigned ordinary fields and their reachable targets. `setRawValue(value, false)` and `setFields(data, false)` do not originate graph requests. An earlier true request still checks the final value; another source's real edge can select a suppressed target.
- `Form.checkValid()` remains a full immediate check in normal traversal order. Explicit Field checks remain immediate and local. These explicit checks are additional to automatic checks; deduplication applies to the automatic graph pass.
- Final snapshots are committed before subscriber callbacks. Reentrant subscriber writes form a later transaction. Snapshot reads never execute validators. Target revalidation changes validity/errors without marking the target touched or dirty.
- Without activation, and with an enabled empty graph, automatic scheduling remains the 2.2.0 behavior. Constructor checks, reset targets/membership, touched, dirty/baselines, serialization and optional Luxon remain unchanged.

## Configuration, failures and purity

`DependencyConfigurationError` is exported for missing or unsupported paths, self/multi-node cycles, aliases/shared nodes and overlapping enabled trees. Diagnostics contain property names, never field values. Activation compiles everything before installing ownership; failed activation installs nothing. An enabled Form reserves its containment tree independently of subscriptions, preventing another enabled root from claiming any of those nodes. Internal sharing is rejected too: factories must produce distinct instances.

Use the supported options setter to replace declarations:

```ts
form.confirmation.options = {dependsOn: [{path: ['password']}]}
form.confirmation.options = {dependsOn: []} // Remove this target's incoming edges
```

Option changes inside a batch are judged against the final configuration. A configuration failure retains completed writes and finalizes notifications, then throws before graph validators execute. Subsequent automatic graph passes and full Form checks must successfully compile again. Fix the options or disable the graph; no synthetic field/global error is injected. After a caught configuration error, `isValid` alone does not establish configuration health.

Graph-enabled rule callbacks must be synchronous and pure. Library mutation methods/setters called from required, type-specific or custom rules throw exported `ValidationMutationError` before applying the write. This includes writes to other nodes, reset/baseline/error changes, and graph activation/disposal. The engine may still write the target's validation metadata. Arbitrary in-place JavaScript edits cannot be intercepted without Proxy and are prohibited by contract. Legacy validators without an active nonempty graph keep their existing behavior.

Callback exceptions retain writes; the original batch callback exception takes priority over validation/finalization/subscriber failures. A throwing validator stops its graph pass, finalizes snapshots/notifications and propagates. Remaining targets are not claimed to have been validated. Scheduling and purity guards recover for later transactions.

## Deliberate limits

No dependencies on collections, collection items, nested Forms, direct node references, numeric/positional paths, `scope`, metadata or implicit reads. Independent Forms can enable their own graphs when their containment trees do not overlap. Collections present alongside ordinary fields retain their legacy validation rules. Collection constructor checks, recursive collection checks and explicit checks are outside automatic graph-pass deduplication; no cross-collection scheduling guarantee is introduced.

Arbitrary Form-property replacement/deletion and in-place options/container edits are not intercepted. Use `field.options = ...`; after changing Form properties, disable and reactivate explicitly. Supported collection methods reconcile graph ownership but do not create dependencies across collection boundaries. There is no Proxy, async validation, new runtime dependency, reset redesign or public breaking change for unactivated forms.

The engine reconciles membership and copies cleaned values at mutation commits. Topology is reused while property names, node identities and readonly dependency-array identities stay unchanged; replace declarations through the options setter. Activation and changed-configuration compilation use traversal-order scanning and can take quadratic time in field count. Selective validator counts are guaranteed, constant-time writes are not; further large-graph performance work remains separate.
