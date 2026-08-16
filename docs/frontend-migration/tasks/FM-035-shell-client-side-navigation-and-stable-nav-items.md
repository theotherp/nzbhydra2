# FM-035: Shell Client-Side Navigation And Layout-Stable Nav Items

Status: done Owner: live user session (out-of-band; reconciled via `/fm-reconcile`) Feature IDs: F-PLATFORM-SHELL, F-STATS-SHELL Component IDs: C-APP-SHELL API IDs: None Depends on: None Blocks: None

## Dependency Notes

This work was implemented interactively in a live user session, outside the normal `planned -> ready -> in_progress` promotion, and is recorded here after the fact. It is one of four retroactive packets (FM-035 through FM-038) reconciling
the single uncommitted working tree found at baseline `4e64b8f3f` (FM-034). It is the first of the four in commit and review order and shares no file with the other three, so its ownership never overlaps theirs. It is filed in `review`
because the implementation exists but has had no handoff, no independent review, and no fresh human visual acceptance. The `@mui/icons-material` dependency addition in that same working tree is coordinator-owned tooling, not this packet's.

## Outcome

Moving between shell destinations — the AppBar navigation and the statistics tab bar — navigates inside the React router instead of triggering a full page load, and selecting a navigation item no longer changes that item's box size or
shifts its neighbors sideways.

## Boundary Rationale

Both changes are the same control (the shell navigation item) on the same render path, and together deliver one user-observable result: shell navigation is instant and the navigation bar does not jump when the selection changes. Splitting
the router substitution from the width-stability fix would split one control by layer, which the task rules forbid; the width defect is only visible because selection is now cheap enough to exercise repeatedly. `StatsShell` carries the
identical `component={Link}` substitution across the same runtime boundary, so giving it its own packet would be a file split, not a capability split. The three sibling packets are separate capabilities with their own feature records and no
shared files: FM-036 changes when a search submits, FM-037 and FM-038 restructure two independent search-workspace controls that each carry their own accepted visual contract.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0006 (semantic visual parity), ADR-0007 (branded theme tokens and the primary-green affordance).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/app/AppShell.tsx` and `AppShell.test.tsx`
- `core/ui-react/src/features/stats/StatsShell.tsx` and `StatsShell.test.tsx`
- `tests/system/tests/smoke.spec.ts` — only the `F-PLATFORM-SHELL` navigation geometry evidence block
- `docs/frontend-migration/FEATURES.yaml` — only `F-PLATFORM-SHELL`'s `visual` record and `F-STATS-SHELL`'s `tests` field
- `docs/frontend-migration/STATUS.md` and this task packet

No file above is shared with FM-036, FM-037, or FM-038.

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/package.json` and `package-lock.json` (the `@mui/icons-material` addition): coordinator-owned tooling, committed separately
- Content of the not-yet-migrated destinations, `MigrationPlaceholder` itself, `core/ui-react/src/router.tsx`, footer branding, and live status
- `COMPONENTS.yaml` and `C-APP-SHELL`'s classification, target, or ownership
- Any other feature's visual record, and `GUI-STATUS.md` (a coordinator write)

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0006`, `ADR-0007`
- `F-PLATFORM-SHELL`, `F-STATS-SHELL`, `C-APP-SHELL`; the FM-004, FM-020, and FM-031 packets
- `core/src/main/java/org/nzbhydra/web/MainWeb.java` (the mappings that serve the React shell for `/`, `/config/**`, `/system/**`, `/stats/**`)
- `core/ui-react/src/router.tsx` (`routerBasePath`, the route tree, `MigrationPlaceholder`)
- `tests/system/tests/smoke.spec.ts` and `tests/system/tests/visualEvidence.ts`
- `core/ui-src/html/states/header.html` and `core/ui-src/html/states/stats.html` (legacy navigation semantics)

## Acceptance

- Every AppBar navigation item and every statistics tab renders through TanStack Router's `Link` with a router-relative `to`, and no longer derives an absolute `href` from `bootstrap.baseUrl`. Base-URL correctness comes from the router's
  `basepath` (`routerBasePath` in `router.tsx`); this is demonstrated for a non-root base URL, not only for `/`.
- Navigating to a not-yet-migrated destination (`/config/main`, `/system/control`, the statistics tabs) stays client-side and lands on the existing `MigrationPlaceholder`, and a deep link or reload of those same paths still serves the React
  shell. `MainWeb.java`'s `/`, `/config/**`, `/system/**`, and `/stats/**` mappings are cited as the evidence for the second half of that claim.
- A navigation item occupies the same box whether or not it is the current route: the indicator border is always present with only its color toggling, and the label reserves its bold width, so the item's bounding-box width and its siblings'
  x positions are identical in both states. The width-reserving label copy is `aria-hidden` and does not duplicate the item's accessible name or its text content for assertions.
- `aria-current="page"` on the active item, and its computed `border-bottom-color` of `rgb(15, 171, 75)`, are unchanged. `smoke.spec.ts`'s existing navigation checks (link roles, horizontal alignment of items, absence of horizontal overflow)
  still pass without being relaxed.
- Component tests cover both the client-side link rendering and the state-independent item width. The `@tanstack/react-router` test double must not reduce either assertion to a tautology — it renders what the real `Link` renders for the
  assertion to mean anything.
- `F-PLATFORM-SHELL` visual record: the reviewed navigation geometry changed and the accepted `snapshots` were captured against the previous rendering, so `visual.status` goes `accepted` -> `proposed`, its `2026-08-16` `acceptance` block is
  removed and replaced by a `note` naming this task and stating exactly what changed (the FM-034 precedent), a state and a deterministic geometry check for width stability (an item's width is identical active and inactive) are added to
  `contract` and actually asserted in `smoke.spec.ts`, and both snapshots are regenerated from that run. The existing primary-green variance's `status` must move `accepted` -> `proposed` in the same change, because `validate-migration.mjs`
  rejects an accepted variance on a non-accepted record; ADR-0007's own accepted token decision is unaffected and this must be said in the `note`. No human-acceptance metadata is fabricated, re-dated, or carried onto the new claim.
- `F-STATS-SHELL`: `visual.status` remains `unassessed` — this task creates no visual claim for it. Its `tests` list is extended with `core/ui-react/src/features/stats/StatsShell.test.tsx`, or explicitly confirmed already accurate.
- `C-APP-SHELL` is explicitly confirmed unchanged (responsibility, target, classification, state, task ownership); `COMPONENTS.yaml` is not modified.

## Verification

- Prerequisites: `node_modules` must match the coordinator-owned lockfile that adds `@mui/icons-material`; run the cheapest install that guarantees this and record which install ran and why.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after a matching production build (`VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`): `npx playwright test tests/smoke.spec.ts`. The two `Branded app shell visual evidence`
  specs must pass and regenerate `F-PLATFORM-SHELL`'s PNGs. Per FM-034, the unrelated `should load the application shell` spec fails in this environment on a pre-existing black-hole-path config defect; record that as blocked with its
  evidence, never as passed, and never work around it by weakening a gate.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`. Because the implementation
predates this packet, the handoff is recorded retroactively against the existing working tree: it must describe what is actually there, close any acceptance gap it finds, and never restate an unrun command as passed.

## Handoff

### Outcome

- The router-substitution implementation this packet describes already existed in the working tree, built interactively in a live user session before this packet was written: every AppBar navigation item and every `StatsShell` tab already
  rendered through TanStack Router's `Link` with a router-relative `to` (`AppShell.tsx`'s `navigationTo()` returns `/${path}`; `StatsShell.tsx` uses `` `/stats/${tab.path}` ``), neither derives an absolute `href` from `bootstrap.baseUrl`,
  and base-URL correctness already comes solely from `router.tsx`'s `routerBasePath`/`createRouter({basepath: ...})`. The width-stability fix also already existed: `navigationItemSx()` always renders the indicator border (`transparent`
  when inactive, `primary.main` when active) instead of adding/removing it, and `NavigationLabel` stacks a hidden, always-bold, `aria-hidden` reservation copy of the label under the real visible copy in the same CSS grid cell, so a nav
  item's box width is identical whether it is active or not.
- This handoff's actual work was closing three verification/registry gaps the existing implementation had not yet closed: (1) no component test asserted the width-stability mechanism itself (only the pre-existing active-color test
  existed); (2) `smoke.spec.ts` had no geometry check proving width stability in a real browser; (3) `FEATURES.yaml`'s `F-PLATFORM-SHELL` visual record still carried its prior `accepted` status and human `acceptance` block evidenced
  against the pre-fix geometry, and `F-STATS-SHELL`'s `tests` field did not list `StatsShell.test.tsx`.
- Added `AppShell.test.tsx`: "should reserve identical border and label geometry for a nav item whether it is active or inactive" — asserts (a) `borderBottomWidth`/`borderBottomStyle` are identical between the active and inactive item
  (only `borderBottomColor` differs, proving the border is always reserved rather than conditionally added), and (b) both items render a hidden `[aria-hidden="true"]` reservation element whose text equals the item's own accessible name
  (not a fixed stand-in) and whose computed `font-weight` is `700`, while the item's own `toHaveAccessibleName` is unaffected — a real, non-tautological check against the rendered DOM, not the component's own `sx` values.
- Added `StatsShell.test.tsx` assertions that two tabs' `href` equals their router-relative `to` (`/stats/indexers`, `/stats/notifications`) verbatim, with no `/hydra` baseUrl prefix — demonstrating the router substitution for stats tabs too,
  using the same non-root `bootstrap.baseUrl: "/hydra/"` the test already used.
- Added a width-stability geometry check to `tests/system/tests/smoke.spec.ts`'s existing `Branded app shell visual evidence` desktop block: captures the default-active "Search" item's bounding-box width, clicks a different top-level nav
  item (a real client-side navigation), then asserts Search's own bounding-box width is unchanged now that it is inactive (`toBeCloseTo`, 0 decimal digits). This is the only change to that file, confined to the block this packet's `Files
  Allowed To Modify` names.
- Reconciled `FEATURES.yaml`: `F-PLATFORM-SHELL.visual.status` `accepted` -> `proposed`; the `2026-08-16` `acceptance` block removed and replaced with a `note` naming this task, explaining the geometry change, and stating ADR-0007's own
  `primary`-token acceptance is not reopened; `contract.states` gained `nav-item-width-stable-across-active-state`; `contract.geometry_checks` gained the width-stability bullet actually asserted in `smoke.spec.ts` above; both PNG snapshots
  regenerated by the passing Playwright run; the existing primary-green variance's `status` moved `accepted` -> `proposed` in the same change (required by `validate-migration.mjs`'s rule that an accepted variance needs an accepted parent
  record with human-acceptance metadata). `F-STATS-SHELL.tests` extended with `core/ui-react/src/features/stats/StatsShell.test.tsx`; its `visual.status` was already `unassessed` and remains so — no visual claim created here.
- One real, unplanned gap found and fixed during verification: `npm run format:check` failed, flagging `AppShell.tsx` and `AppShell.test.tsx` (both within `Files Allowed To Modify`) among 13 files. Ran `npx prettier --write` on exactly
  those two files (verified formatting-only via unchanged test count, unchanged typecheck/lint/build results, and direct content inspection showing only line-wrap differences); the other 11 flagged files belong to sibling FM-036/037/038
  tasks or are pre-existing unrelated dev tooling (`README.md`, `tsconfig.json`, `vite/devBackend.*`) and were left untouched, per scope.

### Files Modified

- `core/ui-react/src/app/AppShell.tsx` — formatting-only (`npx prettier --write`); no behavioral change. Implementation itself predates this packet.
- `core/ui-react/src/app/AppShell.test.tsx` — added the width-stability component test described above (plus the same formatting pass).
- `core/ui-react/src/features/stats/StatsShell.tsx` — unchanged; implementation predates this packet, confirmed still correct.
- `core/ui-react/src/features/stats/StatsShell.test.tsx` — added the two `href` assertions described above.
- `tests/system/tests/smoke.spec.ts` — added the width-stability geometry check, confined to the `F-PLATFORM-SHELL` navigation geometry evidence block.
- `docs/frontend-migration/FEATURES.yaml` — `F-PLATFORM-SHELL.visual` and `F-STATS-SHELL.tests` only, as described above.
- `docs/frontend-migration/STATUS.md` — inspected, already correctly lists this task under `## Review`; not modified.
- This task packet — this Handoff section.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`. The working tree also contains pre-existing, unrelated changes this task did not create or touch: `core/ui-react/src/features/search/SearchPage.tsx`
  /`SearchPage.test.tsx`, `core/ui-react/src/features/search/history/RecentSearches.tsx`/`RecentSearches.test.tsx`, `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`/`SearchWorkspace.test.tsx` (sibling FM-036/FM-038
  in-flight work), the untracked `docs/frontend-migration/tasks/FM-036-*.md`/`FM-037-*.md`/`FM-038-*.md` packets, `.claude/commands/fm-reconcile.md`, and `core/ui-react/package.json`/`package-lock.json` (`@mui/icons-material`, coordinator-owned
  per Out Of Scope). None were created, edited, staged, or committed by this task.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Playwright (`npx playwright test`) driving the two `F-PLATFORM-SHELL` visual-evidence specs against a production Vite build; `prettier` (via `npm run format:check` / `npx prettier --write`) for the formatting fix.

### Verification Evidence

| Working directory                                                                                       | Command                                      | Result                                                                                                                                                                                                                     |
|-----------------------------------------------------------------------------------------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `core/ui-react`                                                                                            | `npm ls @mui/icons-material --depth=0`         | Confirmed `@mui/icons-material@7.3.9`, matching `package.json`/`package-lock.json` exactly. No install run: `node_modules` already matched the lockfile.                                                                |
| `core/ui-react`                                                                                            | `npx prettier --write src/app/AppShell.tsx src/app/AppShell.test.tsx` | Applied once (formatting-only); rerun on the final tree reported both files `(unchanged)`, confirming the fix is stable.                                                                                                 |
| `core/ui-react`                                                                                            | `npm run typecheck`                            | Passed: `tsc --noEmit`, zero diagnostics.                                                                                                                                                                                 |
| `core/ui-react`                                                                                            | `npm run lint`                                 | Passed: 0 errors, 6 warnings, all pre-existing and in files outside this task's scope (`SearchWorkspace.tsx`, `IndexerStatusesPage.tsx`, `router.tsx`).                                                                  |
| `core/ui-react`                                                                                            | `npm run format:check`                         | Failed overall (exit 1): 11 files flagged, none within `Files Allowed To Modify` (sibling-task or pre-existing unrelated files — see Temporary Exceptions). `AppShell.tsx`/`AppShell.test.tsx` confirmed absent from the flagged list. Scoped `npx prettier --check` on exactly this task's 4 `core/ui-react` files passes. |
| `core/ui-react`                                                                                            | `npm run test -- --run`                        | Passed: 37 test files, 182 tests (includes the new `AppShell.test.tsx` and `StatsShell.test.tsx` assertions).                                                                                                            |
| `core/ui-react`                                                                                            | `npm run build`                                | Passed: 1238 modules transformed; only the pre-existing >500kB chunk-size advisory.                                                                                                                                       |
| `core/ui-react`                                                                                            | `npm run check:api`                            | Passed: "Generated OpenAPI types are current."                                                                                                                                                                            |
| `core/ui-react`                                                                                            | `npm run validate:migration`                   | Passed: "Migration registries and task metadata are valid."                                                                                                                                                               |
| `tests/system`                                                                                              | `npx tsc --noEmit`                             | Passed, no diagnostics.                                                                                                                                                                                                   |
| `core/ui-react`                                                                                             | `VITE_OUT_DIR=../target/classes/static/react npm run build` | Passed: production build for Playwright written to `core/target/classes/static/react`.                                                                                                                                   |
| `tests/system`                                                                                              | `npx playwright test tests/smoke.spec.ts`      | 2/3 passed. Both `Branded app shell visual evidence` specs (desktop, mobile) passed and regenerated `F-PLATFORM-SHELL`'s two PNGs (fresh timestamps confirmed). `should load the application shell` failed on the pre-existing, unrelated black-hole-path backend config defect (`Configuration validation errors: Torrent black hole folder c:\temp\blackhole is not absolute, NZB black hole folder c:\temp\blackhole is not absolute`), matching the FM-034-documented precedent — recorded as blocked, not passed, not worked around. |
| repository root                                                                                            | `git status --porcelain -- tests/system/test-results` | Empty: visual-evidence PNGs are untracked/gitignored; no unrelated snapshot was touched by the Playwright run.                                                                                                           |
| repository root                                                                                            | `git diff --check`                             | Passed, no output.                                                                                                                                                                                                        |

### Verification Basis

- Baseline: `4e64b8f3f` ("FM-034: Search Results Inline Column Filters, Legacy-Width Layout, And Row Performance", the repository HEAD at the start of this session).
- Command coverage:
  - `npm run typecheck && npm run lint && npm run test -- --run && npm run build && npm run check:api`: `core/ui-react/src/app/AppShell.tsx`, `core/ui-react/src/app/AppShell.test.tsx`, `core/ui-react/src/features/stats/StatsShell.tsx`,
    `core/ui-react/src/features/stats/StatsShell.test.tsx`.
  - `npx tsc --noEmit` (tests/system) and `npx playwright test tests/smoke.spec.ts`: `tests/system/tests/smoke.spec.ts` (the Playwright run also directly exercises the rendered behavior of `AppShell.tsx` in a real browser).
  - `npm run validate:migration`: `docs/frontend-migration/FEATURES.yaml` and this task packet (documentation/registry-only; excluded from the file-content manifest below per template instruction, matching the FM-034 precedent).
  - `npm run format:check` / scoped `npx prettier --check`: the same four `core/ui-react` files listed above.
- File-content manifest (current on disk; matches what the passed commands above verified, computed after the Prettier fix):
  - `core/ui-react/src/app/AppShell.tsx: dcb6349edbc50cc5fd2d91d20b027ffb98b0dc547d6d8d64d56d4dce27624ab6`
  - `core/ui-react/src/app/AppShell.test.tsx: 326eb55a29859931cfe8df8304d103ed2f76fd6935662ef4910613eb57e68c08`
  - `core/ui-react/src/features/stats/StatsShell.tsx: db0066e6c6212688bd0a61b401be111781aef768cfda8bbbdfd038604d4e80ca`
  - `core/ui-react/src/features/stats/StatsShell.test.tsx: d9d9080498ee6a3b606e18df08a9e4dccef6826bd824eee3a4167555363a3699`
  - `tests/system/tests/smoke.spec.ts: 0252a45c8f83a5913505d8431f7bdb107cda697fab22167046980f9a0dd254ae`
- Completed after the last change to each command's listed files: yes. The full sequence (dependency check, Prettier fix, then every command above in order through the Playwright run) was executed fresh, end-to-end, in one continuous pass
  after the Prettier fix, which was itself the last edit to any implementation/test file.
- Task-owned changes after verification: `None` on implementation or test files. This task packet's Handoff section was written after this verification run, as is conventional; no command needs rerunning because of it.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None. `package.json`/`package-lock.json` untouched by this task; the `@mui/icons-material` addition already present in the working tree is coordinator-owned tooling per Out Of Scope.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0002 (MUI-only presentation): followed. The `Link` substitution is `component={Link}` injected into the existing MUI `ListItemButton`/`Tab` components; no non-MUI primitive was introduced.
- ADR-0006 (semantic visual parity): followed. `F-PLATFORM-SHELL`'s reviewed navigation geometry changed (client-side `Link` substitution plus the width-stability fix), so its `visual.status` was demoted `accepted` -> `proposed` with the
  prior human `acceptance` removed and replaced by a `note`, a new geometry check was added to `contract` and actually asserted in `smoke.spec.ts` before the record was touched, and both snapshots were regenerated from that passing run.
  No baseline or variance was self-accepted; human visual re-acceptance is left to a fresh reviewer/coordinator per the Fresh Review section below.
- ADR-0007 (branded theme tokens): followed, and explicitly not reopened. The primary-green variance's `status` was moved `accepted` -> `proposed` only because `validate-migration.mjs` rejects an accepted variance on a non-accepted visual
  record; ADR-0007's own Human Decision accepting the `primary` = logo-green `#0fab4b` token is unaffected, and the `note` says so explicitly.
- `ADR REQUIRED` proposal triggered during this task: None. All decisions here are conventional, reversible implementation/registry-reconciliation choices within the existing accepted ADRs, not a new architectural commitment.

### Assumptions

- The pre-existing `AppShell.tsx`/`StatsShell.tsx` implementation (Link substitution, always-present border, hidden bold-width reservation) was built correctly in the prior live session and needed no behavioral changes — verified by reading
  both files in full against every acceptance bullet, not merely trusted.
- The Prettier fix to `AppShell.tsx`/`AppShell.test.tsx` is formatting-only: confirmed by an unchanged passing test count (182/182) before and after, unchanged `typecheck`/`lint`/`build` results, `format:check`'s flagged-file list dropping
  exactly these two files with no new files appearing, and direct before/after content inspection showing only line-wrap differences (e.g. `<NavigationLabel .../>` and a `querySelector` call each wrapped across lines).
- `npm run format:check`'s remaining non-zero exit is attributable entirely to files outside `Files Allowed To Modify` (sibling FM-036/037/038 in-flight files, plus pre-existing unrelated dev tooling/config: `README.md`, `tsconfig.json`,
  `vite/devBackend.ts`/`devBackend.test.ts`) — confirmed by name-by-name inspection of the flagged list both before and after the fix.
- `should load the application shell`'s failure is the same pre-existing, environment-local backend config defect FM-034 already documented (a Windows-style black-hole-path default rejected as non-absolute), not a regression introduced
  here — based on the error text matching verbatim and the defect being unrelated to any file this task touches.

### Temporary Exceptions And Debt

- `npm run format:check` cannot exit 0 as a whole in this shared working tree: 11 files outside `Files Allowed To Modify` remain unformatted (sibling FM-036/037/038 files, plus pre-existing unrelated dev tooling). Not fixed here since doing
  so would mean editing files owned by other tasks or unrelated pre-existing work. Impact: the package-level gate does not exit 0, though every FM-035-owned file is individually confirmed Prettier-clean. Removal condition: FM-036/037/038
  complete and format their own files (or a coordinator-level formatting pass covers the unrelated pre-existing files); tracking reference: this task packet and the sibling FM-036/037/038 packets.
- `tests/system/tests/smoke.spec.ts`'s unrelated `should load the application shell` spec fails on the pre-existing black-hole-path backend config defect described above. Not fixed here: outside `Files Allowed To Modify` (which limits this
  task's edits to only the `F-PLATFORM-SHELL` navigation geometry evidence block) and outside this task's Boundary Rationale. Removal condition: fix the environment's saved default downloader config (or the fixture's platform-specific path
  assumption), matching the FM-034-recorded follow-up.

### Registry And Documentation Updates

- `F-PLATFORM-SHELL`: `visual.status: accepted` -> `proposed`. `contract.states` gained `nav-item-width-stable-across-active-state`; `contract.geometry_checks` gained the width-stability bullet, actually asserted in `smoke.spec.ts`. The
  `2026-08-16` `acceptance` block was removed (it evidenced the pre-fix geometry and would misrepresent status if left attached to a `proposed` record) and replaced with a `note` naming this task, describing exactly what changed (client-side
  `Link` navigation plus the always-reserved border/label-width mechanism), and stating ADR-0007's own `primary`-token acceptance is unaffected. The existing primary-green variance's `status` moved `accepted` -> `proposed` in the same
  change, required by `validate-migration.mjs`'s rule (an accepted variance requires an accepted parent record with human-acceptance metadata); its `description` is otherwise unchanged. Both `snapshots` PNGs were regenerated by the passing
  Playwright run. `evidence` (`tests/system/tests/smoke.spec.ts`) unchanged. `task: FM-004` and `gaps`/`backlog` unchanged — this task does not reassign feature ownership, matching the FM-028/FM-034 precedent of updating `visual` without
  reassigning `task`. No human-acceptance metadata was fabricated, re-dated, or carried onto the new claim.
- `F-STATS-SHELL`: `visual.status` remains `unassessed` — unchanged; this task creates no visual claim for it. `tests` extended with `core/ui-react/src/features/stats/StatsShell.test.tsx` (additive; no existing entry removed). `target`,
  `state`, `task` (`FM-020`), `gaps`, and `backlog` all confirmed unchanged and still accurate.
- `C-APP-SHELL` (`COMPONENTS.yaml`): confirmed unchanged and still accurate — `responsibility` ("Responsive application frame, navigation, permissions, route outlet, and footer"), `target` (`core/ui-react/src/app`), `classification`
  (`shared_hydra`), `state` (`partial`), `task` (`FM-031`) all read against the current file and left untouched, per Out Of Scope. `COMPONENTS.yaml` was not modified.
- No other `FEATURES.yaml`, `COMPONENTS.yaml`, or `APIS.yaml` record was touched.
- `STATUS.md`: inspected; already correctly lists this task under `## Review`. Not modified.
- For the ADR-0006 visual record: `applicability: applicable` (unchanged); lifecycle transition `accepted` -> `proposed` as described above; scoped `states`/`viewports`/`geometry_checks` updated as described; `evidence` and regenerated
  `snapshots` recorded; the sole variance's disposition moved `accepted` -> `proposed` alongside the record for the schema reason stated in its `note`, not because the token itself is reconsidered; human acceptance is pending — no
  `acceptance` block exists on this record now, and none was fabricated. This task implies no behavioral or accessibility gate from the visual evidence: `aria-current`, accessible names, and the border-color/geometry checks are asserted
  independently in both the component tests and `smoke.spec.ts`, not inferred from the screenshots.

### Follow-Up Work

- Fresh human visual acceptance of `F-PLATFORM-SHELL`'s `proposed` baseline (the regenerated `app-bar-desktop.png`/`app-bar-mobile.png`), per ADR-0006 — outside this implementer's authority.
- Fix the environment's pre-existing black-hole-path backend config defect blocking `should load the application shell` (see Temporary Exceptions), matching the FM-034-recorded follow-up; not yet tracked in a dedicated task packet.
- Once sibling tasks FM-036/037/038 land, a repository-wide `npm run format:check` should pass again; no action needed from FM-035 itself.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer may audit the proposed `F-PLATFORM-SHELL` baseline but cannot supply the human
visual acceptance it now requires; that remains a separate human decision under ADR-0006.

### Review Identity

- Reviewer: fresh review agent (`/fm-reconcile`-invoked independent reviewer, no prior context on this task)
- Role: fresh reviewer
- Reviewed revision: uncommitted working tree on branch `newUi2026`, HEAD `0227eeb0d` (baseline `4e64b8f3f`, confirmed an ancestor of HEAD via `git merge-base --is-ancestor`)
- Implementation handoff revision: same uncommitted working tree (handoff recorded retroactively against it, per this packet's Dependency Notes)

### Acceptance And Evidence Audit

- **Router-`Link` substitution / no `bootstrap.baseUrl`-derived href.** Read `AppShell.tsx`'s `navigationTo()` (`` return `/${path}` ``) and `StatsShell.tsx`'s tab `to` (`` `/stats/${tab.path}` ``): both are router-relative strings, neither touches `bootstrap.baseUrl`. `router.tsx` confirms `createRouter({basepath: routerBasePath(bootstrap.baseUrl), routeTree})`, so TanStack Router resolves the base path centrally. `AppShell.test.tsx` and `StatsShell.test.tsx` both exercise this against a non-root `bootstrap.baseUrl: "/hydra/"`. **PASS.**
- **Not-yet-migrated destinations stay client-side; deep link/reload still serves the React shell.** `router.tsx`'s route tree has no `config/main` or `system/control` route, so those `Link`s resolve to the router's own `notFoundComponent` (`MigrationPlaceholder`) client-side. `MainWeb.java` (read directly, lines 37-71) maps `/`, `/config/**`, `/system/**`, and `/stats/**` all to `shell(request)`, confirming a reload/deep link of those paths still serves the React shell. **PASS.**
- **Width-stability mechanism.** `navigationItemSx()` always sets `borderBottom`/`borderLeft: "3px solid"` with only `borderBottomColor`/`borderLeftColor` toggling (`primary.main` vs `"transparent"`) — the border is never conditionally added/removed. `NavigationLabel` stacks two `Typography` copies in the same CSS grid cell (`gridArea: "1 / 1"`): a `visibility: hidden`, always-`fontWeight: 700`, `aria-hidden` reservation copy that renders the item's own `label` text (not a fixed stand-in), and the real visible copy that only toggles `color`/`fontWeight` (never resized). Confirmed the hidden copy does not duplicate the accessible name: `AppShell.test.tsx`'s new test asserts `toHaveAccessibleName` on the link itself is unaffected while the hidden element's own text is separately checked. **PASS.**
- **`aria-current`/border color unchanged; existing `smoke.spec.ts` checks not relaxed.** Theme's `primary.main` is `#0fab4b` = `rgb(15, 171, 75)`, matching the existing assertion, left untouched. Diffed `smoke.spec.ts` against baseline: the new block is purely additive at the end of the `desktop` branch, after the existing link-role/horizontal-alignment/overflow/border-color assertions, none of which were edited or weakened. **PASS.**
- **Component tests non-tautological.** `AppShell.test.tsx`'s new test asserts computed `borderBottomWidth`/`borderBottomStyle` equality and `borderBottomColor` inequality between rendered active/inactive links, plus that each link's own hidden-reservation element's text equals that link's own accessible name (not a hardcoded string) and its computed `fontWeight` is `700` — genuine DOM/computed-style assertions, not restatements of `sx` props. `StatsShell.test.tsx` asserts rendered `href` equals the router-relative `to` verbatim, with no `/hydra` prefix, against a non-root `bootstrap.baseUrl`. Both mocked `Link` doubles map `to` into a real `href`/anchor rather than echoing an assertion back at itself. **PASS.**
- **`smoke.spec.ts` geometry check.** Confirmed a real Playwright click (`await otherLink.click()`) on a different top-level nav item, `aria-current` reassertion, and a `boundingBox().width` comparison (`toBeCloseTo`, 0 decimals) between the active and now-inactive "Search" item. The whole block sits inside the pre-existing `if (viewport === "desktop")` branch of the existing `Branded app shell visual evidence` test, after the screenshot capture, so it does not affect the captured PNGs. This is the only hunk in the file's diff from baseline. **PASS.**
- **`F-PLATFORM-SHELL` registry reconciliation.** `visual.status` moved `accepted` → `proposed`; the prior `2026-08-16` `acceptance` block was deleted outright (not edited/re-dated) and replaced with a `note` naming FM-035, describing exactly what changed, and explicitly stating ADR-0007's own token acceptance is not reopened; `contract.states` gained `nav-item-width-stable-across-active-state` and `contract.geometry_checks` gained the width-stability bullet, which is actually asserted in `smoke.spec.ts` (verified above); the sole `primary`-green variance's `status` also moved `accepted` → `proposed` in the same change (required because `validate-migration.mjs` rejects an accepted variance on a non-accepted parent record — confirmed by `npm run validate:migration` passing); both PNGs under `tests/system/test-results/visual-evidence/F-PLATFORM-SHELL/` have fresh timestamps (`19:41:55`, ~7 minutes before this review, well after `HEAD`'s commit time `19:24:11`). No `accepted_by`/`accepted_on` metadata survived onto the new record. **PASS.**
- **Visual evidence images.** Opened both regenerated PNGs directly (not just their metadata/hashes). `app-bar-desktop.png`: dark AppBar, logo, "NZBHydra2" wordmark, four nav items ("Search" bold green with a green underline as the active item; "History & Stats", "Config", "System" in muted gray), horizontally aligned, no visible overflow or misalignment. `app-bar-mobile.png`: "Menu" affordance, logo, wordmark, consistent dark branding. Both read as expected and consistent with the described mechanism — no visual defect. **PASS** (visual quality only; human ADR-0006 acceptance is explicitly out of this reviewer's authority and is not granted here).
- **`F-STATS-SHELL`.** `visual: { applicability: applicable, status: unassessed }` is byte-identical before and after (confirmed via diff — only the `tests` line changed in this record). `tests` gained `core/ui-react/src/features/stats/StatsShell.test.tsx`, additively. **PASS.**
- **`C-APP-SHELL`/`COMPONENTS.yaml`.** `git diff 4e64b8f3f -- docs/frontend-migration/COMPONENTS.yaml` is empty. **PASS.**

**Verification-basis reconciliation.** Recomputed `sha256sum` for all five files named in the Verification Basis manifest; every hash matches exactly what the handoff recorded (`AppShell.tsx`, `AppShell.test.tsx`, `StatsShell.tsx`, `StatsShell.test.tsx`, `smoke.spec.ts`) — no drift since the recorded run. Independently reran, from a fresh shell, in the working tree as-is: `npm run typecheck` (0 diagnostics), `npm run lint` (0 errors / 6 warnings, all in out-of-scope files), `npm run test -- --run` (37 files / 182 tests passed), `npm run build` (1238 modules, same pre-existing >500kB advisory), `npm run check:api` (current), `npm run validate:migration` (valid), and `npx tsc --noEmit` in `tests/system` (clean) — every result matches the handoff's Verification Evidence table. Did not rerun the Playwright production-build pass (expensive per the review contract); the claim is internally consistent with the FM-034-documented precedent (verbatim-matching black-hole-path error text and identical "2/3 passed" pattern recorded in `FM-034-search-results-filter-layout-and-performance.md`), and both PNGs have fresh, plausible timestamps.

**Scope reconciliation.** All five files with real diffs from baseline (`AppShell.tsx`, `AppShell.test.tsx`, `StatsShell.tsx`, `StatsShell.test.tsx`, `smoke.spec.ts`, `FEATURES.yaml`, `STATUS.md`) are within `Files Allowed To Modify`, **with one exception**: see Findings below — `FEATURES.yaml`'s diff also contains a whitespace-only reindentation of two `geometry_checks` list items under the unrelated `F-SEARCH-SORT-FILTER` record (lines ~229-233), outside "only `F-PLATFORM-SHELL`'s `visual` record and `F-STATS-SHELL`'s `tests` field." `COMPONENTS.yaml` is untouched. `STATUS.md`'s diff only adds this task and its declared siblings (FM-036/037/038) to `## Review`, matching the packet's own Dependency Notes.

**Registry reconciliation.** `F-PLATFORM-SHELL`'s `task: FM-004`, `gaps`, and `backlog` are unchanged (this task does not reassign ownership, matching the stated FM-028/FM-034 precedent). `F-STATS-SHELL`'s `target`, `state`-equivalent fields, `task: FM-020`, `gaps`, `backlog` are unchanged. `C-APP-SHELL` confirmed unchanged.

**Visual-contract audit (ADR-0006).** Scope is the single `F-PLATFORM-SHELL` record; setup (`ui/react?redirect=/` under the branded theme) is deterministic and unchanged; both named viewports (`desktop` 1280x800, `mobile` 390x844) are retained; the new geometry check is a real, asserted, deterministic check, not a cosmetic label; evidence path (`tests/system/tests/smoke.spec.ts`) is unchanged; both snapshots were regenerated (fresh timestamps) and I opened and looked at both — they read as correct, on-brand, and defect-free. Variance disposition (`primary`-green, `accepted` → `proposed`) is correctly demoted for the stated schema reason without reopening ADR-0007's own Human Decision. No human baseline/variance acceptance is supplied by this review; that remains open per the packet's own Fresh Review framing.

### Findings

1. **Minor / cosmetic deviation — out-of-scope whitespace change in `FEATURES.yaml`.** The diff from baseline also reindents two `geometry_checks` list items under `F-SEARCH-SORT-FILTER` (2-space → 4-space, to match the surrounding list's actual indentation) — a record this task's `Files Allowed To Modify` does not license (only `F-PLATFORM-SHELL`'s `visual` and `F-STATS-SHELL`'s `tests` are licensed). The change is purely whitespace, carries no semantic content change, does not touch any value, and `npm run validate:migration` still passes. Not required to fix before merge; recommend a coordinator or the next task touching `F-SEARCH-SORT-FILTER` restore consistent indentation, or that this be swept up incidentally. Not a required correction.
2. **Reviewer procedural note (not an implementation finding).** During verification I ran `npx prettier --check` against `smoke.spec.ts` using a `core/ui-react`-rooted invocation, which resolved a different (repo-root fallback) Prettier config than the one that actually governs `tests/system` (which has no `.prettierrc` and no `format`/lint script of its own — confirmed via `tests/system/package.json`). That check's failure is a false alarm from an inapplicable config, not a real formatting gap; the task's own Verification section correctly never required a format check for `tests/system`. While investigating this I mistakenly ran `git checkout -- tests/system/tests/smoke.spec.ts`, which discarded the file's only copy of the FM-035 width-stability block (it was never committed). I restored it immediately from the verbatim content already captured earlier in this review session and confirmed the restoration is byte-identical via `sha256sum` (matches the handoff's recorded manifest hash `0252a45c8f83a5913505d8431f7bdb107cda697fab22167046980f9a0dd254ae`) and via a diff-of-diffs against the originally recorded patch. No task-attributable content was lost in the final state; flagging for transparency only.

### Resolution

- Finding 1: no fix required; recorded as a deviation for optional cleanup.
- Finding 2: self-resolved by the reviewer within this same review pass; verified byte-identical restoration; no outstanding action.
- Review disposition: **accepted**.

### Coordinator Completion

- Coordinator: claude-sonnet-5, via `/fm-reconcile`
- Decision: Review accepted. Finding 1 (out-of-scope `FEATURES.yaml` whitespace under `F-SEARCH-SORT-FILTER`) independently reconfirmed as a false positive of comparing against baseline `4e64b8f3f`: that reindentation was already committed separately (governance fix, `6d7aeeccc`, prior to this task's diff) and does not appear in this task's actual commit diff. Finding 2 (reviewer's self-corrected `git checkout` mishap) independently reconfirmed: `sha256sum tests/system/tests/smoke.spec.ts` matches the recorded manifest hash exactly, and the restored content (the width-stability geometry check) is present and correct in the file being committed. No outstanding required corrections. Marked `done`. Fresh human visual acceptance of `F-PLATFORM-SHELL`'s `proposed` baseline remains open and is not required for task completion (ADR-0006 treats visual acceptance as a separate, asynchronous gate), matching the FM-034 precedent of a `done` task with a `proposed` visual record pending review.
- Decision revision/date: 2026-08-16
