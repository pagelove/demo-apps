# Document-first review — community

Guide: Pagelove Document-first development edition2.4, revised2026-11-04; supplied source SHA256 `322d0c1c1c016787edeb67702c62c69610f26916933d0f34ec3dd7b2468b26dc`. Actor: Codex. Review source: `c4dd883ef3ba1b628ae4eee46d8db797fba0f4b1`. Maintainer: repository maintainers. Profiles: A1/A2/A4.

## Model, authority and lifecycle

demo-05-professional/index.html owns directory, topics, replies and resources as semantic HTML. Selected identity is a fictional display choice, never an authentication credential. Activity views are read-only DOM-derived projections.

## Operation, state and recovery contract

Independent append commands have stable record IDs and retain their HTML payload while pending. Forms are frozen per request to prevent overlapping activation/reset of newer text. 15-second timeout; unknown outcomes do not auto-retry, retain copyable text and require source reconciliation before another submit. No atomic cross-collection transaction is promised.

No offline shared-save queue or durable form backup is offered. Browser read/search/forms remain useful on refusal. Repository and deployment bundle checks are distinct from live native-write and accessibility acceptance.

## Enforcement and effects

Native schema/shape/authorization declarations need target-host valid/invalid/unauthorized probes. Static test server rejects POST/PUT rather than presenting a file read as a successful save. No real private member data or account-authority claim.

## W1–W8 / R01–R12 acceptance

- W1–W3 / R01–R04: selected profiles, HTML preference, stable identities, owned aggregates and the representation exception above are the governing source contract. Derived caches/runtime arrays cannot become independent editable authorities.
- W4 / R05–R07: inspect exact canonical address/selector, actor, source revision and actual enforcement before enabling a newly relied-on mutation. Local fixtures and declaration review do not establish target-host privacy or validation.
- W5–W6 / R08–R10: distinguish working draft, frozen pending command, accepted state and unknown outcome. Preserve original data on rejected/future imports. No automatic external-effect replay. Offline collaboration/subscription features are not implied by browser storage; add tested scope/disposal/reconnect contracts before offering them.
- W7–W8 / R09–R12: audit/CHANGELOG.md records current commands, revisions and results. Existing REVIEW evidence remains historical. Re-run the appropriate source/shape/round-trip/concurrency/negative checks, then actual affected browser tasks. Never label pending live, maximum-device, assistive, restore or security checks as passed.

## Release and maintenance gates

Preserve user records, mutable source paths and incompatible backups during code updates. Do not replace a live document containing user records with a seed. Exclude credentials/private payloads from source, logs, public examples and previews. Pin coupled runtime/definition versions and retain rollback assets. Before real private or consequential use, verify supported read/write paths with valid and known-invalid/unauthorized requests on the actual host, exercise restoration in isolation, and record device/performance/accessibility limits. No new service or identity provider is authorized by this record. Re-review when format, source route, write adapter, host configuration, rules or runtime changes.
