# FM-114: Bulk Send Default Category Parity

Status: planned Owner:
Feature IDs: F-SEARCH-DOWNLOADS
Component IDs: C-DOWNLOAD-ACTIONS
API IDs: None
Depends on: None
Blocks: None

## Outcome

A bulk send with no explicit category choice again reaches the downloader with the downloader's configured
`defaultCategory`, as legacy did. Two client-side causes, one defect: `DownloadActions.tsx` preselects
`downloader.defaultCategory` **only if it appears verbatim in the live `get_cats` list** and otherwise silently falls
back to `null`, and the "Use downloader default" option maps to `null` too — while `null` reaches SABnzbd as no `cat`
parameter at all. Legacy read `defaultCategory` straight off the downloader and sent it verbatim, consulting no list.
Silent wrong behaviour on every bulk send, and no surviving test covers it: FM-094 deleted the two `cat` assertions
when it removed the legacy suite.

**The ledger's framing of this item is wrong and must not be followed.** It says the fix "crosses `DownloadActions.tsx`
and the server path that resolves a null category". There is no such server path — `Downloader.addBySearchResultIds`
special-cases only the three sentinel strings and lets `null` through unchanged, `Sabnzbd.addContent` then omits `cat`
for a null-or-empty category, and `defaultCategory` has exactly one backend reader, `SafeDownloaderConfig`, which only
exposes it to the UI. Resolving the default was always the client's job. `downloads.spec.ts:102-107`'s comment
("React sends `null`, which the server resolves to that same default") is likewise factually wrong and is corrected here.

## Decision Dependencies

None — this restores recorded legacy behaviour rather than choosing new behaviour.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/DownloadActions.tsx` — **only** the category preselection and the
  category actually sent, per Acceptance. The downloader select, the TORBOX compatibility gate, the duplicate-reason
  flow, the `send-to-downloader`/`download-nzb` test ids, and the select's option order and labels are frozen.
- `core/ui-react/src/features/search/results/SearchResults.test.tsx` — **add-only** cases; no existing case deleted,
  retargeted, or weakened to make a case pass
- `tests/system/tests/downloads.spec.ts` — restore the two `cat` assertions FM-094 removed and correct the wrong
  server-resolution comment at `:102-107` and the finding comment at `:135-145`
- The `C-DOWNLOAD-ACTIONS` record's `responsibility` in `../COMPONENTS.yaml`
- This task packet and `../STATUS.md`

## Out Of Scope

- `core/ui-react/src/domain/downloads/actions.ts` — `AddFilesRequest`, `addFilesRequest()`, `sendToDownloader()` and
  `requiresDuplicateReason()` are unchanged. The category is decided by the caller; the wrapper stays a passthrough,
  and `F-HISTORY-DOWNLOADS`, its other consumer, must see no change at all.
- **Every Java file.** A server-side fallback in `Downloader.addBySearchResultIds` was considered and is refused: it
  would redefine what `category: null` means on a shared endpoint — an API-contract change — and it would also hit
  `checkDuplicateMovieDownload`, which deliberately sends `null`. Legacy resolved this client-side and the sentinel
  strings already ride in the same field, so the client fix reproduces legacy exactly with no contract movement. If a
  reviewer wants the server behaviour instead, that is a `DECISIONS.md` question, not an in-flight substitution.
- The separately-logged "bulk send leaves the sent rows unmarked" gap (`SearchResults.tsx`'s `onDownloaded` mapping)
  and the cleared-size-constraint bug — both `MAINTENANCE.md` items, neither fixed here.
- `core/ui-react/src/api/generated/openapi.ts` and `core/openapi.json` (untouched; the hand-written request type stands)

## Context To Read

- `DownloadActions.tsx` — the `category` state and the `categories(transport, downloader)` `.then` that gates
  preselection on list membership; `send()`'s `request.category = category`; the `MenuItem value=""` option
- Legacy, via `git show 4642eed5b^:core/ui-src/js/nzb-download-service.js` — `download()` opens with
  `var category = downloader.defaultCategory;` and consults no fetched list; only an empty default opened
  `DownloaderCategoriesService.openCategorySelection`. Also `git show 4642eed5b^:core/ui-src/js/downloader-request-service.js:11`
  (`buildAddFilesRequest`) and `.../config/formly-downloaders.js:43` (new downloaders seeded `"Use no category"`).
- `core/.../downloading/downloaders/Downloader.java:113-128` (the three sentinels; `null` falls through the `else`) and
  `.../sabnzbd/Sabnzbd.java:139-147` (`if (!Strings.isNullOrEmpty(category))` — why `null` yields no `cat`)
- `shared/mapping/.../config/downloading/DownloaderConfig.java` (`defaultCategory`, no initializer) and
  `core/ui-react/src/features/config/downloading/downloadingSettings.ts` (React seeds `"Use no category"`)
- `tests/system/tests/environment.ts` (`sabnzbdMockCategory`, default `"Deterministic Category"`),
  `fixtures.ts`'s `configureSabnzbdMock()` writing it as `defaultCategory`, and
  `other/mockserver/.../MockSabnzb.java:62` (the mock's `get_cats` list, which does **not** contain it — this
  mismatch is exactly what the membership gate turns into a silent `null`)

## Acceptance

- With no explicit choice, a bulk send transmits `downloader.defaultCategory` verbatim — including when that value is
  absent from the fetched category list, and including the three sentinel strings, which the server still interprets.
  A downloader with no configured default still sends `null`, as today.
- The category select preselects the configured default without gating on list membership. When the default is not in
  the fetched list the select must still visibly represent what will be sent rather than silently reading as
  "Use downloader default" — state in the handoff how you did that and capture it in the strip.
- "Use downloader default" continues to mean *the downloader's configured default*, so choosing it explicitly and
  leaving it untouched send the same value. An admin who picks a concrete category still sends exactly that.
- A category-load failure (the existing accessible-feedback path) must not lose the configured default — the send
  falls back to `defaultCategory`, not to `null`, since the list was never the authority.
- Add-only unit cases in `SearchResults.test.tsx`: default present in the list; default **absent** from the list (the
  regression this packet exists for); no configured default; a sentinel default; and an explicit category overriding
  the default. Each asserted on the outgoing request's `category`. The absent-from-list case must be observed failing
  against the current component before the fix lands.
- `downloads.spec.ts` restores `expect(addNzbRequest.category).toBe(testEnvironment.sabnzbdMockCategory)` and
  `cat: testEnvironment.sabnzbdMockCategory` in the recorded `queryParameters` — both places FM-094 removed — and its
  two comments are corrected to state that the client resolves the default. No assertion is weakened to pass.
- `C-DOWNLOAD-ACTIONS`'s `responsibility` names the resolution rule in one sentence (an unset selection resolves
  client-side to the downloader's configured `defaultCategory`; the fetched list is a convenience, never the
  authority), so a later task cannot re-introduce the membership gate as a tidy-up. No new registry ID.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 and mobile 390x844 of the bulk-actions bar with
  a configured default that is **not** in the fetched list — the state that reads wrongly today.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run
  build && npm run check:api && npm run validate:migration` succeeds. `npm run knip` reports its two known
  pre-existing findings (`NO_ADVANCED_DISCLOSURE`, `RepeatSection`'s dead barrel export) and no third. Lint is 14
  warnings / 0 errors at base; a fifteenth is yours.
- `npm run validate:focus-affordances` is **red at base** on five known false positives (`../MAINTENANCE.md`), none of
  them in this packet's files. Report it *failed*, with a base-comparison run on a pristine tree (stash or `git
  archive`) proving your finding set is byte-identical to base. A sixth finding is yours to fix. Never silence it by
  adding entries to the exemption list at `scripts/validate-focus-affordances.mjs:112` — that weakens a real gate to
  hide a matcher bug, and FM-111 refused exactly that workaround.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/downloads.spec.ts
  tests/results.spec.ts` passes in full. Both are `F-SEARCH-DOWNLOADS` tests and `results.spec.ts` is unedited — it is
  in the filter to prove the untouched per-row and ZIP paths still behave, not to be adjusted. A failure there is a
  defect in this change.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — parity reconstructed from deleted legacy AngularJS source, with a select whose displayed state
  and transmitted value must be reconciled for a value the list does not contain.
- Reviewer: `opus` — at least the implementer's tier; restores an observable wire contract and writes a registry
  record. Verify against the legacy source, not the packet's summary of it.
- Fixer: `sonnet` — expected findings are test cases, comment wording and select labelling.

Implementer prompt: Read legacy `download()` at `git show 4642eed5b^:core/ui-src/js/nzb-download-service.js` before
touching anything — one line of it is the whole specification. Trap: the mock's `get_cats` deliberately excludes the
configured default, so a test seeding a default *inside* the list passes against the bug. Second trap: `value=""` and
the fallback both produce `null` today, so the two paths are indistinguishable until you separate them. Prove the
absent-from-list case red first.
Reviewer prompt: Check hardest that the sentinel strings still reach the server untranslated and that
`domain/downloads/actions.ts` is byte-identical, so `F-HISTORY-DOWNLOADS` cannot have moved. Distrust the restored
`downloads.spec.ts` assertions until you have seen them fail without the component change.
