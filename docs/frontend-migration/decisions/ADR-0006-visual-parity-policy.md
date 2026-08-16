# ADR-0006: Visual Parity Policy

Status: accepted

## Decision Question

Should the React migration adopt semantic visual parity, tracked in the existing feature-parity authority and accepted by a human per visual baseline or variance, rather than require Bootstrap pixel identity or leave visual quality to behavioral testing alone?

## Context And Evidence

- `CONTEXT.md` fixes MUI as the target visual component system, while `ADR-0002` prohibits adding Bootstrap or another general component suite. Exact Bootstrap pixel identity is therefore incompatible with the accepted target stack.
- `README.md` names `FEATURES.yaml` as the authority for user-visible parity, and `ADR-0004` already makes it the parity inventory linking legacy sources, tests, target ownership, and migration state. A separate visual registry would duplicate that authority.
- `FEATURES.yaml` has feature-level `parity`, `gaps`, legacy-source, target, test, and task records, but no visual status, visual evidence, accepted baseline, or accepted-variance record.
- Existing task contracts already require responsive and deterministic browser evidence: FM-008 compares deterministic legacy/React news at desktop and 390 px widths; FM-020 requires deterministic status evidence at desktop/mobile widths; FM-021 requires deterministic React/legacy route flows; FM-022 and FM-024 require responsive Playwright evidence. These contracts do not define a common visual acceptance policy.
- `tests/system/playwright.config.ts` runs one Chromium project and currently captures screenshots only on failure. Existing specs set fixed viewports and assert geometry such as absence of horizontal overflow, but repository search found no committed visual snapshot assertion.
- `ADR-0004` requires independent domain, component/accessibility, and Playwright evidence. Visual equivalence is a separate quality claim from behavioral correctness and accessibility conformance.

## Options

### Option A: Semantic visual parity in `FEATURES.yaml` with scoped visual contracts and independent gates

- Define visual parity as preservation of user-meaningful information hierarchy, grouping, state visibility, responsive behavior, interaction affordances, and readable/accessible presentation; permit intentional MUI-based differences from Bootstrap pixels.
- Extend each applicable existing `FEATURES.yaml` record with one visual status/evidence record, including the scoped baseline states/viewports, deterministic geometry assertions, narrow snapshot references where useful, documented variances, and explicit human acceptance status. Do not create another visual registry.
- New feature work owns a scoped visual contract in its task packet and records its evidence in its feature record and handoff. Already completed React screens receive separately designed remediation tasks; they are not retrospectively declared visually accepted.
- Use deterministic Playwright fixtures, fixed geometry, and narrow component/region snapshots only for stable, high-value evidence. Do not make full-page pixel diffs or screenshot volume the parity definition.
- Require explicit human acceptance of each feature's proposed visual baseline and any variance from legacy semantics. Behavioral, accessibility, and visual gates remain independently evidenced and independently pass/fail.

### Option B: Bootstrap pixel identity with broad full-page snapshots

- Require the React UI to reproduce legacy Bootstrap pixels and use full-page image snapshots as primary proof.
- Gives direct image comparison, but conflicts with the accepted MUI target, makes responsive/font/browser variation brittle, and encourages recreating the retired implementation rather than preserving user meaning.

### Option C: Keep visual quality implicit in existing behavior and accessibility tests

- Continue the current task-specific responsive assertions and rely on behavior/accessibility coverage without a visual record or human baseline acceptance.
- Avoids additional policy and evidence work, but leaves no consistent definition of visual parity, no authoritative disposition for intentional variances, and no remediation path for screens already marked done.

## Recommendation

Recommend Option A. It preserves the accepted MUI migration boundary, extends rather than competes with the established `FEATURES.yaml` parity authority, and makes visual claims reviewable without treating unstable pixel identity as product parity. The existing deterministic Playwright route fixtures and fixed viewport checks provide a repository-established basis for focused geometry and snapshot evidence.

## Human Decision

- Accepted Option A: semantic visual parity in `FEATURES.yaml` with scoped visual contracts and independent behavioral, accessibility, and visual gates.
- Rationale: preserve the accepted MUI target boundary while extending the existing feature-parity authority instead of requiring Bootstrap pixel identity or creating a competing visual registry.

## Consequences

- Bootstrap pixel identity is not a migration acceptance criterion. A variance is acceptable only when it preserves the stated semantic visual contract or is explicitly recorded and accepted by a human.
- `FEATURES.yaml` becomes the sole durable location for feature-level visual status/evidence. Its visual record must identify the feature-scoped baseline states and viewports, evidence locations, deterministic geometry checks, snapshot references when used, variance disposition, and human acceptance; it must link existing task and test IDs rather than copy their content.
- Each new or refined screen task must state a narrowly scoped visual contract: user-meaningful layout/grouping/state/affordance expectations, deterministic data/setup, named viewport geometry, and any intentionally proposed variance. Task ownership does not authorize unrelated visual cleanup.
- A completed screen without an accepted visual record requires a dedicated remediation task designed by the task designer. The remediation task establishes evidence and proposed baseline/variances without silently reopening unrelated behavior or changing the historical completion claim.
- Playwright visual evidence must use deterministic application data and fixed viewport geometry. Geometry assertions are required for the scoped responsive claims; snapshots are narrow and stable (component or region), used only where they add evidence beyond geometry and semantic assertions, and must not be used as unreviewed broad full-page baselines.
- A human must explicitly accept a proposed feature visual baseline and every recorded variance before that feature may claim visual parity. A reviewer may verify evidence but cannot supply this acceptance.
- Behavioral, accessibility, and visual acceptance are separate gates. Passing one does not waive failures or missing evidence in either other gate; ADR-0004's domain/component/Playwright requirements remain in force.
- No implementation, task packet, registry-schema, Playwright configuration, baseline image, or workflow change is made by this ADR proposal. After a human decision, the task designer must refine or create the affected task packets and the owners must make the corresponding scoped changes.

## Affected Work

- Policy and registry authority: `docs/frontend-migration/FEATURES.yaml`; `README.md`; `decisions/ADR-0004-testing-and-parity.md` as the existing complementary testing/parity decision.
- Workflow/templates requiring task-designer or coordinator follow-up after acceptance: `tasks/README.md`, `templates/task.md`, `templates/handoff.md`, and `templates/review.md`.
- Browser-evidence workflow requiring follow-up only where a scoped contract needs it: `tests/system/playwright.config.ts` and the feature-owned specs under `tests/system/tests/**`.
- Current and completed screen work that will need visual-contract assessment rather than automatic visual acceptance: FM-004, FM-008, FM-010 through FM-021, FM-023, and FM-025; planned/ready route work FM-022 and FM-024 must be refined before implementation if this ADR is accepted.
- Feature records presently evidencing React screens include `F-PLATFORM-SHELL`, `F-SYSTEM-NEWS`, `F-SEARCH-FORM` through `F-SEARCH-SAVED`, `F-STATS-SHELL`, `F-STATS-INDEXERS`, and `F-HISTORY-SEARCHES`; their exact remediation grouping remains task-designer work.

## Supersession

- Supersedes: `None`.
- Superseded by: `None` until a later ADR replaces this decision.
