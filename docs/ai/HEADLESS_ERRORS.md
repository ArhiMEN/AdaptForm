# HF-015 — structured validation errors

[English](HEADLESS_ERRORS.md) · [Русский](HEADLESS_ERRORS.ru.md)

Implemented on `hf-015-structured-validation-errors`, based on master `b9051dd` (HF-011: PR #25, performance: PR #26, HF-013: PR #27). Package version remains **2.2.0**; this source change does not publish a package. HF-014, HF-016 and HF-017 are excluded.

## Architecture and compatibility decision

Previously Field and collection nodes owned mutable `string[]`; Form stored one global message per key. `allErrors` flattened nested form messages with positional labels, while scalar collection item errors were available on their nodes only. `ErrorsSchema.parseErrors()` and `parseErrorsDetailed()` returned one entry per mapped field, with later matching keys replacing earlier ones. Transformers could select/join array messages. Validation stops at required/cast/type failures before the custom callback. All these legacy contracts remain.

The internal source of truth is an ordered error list, with a shared string-array compatibility facade. Explicit library operations update both representations. A public read reconciles external mutations of legacy error arrays, preserving matching metadata where possible and assigning `external` to new strings. Identical messages edited in place cannot identify which duplicate the caller intended; same-position metadata wins, then the first unused matching entry. No Proxy or automatic notification for arbitrary in-place edits is introduced. Protected Field/ArrayField `_errors: string[]` remains a property for subclasses.

New structured server ingestion uses an additive method because silently reinterpreting old arrays or changing scalar collection routing would break existing contracts. Existing `form.errors = response` still calls the configured `parseErrors()`. New `form.setErrors(response)` calls `parseValidationErrors()`; neither path silently changes the other. Custom `parseErrors()` overrides remain authoritative through a compatibility bridge, so information already collapsed by an override cannot be recovered. There are no pending behavior changes requiring migration approval.

## Model

```ts
interface ValidationErrorInput {
  readonly code: string;
  readonly message?: string;
  readonly params?: Readonly<Record<string, unknown>>;
}
interface ValidationError extends ValidationErrorInput {
  readonly path: readonly (string | number)[];
  readonly source: 'client' | 'custom' | 'server' | 'external';
}
```

Codes must be non-empty. Input validators supply code/message/params; the engine assigns provenance and ownership. `client` means required, casting or FieldType validation, `custom` means the options `validate` callback, `server` means either Form server entry point, and `external` means manual `error`/`setErrors()` or newly discovered legacy string edits. Existing custom FieldType string implementations receive generic `custom` codes with `client` provenance; they can override additive `validateErrors(value, form?)` for precise codes. Built-in subclasses overriding historical `validate()` continue to run that override.

Errors, paths, params and returned lists are immutable. Params are detached with the snapshot data conversion: Date/RegExp/Map/Set/binary values become immutable data descriptions; unsupported classes/functions become opaque descriptions. Cycles are supported but cannot be serialized with JSON without a caller policy. Only code/message/params/path/source are copied from an input error; values, raw input and arbitrary extra properties are never automatically attached. Applications must avoid putting secrets into their own messages/params.

Errors are not keyed by code. Duplicates and array order are retained. Machine codes are independent of message language. `message` may be absent; legacy strings then display `code`. An explicit empty message stays empty and still represents a failed new structured rule. No translations, renderer or UI dependency is required.

## Reading and writing

```ts
import {Field, Form, StringType} from 'adaptform';

class Registration extends Form {
  email = new Field(StringType, null, {
    validate: (value: string) => {
      const errors = [];
      if (value.length < 2) {
        errors.push({code: 'min_length', message: 'Minimum length is 2', params: {min: 2}});
      }
      if (!value.includes('@')) {
        errors.push({code: 'email_format', message: 'Use an email address'});
      }
      return errors.length ? errors : true;
    },
  });
}
const form = new Registration();
form.email.rawValue = 'x';
for (const error of form.email.getErrors()) {
  console.log(error.code, error.message, error.params, error.source); // Local path: []
}
console.log(form.getErrors()); // Paths: ['email']
console.log(form.email.errors, form.allErrors); // Existing string APIs
```

`Field.getErrors()` returns own errors. `ArrayField.getErrors()` / `ArrayFormField.getErrors()` include own errors first, then children in current index order. `Form.getErrors()` traverses properties in their existing order, then adds own global errors in insertion order. Paths are relative to the receiver: `[]` for an own field/collection error, `[1]` for a collection item, `['rows', 1, 'name']` from a root Form. Paths are recomputed on reads; they do not retain stale indexes or parent references. Local `getOwnErrors()` is available on Field and collections. Structured read arrays need not have stable identity; `getSnapshot()` retains its existing reference-stability contract.

`field.setErrors(inputs, source = 'external')` and the same method on collections replace **own** errors, leaving children intact. They use existing manual error validity semantics: non-empty means invalid, empty clears the validation result. `error = message` remains supported. Form's `setErrors` is a server-response importer, not this local setter.

Callbacks may return `true`, `false`, a string, one `ValidationErrorInput`, or a readonly array of such inputs. Empty arrays succeed. False uses the configured/default message and code `custom`; strings retain their exact text (including empty strings). Other pre-existing JavaScript results keep their previous success semantics unless recognized as a non-empty-code error or a non-empty array entirely composed of errors. No async support or new rule scheduler. Custom callbacks still do not run after required/cast/type failures; existing early collection constraint exits remain.

## Built-in codes

| Check already present | Code | Params |
| --- | --- | --- |
| Required / failed cast | `required` / `invalid_type` | Cast/type: `expected` |
| String length | `min_length`, `max_length` | `min`, `max` |
| String regex / decimal format | `pattern` | None |
| Integer number | `integer` | None |
| Numeric bounds, including decimal | `min_value`, `max_value` | `min`/`max`, `exclusive` |
| Decimal digit limits | `max_digits`, `decimal_places` | `max`, digit `scope` (`integer` or `total`) |
| Boolean constraints | `must_be_true`, `must_be_false` | None |
| Date/Luxon bounds | `min_date`, `max_date` | `min`/`max` timestamp in milliseconds |
| Existing Luxon year range | `invalid_year` | `min: 1900`, `max: 2100` |
| Collection size (items or forms) | `min_items`, `max_items` | `min`, `max` |

Finite-number/date validation uses `invalid_type`; built-in messages and their customization remain unchanged. `FieldType.validate(): string[]` still works independently of structured errors. No code introduces a new check.

## Server input and schema migration

```ts
// Existing responses and parsing remain unchanged.
form.errors = {email: 'Already registered'};

// Opt into multiple messages and explicit codes.
form.setErrors({
  email: [
    {code: 'already_registered', message: 'Already registered'},
    {code: 'blocked_domain', params: {expected: 'work_email'}},
  ],
});

// Ordinary string arrays also retain each message in the new importer.
form.setErrors({email: ['Already registered', 'Use a work email']});
```

Nested objects, arrays of form objects, dotted mapped paths, static/dynamic rules, priorities, fallback, `nest()`, `forArray()`, clone/merge and value transformers are supported. Transformers receive the entire leaf value once, before mapping, just as before; selecting the first element intentionally discards the others. The new parser recognizes an object with a non-empty string `code` as one error. It preserves all entries when different source keys map to one field. `parseErrors()` / `parseErrorsDetailed()` retain their old return types and last-entry projection.

For a Form that defines `rows` and `tags` collections:

```ts
form.setErrors({rows: [{name: [{code: 'required'}, {code: 'remote_rule'}]}]});
form.setErrors([
  {path: ['rows', 0, 'name'], code: 'remote_rule', message: 'Check the name'},
  {path: ['tags', 1], code: 'duplicate'},
]);
```

Explicit paths avoid dotted-key ambiguity and support scalar collection items. Missing fields/indexes become global errors at the resolving Form; multiple global errors survive in `getErrors()` and `allErrors`. The legacy `globalErrors: Record<string, string>` projects the last message per global key. Manual `setGlobalError(key, message)` still replaces that key in its original position. Old global string keys are literal, remain unbound, and are not retroactively reindexed. Legacy `allErrors` keeps its historical grouping/positional labels and does not start flattening scalar collection item errors; use item `.errors` or `getErrors()` for those.

Both Form server entry points replace all previous errors recursively. Provenance is assigned `server` regardless of input source/path properties. Server and client origins are never inferred from the text.

## Clearing policy, reactivity and limits

The existing policy is preserved and recommended for this compatible implementation:

- Any Field assignment clears its errors, even equal values and `setRawValue(value, false)`; disabled validation leaves validity null. Enabled validation replaces errors with current client/custom results.
- Explicit validation replaces errors of visited nodes. Ordinary Field `checkValid()` still does not assign `isValid`; `checkAndSetValid()` does. Dependent HF-013 targets clear/rebuild errors when selected, without becoming touched/dirty.
- Global errors survive value changes and validation. Clear with `clearGlobalErrors()`, replacement server input or reset. Structural collection actions run their existing checks, which may clear visited server errors. Early constraint exits may leave unvisited child errors as before. Reset clears errors of surviving nodes and keeps the existing membership/reset target policy.

Keeping server errors until the exact value changes, merging server/client lists across validation, or clearing global errors on any edit are possible future policies, **not implemented here**. Each changes existing behavior and needs separate agreement.

Snapshots add optional `validationErrors` to node metadata, containing **own** errors only; child errors stay in child snapshots. This avoids copies of aggregate paths at every ancestor and preserves existing structural TypeScript snapshot producers. Metadata-only code/source/params changes notify observers; equivalent state retains snapshot identity and emits nothing. One mutation/batch publishes final state once per affected node using the existing engine. Snapshot reads never validate. Removed nodes lose parent subscriptions; HF-011 identities remain unchanged and current paths reflect retained nodes' positions.

Unchanged root reads still probe descendants as in PR #26. Error reconciliation/comparison is proportional to a node's errors; aggregation is proportional to returned errors/path lengths. In-place legacy array reconciliation with many changed duplicate messages may be quadratic. Full validation remains full except for the already opt-in HF-013 subset. No new runtime dependency, localization engine, framework adapter, validation trigger, async fencing, submission lifecycle, version bump or npm publication.

Checks and measured metadata costs: [HF-015 report](../roadmap/v2.3.0/ERRORS_VERIFICATION.md).
