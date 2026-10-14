# AdaptForm 2.1.0 Status

## Current stage

**Stage 1 — Baseline audit and test setup**

Branch: `v2.1.0`  
Baseline branch: `master`  
Starting package version: `2.0.5`  
Release status: Not released; npm publication is not authorized by this plan.

## Completed

- [x] Created the `v2.1.0` branch from `master`.
- [x] Added repository safety, architecture, language, and workflow instructions in `AGENTS.md`.
- [x] Added the v2.1.0 plan and progress tracker.
- [x] Identified priority areas from source review: type inference, serialization, validation side effects, array error schema composition, and localization compatibility.
- [x] Confirmed PlayLease consumes `adaptform@^2.0.5` and has a custom adapter that currently translates Russian validation messages.

## In progress

- [ ] Establish the executable test/build/lint baseline (not yet executable from the GitHub connector session).
- [x] Inspect test configuration and replace the machine-specific absolute alias path with a portable path.
- [x] Add regression tests for FormData collection serialization and omission of nullish values.\n- [x] Replace the machine-specific Vitest alias with a portable path derived from `import.meta.url`.\n- [ ] Turn remaining source-review findings into minimal reproducible regression tests.

## Verification log

| Check | Status | Notes |
|---|---|---|
| Repository and branch | Passed | Branch created from `master`; no existing branch changed. |
| Test suite | Not run | The execution environment cannot resolve GitHub, so a local checkout and npm install were unavailable. CI workflow was added; no run is visible yet. |
| Build | Not run | Same environment limitation; CI is configured to run the build. |
| Lint | Not run | Same environment limitation; CI is configured to run lint. |
| PlayLease integration tests | Not run | Review only; no application runtime was started. |

## Decisions and constraints

- Keep the current published version unchanged until a release is explicitly approved.
- Prefer backward-compatible improvements for the 2.1.0 minor release.
- Do not change validation-message language without assessing the PlayLease adapter and documenting a migration path.
- Record verified results only; never mark a check as passed based on inspection alone.

## Next actions

1. Inspect and correct the Vitest configuration if it contains a machine-specific absolute path.
2. Run tests, build, and lint in a real checkout and record results.
3. Add regression coverage for the most important correctness issues before refactoring the implementation.
