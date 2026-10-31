# AdaptForm 3.0 — PR #29 documentation integration

[English](V3_DOCUMENTATION_INTEGRATION.md) · [Русский](V3_DOCUMENTATION_INTEGRATION.ru.md)

V3-02: **ACCEPTED** by the owner at `b041806ee35c56f55c0a0925e7d0de8b533f09bd`; ODR-01–05 are final for this stage. Integration result: **READY_FOR_OWNER_REVIEW**. Review concerns the documentation transfer, not renewed architecture approval or V3-03 authorization.

## Inspected revisions and precedence

Inspection date: 2026-10-31. Both PRs target master `670c6a04014fbf938574bfd8eb2a706e44a9d4d0` and remain open Drafts. Work started with a clean index/tree on the accepted PR #30 HEAD. Neither source branch was merged or rebased.

| Source | Branch / HEAD | Difference from master at inspection |
| --- | --- | --- |
| [PR #29](https://github.com/ArhiMEN/AdaptForm/pull/29) | docs/v3-architecture-legacy-policy / aab14d29b428c57cabb9ec5ceb069fcc5adaba6e | 6 commits; 6 files; +138 / −0 |
| [PR #30](https://github.com/ArhiMEN/AdaptForm/pull/30) | docs/v3-02-specification / b041806ee35c56f55c0a0925e7d0de8b533f09bd | 2 commits; 10 files; +1848 / −0 |

The accepted [architecture](V3_ARCHITECTURE.md), [code catalogue](V3_ERROR_CODES.md) and [30-row migration ledger](../roadmap/v3.0.0/PLAN.md) govern current 3.0 design. PR #29 supplies missing development policy and historical provenance. Its preliminary API and unresolved approval gates do not override V3-02. Historical HF-015/2.x compatibility contracts still describe their own releases. [AGENTS](../../AGENTS.md) governs development and escalation; this matrix is an integration record, not another API contract.

## Complete source-file inventory

All changes in [the PR #29 diff at the inspected head](https://github.com/ArhiMEN/AdaptForm/compare/670c6a04014fbf938574bfd8eb2a706e44a9d4d0...aab14d29b428c57cabb9ec5ceb069fcc5adaba6e) were read, including both language versions.

| PR #29 files | Added lines per file | Disposition |
| --- | --- | --- |
| AGENTS.md / AGENTS.ru.md | 8 / 8 | Four policy bullets transferred verbatim; accepted-V3-02 precedence and architectural-deviation escalation added |
| docs/ai/DECISIONS.md / DECISIONS.ru.md | 7 / 7 | Original direction bullets retained with a historical note; acceptance and integration recorded separately |
| docs/ai/V3_ARCHITECTURE.md / V3_ARCHITECTURE.ru.md | 54 / 54 | Provision-by-provision reconciliation below; accepted specification retained, missing policy made explicit, risks and gates preserved |

## Transfer matrix

Classification is relative to accepted PR #30 **before integration**: **INCLUDED** = already included; **TRANSFER** = missing or incomplete and transferred; **SUPERSEDED** = incompatible preliminary wording resolved by accepted V3-02; **HISTORY** = historical evidence retained. Source headings refer to PR #29 at the immutable head above. EN/RU companions have the same row IDs and classifications.

| ID | PR #29 provision | Classification | Integrated destination / resolution |
| --- | --- | --- | --- |
| M01 | AGENTS: identify the old contract and need; immediately report affected API, evidence, alternatives, migration impact and recommendation | TRANSFER | AGENTS escalation section; architecture §2 adds costs and the same disclosure requirement |
| M02 | AGENTS: no silent workaround; stop affected work, request remove/replace/retain-with-justification/defer; continue independent approved work only if safe | TRANSFER | AGENTS escalation section; architecture §2; applies to new architectural deviations as well |
| M03 | AGENTS: major version is not blanket removal permission; useful behavior needs replacement/migration; no out-of-scope break | INCLUDED | Architecture §2 and plan §§3–4 already preserve behavior/migration; full policy now also in AGENTS |
| M04 | AGENTS: one error/validation contract; configurable backend-independent normalization is supported integration, not legacy | TRANSFER | Architecture already specifies the single model/parser; missing explicit policy distinction transferred to AGENTS and architecture §2 |
| M05 | DECISIONS: target 3.0.0 rather than 2.3.0; inventory and owner-approved migration before legacy removal | INCLUDED | Architecture §2; plan §§2–4 and all 30 accepted ledger decisions; original direction retained in DECISIONS |
| M06 | DECISIONS: evolve ErrorsSchema for arbitrary APIs, no Django/PlayLease assumptions; separate parsing/application and source lifecycle | INCLUDED | Architecture §§5,7–8; plan §§3–4; no backend-specific contract |
| M07 | DECISIONS: mandatory escalation before fallbacks/bridges/duplicate representation/workarounds; normalization is useful functionality | TRANSFER | Original DECISIONS direction bullets retained; operative rule in AGENTS and architecture §2, including justification and stop/decision workflow |
| M08 | DECISIONS: V3-01 read-only; exact API and later stages require separate approval | HISTORY | DECISIONS historical note preserves the read-only audit boundary; exact API is now ACCEPTED, implementation/version/merge/publication gates remain |
| M09 | Architecture status: direction approved but public API not finalized | SUPERSEDED | Architecture status records owner-accepted V3-02 HEAD; integration alone remains READY_FOR_OWNER_REVIEW |
| M10 | Release direction: 3.0.0 replaces 2.3.0, published 2.2.0 unchanged | INCLUDED | Architecture §§1–2 and plan §1; version and dependencies untouched |
| M11 | Release direction: consolidate structured errors and validation; inventory dependencies/migration before legacy cleanup | INCLUDED | Architecture §§2–6; plan §§2–4; no bridge or alias restored |
| M12 | Release direction: preserve headless state, collection identity, performance and dependency validation; defer async/submit/UI adapters/unrelated reset | INCLUDED | Architecture §§2,4–6,9 and plan §§1,4–6; scope exclusions made explicit together in architecture §2 |
| M13 | Release direction: TypeScript-first, framework-agnostic core with no server-framework behavior | TRANSFER | Backend independence already present; explicit combined core/platform policy added in architecture §2 |
| M14 | Proposed errors: stable code, optional message/params, path where appropriate, type/custom/server/manual provenance | INCLUDED | Exact accepted declarations in architecture §3 and ODR-02 JSON domain in §6 replace the preliminary sketch without adding a second definition |
| M15 | Proposed errors: ordered collections, repeated codes; local Field storage versus full Form paths | INCLUDED | Architecture §§2–3,5–7; canonical own errors and located read projections retained |
| M16 | Proposed errors: localization must not parse raw message text | INCLUDED | Accepted I18N-01 in architecture §2 and catalogue: application-owned display; no core formatter/locale/message or code fallback |
| M17 | Proposed errors: signatures, mutability and names still require V3-02 approval | SUPERSEDED | Accepted architecture §§3,6–8 and ODR-01–05 are final; no renewed approval gate |
| M18 | Server: developer configures arbitrary API encoding; no framework guessing | INCLUDED | Architecture §7 records/tree/adapter configuration and explicit codecs; plan V3-04.1–3 |
| M19 | Server: evolve ErrorsSchema before competing API; extraction, mapping, globals, nested arrays/objects, multiplicity, custom transforms | INCLUDED | One ErrorsSchema.parse plus immutable ErrorsMapping in architecture §7; ODR-04 and plan helper migration retained |
| M20 | Server: consider parse/normalize separate from application where useful | SUPERSEDED | Architecture §§7–8 already requires separate Parse/Preflight/Commit/Notification under ODR-05 A; the weaker optional wording is not copied |
| M21 | Server: safe object keys and paths, including prototype-sensitive names | INCLUDED | Architecture §§6–9 and plan A03/params regression rows; safe registered-node resolution and descriptor checks |
| M22 | Lifecycle: own field edit clears its server errors, not siblings | INCLUDED | Architecture §5 adds accepted actual raw/clean-change and manual-source rules, collection ownership and Form-global exceptions |
| M23 | Lifecycle: ordinary revalidation must not erase server errors | INCLUDED | Architecture §§2,4–5; validation also preserves manual errors and reports effective validity |
| M24 | Lifecycle: independent source rules and unresolved response replacement/reset/nested/identity/staleness decisions | SUPERSEDED | Architecture §§5,8 resolves every listed issue; source partitioning, whole-scope replace, tokens/revisions and retained identity are accepted contracts |
| M25 | A01: structural legacy types without validateErrors break; document major migration rather than force a bridge | HISTORY | Original risk retained here; accepted structural contract in architecture §3 and plan A01/V3-03.3/V3-05.2; removal is already approved |
| M26 | A02: direct field validation can bypass mutation guard | HISTORY | Original risk retained here; architecture §4 requires guarding all paths; plan A02/V3-03.4–6 and V3-06.2 require future closure |
| M27 | A03: prototype-sensitive nested error merge is unsafe | HISTORY | Original risk retained here; architecture §§6–9 and plan A03/V3-04.1/4/V3-06.2; no claim of an implemented fix |
| M28 | A04: structured-error overhead needs measurement and an explicit performance decision | HISTORY | Original risk retained here; architecture §9 keeps historical measurements; plan PERF-01/A04/V3-06.1–2 retains measurement/review gates |
| M29 | Sequence: V3-01 read-only audit → V3-02 owner acceptance | HISTORY | Audit remains evidence; acceptance is recorded in architecture §1, DECISIONS and HANDOFF; it does not authorize V3-03 |
| M30 | Sequence: V3-03 core, V3-04 normalization/application, V3-05 migration/tests/EN-RU, V3-06 independent correctness/security/performance review | INCLUDED | Plan §§5–7 retains milestones/subtasks, dependencies and separate authorization |
| M31 | Sequence: V3-07 separately approved version/merge/npm verification; PL-01 downstream adoption only after verified package and outside release | INCLUDED | Plan V3-07 and §7 retain release/downstream gates; no release or downstream work in this integration |
| M32 | Release warning: master CI may automatically publish a new npm version; no version-bump merge without publication approval | INCLUDED | Plan V3-07 and §7 retain the warning; version/workflows/master untouched |
| M33 | No-silent-legacy rule: pre-implementation evidence, options, costs/migration, affected-work stop, useful replacement and AGENTS authority | TRANSFER | Complete rule in AGENTS and architecture §2; accepted ODR/ledger decisions need no re-approval; new unresolved conflicts stop affected work |

## Preservation and verification boundary

All 30 ledger rows, all five ODR rows, the approved decision descriptions, 14 TypeScript declaration/example blocks, code/parameter tables and implementation-task rows remain byte-identical to the accepted HEAD in each language. Only status/provenance/policy text changes in those documents. Historical HANDOFF entries and pre-V3 DECISIONS remain intact; the earlier V3-02 finalization handoff is explicitly historical. No runtime, tests, dependencies, package version or CI/CD change is part of this integration.

Actual documentation-check results and limitations are recorded in [HANDOFF](HANDOFF.md). Historical runtime/audit/benchmark results are not new checks. No unresolved substantive conflict remains: every SUPERSEDED row is resolved by already accepted decisions. New conflicts outside those decisions must be escalated under AGENTS before affected work continues.

## Recommendation for PR #29

Keep PR #29 open during owner review. After the owner accepts this integration, recommend closing PR #29 as superseded by PR #30, with a link to this matrix; do not merge its obsolete architecture or delete its branch. Closing or commenting on PR #29 is not performed by this task. PR #30 remains Draft, and V3-03 still requires separate authorization.
