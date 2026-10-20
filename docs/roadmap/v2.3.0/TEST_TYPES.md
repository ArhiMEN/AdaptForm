# STAB-01 — test typing

[English](TEST_TYPES.md) · [Русский](TEST_TYPES.ru.md)

Base: master `9942aac71dbd5b20121f634bbad5663a812ef6ee`, package 2.2.0. Node 24.19.0, npm 11.9.0, TypeScript from `npm ci` (lockfile unchanged). This is next-milestone source work, not an npm release.

`npx tsc --noEmit -p tsconfig.test.json` reproduced **54 diagnostics**, now **0**:

| Root cause | Count | Correction |
| --- | ---: | --- |
| Type constructors require options | 41 | Tests pass `{}`; constructor contracts unchanged |
| Recursive Form mapped-type expansion (TS2589) | 5 | Exclude base Form members before inspecting their types |
| Partial object supplied as Form | 3 | Use real Form subclasses in tests |
| Missing script declarations (TS7016) | 2 | Precise adjacent `.d.mts` declarations, including status-only registry mocks |
| Unsupported async validator | 1 | Replace misleading test with application-owned async result applied through existing error setter |
| Missing `@core` root alias | 1 | Match existing Vitest alias in test tsconfig |
| FormData iterable API in imported demo | 1 | Add DOM.Iterable to test compiler libraries |

The TS2589 cycle was `keyof this` → inspect `fieldsValue` → `FormFieldsValue<this>`. Base Form members cannot be serializable field properties. Filtering them first preserves field value inference and avoids traversing this cycle; it does not cap nesting depth or widen values. Regression tests check scalars, collections, multiple nested levels, finite access in recursive models, excluded metadata, and rejected invalid context/value/async contracts. `@ts-expect-error` is used only for intentional negative regression cases, never to suppress an existing failing test.

No test exclusion, strictness reduction, mass `any`, public API weakening or runtime behavior change. The pre-existing need to annotate a generic ArrayField factory's value parameter remains; this task does not redesign inference. No breaking-change blocker remains for the 54 diagnostics.

Verification: source and test typechecks, lint and targeted STAB-01 tests. Final whole-project checks are recorded in [VERIFICATION](VERIFICATION.md). CI now checks the test tsconfig too, preventing recurrence.
