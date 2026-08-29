# FM-128: Bulk-Send Row Feedback — Establish, Assert, Record

Status: planned Owner:
Feature IDs: F-SEARCH-DOWNLOADS
Component IDs: None
API IDs: API-DOWNLOAD-ADD-NZBS
Depends on: None
Blocks: FM-129

## Outcome

After a bulk send, the rows that were actually added visibly read "Downloaded" — and that claim is finally *tested* and
*recorded* instead of contradicted. The repository currently asserts both truths at once: `SearchResults.tsx:936-969`
(FM-040) maps the response's `addedIds` back to `downloadedIds` (bridging the id-form mismatch — the request sends
`downloadId`'s `guid.searchId`, the response returns bare guids, hence `.split(".")[0]`), while `downloads.spec.ts:124-129`
states as fact that "the row's Downloaded chip is raised only by the direct NZB/torrent transfer". Zero tests at any level
assert post-bulk-send row state (every unit bulk test stubs `addedIds` and asserts only the request; the system test stops
at the response body). Legacy's own bulk path never marked rows either — `search-results-controller.js:986-999` only
deselects; `.sabnzbd-success` came from the per-row `addable-nzb` button React does not have — so whichever way the
empirical check falls, the ledger's "parity regression" framing is corrected too. One packet: the behavior, its missing
assertions at both levels, and the false records must move together.

## Decision Dependencies

None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/{SearchResults.tsx,SearchResults.test.tsx,DownloadActions.tsx,ResultRow.tsx}`
  (source files only if the empirical check proves the wiring broken)
- `tests/system/tests/downloads.spec.ts`
- `docs/frontend-migration/FEATURES.yaml` (`F-SEARCH-DOWNLOADS` only), this task packet

## Out Of Scope

- Any styling/px change in these files (FM-129 owns that; it is sequenced after this task)
- A per-row send-to-downloader control (legacy's `addable-nzb`; retiring or reproducing it is not this task's question)
- The direct-transfer chip path and its optimistic-on-click semantics (`DownloadActions.tsx:437-462`)

## Context To Read

`SearchResults.tsx:287,391-393,934-969,1637-1639`; `DownloadActions.tsx:142-175`; `domain/downloads/actions.ts:22-40,99-115`;
`downloads.spec.ts:33-42,44-153`; `SearchResults.test.tsx:1111-1250,1840-1861`; legacy
`docker/uiDev/ui-src/js/directives/{addable-nzb.js,download-nzbs-button.js}` and `search-results-controller.js:986-999`;
`FEATURES.yaml:316-338`; the 2026-08-27 `MAINTENANCE.md` open candidate this task discharges.

## Acceptance

- First, empirically: against the real backend, perform a bulk send and record (screenshot + DOM evidence) whether the sent
  row shows the Downloaded chip and leaves the selection. The handoff states the observation before any fix.
- If broken: fix within the allowlist, with a unit regression test observed red against the unfixed code.
- Either way, the behavior is pinned: a unit test drives a bulk send whose stubbed response carries `addedIds` for a subset
  of selected rows and asserts the chip appears on exactly that subset and those rows are deselected; and
  `downloads.spec.ts`'s downloader-workflow test asserts the sent row's visible "Downloaded" chip after the send,
  replacing the false comment at 124-129 (and correcting 33-42 if inaccurate).
- `F-SEARCH-DOWNLOADS` is reconciled: it gains the `gaps:` key it lacks (nothing currently substantiates
  `parity: partial` — either substantiate or promote, on the evidence gathered here), and its `send-to-downloader`
  selector entry — a legacy per-row testid React does not render — is corrected to what ships.
- No `data-testid` additions unless the system-level chip assertion genuinely needs one; if added, record it in
  `F-SEARCH-DOWNLOADS.selectors`.
- Screenshot strip per Visual Gate only if rendering changed (a wiring fix changes it: capture the post-send row at
  1280x800); pure test-and-record outcome needs none.

## Verification

- `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm test -- --run && npm run build && npm run check:api && npm run validate:migration` — all pass
- Root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/downloads.spec.ts` — all pass, including the new post-send row assertion
- Root: `git diff --check` clean; changed files match the allowlist; if no source fix was needed, `SearchResults.tsx`/`DownloadActions.tsx`/`ResultRow.tsx` show comment-only or zero diff — state which in the handoff

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the deliverable is an evidence-first verdict across unit, system, and registry levels, with a
  contradiction to resolve, not a pattern to apply.
- Reviewer: `opus` — must independently re-derive the verdict, not audit a diff against a spec.
- Fixer: `sonnet` — once the verdict stands, expected corrections are mechanical.

Implementer prompt: Start from `SearchResults.tsx:936-969` and `downloads.spec.ts:124-129` — one of them is wrong. Prove
which in a real browser before writing anything. The trap: the deselect at `:958` makes a successful send *look* like the
row vanished from feedback; check the chip on the row itself, in grouped and ungrouped display modes.
Reviewer prompt: Distrust the packet's own framing until the empirical evidence is shown. Check hardest that the new unit
test would fail if the `.split(".")[0]` bridge were deleted, and that the spec comment rewrite matches what actually ran.
