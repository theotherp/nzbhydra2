# FM-048: Fluid-Table Responsibility And The `desktop-wide` Viewport Record

Status: done Owner: migration-implementer Feature IDs: F-SEARCH-RESULTS, F-SEARCH-SORT-FILTER Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-042 Blocks: None

## Dependency Notes

This is a **registry-contract reconciliation packet** for two consequences ADR-0011 (`accepted` 2026-08-18) placed on records FM-042 was not allowed to touch. It is not a feature packet and it changes no product behavior.

`Depends on: FM-042` is literal and load-bearing in both directions. FM-042 is `done` (`e0900fa7e`), so both facts this packet records are already true in the shipped implementation and already evidenced in a real browser — this packet
transcribes them into the registries, it does not establish them. Had FM-042 not landed, both entries would be false.

Both items were attempted as `/fm-quickfix` maintenance fixes and **correctly refused** by that command's qualification gate, which forbids any edit to a `FEATURES.yaml`, `COMPONENTS.yaml`, or `APIS.yaml` contract
(`README.md`, *Choosing A Mechanism*; `MAINTENANCE.md`, *What belongs here*). They are the last two bullets under `MAINTENANCE.md`'s *Open candidates*, each already annotated as routed to `/fm-orchestrate`. FM-042's own handoff
proposed the `C-RESULT-TABLE` item as a quickfix candidate (`tasks/FM-042-…md:448`-adjacent *Follow-Up Work*); that classification was wrong and the ledger records the correction. FM-042's packet deliberately excluded
`COMPONENTS.yaml` from its `Files Allowed To Modify` (`:49-65`), which points the same way.

The validator-side half of the second item is already discharged: `core/ui-react/scripts/validate-migration.mjs:32`'s `visualViewportNames` allowlist gained `"desktop-wide"` in quickfix `b1bf2770a`. That lifted the block only; the
registry edit it unblocked is this packet's.

## Outcome

`C-RESULT-TABLE` states its fluid, never-horizontally-scrolling layout responsibility, and `F-SEARCH-RESULTS`'s visual contract names `desktop-wide` 1900x1000 in its structured `contract.viewports` array, so `npm run validate:migration`
machine-checks the viewport that ADR-0011 required and FM-042 could only record in prose. Nothing else in either registry changes, and no source file, test, or rendered pixel changes at all.

## Boundary Rationale

**This is deliberately one packet, not two.** Both items are registry-contract reconciliation of the *same* accepted decision — ADR-0011's `Consequences` section states both, three bullets apart — arising from the *same* predecessor
task, describing the *same* component's layout model, gated by the *same* single command, and reviewable as one diff of four documentation files. Splitting them would be a split by *registry file* (`COMPONENTS.yaml` versus
`FEATURES.yaml`), which `README.md`'s *Creating Task Batches* rules forbid outright: "Do not split a feature by source file or layer merely to create smaller tasks." There is no dependency between them, no separate runtime boundary, no
independent product capability, and no unresolved contract — the four criteria that would justify a split. Two near-identical packets, each with its own implementer, reviewer, and verification chain, for two YAML field edits is exactly
the overhead `MAINTENANCE.md`'s preamble records as having caused debt rather than prevented it.

It is equally deliberately **below** the normal "substantial vertical capability" bar, for the reason FM-047 records: the unit of work is as large as the defect. It cannot be usefully enlarged — bundling unrelated registry improvements
to reach a larger size is forbidden by the same rules — and it cannot be folded into an adjacent packet, because the only adjacent packet is `done`.

## Decision Dependencies

- Accepted ADRs governing this task: **ADR-0011** (the results table's scroll model, and how a viewport-sticky column header coexists with contained horizontal scroll) — `accepted` 2026-08-18, **Option E** with sub-decision
  **E-title (i) wrap** and a scoped `desktop-wide 1900x1000` evidence viewport, by explicit decision of the repository owner. It is the sole decision source for both edits; see the two literal quotations under `Acceptance`.
  **ADR-0006** (semantic visual parity policy) governs the record being edited and constrains *what may not happen here*: it reserves baseline and variance acceptance for an explicit human decision, which this task must not simulate.
  **ADR-0004** (independent behavioral/accessibility/visual gates) governs the verification proportionality argument.
- This task defines no new visual contract, no new state, no new geometry check, no new evidence, and no new variance. It amends the `viewports` array of an existing contract whose `status` is `proposed`, so no human acceptance exists
  to invalidate and none is created. Nothing about it makes any `proposed` record more accepted than it is today.
- Proposed or rejected ADRs blocking this task: **None**.

## Files Allowed To Modify

- `docs/frontend-migration/COMPONENTS.yaml` — **only** `C-RESULT-TABLE`'s `responsibility` field (`:165` at baseline `64d5347a9`; the record is `:164-173`). No other record, and no other field of this record.
- `docs/frontend-migration/FEATURES.yaml` — **only** `F-SEARCH-RESULTS`'s `visual.contract.viewports` array (`:219` at the same baseline; the record starts `:202`). Not its `note`, not its `states`, not its `geometry_checks`, not its
  `evidence`, not its `snapshots`, not its `variances`, not its `status`, and not one character of any other record in the file — `F-SEARCH-SORT-FILTER` (`:260`) included. See `Out Of Scope` for why that record is excluded.
- `docs/frontend-migration/MAINTENANCE.md` — **only** the deletion of the two now-discharged bullets under *Open candidates*, identified by their opening text (the `` `desktop-wide` is recorded in prose `` bullet and the
  `` `C-RESULT-TABLE` does not record its fluid `` bullet), each replaced by nothing. That list changes as other candidates are discharged, so match on text, not position or count. Do **not** add a
  ledger entry above: that section records `/fm-quickfix` fixes, and this is not one. Decision source: that section's own preamble defines it as a list of defects *not yet fixed*, so leaving a discharged one there would make it false
  and would invite a future agent to re-attempt work already done.
- `docs/frontend-migration/STATUS.md` and this task packet.

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- **Any change under `core/ui-react/src/`, `core/ui-react/scripts/`, or `tests/system/`.** No React source, no component test, no Playwright spec, no `visualEvidence.ts`, no `validate-migration.mjs`. Both facts being recorded are
  already implemented and already evidenced; if this task appears to need a code change, its premise is wrong — escalate rather than widen.
- **Applying `desktop-wide` to the ~28 existing "at desktop" / "at 1280x800 and 390x844" checks** in `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER`. ADR-0011's `Human Decision` item 3 declined this explicitly and in those words — "no
  per-check editorial pass is authorized by this decision" — precisely to avoid that pass. Widening it is a decision only the repository owner may make; if the implementer believes it is required, that is an escalation, not a design
  choice available here.
- **`F-SEARCH-SORT-FILTER`'s `visual` record.** Its `contract.viewports` stays `desktop` + `mobile`, which is not an oversight but the literal content of its own FM-042 geometry check: "this record's contract viewports are unchanged by
  FM-042 (`desktop-wide` is scoped to `F-SEARCH-RESULTS`'s own scrolled/title-collapse states)". The record is listed under `Feature IDs` because `README.md`'s *Registry Rules* require every linked record to be "updated or explicitly
  confirmed unchanged", and confirming is what this task does to it. See `Considerations And Follow-Up` for one observation about it that is deliberately not acted on.
- **Any human visual-acceptance metadata.** `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` stay `visual.status: proposed`; no `decision`, `accepted_by`, or `accepted_on` key is added anywhere; no existing acceptance history is re-dated
  or removed; and all four `proposed` variances on `F-SEARCH-RESULTS` — including the two ADR-0011 ones FM-042 added — keep `status: proposed`. ADR-0011's own acceptance text says it "is not visual acceptance of anything", and no agent
  may supply that acceptance.
- **`C-RESULT-TABLE`'s `state`, `task`, and `backlog` fields.** They stay `partial`, `FM-012`, and the existing deferred rationale. This packet delivers no component parity, so claiming ownership of the record would be false.
- **Editing `FM-042` or any other `done` packet.** FM-042's statements that `desktop-wide` was deliberately *not* made a structured entry (`:298`, `:408`) are accurate historical records of what FM-042 did under its own scope, not
  defects. `README.md`'s *Workflow* carve-out permits factual corrections to a `done` packet's evidence; this is not one, and rewriting attested findings is forbidden.
- **ADR-0011's `Required Re-Measurement Before Any Option Is Relied On` obligations**, and every remaining bullet under `MAINTENANCE.md`'s *Open candidates* other than the two this packet discharges.

## Context To Read

- `README.md` — *Sources Of Truth*, *Visual Parity*, *Registry Rules*, *Verification Integrity*, *Choosing A Mechanism*, and the task-boundary rules.
- `decisions/ADR-0011-results-table-scroll-model-and-sticky-header.md` — the `Human Decision` section in full (especially items 1 and 3) and the `Consequences` section's first two groups. The retained Option A–D consequence groups are
  **record only and not in force**; do not implement from them.
- `decisions/ADR-0006-visual-parity-policy.md` — what a `proposed` contract is and who may accept one.
- `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` in `docs/frontend-migration/FEATURES.yaml` in full, and `C-RESULT-TABLE` in `docs/frontend-migration/COMPONENTS.yaml`.
- `MAINTENANCE.md`'s *Open candidates*, both bullets this packet discharges, and the `2026-08-18 — Allow desktop-wide in the visual viewport allowlist` entry above them.
- `tasks/FM-042-search-results-sticky-toolbar-and-header.md` — its `Files Allowed To Modify` (`:49-65`) and the two disclosures at `:297-298` and `:408` explaining why the structured entry was left undone.
- `core/ui-react/scripts/validate-migration.mjs:30-32` (the allowlist and its "must stay in step with" comment) and `:266-279` (the viewport check that consumes it); `tests/system/tests/visualEvidence.ts:3-15` (the harness-side map and
  its FM-042 comment).
- `tests/system/tests/results.spec.ts:1978`, `:2342`, and `:2475` — the three tests whose `prepareVisualEvidence(page, viewport, …)` calls already run at `"desktop-wide"`, read-only, to confirm first-hand that the viewport being
  recorded is genuinely exercised.

## Acceptance

- **`C-RESULT-TABLE`'s `responsibility` records the fluid, never-horizontally-scrolling layout model, and why it matters.** The existing text — "Hydra-specific search result processing, paging, grouping, filtering, sorting, selection,
  and presentation using TanStack primitives" — is retained in full and extended, not replaced. The addition must state all three literal facts, in the registry's terse single-line style: the table is **fluid** with **no horizontal
  scroll at any width at or above the 768px stacking breakpoint**, and consequently **no scrolling ancestor exists between a sticky column header `<th>` and the document**, which is what makes the viewport-sticky header work. Decision
  source, quoted from ADR-0011's `Consequences`: "`C-RESULT-TABLE` gains a 'fluid, never horizontally scrolling' layout responsibility worth recording when its record is next reconciled." The sticky-header clause is not decoration — it
  is the reason the property is load-bearing rather than cosmetic, and without it a future change that reintroduces an `overflow-x: auto` wrapper would silently break the sticky header with nothing in the registry to warn against it.
  The `768px` figure is legacy's measured stacking threshold (`core/ui-src/less/partials/tables.less:91`), realized in `RefineSidebar.tsx`'s `useCompactRefineSurface()`; verify it in the source rather than copying it from here.
- **`C-RESULT-TABLE`'s every other field is byte-identical.** `legacy`, `target`, `consumers`, `classification`, `state: partial`, `task: FM-012`, and the `backlog` deferred rationale are all unchanged, and that must be confirmed
  explicitly in the handoff rather than assumed. In particular `task:` does **not** become `FM-048`.
- **`F-SEARCH-RESULTS`'s `contract.viewports` gains exactly one entry: `{ name: desktop-wide, width: 1900, height: 1000 }`,** appended after the existing `mobile` entry. The existing `{ name: desktop, width: 1280, height: 800 }` and
  `{ name: mobile, width: 390, height: 844 }` entries are unchanged and stay first. The three literal values come from `tests/system/tests/visualEvidence.ts:14`'s `"desktop-wide": {width: 1900, height: 1000}` and ADR-0011's `Human
  Decision` item 3 ("add `desktop-wide 1900x1000`"), which agree; read both and escalate rather than choosing if they ever disagree. The name must be exactly `desktop-wide` — the allowlist at `validate-migration.mjs:32` and the harness
  map key are the same string, and a variant spelling fails the gate.
- **The scoping survives the move into structured form.** `F-SEARCH-RESULTS`'s existing geometry check beginning "FM-042 (ADR-0011): `desktop-wide` (1900x1000) is additive and applies only to the three scrolled/title-collapse states
  below" (`FEATURES.yaml:222` at baseline) is retained unedited. It is the only mechanism carrying the per-state scoping, because `contract.viewports` is a flat array with no per-state field, so deleting or weakening it would silently
  convert a scoped viewport into a record-wide one. No other check's viewport phrasing changes, the `states` array is unchanged, and the `snapshots` array — which already lists `sticky-header-desktop-wide.png` — is unchanged.
- **`F-SEARCH-SORT-FILTER` is confirmed unchanged and correct.** Verify first-hand that its `contract.viewports` is still `desktop` + `mobile`, that its FM-042 geometry check still reads "this record's contract viewports are unchanged
  by FM-042", and that the two remain consistent with each other after this packet lands. Record the confirmation; change nothing. If the implementer's own reading contradicts this, escalate — do not reconcile by editing.
- **No visual acceptance is created, implied, or re-dated,** exactly as enumerated under `Out Of Scope`. `grep -c "status: proposed"` over `F-SEARCH-RESULTS`'s variances returns the same count before and after.
- **No behavior, source, or test file changes.** `git diff --stat` at handoff lists exactly four paths, all under `docs/frontend-migration/`. `core/ui-react/`, `tests/system/`, `core/ui-src/`, and `docs/frontend-migration/decisions/`
  are byte-identical to `HEAD`.
- **`MAINTENANCE.md`'s two discharged *Open candidates* bullets are removed**, the other three bullets and every ledger entry above them are untouched, and no new ledger entry is added.
- **The gate is proven to bite, not merely to pass.** The whole point of the `desktop-wide` half is to bring the viewport under machine checking, so demonstrate that: temporarily mistype the new entry's `name` (for example
  `desktop-wideX`), run `npm run validate:migration`, and observe it fail with `FEATURES.yaml F-SEARCH-RESULTS visual contract requires named integer viewports`; then revert the probe and observe it pass. Record both outcomes. The
  working tree must be free of the probe at handoff — confirm with `git diff`.

## Verification

Prerequisites: none beyond a working Node install. No backend, no mockserver, no Docker, and no browser are required.

- Working directory: `/home/sist/projects/nzbhydra2/core/ui-react`
- `npm run validate:migration` — prints `Migration registries and task metadata are valid.` and exits 0, with FM-048 correctly placed under `## Upcoming` in `STATUS.md` for its `ready` status.
- The negative probe described under `Acceptance`, run from the same directory, with both the failing and the restored-passing results recorded.
- Working directory: `/home/sist/projects/nzbhydra2`
- `git diff --stat` — exactly four paths: `docs/frontend-migration/COMPONENTS.yaml`, `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/MAINTENANCE.md`, `docs/frontend-migration/STATUS.md`, plus this task packet.
- `git diff -- core/ui-react tests/system core/ui-src docs/frontend-migration/decisions docs/frontend-migration/APIS.yaml` — empty.
- `git diff -- docs/frontend-migration/COMPONENTS.yaml` — one changed line; `git diff -- docs/frontend-migration/FEATURES.yaml` — one changed line.
- `git diff --check` — no whitespace errors.
- Confirm task-owned changed files are all listed under Files Allowed To Modify.
- Confirm verification leaves no unexpected generated or modified files.

The React quality chain (`typecheck`, `lint`, `format:check`, `test`, `build`, `check:api`) is **not required**: this task changes no file under `core/ui-react/`, and `validate:migration` is the only gate that reads the files it does
change. `tests/system`'s `tsc --noEmit` and any Playwright run are **not required and must not be claimed**: no spec changes, and FM-042's own real-backend run (`results.spec.ts` 22/22) already evidenced every `desktop-wide` state this
packet records. Record all of these as not run, with this reason — never as passed. This proportionality is ADR-0004's independent-gates principle applied honestly, not a relaxation of `README.md`'s *Verification Integrity*.

## Considerations And Follow-Up

**One observation about `F-SEARCH-SORT-FILTER`, recorded rather than acted on.** Its `visual.note` states that every sortable header's full label fits "at 1280x800 in both sidebar states and at 1900x1000", and `results.spec.ts:2342`
does loop that assertion over both viewports — so the record's *evidence* reaches `desktop-wide` while its *contract check* deliberately asserts only at 1280x800. Both statements are true and neither is stale; the narrower check is the
scoping ADR-0011 chose. Adding `desktop-wide` to that record's `contract.viewports` would therefore be the widening `Out Of Scope` forbids, not a correction. Whoever performs the outstanding ADR-0006 human acceptance for these two
records is the right person to decide whether the scoped or the record-wide form is what they want long-term; if they choose to widen, that is a fresh decision and a fresh packet, and it carries the ~28-check editorial pass ADR-0011
declined.

## Expected Implementer Gaps

Stated plainly so the coordinator can judge the cost — honestly, this is very small:

- **One extended line in `COMPONENTS.yaml`** and **one appended array element in `FEATURES.yaml`**. That is the entire registry change.
- **Two bullets deleted from `MAINTENANCE.md`**, plus `STATUS.md` and this packet's lifecycle text. Note that the ledger is actively edited by `/fm-quickfix` between packets — re-read *Open candidates* rather than trusting any count.
- **One cheap validator run, plus the negative probe and its revert.** No install, no build, no browser, no backend.
- **No source change, no test change, no new evidence, no new visual contract, no ADR.**

If the implementer finds the work is larger than this, that is a signal the packet's premise is wrong — escalate rather than expand.

## Handoff

### Outcome

Two registry-contract reconciliation edits, both narrow, discharging two ADR-0011 `Consequences` items FM-042 was not allowed to touch:

- `COMPONENTS.yaml`'s `C-RESULT-TABLE` `responsibility` field is extended (not replaced) with the fluid, never-horizontally-scrolling layout responsibility: the table is fluid with no horizontal scroll at any width at or above the 768px
  stacking breakpoint (verified in source: `RefineSidebar.tsx:69-71`'s `useCompactRefineSurface()` and its preceding comment, itself citing `core/ui-src/less/partials/tables.less:91`'s `@media (max-width: @screen-xs-max)`, which
  resolves to 767px), so no scrolling ancestor exists between a sticky column header `<th>` and the document — the property that makes the viewport-sticky header possible. Confirmed the `overflowX: "auto"` wrapper is genuinely gone
  from `SearchResults.tsx` (only an explanatory comment referencing its historical removal remains, at `:977-978`), so the claim is not aspirational.
- `FEATURES.yaml`'s `F-SEARCH-RESULTS` `visual.contract.viewports` gains exactly one appended entry, `{ name: desktop-wide, width: 1900, height: 1000 }`, after the existing `desktop`/`mobile` entries, matching
  `tests/system/tests/visualEvidence.ts:14`'s `{width: 1900, height: 1000}` and ADR-0011's `Human Decision` item 3.
- `MAINTENANCE.md`'s two now-discharged *Open candidates* bullets (the `desktop-wide` one and the `C-RESULT-TABLE` one) are deleted; no ledger entry added.
- `STATUS.md` updated: FM-048 moved from `## Upcoming` to `## Review`, with its context paragraph updated from "is `ready`... immediate next work" to "is `review`... pending a fresh independent reviewer."
- This task packet: `Status` header (`ready` → `review`, `Owner:` → `migration-implementer`) and this Handoff.

No React source, no test, and no user-observable behavior changed. `core/ui-react/`, `tests/system/`, `core/ui-src/`, and `docs/frontend-migration/decisions/` are byte-identical to `HEAD`.

### Files Modified

- `docs/frontend-migration/COMPONENTS.yaml` — one line, `C-RESULT-TABLE`'s `responsibility` field extended. Every other field of the record (`legacy`, `target`, `consumers`, `classification`, `state: partial`, `task: FM-012`, `backlog`)
  confirmed byte-identical.
- `docs/frontend-migration/FEATURES.yaml` — one line, `F-SEARCH-RESULTS`'s `contract.viewports` array gains the `desktop-wide` entry. `note`, `states`, `geometry_checks` (including the scoping check that carries the per-state
  restriction, retained unedited), `evidence`, `snapshots`, `variances` (all four still `status: proposed`), and `status` all confirmed unchanged. `F-SEARCH-SORT-FILTER`'s entire record, including its own `contract.viewports`
  (`desktop` + `mobile`, unchanged) and its FM-042 geometry check ("this record's contract viewports are unchanged by FM-042"), confirmed byte-identical.
- `docs/frontend-migration/MAINTENANCE.md` — the two discharged *Open candidates* bullets deleted, matched by their opening text. The other two bullets (Prettier formatting, Refill keyboard-reachability) and every ledger entry above
  untouched. No ledger entry added.
- `docs/frontend-migration/STATUS.md` — FM-048 moved `Upcoming` → `Review`; its context paragraph updated to match; FM-022's entry and every other paragraph untouched.
- `docs/frontend-migration/tasks/FM-048-fluid-table-responsibility-and-desktop-wide-viewport.md` — this packet: `Status`/`Owner` header and this Handoff. (Present at invocation start as designer output, untracked; task-attributable.)
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`. `git status --porcelain` reports exactly these five paths (four modified, one untracked) and nothing else.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: none required (no build, no browser, no backend).

### Verification Evidence

| Working directory | Command | Result |
|-------------------|---------|--------|
| `core/ui-react` | `npm run validate:migration` | Passed. Exit 0. `Migration registries and task metadata are valid.` |
| `core/ui-react` | Negative probe: `FEATURES.yaml`'s new entry mistyped to `{ name: desktop-wideX, width: 1900, height: 1000 }`, then `npm run validate:migration` | **Failed as required.** Exit 1. `Migration registry validation failed:` / `- FEATURES.yaml F-SEARCH-RESULTS visual contract requires named integer viewports` — the exact message the packet specifies. |
| `core/ui-react` | Probe reverted (`desktop-wideX` → `desktop-wide`), then `npm run validate:migration` | Passed. Exit 0. `Migration registries and task metadata are valid.` |
| `/home/sist/projects/nzbhydra2` | `git diff --stat` | Passed. Exactly four paths: `COMPONENTS.yaml`, `FEATURES.yaml`, `MAINTENANCE.md`, `STATUS.md`, plus the untracked task packet. |
| `/home/sist/projects/nzbhydra2` | `git diff -- core/ui-react tests/system core/ui-src docs/frontend-migration/decisions docs/frontend-migration/APIS.yaml` | Passed. Empty. |
| `/home/sist/projects/nzbhydra2` | `git diff -- docs/frontend-migration/COMPONENTS.yaml` | Passed. One changed line. |
| `/home/sist/projects/nzbhydra2` | `git diff -- docs/frontend-migration/FEATURES.yaml` | Passed. One changed line (after probe revert; confirmed clean). |
| `/home/sist/projects/nzbhydra2` | `git diff --check` | Passed. No whitespace errors. |
| `/home/sist/projects/nzbhydra2` | `awk` scoped to the `F-SEARCH-RESULTS` record, `grep -c "status: proposed"` | Passed. `5` (the record's `visual.status: proposed` plus its four variances' `status: proposed`), identical before and after — no line in that range was touched. |

**Not run, with reason** — the packet's Verification section states these are not required and must not be claimed as passed:

- `core/ui-react`'s React quality chain (`typecheck`, `lint`, `format:check`, `test`, `build`, `check:api`) — not required: no file under `core/ui-react/` changed, and `validate:migration` is the only gate that reads the files this
  task changes.
- `tests/system`'s `tsc --noEmit` — not required: no spec file changed.
- Any Playwright run — not required: no spec changed, and FM-042's own real-backend run (`results.spec.ts` 22/22) already evidenced every `desktop-wide` state this packet records (`results.spec.ts:1978`, `:2342`, `:2475` confirmed
  read-only to already call `prepareVisualEvidence(page, "desktop-wide", …)`).

### Verification Basis

- Baseline: `66144982b1131eafc66da5821919031c80736b2c`.
- Command coverage: `npm run validate:migration` (all three invocations) reads and is affected by `docs/frontend-migration/COMPONENTS.yaml`, `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, and every file
  under `docs/frontend-migration/tasks/` (including this packet, for its `Status` field and STATUS.md-section consistency check). `docs/frontend-migration/MAINTENANCE.md` is not read by the validator and affects no command's evidence.
  No implementation or test file (`core/ui-react/`, `tests/system/`) is involved in any command.
- File-content manifest (SHA-256, post-probe-revert, final on-disk state):
  - `docs/frontend-migration/COMPONENTS.yaml`: `bc3369de1ded905cfcec7633389b5d8a268d8e2c3988316876c1f426ff91b528`
  - `docs/frontend-migration/FEATURES.yaml`: `565b4f64c6a364ad2689430229a4f4f996c1ef5e646ba544e7e69b1f8c91b638`
  - `docs/frontend-migration/STATUS.md`: `d56bb091789b8119bb5071893592e073eec6ac0d328f75accbc74384ac56101a`
  - `docs/frontend-migration/MAINTENANCE.md`: `d4590993f6bb1acc6bd3ec41b81cd5f51c48023b93400e321ed32f851c4035a2` (not command-coverage-relevant, listed for completeness)
- Completed after the last change to each command's listed files: yes. The final `validate:migration` run (the "Passed" row after the probe revert) was executed after every content edit above, including the probe revert itself, and
  its output is the evidence of record.
- Task-owned changes after verification: `None`. The negative probe's own edit-and-revert cycle happened *during* verification and left the working tree byte-identical to its pre-probe state, confirmed by the final `git diff --
  FEATURES.yaml` matching the one shown in Files Modified.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: `None`.
- Development dependencies added, removed, or changed: `None`.

### Architecture Decisions

- **ADR-0011** (accepted 2026-08-18): both edits transcribe `Consequences` items this ADR placed on records FM-042 could not touch — `C-RESULT-TABLE`'s fluid/never-scrolling responsibility (quoted in `Consequences`: "`C-RESULT-TABLE`
  gains a 'fluid, never horizontally scrolling' layout responsibility worth recording when its record is next reconciled") and the `desktop-wide 1900x1000` structured viewport entry (`Human Decision` item 3), scoped to FM-042's own
  states only, per the same item's explicit decline of a per-check editorial pass.
- **ADR-0006**: governed what must *not* happen — no visual acceptance created, implied, or re-dated; `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` stay `visual.status: proposed`; all four variances stay `proposed`.
- **ADR-0004**: independent-gates principle applied to the Verification proportionality — only `validate:migration` is required; the React quality chain and Playwright runs are recorded not-run rather than skipped silently.
- `ADR REQUIRED` proposal triggered during this task: `None`.

### Assumptions

- None beyond what the packet already settles. The two designer-established points (scoping stays with FM-042's own states; `F-SEARCH-SORT-FILTER` stays unchanged) were treated as binding, not relitigated, per the task instructions.

### Deviations From The Packet

- None.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `C-RESULT-TABLE` (`COMPONENTS.yaml`): `responsibility` extended as described above. `target`, `consumers`, `classification`, `state: partial`, `task: FM-012`, and `backlog` explicitly confirmed unchanged — `task:` does **not**
  become `FM-048`.
- `F-SEARCH-RESULTS` (`FEATURES.yaml`): `visual.contract.viewports` gains the `desktop-wide` entry. `applicability`, `status: proposed`, `note`, `contract.setup`, `contract.states`, `contract.geometry_checks` (the FM-042 scoping check
  retained unedited), `evidence`, `snapshots`, and all four `variances` (each still `status: proposed`) confirmed unchanged. `target`, `tests`, `selectors`, `parity`, `gaps`, `task: FM-010`, and `backlog` confirmed unchanged.
- `F-SEARCH-SORT-FILTER` (`FEATURES.yaml`): confirmed unchanged and correct — `visual.contract.viewports` is still `desktop` + `mobile`, and its own FM-042 geometry check still reads "this record's contract viewports are unchanged by
  FM-042 (`desktop-wide` is scoped to `F-SEARCH-RESULTS`'s own scrolled/title-collapse states)". The two remain consistent with each other after this packet lands.
- No `APIS.yaml` record is linked; confirmed unchanged (`git diff -- docs/frontend-migration/APIS.yaml` empty).
- ADR-0006 visual records: applicability and lifecycle unchanged for both linked records (`applicable`/`proposed`). `F-SEARCH-RESULTS`'s scoped viewports gain one machine-checked structured entry; its scoped states, geometry checks,
  evidence, and snapshots are otherwise unchanged. No variance disposition changed — all four stay `proposed`. Human acceptance remains pending for both records; this task neither performs nor implies it. No behavioral or accessibility
  gate is implied by this visual-contract edit — it is a viewport-name/dimension record only.

### Follow-Up Work

- None required by this task. The two `Open candidates` this packet targeted are discharged and removed from `MAINTENANCE.md`. The remaining two `Open candidates` (Prettier formatting across 11 `tests/system` spec files, and Refill
  keyboard-reachability) are out of this task's scope and were left untouched, as instructed.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`.
