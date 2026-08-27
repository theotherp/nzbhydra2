# Decisions

Append-only log of the migration's binding decisions. Each entry is the complete current authority for its subject; the full
original ADR analyses (options weighed, evidence, verbatim owner feedback) were deliberately compacted on 2026-08-19 and live in
git history (`git log -- docs/frontend-migration/decisions`). IDs are permanent; a superseded entry stays and names its
replacement.

New entries: only for hard-to-reverse choices — framework/stack, API or URL contracts, persisted data, cross-cutting UX policy.
Keep an entry under ~20 lines: date, question, decision, binding constraints. Option analysis happens in conversation with the
repository owner, not in this file. Styling questions inside ADR-0014's rules never need an entry.

## ADR-0001 — React placement and UI switch (accepted)

React source lives permanently in `core/ui-react`; Vite production output uses the isolated `static/react/` namespace and never
overwrites legacy assets. A Thymeleaf React shell receives the same server bootstrap contract as the legacy shell. A temporary
cookie-based selector (`ui/react`, `ui/legacy` endpoints) picks the shell for canonical URLs; Spring route mappings keep their
role protection. React uses final URL shapes from the start and shows a migration placeholder for unimplemented routes. React
becomes the default only after migration acceptance; selector and AngularJS are then removed in separate cleanup work.

## ADR-0002 — Frontend stack and boundaries (accepted)

React, TypeScript, Vite, MUI, TanStack Router/Query/Table, React Hook Form, Zod, Vitest, React Testing Library, SockJS,
`@stomp/stompjs`. MUI is the only general visual component system — no Bootstrap, Tailwind, second component suite, second
router, or second server-state library without superseding this entry. Hydra-specific table behavior (grouping, duplicates,
filtering, selection) stays explicit domain code. Config editing uses React Hook Form with a small typed field vocabulary, not a
generic schema framework. Shared Hydra behavior is registered in `COMPONENTS.yaml`; ordinary MUI usage is not wrapped.

## ADR-0003 — API contract and generation (accepted)

Generate TypeScript types from `core/openapi.json`; do not generate the transport or hooks. A small handwritten fetch transport
(`C-API-TRANSPORT`) derives its base from bootstrap data, sends credentials, and implements the CSRF cookie/header contract
(`HYDRA-XSRF-TOKEN` → `X-XSRF-TOKEN`). Login, logout, file transfers, upload progress, and STOMP are handled explicitly.
Generated files are reproducible and never hand-edited. `APIS.yaml` tracks contract quality and adoption per API ID.

## ADR-0004 — Testing and parity (accepted)

`FEATURES.yaml` is the behavioral parity inventory. Stable legacy `data-testid` values are preserved where behavior is
equivalent. Pure domain transformations get exhaustive unit tests; interactions and accessibility get component tests; routes,
packaging, API workflows, and parity get Playwright/Java system tests. jsdom cannot observe focus/layout/painting — claims about
those need a real browser. No test may be removed, skipped, weakened, or ignored to complete work. Rendering a page is not
parity; linked behavior must be covered.

## ADR-0005 — Recent-history criteria contract (accepted)

Recent searches persist and expose `minAge`, `maxAge`, `minSize`, `maxSize`, and explicitly selected indexers through
`API-HISTORY-RECENT-SEARCHES`. Pre-existing records without these values stay usable: refill/repeat falls back to default
indexers and empty age/size filters. Age/size/indexer values are not shown inline in the recent-search dropdown (tooltips only
where existing conventions allow).

## ADR-0006 — Visual parity policy (accepted; acceptance mechanism amended by ADR-0014)

Visual parity is semantic — information hierarchy, grouping, state visibility, responsive behavior, affordances — never
Bootstrap pixel identity. Behavioral, accessibility, and visual gates are independent. Only a human accepts a visual result.
*Amended by ADR-0014:* acceptance now happens by the owner reviewing each change's screenshot strip, not through per-record
visual contract/variance lifecycle records in `FEATURES.yaml` (that machinery is removed).

## ADR-0007 — Branded MUI theme foundation (superseded by ADR-0009)

Historical: adopted legacy's grey palette with logo-green primary. Palette and typography replaced by ADR-0009. The
`dark-dyschromatopsia` accessibility palette variant it introduced remains a requirement and must compose with the current
palette.

## ADR-0008 — Branded visual redesign, Option B (superseded by ADR-0009)

Historical: "mock structure only, keep old palette" — reversed by the owner after seeing the result.

## ADR-0009 — Mock-driven visual redesign (accepted; fidelity level amended by ADR-0014)

The owner's mock `uimock/NZBHydra Search.dc.html` (git-ignored, in the working tree) is the design source for the app: its
`oklch` teal palette, vendored IBM Plex Sans/Mono (never a runtime Google Fonts dependency), its density, and its structural
patterns — sticky results header, the Refine sidebar as the sole filter surface (no inline column filters), toggle-row
multiselects for category/indexer in the sidebar. Rollout is shell-first; routes without a mock keep their current look until
redesigned. *Amended by ADR-0014:* fidelity is token- and structure-level, not pixel-level — control anatomy is stock MUI.

## ADR-0010 — React production CSS delivery (accepted)

The CSS bundle filename is pinned in `core/ui-react/vite.config.ts`; `core/src/main/resources/templates/react.html` links it;
`validate:production-assets` checks the real served template, not Vite's unused `index.html`.

## ADR-0011 — Results table scroll model and sticky header (accepted)

The results table never scrolls horizontally, like legacy: no `overflowX` wrapper, no table min-width floor, the Title column
absorbs the squeeze and wraps (`overflow-wrap: anywhere`; variable row heights accepted). With no scrolling ancestor between the
header cells and the document, the column header is viewport-sticky via native `position: sticky`. Below the ~768px breakpoint
rows stack as cards.

## ADR-0012 — Recent-search Refill keyboard reachability (accepted)

`ArrowRight` on a recent-search row moves focus to its nested Refill `IconButton`; `ArrowLeft`/`Escape` return to the row;
`Enter`/`Space` activate natively; `aria-keyshortcuts="ArrowRight"` plus one visible menu hint provide discoverability. The
binding depends on MUI menu internals and must be re-verified in a real browser after any `@mui/material` upgrade
(`tests/system/tests/search.spec.ts`).

## ADR-0013 — Keyboard focus indication (accepted; scope amended by ADR-0015)

The app authors one explicit focus-ring token in `theme.ts` (`3px solid primary.main`, offset `3px`, inset `-3px` where an
ancestor measurably clips an outset ring), keyed to each control family's own `&.Mui-focusVisible`/`:focus-visible` selector.
`SwitchBase`-derived controls (Checkbox/Radio/Switch) must be authored on the root class — their focusable node is a transparent
input overlay where `:focus-visible` paints invisibly. Gated by `tests/system/tests/focus-indication.spec.ts` (real browser,
keyboard-only) and the `validate:focus-affordances` source guard; both are version-scoped to the installed MUI and must be
re-proven after an upgrade. *Amended by ADR-0015:* the ring no longer applies to the text-input/select family.

## ADR-0014 — Token fidelity, standard MUI (accepted 2026-08-19)

Supersedes ADR-0009's pixel-fidelity reading after the owner reviewed the result: literal translation of the mock's inline CSS
produced hand-built controls (bare `InputBase` composites, clipped labels, deleted borders) that destroyed MUI's built-in
affordances and required expensive repair work (FM-052/ADR-0013/FM-053).

- The mock defines **tokens** (palette, typography, density, radii, surface colors) and **page structure**. Tokens live in
  `theme.ts` only — as palette entries and component `styleOverrides`/`defaultProps` — so every standard component gets the
  mock's look automatically.
- **Control anatomy is stock MUI**: standard components, visible labels, default borders, default focus/hover/error states.
  Feature code contains no color/font/radius literals and never restyles component internals (`notchedOutline`, label clipping,
  outline suppression).
- Deviating from stock MUI requires a written justification at the site; deviating from the mock's pixels requires none.
- Visual acceptance is a human reviewing the change's screenshot strip (see README, *Visual Gate*), replacing the
  `FEATURES.yaml` visual contract/variance lifecycle.
- Conventions are operationalized in `/core/ui-react/AGENTS.md`, *UI Conventions*.

## ADR-0015 — Focus indication simplification (accepted 2026-08-19; amends ADR-0013)

With ADR-0014 restoring stock inputs, the text-input/select family indicates focus through MUI's own focused outlined border
(2px `primary.main` — measured by FM-052 at 3.15–5.56:1, passing contrast everywhere). The theme's `MuiInputBase`
`&:has(:focus-visible)` ring is removed — it double-bordered every focused select. The authored ring remains for the families
where MUI renders nothing by itself: `ButtonBase` (Button/IconButton/Tab), `SwitchBase` (Checkbox/Radio/Switch),
`MenuItem`/`ListItemButton` (inset), `Chip`, `Link`, and the global `:focus-visible` rule for unclassed elements. Feature code
must not suppress the resting or focused input border; the focus gate and source guard are updated to assert this split.

## ADR-0016 — History refine bar multi-select semantics (accepted 2026-08-19)

The legacy history filters preselect every value of a `checkboxes-filter` and offer an invert control
(`download-history.html` indexer/status, `search-history.html` category, `notification-history.html` event type). The owner
decided the React refine bar does not carry that model forward.

- A multi-select dimension starts with **nothing selected**, and an empty selection means **no filter** — all entries show.
  Selecting one or more values narrows to exactly those. There is no preselect-all state and no invert control; deselecting
  everything returns to showing all.
- This is the semantics of the shared bar's multi-select kind (`C-HISTORY-REFINE-BAR`), not a per-route choice: download
  history's indexer and result, search history's category, and notification history's event types all follow it, as does any
  history dimension added later.
- Consequence for parity: an entry's absence from a selection is never a filter. A route must not send a filter value list
  that merely enumerates every known option — an unselected dimension sends no `filterModel` entry at all.
- Download history's indexer dimension therefore becomes multi-select over the known indexer list, replacing the freetext
  contains-match the React route ships today (`api/history/downloads.ts` sends `filterType: "freetext"` on column `name`).

## ADR-0017 — Post-save safe-config refresh (accepted 2026-08-20)

Legacy reloads the whole page after every successful config save; the React app must not. Instead, the safe configuration
becomes reactive server state: `C-BOOTSTRAP-CONTEXT`'s safe config is served by a TanStack Query over `API-CONFIG-SAFE`
(`GET internalapi/config/safe`), seeded with the bootstrap value as `initialData`, and invalidated after every successful
config save. Consumers keep reading the same context; none may cache the value outside the query. A successful save performs
no `window.location.reload()` — the form resets from the PUT response's `newConfig`, and bootstrap-derived UI (nav gating,
stats tabs, history metadata) refreshes through the query. Restart-needed flows remain the province of
`C-RESTART-COORDINATOR` and do reload after the server restarts.

## ADR-0018 — Web API primitive-null leniency (accepted 2026-08-20)

FM-064 found that `internalapi` requests omitting a primitive field (e.g. `DownloaderConfig.enabled`/`addPaused`) are
rejected with HTTP 400, because `WebConfiguration`'s web `JsonMapper` does not disable
`DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES` the way every other mapper in `Jackson.java` does — an apparent drift
from the app's own stated intent. The owner decided to restore parity: `WebConfiguration`'s web mapper gets the same
`.disable(FAIL_ON_NULL_FOR_PRIMITIVES)` call as `Jackson.JSON_MAPPER`, rather than a narrow per-class fix on
`DownloaderConfig` alone or preserving strict rejection with a better error. This is a deserialization-contract change
across every HTTP endpoint the web mapper serves (internal and the public newznab/torznab surface): an omitted primitive
now silently defaults instead of erroring. Binding for the packet designed to implement it and any future class hitting
the same trap.

## ADR-0019 — Bound `WebAccessException`'s user-facing message (accepted 2026-08-20)

FM-065's review found `WebAccessException.getMessage()` joins the response message, the **entire** response body, and
`"Code: N"` with no bound, reaching user-facing surfaces: the External Tools connection-test toast/sync notification, the
Prowlarr-import UI, indexer connection/caps checks, and the persisted `IndexerApiAccessEntity.error` column.

Decided: split the API rather than bound `getMessage()` globally or fix only External Tools. `getMessage()` keeps its
current diagnostic form (message + full body + code) for logs; a new short-form accessor (message + code, no body) is
added and used at every user-facing boundary — `ExternalToolsWeb.testSimpleConnection`,
`ProwlarrConfigRetriever`/`IndexerWeb.readProwlarrConfig`, and `IndexerWebAccess`'s connection/caps-check paths.
`getBody()` stays available where a caller wants the raw body. This bounds every UI surface without degrading log
detail, and lets FM-066/FM-067 inherit the bounded message from their first implementation.

Binding for the packet implementing it; its `Files Allowed To Modify` may reach `externaltools/`, `webaccess/`, and
`indexers/` without a further decision — the boundary list above is exhaustive of what this ADR covers; a body-leak found
through some other path later needs its own escalation.

**Addendum (2026-08-20):** the owner extended the boundary list, in conversation, to also cover
`ExternalTools.handleXdarrError`'s fallback branch (`messages.add(e.getMessage())`) and `ExternalToolsSyncService`'s
per-tool sync-failure message — both leak the same unbounded body into `POST .../syncAll`'s JSON `messages` list (the
persisted sync notification's own body stays the generic count text and is unaffected). Both switch to
`getShortMessage()` under FM-071, which now also touches `handleXdarrError`'s one `else` branch inside `ExternalTools.java`
— a narrow, disclosed exception to FM-070's otherwise-exclusive ownership of that file, since the two tasks change
disjoint lines for disjoint reasons.

## ADR-0020 — Reject unresolvable save markers; fix the fixture, not the contract (accepted 2026-08-20)

FM-068's implementer found that rejecting a `***UNCHANGED***` marker whose record cannot be identified in the saved
config (the packet's acceptance criterion 4) breaks `tests/system/tests/fixtures.ts`'s shared `hydra` fixture: its
teardown restores a masked `GET`-time snapshot via `PUT`, and when a test changed a list's identity in between (e.g.
`configureMockIndexers` replacing the indexer list), that restore now asks the server to keep a secret for a record it
no longer holds — cascading failures in `search.spec.ts` and `config-indexers.spec.ts`.

Decided: keep the server rejection exactly as the packet specifies; the fixture is wrong, not the contract — it was
restoring a credential it was never actually given, previously masked only by the old positional fallback's accidental
correctness. `tests/system/tests/fixtures.ts`'s teardown is fixed (e.g. restore the runner's known baseline explicitly,
or drop/skip unresolvable markers on restore with a logged warning) instead of softening or splitting the rejection
rule.

Binding for FM-068: extends its `Files Allowed To Modify` to include `tests/system/tests/fixtures.ts` for this narrow
teardown-restore purpose only — no other change to that file's scope.

## ADR-0021 — Stats dashboard: redesign at migration, data parity only, no mock (accepted 2026-08-21)

Question: migrate the legacy stats page faithfully and improve later, or redesign its presentation during migration?

Decided: FM-024 redesigns the presentation in one pass. The legacy layout is not reproduced: parity is pinned to the data and request contract — same `POST /internalapi/stats` endpoint, same sixteen family switches with calculation-skip
semantics, same values reachable — while layout, grouping, and chart forms are new. Rationale: ADR-0009/0014 already re-skin every route, nvd3 cannot carry over so the chart layer is rebuilt from scratch either way, and stats is a read-only
leaf page where faithful- then-redesign would double the most expensive work (charts, Playwright value assertions, visual gate) for no verification benefit.

Binding constraints:

- No uimock exists for stats and none is required: the FM-024 packet's Presentation Structure section is the design authority, rendered in stock MUI on ADR-0014 tokens.
- Share/proportion families render as sorted value-labeled horizontal bars, not pie/donut charts.
- Every legacy statistic value stays reachable with an accessible table rendering; charts are the secondary, tables the accessibility layer.
- New statistics and backend calculation changes remain out of scope until after legacy removal.

## ADR-0022 — Retire the guided search tour and demo mode (accepted 2026-08-23)

Question: how should `F-SEARCH-TOUR` (guided search tour + demo mode), the last `inventoried` feature, be handled in React? The legacy implementation is ~2,300 lines (`guided-tour-service.js` plus vendored `angular-ui-tour.js`) with
demo-mode server data, fake-downloader injection, and cross-state step choreography; none of it ports mechanically. Options considered: rebuild custom on MUI Popper; adopt a third-party React tour library; drop the tour.

Decided: drop the tour for React. `F-SEARCH-TOUR` and the four API records `API-TOUR-HIDDEN`, `API-TOUR-HIDE`,
`API-DEMO-START`, `API-DEMO-STOP` are retired as deliberately unmigrated.

Binding constraints:

- No React tour or demo mode is built; no tour library is added to the stack.
- The `GuidedTourWeb`/`DemoDataProvider` backend surface is not adopted by the React frontend; its removal, if any, is deferred until after legacy removal and is not part of any FM packet without a new decision.
- Registry/status bookkeeping marking these records retired is routed through `migration-task-designer`, not done ad hoc.

## ADR-0023 — Migration acceptance for the React default flip (accepted 2026-08-23)

Question: ADR-0001 permits React to become the default UI "only after migration acceptance", and FM-094 refuses to
promote past `planned` until that acceptance exists as a decision entry. Is the migration accepted?

Decided: yes, taking effect once FM-093 and FM-096 pass review. The owner declared acceptance on that condition.

Evidence at the time of declaration: after FM-091, FM-092 and FM-093, no capability remains that legacy has and React
lacks. What is left is (a) `F-AUTH-LOGIN`'s BASIC-logout limitation, which legacy shares — `POST /loggedout` is dead
server code no UI has ever called; (b) screen-reader verification debt on ADR-0012's keyboard affordances, which is
verification not capability; and (c) the guided tour and demo mode, already retired by ADR-0022.

Binding constraints:

- Acceptance is conditional: FM-094 may not be promoted until FM-093 and FM-096 are `done`.
- The screen-reader verification debt does not block acceptance and is recorded as open debt in the registries
  (owner decision, same conversation). It must not be silently closed by asserting it was verified.
- Acceptance authorises the flip and the subsequent removal of the selector and AngularJS (FM-094, FM-095). It does
  not authorise removing the `GuidedTourWeb`/`DemoDataProvider` backend surface, which ADR-0022 still defers.


## ADR-0024 — Keep the config tooltip affordance; no tooltip-into-help merge (accepted 2026-08-24)

Question: `docs/config-ui-improvements.md` §2 proposes merging each setting's tooltip content into the inline help
text, leaving a separate tooltip icon only where the text is genuinely long. The FM-097..FM-107 designer declined to
package it and asked the owner to confirm, because the proposal's premise does not match the current code. The owner
delegated the decision to the coordinator.

Decided: do not merge. The tooltip affordance stays as it is, and no packet in the FM-097..FM-107 batch changes it.

Rationale: §2 describes the legacy four-column grid as "today", but `SettingRow.tsx` is already single-column with
help rendered below the control as `FormHelperText`, so the readability problem the merge was meant to solve is
already solved. The merge's remaining effect would be to delete the `config-tooltip-*` affordance and its selectors —
a user-visible and test-visible removal with no demonstrated benefit.

Binding constraints:

- No FM packet removes or re-homes the `config-tooltip-*` affordance or its selectors on the strength of §2.
- Reopening this requires a new decision entry naming a concrete problem with the current tooltip presentation.
- This decision governs §2 only; it does not touch FM-098's inline "Advanced" chip, which is separately packaged.

## ADR-0025 — Unattended coordination authority for the FM-108..FM-107 run (accepted 2026-08-24)

Question: the FM-097..FM-112 run is coordinated unattended overnight, but the orchestration playbook stops and asks
the owner at two points: a worker raising `DECISION REQUIRED`, and a task that exhausts its three fix/review cycles or
blocks. No owner is available during the run.

Decided, by explicit owner instruction: the coordinator carries bounded decision authority for this run only.

Binding constraints:

- The coordinator may resolve a `DECISION REQUIRED` itself **only** when the choice is front-end-only and reversible.
  Each such resolution is recorded as its own dated ADR entry here, with rationale and constraints, before the
  affected task resumes.
- Anything touching a backend contract, an API shape, a persisted format, or another shared boundary is **not**
  self-resolvable: that task blocks and waits for the owner, as the playbook requires.
- A task that exhausts three fix/review cycles or blocks is left at its true status with findings recorded; its
  dependents are skipped; independent tasks continue. Failures are never papered over to keep the run moving.
- This authority expires with this run. It does not generalise to later batches, and it does not authorise the
  coordinator to implement, review, or fix anything itself.

## ADR-0026 — A handoff is reported, not written into the template file (accepted 2026-08-24)

Question: every task packet's Handoff/Review section says "Implementer fills `../templates/handoff.md`". FM-108's
implementer read that as "fill out the form that file defines" and reported its handoff to the coordinator; its
reviewer logged the not-written-to-a-file choice as a process deviation. Acting on that finding, the coordinator told
FM-109's implementer to write the handoff into the file — which overwrote the blank template with one task's content.
`git log` shows no FM task has ever committed a filled `templates/handoff.md`; its only history is governance edits.

Decided, by the coordinator under ADR-0025: FM-108's reading was the correct one. "Fills `../templates/handoff.md`"
means fill out the form that template defines; the template file itself stays blank and reusable. The handoff is
reported to the coordinator, which carries its substance into `STATUS.md` and the task-boundary commit message, and
git history is the archive — the same lifecycle the task packets themselves follow.

Binding constraints:

- `docs/frontend-migration/templates/handoff.md` and `templates/review.md` are forms. No task writes its content into
  them; the FM-109 overwrite was reverted to the FM-108 baseline.
- A handoff must still contain everything the template asks for, command-by-command verification evidence included.
  This decision changes where it lives, not how complete it is.
- FM-108's corresponding MAINTENANCE.md open candidate is discharged by this entry.
- If a written per-task handoff file is ever wanted, it needs a new decision naming its path and lifecycle; it must
  not be the template.

## ADR-0027 — The Advanced chip marks revealed rows only, not the toggle-on state (accepted 2026-08-26)

Question: FM-098's Acceptance contradicts itself. Bullet 1 says that with the global advanced toggle on "everything
renders exactly as today"; bullet 3 says every advanced row carries an `Advanced` chip "whenever visible (toggle on or
revealed)". Its reviewer prompt independently demands pixel-identical toggle-on rendering. The implementer followed the
specific bullet over the general one, which is textually correct, and flagged the conflict rather than choosing quietly.
The owner delegated design calls of this kind to the coordinator for this run (ADR-0025).

Decided: the chip marks a row **revealed through a per-fieldset expander**, and is absent when the global toggle is on.
This amends FM-098 Acceptance bullet 3; bullets 1 and 2 stand unchanged, and the conflict disappears.

Rationale, from the reviewer's inspection of `main-advanced-shown-desktop.png` rather than from principle: the chip in
the toggle-on state is not merely redundant on a page the user reached *by asking for advanced settings* — it is an
inconsistent signal that actively misleads. The chip marks rows flagged advanced *individually*. Rows inside a wholly
advanced fieldset carry no individual flag, so Proxy, Logging, Backup, History and Database render no chips at all,
while Security renders five in a column. A reader infers that an unchipped row is not advanced, which is false for
every row in those five fieldsets. `main-after-save-desktop.png` shows both cases stacked. In the revealed state the
same chip is unambiguous and does exactly the job bullet 3 describes, because there the chip distinguishes the rows the
expander just added from the plain rows they were inserted among.

Binding constraints:

- The chip renders only for a row revealed by its fieldset's expander — gate it on the hidden-by-toggle condition.
  Toggle-on rendering returns to pixel-identical with the pre-FM-098 baseline.
- The `config-advanced-chip-<path>` selector and the chip's anatomy are otherwise unchanged, and it stays recorded in
  `F-CONFIG-MAIN.selectors`.
- This is a presentation decision only. It does not touch the registration invariant, the count, or which rows are
  hidden.

## ADR-0028 — The config "on this page" list is a sibling below the nav, not a nested expansion (accepted 2026-08-26)

Question: FM-102 requires "the active sidebar entry expands to an 'on this page' list" of fieldset anchors that are
buttons or links in the Tab order. FM-097 built that sidebar as a vertical MUI `Tabs` with eight `Tab` children
(`ConfigNav.tsx:80-115`), deliberately, to preserve the `tab`/`tablist` roles, `aria-selected`, and every
`config-tab-<path>` selector. Anchors cannot nest inside a `Tab` — it is a button, so nested interactive content is
invalid and unreachable — and non-`Tab` children cannot be interleaved in the `tablist` without breaking both ARIA and
MUI's child-index and roving-tabindex handling. FM-102 is therefore unbuildable as written. Raised by the task
designer while sweeping the config batch for assumptions FM-097 invalidated; resolved by the coordinator under
ADR-0025.

Decided: option (a). The anchor list renders as a sibling *below* the `Tabs` element in the nav column, headed with the
active tab's name, rather than nested under its own entry.

Rationale: the alternative of replacing vertical `Tabs` with a hand-built `List`/`ListItemButton` nav would reopen
FM-097's recorded decision and discard the role, `aria-selected`, and selector guarantees it was chosen to protect —
a large, contract-visible regression taken as a side effect of adding an anchor list, which is exactly the kind of
incidental scope creep the packet discipline exists to prevent. Moving the list into the tab body was the other
option; it is defensible, but sub-navigation belongs with navigation, and a list at the top of a long tab scrolls
away, which is the defect FM-097's sticky bar was built to fix. Heading the sibling list with the active tab's name
recovers the association that nesting would have carried structurally.

Binding constraints:

- `ConfigNav.tsx`'s `Tabs`/`Tab` structure, its `tab`/`tablist` roles, `aria-selected`, and every `config-tab-<path>`
  selector are unchanged by FM-102. The anchor list is a sibling element, never a `Tabs` child.
- The list is headed with the active tab's name, so its scope is unambiguous when it sits under all eight entries.
- FM-102's Acceptance wording ("the active sidebar entry expands") is refined to match; the anchors' keyboard
  reachability requirement stands.

## ADR-0029 — The review-changes panel must show the new value on mobile (accepted 2026-08-26)

Question: FM-100's review panel renders four columns (setting, origin, previous value, new value). At 390px they do not
fit, so the "Now" column sits entirely outside the dialog and the table scrolls horizontally inside its own
`TableContainer`, with no scrollbar, gradient, or other affordance indicating more exists to the right. FM-100's
implementer deliberately did not add a breakpoint-dependent layout, reasoning that a second rendering path is scope the
packet did not ask for. Its reviewer, judging the actual capture rather than the principle, said it should not ship.
Resolved by the coordinator under ADR-0025.

Decided: the panel must show the new value at every supported viewport. Below `sm`, drop the origin ("Section") column
and merge the value pair into a single cell (`off → on`, `(hidden) — changed`).

Rationale: the panel exists to answer "what is about to be written to my config", and below `sm` it currently answers
only "what does my config say now" — the one column that carries the panel's purpose is the one off-canvas, with the
header clipped mid-word and nothing signalling it. The implementer's engineering instinct was right in general and
applied to the wrong question: the packet did not ask for a second rendering path, but it did ask for old and new
values to be legible, and they are not. The chosen remedy is deliberately not a stacked card layout — dropping a column
and merging a cell is one responsive decision inside the existing table, so there remains a single rendering path to
test and reason about.

Binding constraints:

- The new value is legible at 390px without horizontal scrolling. Origin may be dropped below `sm`; the setting label
  and both values may not.
- One rendering path: no separate mobile component, no `useMediaQuery` branch returning different markup.
- Secret hiding is unchanged — a merged cell renders `(hidden) — changed`, never a value.
- The mobile capture is re-taken as evidence.

## ADR-0030 — The config nav column is sticky, so its anchor list survives scrolling (accepted 2026-08-26)

Question: FM-102 renders an "on this page" anchor list as a sibling below the nav's `Tabs`, per ADR-0028. But the nav
column is not sticky, so on a long tab the list scrolls off the top with the page — FM-102's own mid-page capture shows
the heading, all eight tab entries, and the first two anchors gone. Its implementer judged that acceptable; its
reviewer refused to sign it and referred the scope question here, since the remedy exceeds FM-102's allowlist fence of
"only the additive sibling list", and declined to choose between making the whole column sticky or only the list within
it. Resolved by the coordinator under ADR-0025.

Decided: the **whole nav column** is sticky at the docked (`md`+) breakpoint — sticky below the save bar, with its own
`max-height` and internal scrolling so a column taller than the viewport stays fully reachable. The mobile `Drawer`
branch is unaffected; it is already an overlay.

Rationale: ADR-0028 chose the sibling-below-`Tabs` placement expressly because "a list at the top of a long tab scrolls
away, which is the defect FM-097's sticky bar was built to fix" — so a non-sticky column reproduces the exact defect
that decision was made to avoid, and FM-102's Outcome, ending the endless scroll, is unmet in precisely the state that
needed it. ADR-0029 is the standing precedent for refusing a layout that hides its own point. Sticking the whole column
rather than only the list is the better of the two: the tab entries are navigation too, and a user deep in Main who
wants Searching should not have to scroll up to reach it. The internal scroll is not optional — eight tab entries plus
up to ten anchors plus the foot can exceed a short viewport, and a sticky element taller than its container silently
clips.

Binding constraints:

- Sticky applies to the docked branch only; the `Drawer` branch is untouched.
- The column must never clip its own content: constrain its height and let it scroll internally.
- ADR-0028 still holds — the `Tabs`/`Tab` subtree, its roles, `aria-selected` and every `config-tab-<path>` selector
  are unchanged, and the anchor list remains a sibling, never a `Tabs` child.
- This authorises FM-102 to modify `ConfigNav.tsx`'s docked-column container beyond the "additive sibling list" fence,
  for this purpose only. The visual capture is re-taken as evidence.

## ADR-0031 — Remove `searching.loadLimitInternal` rather than honour it (accepted 2026-08-27)

Question: React's Config > Searching tab edits `searching.loadLimitInternal`, but nothing consumes it — legacy used it as
the results view's displayed page size, and the React results view ignores it. FM-094 deleted the last test that covered
it, so nothing evidences the gap either. The ledger recorded the open question as "honour the setting in the results
view, or declare it backend-only".

Decided, by the owner: **neither — remove it**, from the frontend and, where the evidence supports it, from the backend
too. An admin should not be offered a control that does nothing.

Binding constraints:

- The Searching tab stops offering the setting, and it leaves `C-CONFIG-SETTINGS-INDEX` so settings search cannot
  surface a control that no longer exists.
- Whether the backend field itself is removed is a question of evidence, not preference, and the packet must settle it
  before writing: `SearchingConfig.java` declares it, `SafeSearchingConfig.java` projects it to the frontend, and
  `baseConfig.yml` ships a default. If any Java path reads it for behaviour, that path governs and only the UI goes.
- **The migration hazard is the deciding factor for the backend half and must be established first**: existing
  installations' `nzbhydra.yml` files contain `loadLimitInternal`. If the config reader rejects unknown properties,
  deleting the field breaks every existing install on upgrade, and the field must instead be retained and deprecated
  rather than removed. Do not remove it on the assumption that unknown keys are tolerated — prove it.
- `reachability-metadata.json` names the field; a native build must still work after whatever is removed.
- This is a persisted-data change, so it takes a task packet with independent review, not a single-session fix.

## ADR-0032 — Supersedes ADR-0031: `searching.loadLimitInternal` stays; its description is the defect (accepted 2026-08-27)

Question: ADR-0031 directed removing `searching.loadLimitInternal` on the recorded ground that nothing consumes it. While
designing the packet, that premise was found false.

Evidence: `core/src/main/java/org/nzbhydra/searching/searchrequests/SearchRequestFactory.java:26-30` substitutes the
setting as the server-side page size whenever an internal search arrives without an explicit `limit` —

```java
if (limit == null) {
    limit = source == SearchSource.INTERNAL ? searchingConfig.getLoadLimitInternal() : 100;
}
```

— and `SearchPage.tsx:166-196` builds every internal search request without a `limit` key, then consumes the returned
`limit` as its load-more cursor (`SearchPage.tsx:294-335`, `SearchResults.tsx:490-494`). So the setting governs the fetch
size of every internal search on every install.

Decided, by the owner on that evidence: **ADR-0031 is superseded. The setting stays and stays editable.** The real defect
is that its label and help text describe a *display* page size, which is what legacy used it for, while it now controls a
*fetch* page size. FM-116 becomes a text correction rather than a removal.

Binding constraints:

- `SearchingConfig.java`, `SafeSearchingConfig.java`, `baseConfig.yml` and both native-image metadata files are
  untouched. No persisted data changes and no search behaviour changes.
- The Searching tab keeps the control and its entry in `C-CONFIG-SETTINGS-INDEX`; only the wording changes.
- The wording must say what the setting does — how many results are fetched per request — without implying it caps what
  is displayed, since the results view pages through what it fetches.
- ADR-0031 is retained above rather than deleted: the record of a decision made on a false premise, and of how it was
  caught, is worth more than a clean history. It has no force.

Lesson recorded: the ledger entry asserting the setting was "consumed nowhere" was wrong, and it was wrong because the
consumer is a *default substituted server-side for an absent field*, which greps for the setting name in the frontend
cannot see. A "nothing consumes this" claim needs a check on the backend read path before it becomes a decision.

## ADR-0033 — Downloaders get a bespoke table, not a shared table extraction (accepted 2026-08-27)

Question: the owner wants downloaders shown the way indexers are — a table whose name cell is a button opening the edit
modal, plus Type and URL columns — replacing today's `DownloadersSection` list of `Edit <name>` buttons. Should
`IndexerTable` be extracted into a reusable table first, or should a bespoke `DownloaderTable` be written?

Evidence: there is no shared table component in this codebase. `IndexerTable.tsx`, `CategoriesTable.tsx` and
`auth/AuthUsersSection.tsx` each hand-roll MUI `Table`/`TableContainer` and cross-reference one another only in comments
(`AuthUsersSection.tsx:42` cites `CategoriesTable.tsx:36-47`). `IndexerTable` is indexer-typed throughout: 15 imports
from `./indexerSettings`, a module-level `COLUMNS` constant rather than a prop, hand-written cell bodies including three
indexer-only status chips, and every `data-testid` literally `config-indexer(s)-…`. The three existing tables have
divergent requirements — indexers need sort + filter + bulk state actions + a responsive single-cell collapse, auth users
need two action buttons per row, categories need expansion rows.

Decided, by the owner: **bespoke `DownloaderTable`, following the shape the other three already use.** An extraction now
would be designed against three divergent call sites at once and would put the working indexers table at risk to serve a
fourth that does not exist yet.

Binding constraints:

- These `data-testid`s are load-bearing and must survive unchanged: the container anchor
  `config-repeat-downloading-downloaders` (asserted by `settingsIndexDrift.test.tsx`, indexed at `settingsIndex.ts:905`),
  the row entry `config-repeat-entry-downloading-downloaders-${index}`, the edit control
  `config-repeat-edit-downloading-downloaders-${index}`, the add menu `config-repeat-add-downloading-downloaders` and its
  `config-repeat-add-option-…` items, and the summary cells `config-downloader-value-${index}-${field}`. E2E
  (`tests/system/tests/config-downloading.spec.ts`) asserts all of them.
- The per-row Enabled switch stays on the row and out of the modal (`DownloadersSection.tsx:268-273` records why).
- Rows keep binding to the config index, never the display position; row N edits index N.
- Order stays the configured array order. Legacy's name sort was deliberately dropped
  (`DownloadersSection.tsx:56-61`); do not reintroduce it, and do not add drag reorder — neither exists today.
- Torbox entries have no `url` and no user-set `name` (`visibleDownloaderFields`, `downloadingSettings.ts:186-191`). The
  URL cell must render an explicit empty state, not the string "undefined".
- `downloaderType` currently renders as the raw enum (`NZBGET`). Add a label map mirroring
  `indexerSettings.ts:287-315`; a table column showing constants where the indexer table shows prose is the kind of
  inconsistency this change exists to remove.
- A follow-up packet candidate is recorded, not scheduled: extract the common table core once a fourth table exists and
  the genuinely shared shape can be read off four instances instead of guessed from three.

## ADR-0034 — Categories move to edit modals; the required-name guarantee is replaced, not dropped (accepted 2026-08-27)

Question: categories today are accordion rows — an expanded row renders `CategoryEntryFields` in place. The owner wants
edit modals instead, matching the indexers/downloaders concept. What replaces the behaviour the accordion was carrying?

Evidence: `CategoriesTable.tsx:448-455` renders `<Collapse in={expanded}>` with `unmountOnExit` deliberately absent, and
the module doc comment (`:66-73`) records why: `name` is `required`, so unmounting a collapsed row's controls would let a
nameless category through with no error anywhere in the DOM. `add` (`:155-162`) expands the new row immediately for the
same reason. A modal unmounts those fields, so that mechanism cannot survive the change.

The same eager mount is also the reported performance defect. The base config ships 16 categories
(`baseConfig.yml:33-263`) and `CategoryEntryFields` registers 13 controllers each — 208 registered inputs, including 48
`Autocomplete`s and 64 `Select`s, all mounted on entering the tab whether or not any row is expanded.

Decided: **modals, with dialog-local validation replacing the always-mounted guarantee.** The dialog refuses to commit a
blank name via its own `trigger()`, as `DownloaderDialog.tsx:191-198` already does. This is a strictly better guarantee:
the invalid state cannot be created, rather than being created and reported later from a control the user must hunt for.
This is a front-end-only, reversible change and was decided by the coordinator under the owner's standing delegation.

Binding constraints:

- The container anchor `config-repeat-categoriesConfig-categories` (`settingsIndex.ts:837`) must survive unchanged.
- The dialog follows the established shape — a throwaway `useForm` over `structuredClone`, bound to a new
  `CATEGORY_DRAFT_PATH` constant alongside `INDEXER_DRAFT_PATH`/`DOWNLOADER_DRAFT_PATH`, with Delete/Cancel/Reset/Submit
  and the `AdvancedDisclosureContext.Provider value={NO_ADVANCED_DISCLOSURE}` wrapper. `auth/UserDialog.tsx` is the
  closest template.
- `CategoryEntryFields` and `SizePresetRow` currently build every path from `index: number`
  (`CategoryEntryFields.tsx:33`, `:111-171`). They need a path-builder prop so they can bind to a draft path. This is a
  signature change, not a rewrite; the field list and its order must not change.
- `mayBeSelected` and `preselect` are persisted but have no control (`categoriesSettings.ts:90-96`). A commit that
  replaces the entry must clone them through — the ADR-0003 round-trip hazard.
- `CategoriesConfig.setCategories` re-sorts by name on every deserialization, so a config index is not stable across a
  save. The commit must be synchronous into form state; no transaction may hold an index across an async gap.
- The summary cell's invalid-newznab-token flagging (`CategoriesTable.tsx:386-425`) stays. It is what makes a bad stored
  token findable without opening anything, and it is independent of how editing happens.
- Dead on arrival, and to be removed rather than left: the `fieldsWidth` `ResizeObserver` machinery (`:118-133`,
  `:456-472`), the `config-categories-scroller` sticky box, and the expanded-index fixup after delete (`:188-194`).
- Roughly a dozen unit cases and the E2E `expandCategory` helper encode expansion directly and must be rewritten, not
  deleted. `CategoriesConfigTab.test.tsx:331` asserts an input is present *because nothing was expanded* — that case
  encodes the old guarantee and must be replaced by one proving the dialog blocks a blank name.

## ADR-0035 — `palette.error.main` is corrected app-wide (accepted 2026-08-27)

Question: the Delete button in the indexer and downloader dialogs is hard to read. It is a text-variant
`Button color="error"`, so `palette.error.main` is the foreground. Fix the token, or override the two buttons?

Evidence: `theme.ts:281` sets `error: "#a33938"`, and its own comment records it as a carried-over legacy value with no
mock evidence, while the rest of the palette was re-authored in oklch. Against `background.paper` `#262c2e` that is about
2.1:1, versus roughly 9.6:1 for a neighbouring `text.primary` button label. The dyschromatopsia variant already overrides
`error` to a much lighter `#b090c8` (`theme.ts:468-471`); the default dark theme never received the same pass. Three call
sites use it as a foreground: `IndexerDialog.tsx:757-768`, `DownloaderDialog.tsx:342-352`, `RepeatSection.tsx:120`.

Decided, by the owner: **raise `error.main`'s lightness to clear 4.5:1 against both `background.paper` and
`background.default`, preserving hue.** A per-button override would leave the identical failure everywhere else the token
is used as a foreground, and would add exactly the kind of call-site colour literal ADR-0014 exists to prevent.

Binding constraints:

- The measured contrast ratio against both grounds is recorded in the handoff. "Looks better" is not evidence.
- The change is to the token only. No call site gains a colour literal or an override.
- Error-coloured surfaces where the token is a *background* (with white/dark text on it) must be re-checked, since
  lightening a foreground colour can break a background pairing. Any such site is reported.
- The dyschromatopsia variant's own override stays as it is.

## ADR-0036 — Config field treatment: one ground, one readable border (accepted 2026-08-27)

Question: the owner reports that field labels "look weird" in the indexer and downloader dialogs, suspecting the fields
lack a visual border. What is actually wrong, and what is the fix?

Evidence: the fields *are* `outlined` — no config `TextField` passes a `variant`, so MUI's default applies. Two theme
rules make them not read that way. `MuiOutlinedInput` (`theme.ts:892-947`) paints `backgroundColor: surfaces.recessed`
`#1c2224` with `notchedOutline` `borderColor: surfaces.hairline` `rgba(255,255,255,0.1)`, and `MuiInputLabel`
(`theme.ts:806-819`) sets `shrink: true` globally, so every label is permanently floated into the notch rather than
resting in the field. The result reads as a filled field with a floating label, and the near-invisible outline gives the
label nothing to sit on. The grounds then differ: config tab bodies render on `background.default` `#1f2426` with no
`Paper` wrapper, while dialogs take `background.paper` `#262c2e`. The same field is a ~3-unit-invisible edge on one
surface and a visibly darker well on the other.

Decided: **strengthen the outline so the notch reads as a notch, and stop the same control reading two ways.** This is
front-end-only and reversible, decided by the coordinator under the owner's standing delegation.

Binding constraints:

- Raise `surfaces.hairline`'s alpha (or give `MuiOutlinedInput.notchedOutline` its own stronger token) until the border
  is visible on both `background.default` and `background.paper`. Record the chosen value and why.
- Resolve the two-grounds problem in one direction only, and state which: either the input background follows its
  surface, or the config tab bodies gain the `Paper` the dialogs already have. Do not do both.
- `shrink: true` stays. Unshrinking labels would change every field's geometry and is not what was reported.
- Verify against a dialog *and* a config tab in the same pass. A fix proven on one surface is exactly the failure mode
  being corrected.
- Hover, focus, disabled and error states must all still be distinguishable from rest after the border weight changes.
