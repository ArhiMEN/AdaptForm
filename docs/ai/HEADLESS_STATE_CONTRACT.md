# Headless state contract (HF-005–HF-010)

[English](HEADLESS_STATE_CONTRACT.md) · [Русский](HEADLESS_STATE_CONTRACT.ru.md)

Approved scope: additive state foundation for 2.2.0. Source/package metadata are prepared as 2.2.0; npm publication remains separate. HF-005–HF-010 passed review and merged in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16). Implementation and verification are recorded in [HANDOFF](HANDOFF.md).

## Sources and derived state

Field owns raw input, the cached cast/plugin-cleaned value, errors, legacy writable `isTouched` and tri-state `isValid` (`null` unchecked, `true` accepted, `false` rejected). Baseline is a detached capture of the cleaned constructor value, after plugins and casting. `isDirty` compares the cached cleaned value with that capture; reads never cast or validate. Invalid raw inputs that both clean to null are equal for dirty tracking, but snapshots distinguish their raw input.

Form derives validity and touched using the existing contracts. Dirty is derived from descendants. Collections additionally compare current ordered cleaned content with their constructor baseline; add/remove/reorder/replacement therefore affect dirty. Equal content restored to the same order is clean; no stable element IDs are introduced. Initial ArrayFormField hydration is committed as the collection's baseline, independently of the child class reset defaults. Descendant dirty is also included, so explicit child baseline commits remain visible correctly.

Nested forms use the existing ArrayFormField ownership model. Focused, visited, pending validation, submission and async states are not implemented. There is no separate mutable aggregate validity or dirty truth.

## Transitions

| Operation | Value | Touched | Validity/errors | Baseline/dirty |
| --- | --- | --- | --- | --- |
| Constructor | Existing default/plugin/cast behavior | false (legacy collection rules retained) | Existing default validation | Capture clean value |
| Assignment, validation enabled | Cast once | true, including programmatic writes | Existing synchronous validation | Compare with baseline |
| Assignment, validation disabled | Cast once | **true** | null; clear field errors | Compare with baseline |
| checkValid | Unchanged | Unchanged | Rebuild errors; Field does not assign isValid | Unchanged |
| checkAndSetValid | Unchanged | Unchanged | Rebuild errors and assign validity | Unchanged |
| Server error | Unchanged | Unchanged | Existing error setter behavior | Unchanged |
| reset | Restore constructor defaults of surviving nodes | Existing reset behavior | Clear errors, unset validation | **Keep baseline** and recompute dirty |
| commitBaseline | Unchanged | Unchanged | Unchanged | Capture current clean value, recursively; clean |

Touched records legacy assignment/interactions, not difference from baseline or exclusively human input. Formatting-only raw changes can be touched and snapshot-visible while clean. Errors and dirty are independent. After committing a different baseline, reset can be dirty: reset still restores constructor defaults. No collection membership/order is restored by reset (HF-004 excluded).

`reinitialize(data)` is deferred: a future proposal should atomically assign data and commit baseline with explicit validation/touched options and a separate choice of reset target. It must not silently repurpose reset. No method is implemented here.

## Value comparison

Use structural comparison, never JSON.stringify: primitives (Object.is), Date timestamps, arrays, plain string-keyed records, Map/Set in iteration order, RegExp and binary buffers/views. Captures detach mutable supported containers; cycles are supported. Luxon DateTime compares semantically without a core Luxon dependency. Other class instances are opaque and compare by identity; reassignment is required for observable updates. Symbol/non-enumerable properties and externally mutated input/error arrays are outside automatic notification tracking.

## Subscriptions and snapshots

All four node classes share one synchronous notification infrastructure. `subscribe(listener)` returns an idempotent unsubscribe; listeners receive no user data arguments and read `getSnapshot()`. No initial notification. A snapshot is referentially stable when observed state is equal and detached/frozen recursively. It includes raw/clean values where applicable, validity, errors, touched, dirty and descendant snapshots. No validators run on reads. Dates and other mutable built-ins use immutable data descriptions rather than live instances; unsupported classes/functions/symbols use opaque descriptions and never expose internal references. Public snapshot types describe these representations, not writable model instances.

One complete library mutation emits at most one notification per affected node. Errors/touched/validity alone are observable. Subscribe/getSnapshot discovers existing class fields after subclass initialization. Collection membership changes reconcile child ownership; removed children lose parent links. Last unsubscribe releases observation links recursively; future subscribe reconnects. Direct arbitrary property replacement on a Form, external mutation of returned legacy arrays/options, and in-place edits inside custom values require an explicit library mutation or a subsequent read to refresh; they are not intercepted by a Proxy.

## Batch

`form.batch(() => { ... })` is synchronous and nestable. Completed changes are not rolled back on exceptions; finalize notifications, then rethrow. Existing setter validation outside batch stays synchronous. Inside explicit batch, automatic setter validation is deferred until all values are assigned, with the enclosing Form as context; explicitly requested validators run immediately and can see intermediate values. Final validation is coalesced, not a dependency graph. `getSnapshot()` inside batch returns the last committed snapshot; getters on the live model expose current values. Async callbacks are unsupported; await outside batch.

## Compatibility with 2.1.1

| Surface | Policy |
| --- | --- |
| Class construction, public method names and inferred values | Retained; additive APIs only |
| rawValue/valueClear, plugins and cast pipeline | Retained |
| setRawValue(value, false) | Still touches and clears errors; does not validate |
| setFields(data, false), synchronous validation outside batch | Retained |
| isValid, errors/allErrors/ErrorsSchema, server errors | Retained |
| reset and collection membership | Retained, not redefined as baseline restoration |
| toJSON/toFormData payloads | Retained; snapshots are a separate representation |
| ArrayField/ArrayFormField, adaptform/luxon | Retained; Luxon optional |
| Dependencies/version/release | No runtime UI dependencies, bump or publication |

## Limits and future work

Snapshots and equality traverse supported values; large forms have linear capture costs, not a claimed benchmark result. Validators must avoid mutation/cycles. No dependency discovery, rollback, async fencing, stable collection IDs, submit orchestration or UI adapter is included (HF-011+ excluded). Independent review, CI and separate release preparation remain required.
