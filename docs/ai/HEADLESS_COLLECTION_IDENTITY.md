# HF-011 — collection identity contract

[English](HEADLESS_COLLECTION_IDENTITY.md) · [Русский](HEADLESS_COLLECTION_IDENTITY.ru.md)

Current status: HF-011 accepted in PR #25; HF-013 in PR #27. HF-015 additive ingestion and structured paths are described in the [error contract](HEADLESS_ERRORS.md); the legacy server paths documented below remain unchanged.

Implemented in the 2.3.0 foundation branch against published 2.2.0; package version remains 2.2.0. This does not change the published release. HF-004 reset redesign is excluded.

## Identity and snapshots

A retained Field/Form instance has one stable process-local string ID, independent of values and indexes. A shared WeakMap uses object keys, not element values; it does not retain removed nodes. New independent instances (including equal-valued instances) have different IDs. IDs are allocated lazily on snapshot capture, never reused in the loaded module, and are not portable across reloads, engine copies or serialization. Distinct elements should use distinct instances: an application factory returning the very same Field object aliases one node, as before; it cannot represent two independent values. No new rejection of such legacy factories is introduced.

Both collection snapshots now include frozen ordered `itemIds` arrays parallel to `items` / `forms`. The exported property is optional so existing 2.2.0 structural snapshot producers remain assignable; engine-produced snapshots always supply it. Consumers of the widened interface should handle `undefined`. IDs are not added to child snapshots, fieldsValue, JSON or FormData. Snapshot shapes gain metadata; exact-key snapshot consumers should allow this additive property. An unchanged state retains its snapshot reference. Equal-valued node replacement or reorder now changes collection/ancestor snapshots and notifies observers because identity changed.

Ownership stays object-based, not index-based. Moves retain subscriptions and child baselines. Removal/replacement/clear reconciles observation links immediately, including within a batch. Removed nodes remain usable and may keep their own subscribers, but cannot notify obsolete parents. Last unsubscribe releases recursive links. No explicit destroy/dispose API or guarantee of immediate GC.

## Additive operations

```ts
const tags = new ArrayField((value?: string) => new Field(StringType, value), {}, ['a', 'b'])
const retained = tags.items[1]
const id = tags.getSnapshot().itemIds?.[1]
tags.insert(1, 'new', false) // Field<string> | undefined; insert before index
tags.move(2, 0)             // final order: b, a, new
retained === tags.items[0]  // true
tags.getSnapshot().itemIds?.[0] === id // true
```

| API | Contract |
| --- | --- |
| ArrayField.insert(index, value?, force_check = true) | Field<T> or undefined; same factory, touched and validation flow as add |
| ArrayFormField.insert(index, data?, force_check = true) | T or undefined; same constructor/hydration/child baseline/touched flow as add |
| Both move(from, to): void | Reorder the same node to the final destination index; validate once automatically |

Insert accepts integer indexes `0..length`, including empty insertion and append. Move accepts integers `0..length-1` on both sides; no index adjustment is applied after removal. Invalid negative, fractional, NaN, infinite or out-of-range indexes are no-ops with no construction, validation, touched change or event. Equal-index move is also a no-op. Move does not assign touched, matching remove's existing behavior; insert assigns touched exactly as add. Existing add signatures/return values and setters are unchanged. Automatic validation is synchronous outside batch and deferred/coalesced in Form.batch; explicit checks remain immediate. Completed structural writes are not rolled back on exceptions.

## Values, errors and compatibility

Dirty/baseline remains ordered cleaned-content comparison plus descendant dirty, without IDs. Returning unequal content to baseline order is clean; swapping equal content remains clean even though IDs and snapshots change. `commitBaseline()` and `reset()` semantics are unchanged; reset affects surviving nodes and does not restore collection membership/order. `setItemsValue()` / `setForms()` construct replacements, never match old nodes by equal value. A new object gets a new ID even when payloads match.

Error metadata lives on nodes; aggregate errors are built in current array order. ArrayFormField's existing server-error paths (`rows.1.name`) resolve the **current** index at assignment; Form.allErrors labels current positions. Move uses ordinary automatic validation, which may rebuild/clear old validation/server errors just as remove does. ArrayField item errors remain accessible on item nodes/snapshots; its pre-existing unsupported dot-path server errors remain global errors. Arbitrary global string-keyed errors are not retroactively rebound/reindexed. No new error format or routing contract is introduced.

Direct writes to the legacy mutable `items`/`forms` arrays remain outside automatic observation. Read refresh can discover them; use insert/move/add/remove for committed structural events. Cross-collection transfers/adoption, retained-instance setters, persisted IDs and stable public node references for a dependency graph remain separate design topics.

Regression coverage: insertion/deletion/reorder in both collection types; equal values; nested retained children; final batch validation/context; subscriptions before/after removal; indexed nested errors; scalar item errors; frozen/stable snapshots; full replacement and serialization; dirty/baseline/reset compatibility; invalid indexes and append/empty boundaries. See [verification](../roadmap/v2.3.0/VERIFICATION.md).
