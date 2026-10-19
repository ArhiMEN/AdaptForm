# Headless state usage

[English](HEADLESS_STATE_USAGE.md) · [Русский](HEADLESS_STATE_USAGE.ru.md)

HF-005–HF-010 were independently reviewed and merged in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16). The **2.2.0 source candidate** is merged in master ([PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18)), and **published to npm as 2.2.0** using OIDC Trusted Publisher; see the [release checklist](../roadmap/v2.2.0/RELEASE.md). Full semantics and compatibility: [state contract](HEADLESS_STATE_CONTRACT.md).

```ts
import {Form, Field, StringType, NumberType} from 'adaptform'

class Profile extends Form {
  name = new Field(StringType, 'Alex')
  age = new Field(NumberType, 25)
}

const form = new Profile()
const unsubscribe = form.subscribe(() => {
  const state = form.getSnapshot()
  render(state.fieldsValue, state.isValid, state.allErrors)
})

form.batch(() => {
  form.name.rawValue = 'Alexandra'
  form.age.rawValue = 26
})
// One root notification, after final validation. Direct child edits also notify.
form.name.setRawValue('Alex', false) // Still touched; validity becomes null.
form.commitBaseline()              // Commit values without changing errors/touched.
unsubscribe()                      // Call when the UI consumer is disposed.
```

`render` is application code, not a core dependency. `subscribe`, `getSnapshot`, `isDirty`, and `commitBaseline` exist on Field, Form, ArrayField and ArrayFormField; `batch` is public on Form. Subscribe does not call its listener initially: read `getSnapshot()` for the initial UI state. Registering the same callback twice creates two independent subscriptions. Unsubscribe is idempotent. Listener exceptions do not prevent other listeners from running; the first exception is rethrown after finalization. Writes from a listener become the next synchronous notification cycle, while the current callbacks retain the current committed snapshot.

Snapshots contain immutable data only. Field snapshots expose `rawValue`, `valueClear`, `errors`, `isValid`, `isTouched`, `isDirty`. Form snapshots expose `fieldsValue`, `allErrors`, `globalErrors`, `fields` and the common flags; collection snapshots expose values, child snapshots, collection errors and flags. Snapshot interfaces and `SnapshotValue` are exported. Form field entries use a safe union of node snapshot types; narrow by property before using a field-specific property. Values use the `SnapshotValue` data union; this minimal API does not promise the original mutable T as the snapshot type.

A Date becomes `{kind: 'Date', timestamp: milliseconds}`; Luxon becomes `{kind: 'DateTime', iso: ...}`. Map/Set become `{kind, entries}`, binary containers become `{kind, bytes}`, RegExp becomes `{kind, source, flags}`. Plain objects/arrays recurse and preserve cycles; unsupported instances, symbols and functions become `{kind: 'Opaque', type: ...}`. Opaque descriptions do not distinguish every same-class instance. Use normal model getters or serialization to obtain the library's original values; snapshot representation does not alter `toJSON()` or `toFormData()`.

Only library methods/setters provide automatic notifications. In-place mutation of legacy arrays (`items`, `forms`, `errors`), `options`, mutable value internals or arbitrary Form-property replacement is not intercepted. Reassign through the supported methods to notify, or read again to refresh a snapshot. Nested Form ownership follows the existing ArrayFormField model; arbitrary Form-valued properties are not added to serialization or field discovery.

## Batch and validation

```ts
try {
  form.batch(() => {
    form.name.rawValue = 'Saved locally'
    throw new Error('stop')
  })
} catch {
  // The completed write stays; validation and notification finalization ran.
}
```

A batch is synchronous, nestable and returns the callback result. Promise-returning callbacks are rejected by the TypeScript signature and checked at runtime. No async work is scheduled. If any automatic validation is requested within a batch, the participating enclosing Form is checked once after all writes, including its other fields. `validate=false` suppresses that operation's request; it does not veto another operation's final Form check. A batch containing only deferred assignments does not validate. Unrelated nodes edited in a batch retain their own deferred checks. Nested participating forms covered by an ancestor are checked through that ancestor, not twice.

Direct calls to `checkValid()`/`checkAndSetValid()` still run immediately, so explicit checks may observe intermediate live values. Snapshots read inside batch retain their pre-batch reference; live getters expose current writes. State-equivalent batches do not notify. No rollback occurs. A callback exception takes precedence over validation/listener exceptions; otherwise finalization errors propagate, and later batches continue normally.

## Baseline and reset

Field constructor captures the cleaned value after plugins/casting. New forms hydrated through a collection commit their hydrated values as their own baseline. Collections capture ordered cleaned content and include child dirty states. Call `form.commitBaseline()` after accepting server data when the whole form should become clean. Committing a single child does not rewrite its collection's content baseline.

Baseline commits never clear errors, alter touched/validity, assign values or validate. Reset retains the 2.1.1 operation: surviving children reset to their constructor defaults; collection membership/order stays. It does not restore the committed baseline, so it can leave dirty=true. `reinitialize` is only a future proposal.

## Costs and limits

No required runtime dependencies, timers or asynchronous event queues. Snapshots and comparisons traverse values; aggregate captures at multiple nesting levels and batch-root containment checks can cost more than a single linear traversal. Snapshot reads are reference-stable but currently recapture/compare rather than using selectors or a dependency graph. No performance benchmark or GC-proof claim is made. Deterministic tests cover detach, last-unsubscribe cleanup, shared children, repeated add/remove and reentrant notifications. Cyclic model ownership and mutating validators are unsupported; cyclic structured field values are supported. HF-004/HF-011+ and release preparation are separate work.
