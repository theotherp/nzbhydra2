# Migration Status

Entries are ≤ 5 lines; details live in the task packets and git history. FM-001 through FM-070, FM-022, FM-023, and FM-024
are done; their packets were removed from `tasks/` during the 2026-08-19 governance compaction (FM-001–FM-053) or on
completion (FM-054, FM-055, FM-056, FM-057, FM-058, FM-059, FM-060, FM-061, FM-062, FM-063, FM-064, FM-065, FM-066, FM-067,
FM-068, FM-069, FM-070, FM-022, FM-023, FM-024) (see `DECISIONS.md` ADR-0014/0015 and git history).

FM-060 (Config Auth Tab) added a `RepeatSection` primitive to `C-CONFIG-FIELDS` for list-of-records editing (available to
FM-066). It also escalated, without fixing (outside its Java write scope), two pre-existing backend defects proposed as one
future backend packet: `ConfigWeb.setConfig()` returns unmasked secrets in its save response (affects every `@HiddenInUI`
field — Main's proxy credentials, Auth's user passwords, and later the Indexers/Downloading tabs' credentials), and
`SensitiveDataConfigValidator.findCorrespondingOldItem`'s positional fallback can swap two users' passwords when removing a
user shifts later rows (identical in legacy `repeatSection.html`, not fixable from the frontend).

FM-061 (Config Categories Tab) passed with minor findings, not corrected (optional): the size-preset row's legacy
"Size preset" label isn't rendered in the DOM (min/max inputs' own MUI labels stand in for it), and its two inputs lack
`aria-describedby` wiring to their help text, unlike other `C-CONFIG-FIELDS` controls. Candidates for a future quickfix.

FM-062 (Config Notifications Tab) reconstructed legacy's event-type table (`notifications-service.js`) into one module
whose completeness is asserted against the backend `NotificationEventType` enum source, and added a multiline text setting
and an optional add-from-a-menu mode to `C-CONFIG-FIELDS`. It passed with minor findings, not corrected (optional): the
`RepeatSection` menu button lacks `aria-expanded`/`aria-controls`/menu `id`, and the new test-id naming is inconsistent
between the test action and the unknown-event warning (both documented in `F-CONFIG-NOTIFICATIONS.selectors`). It also
surfaced two follow-up candidates, not yet packaged: a backend fix so `NotificationsWeb.NOTIFICATION_EVENTS` covers
`EXTERNAL_TOOL_CONFIGURATION` (the test-send endpoint 500s for that event type today), and a feature record for the
legacy-only live in-app notification channel (`hydra-checks-footer.js`, `/topic/notifications`) that consumes the settings
this tab now edits.

FM-063 (Config Searching Tab) reconstructed legacy's nine setting groups plus the custom-mapping list, whose entries are
edited entirely through a help-and-test modal dialog (clone-on-open, discard-on-cancel, commit-on-submit) rather than
legacy's mix of inline rows and a modal — a deliberate boundary decision, not an omission. It passed with minor findings,
not corrected (optional): a handoff arithmetic typo, a dropped `placeholder` on one numeric field, selectors recorded as
YAML comments rather than list entries for `F-CONFIG-SEARCHING`, and two undocumented-but-tested outcome improvements over
legacy (a distinct transport-failure message; quick-filter presets no longer include blank display names). Candidates for
a future quickfix.

FM-064 (Config Downloading Tab) established the modal-transaction pattern (`FM-065`/`FM-066` follow it): a downloader
dialog edits a clone over its own form, with a connection check (`API-DOWNLOAD-CHECK-CONNECTION`) that can veto or be
overridden on close, and only a resolved, still-current transaction commits into the whole-config form. A first review
found the dialog's Cancel/Reset/Delete stayed live during an in-flight check and the commit path used a stale closure, so
Cancel or Delete during a pending check could still write or resurrect an entry; a fix cycle blocked the dialog for the
check's duration and added a per-transaction token so a resolved check for a superseded transaction is discarded, with
new tests proving both reproductions are closed. Re-review passed clean. Non-blocking observations noted, not corrected
(optional): `gaps` is otherwise only used for unmigrated capability, not documented deviations, so the two entries added
here (no legacy auto-select of the primary downloader on view; no name-sort of the downloader list) read atypically —
worth a distinct registry key if this pattern recurs; the connection-failure dialog's long backend reason text clips on
mobile (a `C-DIALOG-SERVICE` wrapping issue, outside this packet's files). Candidates for a future quickfix.

FM-065 (Config External Tools Tab) followed FM-064's modal-transaction pattern for Sonarr/Radarr/Lidarr/Readarr entries,
whose submit tests the connection and then writes NZBHydra's settings into the *arr instance, closing only on a truthy
configure response. It re-pointed the suite's only real-backend config system test (`external-tools.spec.ts`) at React
without losing an assertion, verified line-by-line against the legacy spec. `API-CONFIG-EXTERNAL-DIALOG` and
`API-CONFIG-EXTERNAL-MESSAGES`'s dead "Configure NZBHydra in ..." wizard path was correctly left unmigrated (`target:
null`). Passed clean on first review. Non-blocking observations noted, not corrected (optional): `C-TOAST-SERVICE`'s
`Snackbar` overlaps `DialogActions` on a long connection-failure message, leaving Cancel/Submit unclickable and the toast
itself unreachable for its duration (a `C-TOAST-SERVICE` issue, outside this packet's files, worth prioritizing since it
blocks real dialog actions); verbose backend connection-test failure text; `connectionSettingsChanged` compares current
vs. initial values rather than legacy's change-event tracking (undocumented deviation, arguably better, worth a
`F-CONFIG-EXTERNAL-TOOLS.gaps` line). Candidates for a future quickfix.

FM-066 (Config Indexers list and edit modal) followed FM-064's/FM-065's modal-transaction pattern for the indexer list: an
ordered list with inline state/priority and incomplete-config/incomplete-caps markers, three add-preset groups (newznab,
torznab, special), and an edit modal whose Submit reproduces `IndexerCheckBeforeCloseService` — a connection check, then
(when supported search types/IDs are unknown) a `SINGLE` capability check with a polling progress dialog — before the
entry is committed. Only `updateIndexerModel`'s nine fields are written back from a successful check, so the check's
resolved credentials never reach the form. A first review found the ported `createIndexerModel` base (`baseIndexerDraft`)
silently dropped `state: "ENABLED"`, producing a self-contradicting off-switch-captioned-"Enabled" control on freshly
added indexers and an incorrect list-sort position for entries committed without a caps check; a one-line fix cycle added
the missing key and corrected the test that had locked in the wrong behavior. Re-review passed with minor findings, not
corrected (optional): the list no longer tints a row by the indexer's configured colour (only the colour-picker control
itself was recorded as a gap, not the tint), the special presets' harmless `categories: []` key, a dropped "Supports
&lt;ids&gt;" line/tooltip on the manual capability-check button, untested backdrop-dismissal, an unjustified inline style
in the edit dialog, ambiguous accessible names on the two add-preset buttons, and a preset-seeding unit test that asserts
with `toMatchObject` rather than pinning `state` directly. Bulk caps recheck and the Jackett/Prowlarr imports were
FM-067's. Candidates for a future quickfix.

FM-067 (Config Indexers bulk caps recheck and Jackett/Prowlarr import) added the two whole-list capabilities atop
FM-066's dialog and merge: bulk recheck reuses FM-066's progress dialog with `indexerConfig: null` for `INCOMPLETE`/`ALL`,
merging results back by indexer name through the same nine-field `updateIndexerModel` contract so unsaved edits on
unrelated fields survive; the two imports replace the whole list with the response's `newIndexersConfig` and report its
added/updated/removed counts, warning before the replacement runs. Passed with minor findings, not corrected (optional):
a handoff prose miscount (seven, not eight, `deliberate -` gap lines — the registry itself is correct), an untested third
error-fallback branch (`UNKNOWN_IMPORT_ERROR` for a non-`ApiError` failure; correct by inspection), and a cosmetic
ordering of the new selector comment block ahead of the pre-existing preamble comment in `FEATURES.yaml`. Candidates for
a future quickfix. It also reconfirmed two backend follow-up candidates, not yet packaged: `ApiTransport` discarding the
response's `statusText`, and `IndexerWeb.readJackettConfig`'s unstructured 500 where `readProwlarrConfig` beside it
already answers `400 {errorMessage}`.

FM-068 (Config Secret Round Trip Correctness) closed the two backend defects FM-060 had escalated without fixing:
`PUT /internalapi/config` now masks its response identically to `GET`, built from a `ConfigReaderWriter.getCopy` so the
live config is never mutated by masking, and `SensitiveDataConfigValidator.findCorrespondingOldItem` resolves a marker by
record identity (name, then username) first, falling back to position only when the list length is unchanged — closing
the defect where removing an entry could bind its neighbour's secret to the shifted record. `UserAuthConfigValidator`'s
username-based matcher was reordered ahead of the generic pass so it is reachable again, and a marker that survives
resolution is now refused (`ok == false`, an `errorMessages` entry naming the setting) rather than ever persisted. Hit a
`DECISION REQUIRED` mid-implementation: the correct new rejection broke `tests/system/tests/fixtures.ts`'s shared
teardown, which restored a stale masked config snapshot the server could no longer identify; resolved as ADR-0020 (fix
the fixture, not the contract) and the packet's `Files Allowed To Modify`/`Verification` were refined accordingly before
resuming. Passed with minor findings, not corrected (optional): a same-baseline reference implementation in
`ConfigSecretRoundTripTest.maskedViewOf` slightly weakens one assertion's ability to catch a future divergence between
the save and load paths; the fixture's drop-and-warn restore leaves cross-test state leakage as its one avoidable
downside versus ADR-0020's alternative of restoring an explicit known baseline; two secret-field assertions use
`.contains(marker)` where `.isEqualTo(marker)` is available and stricter; and the Visual Gate's literal "Value unchanged
placeholder" wording doesn't match stock MUI's shrink-on-focus label behavior, though the substance (no stored credential
visible) holds — worth a `C-SECRET-INPUT` proposed packet if the owner wants the placeholder text actually visible.
Candidates for a future quickfix.

FM-069 (Web Mapper Primitive Leniency) implemented ADR-0018: `WebConfiguration`'s web mapper now disables
`FAIL_ON_NULL_FOR_PRIMITIVES`, so an omitted or explicitly null primitive takes its Java default instead of HTTP 400.
Re-verified creator-bound bodies (the ones an *omitted* primitive reaches): `DownloaderConfig`, `SearchRequestParameters`,
`IndexerCategoryConfig.MainCategory`/`.SubCategory`, `HistoryRequest`, `FileSystemBrowser.DirectoryListingRequest`, and
`GuidedTourWeb.setTourHidden`'s bare-boolean body. `StatsRequest` was misclassified as creator-bound at design time; its
extra three-arg constructor actually removes the implicit creator, so only its explicit-null case changes — the exposure
every other `@Data`-only body already had. Passed with minor findings, not corrected (optional): `other/github-release-plugin`'s
own tests rewrite tracked fixture files in place whenever `mvn -pl core -am test` pulls it into the reactor, dirtying the
tree on every future task's verification run; and `ApiHistoryRequest`'s creator-bound `request` field has the same dead-initializer
shape as the `HistoryRequest` follow-up below but isn't yet recorded alongside it. Candidates for a future quickfix.

Follow-up candidate surfaced there, deliberately not fixed (out of packet scope): `HistoryRequest`'s `page = 1`/
`limit = 100` field initializers never applied to a creator-bound body, so an omitted `page`/`limit` now yields `0`
rather than the intended defaults. `History.java:122`/`:139` feed those into `PageRequest.of(page - 1, limit)`, turning
what used to be a clean HTTP 400 into an HTTP 500 for an external `/api/history/...` caller (`ApiHistoryRequest` nests
it, and shares the same dead-initializer defect for its own `request` field). The React client always sends both, so no
in-app surface regresses. Single-session fix candidate.

FM-070 (External-Tool Numeric Input Guards) implemented FM-065's second escalation: `ExternalTools` now defaults a blank
`minimumSeeders` to `1`, trims/drops empty `categories` tokens, and refuses a non-numeric value by field name instead of
throwing into the blanket catch; the dialog carries the matching validators. Verification found the packet's premise
partly stale: `WebConfiguration`'s `EmptyStringToNullDeserializer` maps an empty `minimumSeeders` to null before it ever
reaches the parse, so the packet's specified system-test case (cleared field) can't fail pre-fix; the guard's live reach
over HTTP is a spaced/non-numeric value, and over the automatic sync is the Java path with no web mapper. The required
system-test case was kept and a second, genuinely reproducing case (spaced `categories`) added alongside it. Passed with
minor findings, not corrected (optional): the client regexes are slightly stricter than the server (reject a trailing
separator or signed value the server tolerates), documented as contract-conformant one-directional strictness rather
than in the `gaps` line; this Review-to-Done entry itself briefly exceeded the file's 5-line rule pre-edit. Candidates
for a future quickfix. Proposed follow-up packet, not yet decided: `EmptyStringToNullDeserializer` coerces every empty
string to null across all internal API request bodies, which may contradict `externalTools.ts`'s documented `""`-vs-absent
distinction for `categories` — worth pairing with FM-071/ADR-0019 as an owner decision on what the web boundary may rewrite.

FM-071 (Bounded WebAccessException Message) implemented ADR-0019 and its addendum: `WebAccessException` gained
`getShortMessage()` (response message plus `Code: N`, no body), and the six named boundaries (External Tools connection
test, Prowlarr import, indexer connection/caps checks, `handleXdarrError`'s fallback, external-tool sync) switched to it,
while `getMessage()`/`getBody()` stay byte-identical for logs and body-inspecting callers. `IndexerChecker`'s
`"Incorrect parameter"` caps heuristic was re-guarded through `getBody()`, proven load-bearing by a red test. Passed with
minor findings, not corrected (optional): the acceptance criterion asking `handleXdarrError`'s test to show `getMessages()`
"ending with exactly" the bounded entry can't literally hold, because `addNzbhydraAsIndexer`'s blanket catch — outside this
task's allowlisted line — re-appends the full body to the same list one frame up; the bounded entry itself is proven
correct and the residual leak is pinned by a dedicated test rather than fixed or hidden. A cosmetic redundant sentence in
`APIS.yaml`'s Prowlarr note (FM-067's existing note plus this task's prescribed text) is a single-session fix candidate.
Proposed follow-up packet, not yet decided: extend ADR-0019 to `ExternalTools.java:137-138`'s blanket catch and its live
route through `ExternalToolsSyncService`'s `else` branch, which still leak the response body to `syncAll`/`messages`.

FM-024 (Statistics Dashboard) implemented per its ADR-0021 revision. `F-STATS-MAIN` now targets
`core/ui-react/src/features/stats/dashboard` at canonical `/stats/stats`, sending the same sixteen-family
`POST /internalapi/stats` request/response contract as legacy behind a redesigned dashboard (controls header with
date presets/custom range/include-disabled/grouped statistics menu, overview tiles, a sortable consolidated indexer
table, grouped activity charts, sorted-bar source shares gated on `historyUserInfoType`, and a download-age histogram
with summary stats) using `@mui/x-charts` for its themed bar charts. Passed with minor findings, not corrected
(optional): the page-level (not per-section) loading/error/empty states, an unreachable empty-data alert, the new
Playwright cases route-mocking the endpoint rather than hitting a real backend, a dead `isAbortError` branch, a
non-focusable chart-card help tooltip, a non-`ListSubheader` family-menu group header, an inconsistent try/catch in
`persistence.ts`, and the added dependency's un-lazy-loaded bundle-size cost. Candidates for a future quickfix.

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

Not yet packaged: a backend fix for `NotificationsWeb.NOTIFICATION_EVENTS` missing `EXTERNAL_TOOL_CONFIGURATION`, and a
feature record for the legacy-only live in-app notification channel (both surfaced by FM-062; see above).

FM-024's minor findings (see above) are candidates for a future quickfix.

FM-033 (Durable Visual Evidence Output) was retired unrun on 2026-08-19: its evidence-relocation outcome had already shipped
ad-hoc in `5c36a7a14`, ADR-0014 removed the `FEATURES.yaml` visual machinery it was anchored to, and its one undelivered
criterion — the containment regression guard — landed as a quickfix (`12b615863`, see `MAINTENANCE.md`).
