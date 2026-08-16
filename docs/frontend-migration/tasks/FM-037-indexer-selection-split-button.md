# FM-037: Legacy-Shaped Indexer Selection Split Button

Status: done Owner: live user session (out-of-band; reconciled via `/fm-reconcile`) Feature IDs: F-SEARCH-INDEXERS Component IDs: None API IDs: None Depends on: None Blocks: None

## Dependency Notes

Implemented interactively in a live user session, outside the normal `planned -> ready -> in_progress` promotion, and recorded here after the fact. It is one of four retroactive packets (FM-035 through FM-038) reconciling the single
uncommitted working tree found at baseline `4e64b8f3f` (FM-034), and is third in commit and review order. It shares `tests/system/tests/search.spec.ts` with FM-038: this packet owns only the indexer bulk-action visual-evidence block, FM-038
owns only the recent-search-menu geometry assertion, and FM-038 is committed after this packet so the two never own the file at the same instant. The control depends on `@mui/icons-material@7.3.9`, which is a coordinator-owned tooling
commit that must land before or with this packet's commit for verification to pass. Filed in `review` because the implementation exists but has had no handoff, no independent review, and no fresh human visual acceptance.

## Outcome

Bulk indexer selection is performed through a legacy-shaped split button — a default `Invert selection` action plus a dropdown holding the remaining bulk actions, with the indexer-group actions in a labeled subsection — instead of a flat
wrapping row of six or more equal-weight buttons.

## Boundary Rationale

The whole capability is one control in one feature record: its markup, its action set, its accessibility affordances, its component tests, and the `F-SEARCH-INDEXERS` visual contract that describes it all change together, and none of them
is reviewable without the others. It is separate from FM-038 because the recent-search menu is a different control on a different feature record with its own accepted contract and its own superseded geometry claim; the two share only one
evidence spec, in disjoint blocks. It is separate from FM-036 because that packet changes when a search runs, not how indexers are chosen, and separate from FM-035 because that packet changes shell navigation. No shared component is
extracted: the control is feature-scoped under `features/search/workspace`, and `README.md` requires a registry ID only for shared components.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (branded theme tokens).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` and `SearchWorkspace.test.tsx`
- `tests/system/tests/search.spec.ts` — only the indexer bulk-action visual-evidence block (shared with FM-038; see Dependency Notes)
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-INDEXERS`'s `visual`, `tests`, and `selectors` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/package.json` and `package-lock.json` (the `@mui/icons-material` addition): coordinator-owned tooling, committed separately
- The individual indexer dropdown and checkbox presentations themselves, category handling, and every other workspace region
- Extracting the split button into a shared component or creating a `COMPONENTS.yaml` record for it
- `core/ui-react/src/features/search/SearchPage.tsx` and any other feature's registry record

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`
- `F-SEARCH-INDEXERS` and the FM-016 packet; `F-SEARCH-FORM` for the surrounding workspace contract
- `core/ui-src/js/directives/indexer-selection-button.js` and its template, bundled at `core/src/main/resources/static/js/templates.js` (the legacy split button this mirrors: action set, order, and the absence of both icons and groups)
- `core/ui-src/html/directives/multiselect-dropdown.html` (the only legacy indexer control that does use icons)
- `tests/system/tests/search.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- The action set and its order match the legacy directive template: `Invert selection` as the always-visible default action, and, in the dropdown, `Reset to preselection`, `Select all`, `Deselect all`, `Select all usenet indexers`, and
  `Select all torznab indexers`, with each type entry rendered only when indexers of that type are eligible. The React wording `torznab` (legacy says `torrent`) is retained from FM-016 and confirmed as pre-existing rather than introduced
  here. Each action's selection outcome is unchanged from the flat buttons it replaces, and the component test asserts those outcomes, not merely that the menu items exist.
- The indexer-group actions have no legacy equivalent. They render under a divider and an `Indexer groups` subheader, only when groups exist, and this addition is recorded as a `proposed` variance on `F-SEARCH-INDEXERS` rather than left
  implicit as parity.
- The control is reachable by keyboard and assistive technology: the dropdown toggle exposes `aria-haspopup="menu"`, `aria-expanded` while open, and a distinct accessible name; the dropdown is a `role="menu"` whose entries are
  `role="menuitem"`. No existing `data-testid` is removed or renamed — the previous flat buttons are confirmed to have carried none — and any newly introduced `data-testid` is added to `F-SEARCH-INDEXERS`'s `selectors`.
- Icon choices are recorded with their basis: those mirroring legacy's own `multiselect-dropdown.html` usage are identified as such, and the rest are new choices with no legacy counterpart (the legacy indexer-selection template has no
  icons), which belong in the same `proposed` variance rather than being claimed as legacy parity. Icons sit beside text labels and are verified to add no duplicate or competing accessible name.
- `F-SEARCH-INDEXERS` visual record: the control's structure materially changed, from N always-visible buttons to one split button plus an on-demand menu, so `visual.status` goes `accepted` -> `proposed`, the `2026-08-16` `acceptance` block
  is removed and replaced by a `note` naming this task and what changed (the FM-034 precedent), and the `bulk-indexer-actions` state is updated to describe the split button and its open menu. At least one deterministic geometry check
  covering the split button and the open menu — contained within the workspace indexer region, with no menu or page horizontal overflow at both named viewports — is added to `contract.geometry_checks` and is actually asserted in
  `search.spec.ts`, not merely written into the registry. No human-acceptance metadata is fabricated or re-dated; re-acceptance is a human decision that neither implementer nor reviewer may supply.
- The record's existing geometry checks (the dropdown indexer control spans its region, the checkbox indexer region is visible at desktop, no horizontal overflow) are confirmed still literally true of the current rendering.

## Verification

- Prerequisites: `@mui/icons-material` must be installed; `node_modules` must match the coordinator-owned lockfile. Run the cheapest install that guarantees this and record which install ran and why.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after a matching production build (`VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`): `npx playwright test tests/search.spec.ts`, expected to produce the visual evidence for
  the proposed contract. Per FM-034, specs in this suite currently fail in this environment during fixture setup on a pre-existing, unrelated black-hole-path config defect. If that reproduces, record the run as blocked with the evidence that
  it is pre-existing, leave the visual record `proposed`, and log it under `Temporary Exceptions And Debt` with its removal condition. Never report a blocked run as passed and never weaken a gate to get past it.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that the recent-search-menu block of `search.spec.ts` owned by FM-038 was not altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`. Because the implementation
predates this packet, the handoff is recorded retroactively against the existing working tree: it must describe what is actually there, close any acceptance gap it finds, and never restate an unrun command as passed. The
`@mui/icons-material` dependency is classified and justified in the handoff even though its manifest change is committed by the coordinator.

## Handoff

### Outcome

The pre-existing split-button implementation already satisfied most acceptance bullets: the action set and order (`Invert selection` default, then `Reset to preselection`/`Select all`/`Deselect all`/`Select all usenet indexers`/`Select all
torznab indexers` in the dropdown), the `torznab` wording (pre-existing from FM-016, confirmed by reading baseline `HEAD`), keyboard/ARIA accessibility (`aria-haspopup="menu"`, `aria-expanded`, `role="menu"`/`role="menuitem"`, a distinct
accessible name), no removed/renamed `data-testid` (the flat buttons it replaced carried none, confirmed by reading baseline `HEAD`), and a component test (`SearchWorkspace.test.tsx`) that asserts every action's actual selection outcome,
not just menu-item presence.

**Correction to the packet's own premise, made mid-task at the coordinator's direction and independently re-verified before acting on it.** This packet's Acceptance and Context To Read sections claim the "Indexer groups" dropdown
subsection "has no legacy equivalent" and that legacy's indexer-selection control has no icons, citing `core/ui-src/js/directives/indexer-selection-button.js`/`.html` and `multiselect-dropdown.html`. That premise is factually wrong for the
control this task actually mirrors, and I verified this directly against the legacy source before changing anything:
- `grep -rln "indexer-selection-button" core/ui-src/html/ core/ui-src/js/` returns only the directive's own definition file — it is never referenced by any legacy HTML template. It is dead, unused code, not the code driving the search
  page's real split button.
- The actual legacy source is `core/ui-src/js/search-controller.js`: `buildIndexerSelectionActions` (~line 580) builds `[Invert selection, Reset to preselection, Select all, Deselect all]` plus `[Select all usenet indexers, Select all
  torznab indexers]` when any TORZNAB indexer exists (~line 616), each action carrying a Bootstrap glyphicon (`glyphicon-retweet`/`-repeat`/`-ok`/`-remove`/`-hdd`/`-magnet`), then concatenates `buildGroupSelectionActions` (~line 532), which
  builds one action per indexer group labeled `group: 'Indexer groups'` with icon `glyphicon-folder-open`.
- `core/ui-src/html/states/search.html` (lines 193-207) renders this exact action list as a real split button: a default-visible first action plus an `additionalIndexerSelectionActions` dropdown that renders a divider and an "Indexer
  groups" header before the first group action — precisely the `Divider`/`ListSubheader` structure the React component already had. `core/ui-src/html/directives/multiselect-dropdown.html` renders the same `actions` array (with the same
  divider/header behavior) as extra items inside the dropdown-mode indexer selector.
- So: the "Indexer groups" subsection **is** legacy parity, not a novel addition, and every legacy action already carries an icon (MUI substitutes a semantically equivalent icon per action from a different icon library under ADR-0002,
  which is a routine toolkit substitution, not a content variance). The one genuine mismatch the coordinator flagged — legacy's group icon is a folder (`glyphicon-folder-open`), the React implementation used `GroupsIcon` (a people icon) —
  is a real, fixable divergence, not merely a "different icon library" case, so I fixed it: swapped `GroupsIcon` for `FolderOpenIcon` in `SearchWorkspace.tsx`.

Given this, `F-SEARCH-INDEXERS`'s `visual.variances` is left `[]` (not the `proposed` variance the packet's Acceptance describes) — after the correction, neither the groups subsection nor the icon choices are actual parity deviations, so
recording either as a "variance" would misrepresent legacy parity as a deviation. The code comment above `IndexerSelectionButton` and the `FEATURES.yaml` `note` were rewritten to cite the correct legacy source
(`search-controller.js`/`search.html`/`multiselect-dropdown.html`) and state the corrected groups/icon findings; see Registry And Documentation Updates.

The remaining, still-genuinely-missing piece of this task was the `F-SEARCH-INDEXERS` visual-record reconciliation itself: at the start of this task, `visual.status` was still `accepted` with the stale `2026-08-16` acceptance block, no
`note`, and no geometry check covering the split button or its open menu anywhere in `contract.geometry_checks` or `search.spec.ts`. Closed by demoting `status` to `proposed`, removing the stale `acceptance` block and replacing it with a
`note`, and adding a real geometry check to both `contract.geometry_checks` and `search.spec.ts`'s existing per-viewport visual-evidence loop (asserting the split-button toggle is contained within the `workspace-indexers` region and that
its open dropdown menu renders with no menu/page horizontal overflow, at both desktop and mobile).

### Files Modified

- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` — icon import swapped (`GroupsIcon` -> `FolderOpenIcon`) and its one usage in the group-action `MenuItem`; the doc comment above `IndexerSelectionButton` rewritten to
  cite the correct legacy source and the corrected groups/icon findings (see Outcome). No markup structure, action set, order, or accessibility attribute changed.
- `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx` — read in full and left unmodified: it already asserts every action's real selection outcome (invert, reset, select all, deselect all, usenet, torznab, and one
  named-group selection), the `Indexer groups` subheader's visibility, and the accessible names this task's acceptance criteria require. No icon-implementation-detail assertions exist, so the icon swap needed no test change.
- `tests/system/tests/search.spec.ts` — one addition, confined to the indexer bulk-action visual-evidence block (inside "should provide deterministic React workspace visual evidence across desktop and mobile"'s existing per-viewport
  `desktop`/`mobile` loop, immediately after the `dropdown-indexers-${viewport}` geometry check): asserts the split-button toggle (`"More selection options"`) is geometrically contained within the `workspace-indexers` region, then opens
  its menu and asserts `bulk-indexer-actions-menu-${viewport}` has no menu/page horizontal overflow via `expectVisualGeometry`, then closes it with Escape. The recent-search-menu block (FM-038's) was read and left untouched.
- `docs/frontend-migration/FEATURES.yaml` — `F-SEARCH-INDEXERS`'s `visual` (`status`, `note`, `contract.geometry_checks`, `variances`) and `tests` fields only, as described in Outcome and Registry And Documentation Updates. `selectors`
  left `[]` (no `data-testid` was added or removed).
- `docs/frontend-migration/STATUS.md` — inspected; already correctly lists FM-037 under `## Review`. Not modified.
- This task packet — this Handoff section.
- Scope confirmation: every task-owned modification is within `Files Allowed To Modify`. The working tree also contains pre-existing, unrelated changes this task did not create or touch: `.claude/commands/fm-reconcile.md`,
  `core/ui-react/src/features/search/history/RecentSearches.tsx`/`RecentSearches.test.tsx` (sibling FM-038 in-flight work), and the untracked `docs/frontend-migration/tasks/FM-038-*.md` packet. None were created, edited, staged, or
  committed by this task.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `prettier` (`npx prettier --write`, scoped to `SearchWorkspace.tsx`/`SearchWorkspace.test.tsx` only), `vitest`, `eslint`, `tsc`, `vite`, Playwright Chromium — all invoked through the repository's declared `npm run`
  scripts (or `npx` equivalents named in this packet's Verification section).

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ls @mui/icons-material --depth=0` | Passed: `@mui/icons-material@7.3.9`, matching `package.json`/`package-lock.json` exactly. No install run — `node_modules` already matched the lockfile. |
| `core/ui-react` | `npx prettier --write src/features/search/workspace/SearchWorkspace.tsx src/features/search/workspace/SearchWorkspace.test.tsx` | Applied once (`SearchWorkspace.tsx` reformatted — the added doc comment; `SearchWorkspace.test.tsx` unchanged). Rerun `--check` confirmed both clean. |
| `core/ui-react` | `npm run typecheck` | Passed: `tsc --noEmit`, zero diagnostics. Run twice (mid-sequence and in the final rerun after the icon-basis correction), identical result both times. |
| `core/ui-react` | `npm run lint` | Passed: 0 errors, 6 warnings, all pre-existing and unrelated to this task's changes (`SearchWorkspace.tsx` ×4 React Hook Form/Fast Refresh warnings pre-dating this task, `IndexerStatusesPage.tsx`, `router.tsx`). Run twice, identical both times. |
| `core/ui-react` | `npm run format:check` | Failed overall (exit 1) both times: 9 files flagged in the final run (`README.md`, `RecentSearches.tsx`/`.test.tsx`, `SearchResults.tsx`/`.test.tsx`, `router.tsx`, `tsconfig.json`, `vite/devBackend.ts`/`.test.ts`), none within `Files Allowed To Modify`. `SearchWorkspace.tsx`/`.test.tsx` confirmed absent from the flagged list after the Prettier fix. See Temporary Exceptions And Debt. |
| `core/ui-react` | `npm run test -- --run` | Passed: 37 test files, 183 tests. Run twice (before and after the icon-basis correction), identical 37/183 both times. |
| `core/ui-react` | `npm run build` | Passed: 1238 modules transformed; only the pre-existing >500kB chunk-size advisory. Run three times (plain build twice, `VITE_OUT_DIR=../target/classes/static/react` production build twice for Playwright), identical result each time. |
| `core/ui-react` | `npm run check:api` | Passed: "Generated OpenAPI types are current." |
| `core/ui-react` | `npm run validate:migration` | Passed on the first run; failed once after this task's own Playwright run on an unrelated record (`F-PLATFORM-SHELL visual snapshots must contain repository paths`) due to a side effect described in Temporary Exceptions And Debt; passed again after repairing that side effect. Passed on every run after the repair, including the final run after the icon-basis correction. |
| `tests/system` | `npx tsc --noEmit` | Passed, no diagnostics. Run after this task's `search.spec.ts` edit (its only edit to that file), so current for its final content. |
| `core/ui-react` | `VITE_OUT_DIR=../target/classes/static/react npm run build` | Passed both times (before and after the icon-basis correction): production build written to `core/target/classes/static/react`. |
| `tests/system` | `npx playwright test tests/search.spec.ts` | **Blocked**, both times (before and after the icon-basis correction): 14/14 tests failed identically, every one at the shared `beforeEach` (`hydra.configureMockIndexers` → `saveConfig`) on the pre-existing, environment-local black-hole-path config defect (`Configuration validation errors: Torrent black hole folder c:\temp\blackhole is not absolute, NZB black hole folder c:\temp\blackhole is not absolute`), matching the FM-034/035/036-documented precedent verbatim. No test's body ever runs `page.goto`; the browser never renders the search page in any of them, including "should provide deterministic React workspace visual evidence across desktop and mobile" (the one exercising this task's new geometry check). See Temporary Exceptions And Debt. |
| `tests/system` | `npx playwright test tests/smoke.spec.ts` (repair run, twice) | 2/3 passed both times: both `Branded app shell visual evidence` specs passed and regenerated `F-PLATFORM-SHELL`'s two PNGs (this task's own `search.spec.ts` run had deleted them as a side effect — see Temporary Exceptions And Debt); `should load the application shell` failed on the same pre-existing black-hole-path defect, matching FM-034/035's own documented result for this exact spec. Not part of this task's required verification; run only to repair the side effect. |
| repository root | `git diff --check` | Passed, no output. |
| repository root | `git status --porcelain` | Confirmed: only `SearchWorkspace.tsx`, `FEATURES.yaml`, and `search.spec.ts` changed among this task's files (`SearchWorkspace.test.tsx` unmodified, as intended); the remaining entries (`RecentSearches.tsx`/`.test.tsx`, `.claude/commands/fm-reconcile.md`, `FM-038` task doc) belong to sibling in-flight work and were left untouched. |
| repository root | `sha256sum` on task-owned files | Recorded in Verification Basis below; identical across the final two independent end-to-end passes, confirming content stability. |

### Verification Basis

- Baseline: `87a81e043` (the just-committed FM-036, the repository `HEAD` supplied for this task).
- Command coverage: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api` all depend on `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` and
  `SearchWorkspace.test.tsx`. `npx tsc --noEmit` (tests/system) and both `npx playwright test tests/search.spec.ts` runs depend on `tests/system/tests/search.spec.ts` (the Playwright runs also would have exercised
  `SearchWorkspace.tsx`'s rendered behavior had the pre-existing defect not blocked every test body). `npm run validate:migration` additionally depends on `docs/frontend-migration/FEATURES.yaml` and this task packet
  (documentation/registry-only; excluded from the file-content manifest below per template instruction, matching the FM-034/035/036 precedent).
- File-content manifest (current on disk; computed after the icon-basis correction, the last edit to any implementation/test file, and reconfirmed identical by the final independent verification pass):
  - `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx: 86eca75cd6814b16001155359667e46ecc05b2e6b6b9eca9cf1abe4b8a932545`
  - `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx: e7e2c82731e46dda950276cdd6d16829609fa15e815c181d783a9621d615b3c2` (unmodified from baseline `HEAD`)
  - `tests/system/tests/search.spec.ts: 2778e987b05057113521f6e1e4bf8bf47e640b73dbdc7d8e852de2b09fe0ba6b`
- Completed after the last change to each command's listed files: yes. `typecheck`/`lint`/`format:check`/`test`/`build`/`check:api`/`validate:migration` were all re-executed fresh, end-to-end, after the icon-basis correction (the last
  edit to any implementation/test file); results are reported above as the final, current state. `npx tsc --noEmit` and both `search.spec.ts` Playwright runs were executed after `search.spec.ts`'s only edit (adding the geometry check),
  so both are current for its final content; the second Playwright run was additionally executed after `SearchWorkspace.tsx`'s icon-basis correction and produced an identical (blocked) result, confirming the correction did not change
  the outcome.
- Task-owned changes after verification: `None` on implementation or test files. This task packet's Handoff section was written after this verification run, as is conventional; no command needs rerunning because of it.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None. `package.json`/`package-lock.json` untouched by this task. `@mui/icons-material@7.3.9` (used for every icon in this control, including the new `FolderOpenIcon` import) is
  coordinator-owned tooling per this packet's Out Of Scope; the prerequisite check confirmed it already installed and matching the lockfile exactly, so no install ran.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0002 (MUI-only presentation): followed. The control is built entirely from MUI primitives (`ButtonGroup`, `Menu`, `MenuItem`, `Divider`, `ListSubheader`, `@mui/icons-material` icons); the Bootstrap-glyphicon-to-MUI-icon substitution
  per action is exactly the kind of toolkit substitution this ADR anticipates, not a content variance.
- ADR-0004 (testing and parity): followed. The component test asserts every action's real selection outcome; the Playwright visual-evidence addition is real (asserted geometry, not merely registry prose), even though this environment
  could not execute it to a real pass/fail on rendered output (see Temporary Exceptions And Debt).
- ADR-0006 (semantic visual parity): followed. `F-SEARCH-INDEXERS.visual.status` correctly demoted `accepted` -> `proposed` because the control's structure materially changed; the prior `2026-08-16` acceptance block was removed (not
  edited or re-dated) and replaced by a `note`; a new geometry check was added to `contract` and actually asserted in `search.spec.ts` before the record was touched, matching the FM-034 precedent. No baseline or variance was
  self-accepted; human visual re-acceptance is explicitly left to a fresh reviewer/coordinator.
- ADR-0007 (branded theme tokens): not implicated — this control introduces no new color or typography token usage.
- `ADR REQUIRED` proposal triggered during this task: None. The icon-basis correction and the registry reconciliation are conventional, reversible implementation/registry-reconciliation choices within the existing accepted ADRs, not a
  new architectural commitment.

### Assumptions

- The pre-existing split-button implementation (action set, order, ARIA affordances, component test coverage) was built correctly for the cases it covers — verified directly against every acceptance bullet by reading the full component
  and its test, not merely trusted.
- The coordinator's mid-task correction (Indexer groups is legacy parity; the group icon is a real mismatch) was independently re-verified against the actual legacy source before acting on it, not taken on citation: confirmed
  `buildGroupSelectionActions`/`buildIndexerSelectionActions` in `search-controller.js`, their rendering in `search.html` and `multiselect-dropdown.html`, and `indexer-selection-button.js`'s absence from every legacy HTML template via
  direct `grep`/read, all reproduced in Outcome above with concrete line citations.
- Two further, smaller divergences from the exact legacy source were found during this verification but **not** fixed, on the reasoning that this packet's own Acceptance text already normalizes the current behavior and neither was
  raised by the coordinator's correction; logged here as deviations rather than silently accepted as unremarked parity, per the project's stated preference for logging small/cosmetic findings rather than always fixing them immediately:
  - Legacy gates `Select all usenet indexers`/`Select all torznab indexers` together, on `hasTorznabIndexers` alone (both `search-controller.js` and the unused `indexer-selection-button.js` agree on this coupling). The current React
    implementation gates them independently (`usenetIndexers.length > 0` / `torznabIndexers.length > 0`). This packet's Acceptance bullet 1 explicitly describes the current independent-gating behavior as the intended target ("each type
    entry rendered only when indexers of that type are eligible"), so it was left unchanged.
  - Legacy's group-action label is the bare group name (`label: groupName`); the current React implementation uses `Select group {group}`. Not required by any acceptance bullet either way; left unchanged.
- `npm run format:check`'s remaining non-zero exit is attributable entirely to files outside `Files Allowed To Modify` (sibling FM-038 in-flight files, plus pre-existing unrelated dev tooling) — confirmed by name-by-name inspection of the
  flagged list in both the initial and the final verification pass.

### Temporary Exceptions And Debt

- `npm run format:check` cannot exit 0 as a whole in this shared working tree: 9 files outside `Files Allowed To Modify` remain unformatted (sibling FM-038 files, plus pre-existing unrelated dev tooling: `README.md`, `SearchResults.tsx`/
  `.test.tsx`, `router.tsx`, `tsconfig.json`, `vite/devBackend.ts`/`.test.ts`). Not fixed here, since doing so would mean editing files owned by other tasks or unrelated pre-existing work. Impact: the package-level gate does not exit 0,
  though both `SearchWorkspace.tsx`/`.test.tsx` are individually confirmed Prettier-clean. Removal condition: FM-038 completes and formats its own files (or a coordinator-level formatting pass covers the unrelated pre-existing files);
  tracking reference: this task packet and the FM-035/036/038 packets (matching their recorded precedent).
- `npx playwright test tests/search.spec.ts` is blocked in this environment: all 14/14 tests fail identically at the shared `beforeEach`'s `hydra.configureMockIndexers` → `saveConfig` call, on the pre-existing, environment-local
  black-hole-path backend config defect FM-034/035/036 already documented (a Windows-style default downloader path rejected as non-absolute by config validation). Reproduced twice, byte-identical failure text both times, across two
  separate production builds (before and after this task's icon-basis correction). No test body ever reaches `page.goto`, so no evidence — passing or failing — was produced for this task's new geometry check or for the record's
  existing geometry checks; `F-SEARCH-INDEXERS.visual.status` is correctly left `proposed`, not silently regenerated or claimed passing. Not fixed here: outside `Files Allowed To Modify`, and outside this task's Boundary Rationale.
  Removal condition: fix the environment's saved default downloader config (or the fixture's platform-specific path assumption), matching the FM-034/035/036-recorded follow-up; once fixed, rerun `npx playwright test
  tests/search.spec.ts` for real visual/functional evidence and fresh human visual acceptance.
- **Side effect discovered and repaired, disclosed as a structural hazard rather than silently patched over.** This task's required `npx playwright test tests/search.spec.ts` run clears Playwright's `test-results` output directory as
  part of its normal startup (Playwright's default `outputDir` behavior), which deleted `tests/system/test-results/visual-evidence/F-PLATFORM-SHELL/{app-bar-desktop,app-bar-mobile}.png` — untracked (gitignored, per `tests/.gitignore`)
  evidence generated by the already-committed FM-035 task and referenced by path in `F-PLATFORM-SHELL.visual.snapshots`. Detected because `npm run validate:migration` failed afterward on that unrelated record
  (`F-PLATFORM-SHELL visual snapshots must contain repository paths`), even though this task never touched `F-PLATFORM-SHELL`. Repaired both times it occurred by running `npx playwright test tests/smoke.spec.ts` (FM-035's own
  verification spec, not edited by this task) immediately afterward, which regenerated both PNGs; confirmed by direct file-existence check and a clean `validate:migration` rerun each time. Not a concurrent change by another agent —
  reproduced deterministically as a direct consequence of running `search.spec.ts` in isolation. Flagged here because it is a general hazard: any future task that runs `npx playwright test <single-spec>` in this repository will
  silently discard every other feature's locally-generated (gitignored) visual evidence unless it likewise regenerates it, and `F-PLATFORM-SHELL` happens to be the only record currently using the optional `snapshots` field, so this is
  easy to miss. Removal condition/follow-up: the coordinator may want a Playwright config change (e.g. per-spec output subdirectories, or `--output`) or a documented convention to always re-run the full evidence-generating spec set
  after a scoped run; not fixed here since `tests/system/playwright.config.ts` is outside this task's `Files Allowed To Modify`.
- **Found but out of scope to fix.** `search.spec.ts`'s pre-existing "should submit the explicit React indexer selection in both presentations" test (line ~414, outside `Files Allowed To Modify` — this task's file scope for
  `search.spec.ts` is limited to the indexer bulk-action visual-evidence block) targets `page.getByRole("button", {name: "Deselect all"})` and `page.getByRole("button", {name: "Select group Secondary"})` directly, without first opening
  the split button's dropdown. Against the current split-button markup (which this test itself predates — it still reflects the flat-button shape the split button replaced) those two actions are `role="menuitem"` entries inside a
  closed `Menu`, not top-level buttons; by static reading, this assertion would fail to locate its target once the pre-existing environment defect above is fixed and the suite can actually execute test bodies. Not verifiable end-to-end
  in this environment — the defect above blocks every test, including this one, before its body runs, confirmed identically in both Playwright runs. Not fixed here: the fix (opening the dropdown via `page.getByRole("button", {name:
  "More selection options"}).click()` before these two menuitem clicks) is confined to a test block this task's `Files Allowed To Modify` does not grant. Flagged for the coordinator or a follow-up task.

### Registry And Documentation Updates

- `F-SEARCH-INDEXERS`: `visual.status` demoted `accepted` -> `proposed`; the `2026-08-16` `acceptance` block removed (recoverable from Git history, not edited or re-dated) and replaced by a `note` naming this task, explaining the
  split-button structural change, and correcting the record to state that the "Indexer groups" subsection is legacy parity (citing `search-controller.js`'s `buildGroupSelectionActions`, rendered by `search.html`'s own split button and
  `multiselect-dropdown.html`) rather than a novel/unprecedented addition. `contract.geometry_checks` gained the split-button-plus-open-menu check, actually asserted in `search.spec.ts`. `contract.setup`/`states`/`viewports` otherwise
  unchanged. `visual.variances` left `[]`: after the coordinator's correction, neither the groups subsection nor the (now-corrected) icon choices are genuine parity deviations. `evidence` unchanged (`search.spec.ts`). `tests` gained
  `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx` (the file that actually asserts every bulk action's outcome). `selectors` left `[]` — confirmed no `data-testid` was added, removed, or renamed. `legacy_sources`
  (already correctly listing `search-controller.js`, `multiselect-dropdown.js`, and `search.html` from FM-016) was read and left untouched, per this packet's field-scoped `Files Allowed To Modify`. `target`, `parity`, `gaps`, `task`,
  `backlog` all confirmed unchanged and still accurate; none are in this packet's editable field scope. No human-acceptance metadata was fabricated, re-dated, or carried forward onto the new claim.
- The record's pre-existing geometry checks (dropdown indexer control spans its workspace region; checkbox indexer region is visible at desktop; indexer controls and page have no horizontal overflow) were reconfirmed still literally
  true of the current rendering by direct code reading (the split-button addition changed nothing about the dropdown/checkbox presentations themselves, which are explicitly Out Of Scope for this task) — Playwright evidence for this
  reconfirmation could not be produced in this environment; see Temporary Exceptions And Debt.
- ADR-0006 visual record: `applicability: applicable`; lifecycle transitioned `accepted` -> `proposed` (not `accepted`, not left `unassessed`); scoped `states`/`viewports`/`geometry_checks` present and one new check actually asserted;
  `evidence` present; no `snapshots` claimed for this record (it never used the optional field); `variances: []` (no unaccepted or fabricated variance introduced); human acceptance explicitly left pending — this handoff proposes a
  baseline, it does not and cannot accept one. No behavioral or accessibility gate was implied by this visual evidence: keyboard/ARIA accessibility was verified independently via the component's actual rendered roles/attributes and the
  passing component test, not via the (blocked) Playwright visual-evidence run.
- No `COMPONENTS.yaml` record applies (`Component IDs: None`; this task's Out Of Scope explicitly excludes extracting a shared component). No `APIS.yaml` record applies (`API IDs: None`).
- `STATUS.md`: inspected; already correctly lists `FM-037` under `## Review`. Not modified.

### Follow-Up Work

- Once the pre-existing black-hole-path backend config defect is fixed (tracked by FM-034/035/036 and this packet), rerun `npx playwright test tests/search.spec.ts` for real visual/functional evidence of this task's new geometry check
  and the record's existing checks, and obtain fresh human visual acceptance for `F-SEARCH-INDEXERS`.
- Fix `search.spec.ts`'s "should submit the explicit React indexer selection in both presentations" test to open the split-button dropdown before its `"Deselect all"`/`"Select group Secondary"` menuitem clicks (see Temporary Exceptions
  And Debt) — outside this task's file scope; needs either an amendment to this or a sibling packet's `Files Allowed To Modify`, or a small dedicated follow-up task.
- Consider a project-wide fix for the Playwright single-spec `test-results` cleanup hazard described in Temporary Exceptions And Debt (a `playwright.config.ts` change or a documented multi-spec re-run convention).
- Optionally reconcile the two logged-not-fixed minor divergences from legacy (coupled vs. independent usenet/torznab gating; `Select group {name}` vs. legacy's bare group-name label) in a future task, if exact legacy parity for these
  specific details is ever desired.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer may audit the proposed baseline and variances but cannot accept them; that remains
a human decision under ADR-0006.

## Fresh Review

### Review Identity

- Reviewer: fresh migration-reviewer context (this review)
- Role: fresh reviewer
- Reviewed revision: working tree at repository `HEAD` `87a81e043` (task-attributable diff via `git diff HEAD -- <allowed paths>`)
- Implementation handoff revision: retroactive handoff appended in this same task packet (Handoff section above)

### Acceptance And Evidence Audit

- **Action set/order matches legacy** — PASS. Read `core/ui-src/js/search-controller.js` lines 532-640 directly. `buildIndexerSelectionActions` builds `[Invert selection, Reset to preselection, Select all, Deselect all]`, then conditionally
  `[Select all usenet indexers, Select all torznab indexers]` when any TORZNAB indexer exists, then concatenates `buildGroupSelectionActions`. This is exactly the order in `SearchWorkspace.tsx`'s `IndexerSelectionButton`: `Invert selection`
  as the default `ButtonGroup` action, then in the `Menu`: `Reset to preselection`, `Select all`, `Deselect all`, conditional `Select all usenet indexers`/`Select all torznab indexers`, then conditional groups. `SearchWorkspace.test.tsx`
  asserts every action's actual selection outcome via `expectSelectedIndexerNames(...)` after each click, not merely menu-item presence, confirmed by reading the full diff.
- **`torznab` vs legacy `torrent` wording** — PASS, but with a citation caveat (see Findings). The wording is confirmed pre-existing (unchanged by this task's diff). However, independently reading `search-controller.js` lines 619-630 shows
  the real legacy label is already `'Select all torznab indexers'` — identical to the React wording. `'Select all torrent indexers'` only appears in the dead `indexer-selection-button.html` (confirmed dead below), the same wrong citation
  source the coordinator's correction already displaced for the groups/icon claims. The packet's Acceptance bullet 1 clause "(legacy says `torrent`)" is therefore itself inaccurate under the corrected citation — not a functional problem
  (the implementer changed nothing here and the wording is exact parity, which is a strictly better outcome than a tolerated variance), but the correction's scrutiny was not extended to this adjacent clause in the same bullet, in the same
  function, that the implementer had already read in full. Logged as a minor finding below.
- **Coordinator's mid-task correction (indexer groups is legacy parity; group icon mismatch)** — independently re-verified in full, confirmed correct:
  - `grep -rln "indexer-selection-button" core/ui-src/html/ core/ui-src/js/` → only the directive's own `.js`/`.html` files; a further targeted `grep -rn "indexer-selection-button" core/ui-src/html/` returned nothing, and
    `find core/ui-src -iname "*indexer-selection-button*"` found only the directive's own two files. It is never referenced as an element/attribute by any legacy HTML template — confirmed dead code.
  - `search-controller.js`'s `buildGroupSelectionActions` (line 532) and `buildIndexerSelectionActions` (line 580) read in full: every action carries a `glyphicon` `iconClass` (retweet/repeat/ok/remove/hdd/magnet/folder-open); groups are
    labeled `group: 'Indexer groups'` with `iconClass: 'glyphicon glyphicon-folder-open'`.
  - `search.html` lines 181-212 render this exact array as a real split button: a default first action plus an `additionalIndexerSelectionActions` dropdown with a divider and a `{{action.group}}` header ("Indexer groups") before the first
    group action — precisely the `Divider`/`ListSubheader` structure in `SearchWorkspace.tsx`.
  - `multiselect-dropdown.html` lines 13-19 render the same `actions` array with the identical divider/header-by-group behavior for the dropdown-mode indexer selector.
  - Conclusion: the "Indexer groups" subsection **is** legacy parity, and the group icon fix (`GroupsIcon` -> `FolderOpenIcon`) is correct and matches `glyphicon-folder-open` exactly. `visual.variances: []` (rather than a `proposed`
    variance) is the factually correct outcome of this corrected citation, not an under-disclosure. PASS.
- **Keyboard/ARIA accessibility** — PASS. Confirmed in the diff: the dropdown toggle carries `aria-haspopup="menu"`, `aria-expanded={open ? "true" : undefined}`, and a distinct `aria-label="More selection options"`; MUI's `Menu`/`MenuItem`
  render `role="menu"`/`role="menuitem"` by default. No `data-testid` was added, removed, or renamed (confirmed by diff — none existed on the old flat buttons, none exist on the new control); `FEATURES.yaml`'s `selectors: []` is unchanged,
  consistent with this. Icons are `@mui/icons-material` `SvgIcon`s, which are `aria-hidden` by default, so no duplicate/competing accessible name is introduced next to each `MenuItem`'s visible label text.
- **`F-SEARCH-INDEXERS` visual-record reconciliation** — PASS. Diff confirms `visual.status: accepted -> proposed`; the stale `2026-08-16` `acceptance` block is removed (recoverable via Git history, not edited/re-dated) and replaced with a
  `note` citing the corrected legacy source; a new `contract.geometry_checks` entry ("the indexer bulk-action split button is contained within the workspace indexer region, and its open dropdown menu renders with no menu or page
  horizontal overflow, at both desktop and mobile") is present and is actually asserted in `search.spec.ts` (verified below). No human-acceptance metadata is fabricated or carried forward — `variances: []` is the corrected, honest state,
  not a re-dated acceptance.
- **New geometry check actually asserted in `search.spec.ts`** — PASS. The diff adds, inside the existing per-viewport `desktop`/`mobile` loop in "should provide deterministic React workspace visual evidence across desktop and mobile"
  (immediately after the `dropdown-indexers-${viewport}` check): a bounding-box containment assertion of the `"More selection options"` toggle within `getByTestId("workspace-indexers")` (confirmed this test ID wraps the whole indexer
  region including the split button, at `SearchWorkspace.tsx` line 490-494/553-559), then opens the menu and calls `expectVisualGeometry` with region `bulk-indexer-actions-menu-${viewport}`, then closes with Escape. Read
  `tests/system/tests/visualEvidence.ts`'s `expectVisualGeometry`: it asserts both the locator's own `scrollWidth <= clientWidth` and the page `<html>`'s `scrollWidth <= clientWidth` — i.e., both "no menu overflow" and "no page overflow"
  are genuinely checked, matching the acceptance wording exactly.
- **Existing geometry checks reconfirmed still true** — PASS as a code-reading reconfirmation, honestly caveated as not backed by fresh Playwright evidence (the run was blocked; see below). The dropdown/checkbox indexer presentations
  are unchanged by this task's diff (only the trailing bulk-action controls were replaced), so the reconfirmation claim is credible on its face.
- **Playwright run claimed BLOCKED** — sanity-checked, internally consistent. `ls tests/system/test-results/visual-evidence/F-SEARCH-INDEXERS/` returns no such directory (exit 2) — no evidence PNGs exist for this record, consistent with a
  `beforeEach`-level block that never reached any `page.goto`. `visual.status` is correctly left `proposed`, not fabricated as `accepted` or backed by phantom evidence. Not re-run here per the review brief (nondeterministic/environment
  defect already documented three times over by FM-034/035/036; re-running would not change the outcome and is not required to establish any behavior this review needs).
- **`F-PLATFORM-SHELL` PNG side-effect and repair** — PASS. `tests/system/test-results/visual-evidence/F-PLATFORM-SHELL/{app-bar-desktop,app-bar-mobile}.png` both exist on disk (confirmed via `ls`, dated the claimed repair run), consistent
  with the claimed `npx playwright test tests/smoke.spec.ts` repair.
- **Pre-existing broken test in `search.spec.ts`** — confirmed genuinely broken and genuinely out of this task's file scope. Read lines 414-458: `"should submit the explicit React indexer selection in both presentations"` calls
  `page.getByRole("button", {name: "Deselect all"}).click()` and `page.getByRole("button", {name: "Select group Secondary"}).click()` directly, without opening the split button's dropdown first. Against the current markup these are
  `role="menuitem"` entries inside an initially-closed `Menu` (`role="menu"`, not rendered until the toggle is clicked), so a `getByRole("button", ...)` lookup for either would fail once the pre-existing black-hole-path defect is fixed
  and the suite can execute test bodies. This test sits well outside the "indexer bulk-action visual-evidence block" (which is confined to the `desktop`/`mobile` loop inside a different test, `"should provide deterministic React
  workspace visual evidence..."`, lines 221-419) that is this task's only licensed edit surface in `search.spec.ts`; fixing it would require editing a block this task is not permitted to touch. Correctly logged as a disclosed, unfixed,
  out-of-scope defect with a Follow-Up Work entry — treated here as a follow-up finding, not a required correction to FM-037.

### Verification-Basis Reconciliation

`sha256sum` on the three task-owned files matches the Verification Basis's file-content manifest exactly:
- `SearchWorkspace.tsx`: `86eca75c...` — match
- `SearchWorkspace.test.tsx`: `e7e2c827...` — match (unmodified from baseline `HEAD`, as claimed)
- `tests/system/tests/search.spec.ts`: `2778e987...` — match

Independently re-ran, in `core/ui-react`: `npm run typecheck` (clean, 0 diagnostics), `npm run lint` (0 errors, 6 warnings — identical file/line list to the handoff's claim, all pre-existing/unrelated), `npm run format:check` (fails
overall, same 9 files flagged, none within Files Allowed To Modify), `npm run test -- --run` (37 files / 183 tests passed, matching exactly), `npm run build` (1238 modules, same >500kB advisory, no errors), `npm run check:api` ("Generated
OpenAPI types are current"), `npm run validate:migration` ("Migration registries and task metadata are valid"). In `tests/system`: `npx tsc --noEmit` (no output, clean). All results match the handoff's Verification Evidence table exactly;
no discrepancy found. `git diff --check` at repository root: clean, no output.

### Scope Reconciliation

`git diff HEAD` confirms task-attributable changes are limited to exactly: `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, `SearchWorkspace.test.tsx`, `docs/frontend-migration/FEATURES.yaml` (only
`F-SEARCH-INDEXERS`'s `tests`/`visual` fields — `selectors` untouched at `[]`, `legacy_sources`/`target`/`parity`/`gaps`/`task`/`backlog` unchanged), and `tests/system/tests/search.spec.ts` (a single, contiguous insertion confined to the
indexer bulk-action portion of the `desktop`/`mobile` visual-evidence loop; the recent-search-menu block at lines ~351-361, outside that loop, is untouched, confirmed by diff and by grep for `recent-search`/`RecentSearches` in the file).
`docs/frontend-migration/STATUS.md` has zero diff against `HEAD` (`git diff HEAD -- STATUS.md` produces no output), confirming the packet's claim that FM-035 already fully reconciled it. All other working-tree changes
(`.claude/commands/fm-reconcile.md`, `RecentSearches.tsx`/`.test.tsx`, the untracked `FM-038` packet) are outside this task's attribution per the orchestrator's supplied classification and are not touched by, or attributed to, FM-037.

### Registry Reconciliation

`F-SEARCH-INDEXERS` accurately reflects current state: `target: core/ui-react/src/features/search` (unchanged, correct), `tests` now lists both the Playwright spec and the newly-relevant `SearchWorkspace.test.tsx` (accurate — that test is
what actually asserts the new control's behavior), `selectors: []` (accurate, no `data-testid` changed), `legacy_sources` already correctly lists `search-controller.js`/`multiselect-dropdown.js`/`search.html` from FM-016 and needed no
change (the correction is a re-reading of already-cited sources, not a new source). `visual.status: proposed`, `note` correctly cites the corrected chain, `contract.geometry_checks` gained one real, spec-asserted check,
`variances: []` is the corrected and honest state. No stale or fabricated human-acceptance metadata remains.

### Visual-Contract Audit (ADR-0006)

No evidence images exist for `F-SEARCH-INDEXERS` under `tests/system/test-results/visual-evidence/` (directory absent) because the required Playwright run never got past `beforeEach` — there is nothing to open and inspect for this
record, and none is claimed. This is consistent with `visual.status` correctly remaining `proposed` with no snapshots and no acceptance block. Deterministic setup, named viewports (`desktop`/`mobile`, matching the record's existing
`viewports`), and the new geometry check's evidence path (`search.spec.ts`, not a PNG — consistent with how this record's other geometry checks are asserted) are all present and scoped correctly. No baseline or variance acceptance is
supplied by this review; that remains a human decision under ADR-0006, and the handoff correctly does not claim to have made it.

### Findings

1. **Minor / cosmetic, not required.** The task packet's own Acceptance bullet 1 states the React `torznab` wording is retained where "legacy says `torrent`." Independently reading the corrected, actual legacy source
   (`search-controller.js` lines 619-630) shows legacy's real label is already `'Select all torznab indexers'` — identical to the React wording, not `torrent`. The `torrent` wording only exists in the dead
   `indexer-selection-button.html` (the same wrong citation source the mid-task correction already displaced for the groups/icon claims). The correction's re-verification, thorough as it was for groups/icons, did not extend to this
   adjacent clause in the same already-read function. No file needs changing — the current wording is exact parity, a strictly better outcome than the tolerated variance the packet assumed — but the packet's own stated premise is now
   known to be inaccurate and should be corrected the next time this packet or a related registry note is touched, to avoid future confusion about why the wording matches.
2. **Follow-up, not a required correction to FM-037.** `tests/system/tests/search.spec.ts`'s pre-existing `"should submit the explicit React indexer selection in both presentations"` test (line ~448-451) will fail once the pre-existing
   black-hole-path environment defect is fixed, because it targets `role="button"` for actions that are now `role="menuitem"` entries behind a closed dropdown. Confirmed by reading both the test and the current markup. Genuinely outside
   this task's `Files Allowed To Modify` for `search.spec.ts` (licensed only for the indexer bulk-action visual-evidence block). Already disclosed and logged as Follow-Up Work in the handoff; needs a small dedicated follow-up task or an
   amendment to a sibling packet's file scope, not action here.
3. **Minor / cosmetic, not required.** `search.spec.ts`'s single required Playwright run (`tests/search.spec.ts`) has a documented, reproducible side effect of clearing Playwright's default `outputDir` and deleting FM-035's gitignored
   `F-PLATFORM-SHELL` snapshots; correctly disclosed and correctly repaired (both PNGs confirmed present on disk). Flagged in the handoff as a general hazard for future single-spec Playwright runs in this repository; no action needed from
   this review beyond confirming the repair, which is confirmed.

### Resolution

- Finding 1: no file change required; recommend folding the corrected citation into the packet text or a future registry touch-up, no urgency.
- Finding 2: tracked as Follow-Up Work in this packet's Handoff; recommend a small dedicated follow-up task (or an amendment to `search.spec.ts`'s `Files Allowed To Modify` in a sibling packet) to fix the dropdown-opening step in the
  affected test once the black-hole-path environment defect is resolved.
- Finding 3: repair independently confirmed (`F-PLATFORM-SHELL` PNGs present); no further action needed for this task.
- Review disposition: **accepted**

### Overall Result

**PASS WITH MINOR FINDINGS.** All Acceptance criteria are satisfied. The mid-task correction (indexer-groups subsection and icon basis are legacy parity, not a novel addition) was independently re-verified in full against
`search-controller.js`, `search.html`, and `multiselect-dropdown.html`, and against `indexer-selection-button.js`'s confirmed dead-code status, and found to be correct. All required verification commands were independently re-run and
matched the handoff's Verification Evidence exactly, with file-content hashes matching the Verification Basis manifest. Scope is clean: only `Files Allowed To Modify` paths carry task-attributable changes, `STATUS.md` has zero diff, and
the shared `search.spec.ts` file's FM-038-owned block is untouched. The two disclosed, unfixed issues (the pre-existing broken indexer-selection test, and the Playwright single-spec `test-results` cleanup hazard) are genuinely outside this
task's licensed scope and are correctly logged as follow-up work rather than silently ignored or wrongly claimed as fixed. One additional minor citation inaccuracy (the packet's own "legacy says torrent" premise) was found during this
review and is logged above as non-blocking. No `ADR REQUIRED` condition applies; no unresolved fundamental architectural decision was made or required by this task.

### Coordinator Completion

- Coordinator: claude-sonnet-5, via `/fm-reconcile`
- Decision: Review accepted. Independently confirmed the mid-task legacy-citation correction (Indexer groups subsection and its `FolderOpenIcon` are legacy parity via `search-controller.js`, not a novel addition) before dispatching the
  reviewer, who then independently re-verified it a second time and caught a further residual citation nuance (the "torznab vs legacy torrent" wording claim was itself based on the same wrong source; current wording is exact parity).
  All findings are minor/follow-up, none blocking. The pre-existing broken `search.spec.ts` test (targets removed top-level buttons) and the Playwright `test-results` cleanup hazard are both genuinely outside this task's file scope;
  logged as follow-up work. Marked `done`.
- Decision revision/date: 2026-08-16
