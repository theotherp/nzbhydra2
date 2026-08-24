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

FM-072 (System Shell And Control Tab) mounted `SystemShell` at `/system` with legacy's eight tabs (Control, Updates, Log,
Tasks, Backup, Bugreport/Debug, News, About), gated by `maySeeAdminArea` in the same route-construction branch as the
config routes — News moved inside the gate, closing its prior ungated reachability, per legacy's `root.system.news`
`loginRequired(..., "admin")` resolve. Control is fully working: Restart reuses the existing `C-RESTART-COORDINATOR` flow,
Shutdown calls `API-SYSTEM-SHUTDOWN`, and "Reload config from file" calls `API-CONFIG-RELOAD`, both with legacy's toast
wording. Unmigrated tabs show the migration placeholder inside the shell until FM-073..FM-076. Passed with minor findings,
not corrected (optional): `tests/system/tests/shell-selector.spec.ts` asserts the placeholder at `/stats/stats?period=day`,
which FM-024 turned into a real route — stale, needs repointing at a still-unmigrated route before the next full sweep;
`SystemControlTab`'s `run()` has no `catch`, safe today only because the control API client always resolves rather than
rejects. Candidates for a future quickfix. Also noted, not required: Restart/Shutdown have no confirmation dialog, exact
legacy parity — a proposed packet if the owner wants one.

FM-073 (System Updates And About Tabs) added the Updates and About tabs inside FM-072's shell. Updates renders
current/latest/beta versions, the `updatedExternally` warning (which withdraws only the release offer, not the beta one,
unless `showUpdateBannerOnUpdatedExternally` — matching legacy's asymmetric clear of `updateAvailable`), release/beta
offer blocks, "You're up to date!"/ignored-version text, Force update, the `wrapperOutdated` warning, and the full version
history; changelog/version-history `change.text` renders through a new narrow `C-SAFE-RICH-CONTENT` boundary (8 tags vs.
News's 20), never `dangerouslySetInnerHTML`. Install polls `API-UPDATES-MESSAGES` during `API-UPDATES-INSTALL`, waits
legacy's ~2s grace, then hands off to `C-RESTART-COORDINATOR`'s countdown without itself sending a restart command
(matching legacy's `RestartService.startCountdown("")`, since the update process restarts the server itself). About
reproduces legacy's program/contact/license/sponsor content, every external link (including the sponsor link, previously
raw in legacy) through `C-EXTERNAL-LINKS`'s dereferer. Passed with minor findings, not corrected (optional): no unmount
cleanup for the install poll if the tab unmounts mid-install; `API-UPDATES-INSTALL`'s registry `test` field omits
`updates.test.ts`'s coverage; the visual strip doesn't capture the `updatedExternally` or up-to-date/Force states; the
new `data-testid="safe-rich-content"` is no longer unique when multiple changelog entries render. Candidates for a
future quickfix.

FM-074 (System Log Viewer Tab) added the Log tab inside FM-072's shell, reproducing legacy's three views: a formatted
page of 500 records from `API-SYSTEM-LOG-JSON` with offset paging (Older gated on `hasMore`, Newer clamped at 0) and an
entry-detail dialog; the raw current log file (`API-SYSTEM-LOG-CURRENT`, fetched via blob since the endpoint is
`text/plain`) rendered as text with 5s auto-refresh and tail-follow toggles (tail implies refresh, disabling refresh
clears tail) persisted in guarded localStorage; and a downloadable log-file list (`API-SYSTEM-LOG-FILES`/
`API-SYSTEM-LOG-DOWNLOAD`) via base-URL-aware links. A new `C-DATE-TIME` helper reproduces legacy's epoch-seconds-vs-millis
timestamp heuristic (boundary `1979374757`), proven at the boundary value itself. Hostile log content (`<script>`,
`<img onerror>`) is proven inert as text in the table, dialog, and raw panel — no `dangerouslySetInnerHTML`. Passed with
minor findings, not corrected (optional): the mobile formatted view's Message column breaks out of the table's scroll
area; the table row's `role="button"` produces an invalid ARIA table structure; a bare offset-less timestamp is read in
the server zone rather than legacy's UTC-then-convert, undocumented as a gap; `C-DIALOG-SERVICE` non-use is justified only
in a code comment, not the registry; the raw-log `<pre>` isn't keyboard-scrollable (pre-existing in legacy too).
Candidates for a future quickfix.

FM-075 (System Backup Tab) added the Backup tab inside FM-072's shell: a list (filename + server-timezone date via
`C-DATE-TIME`) with a base-URL-aware download link and Restore per row; "Create and download" streams
`API-SYSTEM-BACKUP-CREATE-DOWNLOAD` through the transport's binary path, "Just create" calls `API-SYSTEM-BACKUP-CREATE`
with `dontdownload=true`, both refresh the list; Restore confirms through `C-DIALOG-SERVICE` (a deliberate addition over
legacy's unguarded click) then starts the restart countdown with legacy's exact message; upload-and-restore posts through
a new XHR-based `C-API-TRANSPORT` upload method (ADR-0003's reserved progress path, since fetch cannot observe upload
progress) with a real loaded/total progress bar, treating an HTTP-200 `successful=false` body as refusal rather than
success. Playwright never triggers a real restore or upload against the shared instance; those flows are proven by
component tests with the transport mocked. Passed with minor findings, not corrected (optional): the
`createAndDownloadBackup` gap-line wording overstates itself — a refused creation there still saves an error body as a
`.zip` file with no toast, matching legacy but not matching the gap line's "reported as an error toast" claim, which is
true only of `backuponly`/`restore`; `GUI-STATUS.md` still listed Backup as unmigrated (see below — now reconciled).
Candidates for a future quickfix.

FM-076 (System Bugreport / Debug Tab) added the last of the six migrated system tabs inside FM-072's shell: legacy's
guidance prose and its two direct links; `API-SYSTEM-DEBUG-ZIP` through the transport's binary path under legacy's file
name; `API-SYSTEM-DEBUG-UPLOAD` whose returned URL is rendered as a React anchor's href and text, never via legacy's
`ng-bind-html` hazard; a thread-dump trigger; a sensitive-logging toggle that reflects the state the PUT *returned*, not
an optimistic flip; base-URL-aware heap-dump/endpoint links; a raw-SQL console (Query/Execute); and a 5s-polled
`@mui/x-charts` CPU chart with an ADR-0021 accessible table, stopping on a failed poll and clearing its interval on
unmount. Playwright proves the sensitive-toggle round trip with a direct server read afterward confirming it's off, sends
only a harmless `SELECT`, and never calls the upload endpoint. Passed with minor findings, not corrected (optional): a
legacy wording-typo correction not recorded as a gap; a visual-gate test whose upload-block assertion is shadowed by a
later route handler (still safe, but reads as a stronger guarantee than it is); two overlapping explanatory messages on
a first-poll CPU-chart failure; a dropped chart x-axis label. Candidates for a future quickfix.

FM-077 (System Tasks Tab) added the last of the eight system tabs inside FM-072's shell: legacy's `hydraTasks`
directive as a table (Name, Last execution, Next execution) listing `API-SYSTEM-TASKS`; each row's run action PUTs
`API-SYSTEM-TASK-RUN` for that task's name and replaces the whole list with the response, matching legacy's `runTask`
assigning straight over `$scope.tasks` rather than re-GETting. `C-DATE-TIME`'s `formatServerDateTime`/
`parseServerDateTime` are reused unchanged for the absolute server-timezone tooltip; the relative "x minutes ago" /
"in x minutes" text (legacy's `humanizeDate`, `moment().to()`) is a new local `Intl.RelativeTimeFormat` helper in the
feature, since no earlier `C-DATE-TIME` consumer needed that half of legacy's pairing and this task's Files Allowed
To Modify does not include the shared module. A `null` `lastExecutionTime` (before a task has ever run) renders as a
genuinely empty cell -- no relative text and no tooltip-wrapping element at all, proven by a component test that also
proves the populated Next-execution cell in the same row does carry one. Playwright lists the real scheduled tasks
(asserting the always-registered `Backup` task by name) and blocks every `/internalapi/tasks/{taskName}` PUT so a
system-test run can never run a task against the shared instance. A first review found the only test proving the
relative-text/absolute-tooltip pairing exercised the pure formatter in isolation rather than the rendered `Tooltip`,
so a regression swapping `formatServerDateTime`'s arguments would have gone uncaught; a one-file fix cycle added a
fake-timer test that mouse-overs the real cell and asserts both values for the same independently-supplied instant.
Re-review passed clean.

FM-078 (Form Login, Logout, And Session-Aware Header) added a `/login` page, the header login/logout affordance with
legacy's exact visibility truth table (`header-controller.js`'s `update()`), and the FORM redirect guard so a
FORM-restricted anonymous session lands on `/login` instead of the migration placeholder. Every session transition
(login, logout, the BASIC credential challenge) commits through a full document navigation, since the route tree and
bootstrap are built once and are not made reactive. Fix cycle 1 corrected a required finding: the BASIC challenge had
parsed `/internalapi/askpassword`'s response as bootstrap data, but that endpoint never returns `baseUrl`, so every
real challenge threw — now it only awaits the HTTP outcome, re-verified live against running FORM- and BASIC-configured
instances. `C-AUTH-SESSION` stays `partial`: ending a BASIC session has no effect, since the browser replays its
cached credentials across the full navigation (legacy could not end one either, but hid the affordance in place — a
recorded gap). Passed with minor findings, not corrected (optional): a stale-header risk when a logout's `userinfos`
confirmation fails after a successful `POST /logout`; the BASIC `old_username` hint is captured only after `logout()`
resolves, unlike legacy; two new ESLint warning instances reported as "pre-existing" when they were not; `STATUS.md`'s
prior Upcoming entry described the whole FM-077..FM-081 batch rather than FM-078 alone. Candidates for a future
quickfix; ending a BASIC session (adopting `POST /loggedout`) is proposed as its own packet.

FM-079 (Startup Checks, Welcome, And Announcement Dialogs) ported `hydra-checks-footer.js`'s non-websocket half into
`src/app/status`: one sequence per app load, mounted by the shell, showing one announcement at a time — welcome (or,
once it was shown, sequential user news, admin news, VIP expiry toasts) followed by the admin-only warnings. Built
`C-SERVER-PREFERENCES` for the show-once flags (the only path the checks use to read/clear them), which also fixes
legacy's cleared-flag-reads-truthy bug (`response.data !== "" && response.data` accepted the string `"false"` its own
clear wrote), and implemented `FAILED_BACKUP`'s evident intent (legacy's condition `response.data && !response.data` is
unsatisfiable dead code) — every one-shot ack/clear fires only after its dialog closed, unlike legacy. Passed with minor
findings, not corrected (optional): the wrapper-warning ack isn't pinned as absent-before-close the way the sibling
checks are; `SafeRichContent` anchors render in browser-default blue on the dark news dialog (pre-existing, also affects
`/system/news`); a handoff-prose overstatement that nothing else runs on a first-start load (admin stored-flag/wrapper
checks still run, they just have nothing to show, matching legacy); and `C-TOAST-SERVICE` still replaces rather than
queues concurrent VIP-expiry toasts (compounds an FM-065 observation). Candidates for a future quickfix.

FM-080 (Global Update Footer Banners) added `C-UPDATE-COORDINATOR`'s footer portion for `F-PLATFORM-LIVE-STATUS`: a
cross-route update banner (both the normal and externally-updated variants, sharing FM-073's `updateOffers`
withdrawal rule, `useUpdateInstaller`'s install flow, and `ChangelogDialog`) and an automatic-update notice (its own
changelog dialog fed by the new `API-UPDATES-AUTOMATIC-HISTORY`, dismissed through `API-UPDATES-ACK-HISTORY`). Both
banners share one `API-UPDATES-INFOS` fetch, mounted once by the shell; the shell's main content area pads its own
bottom by the banners' measured rendered height so a scrolled route's content never renders underneath them,
reproducing `footer.js`'s compensation intent without its pixel bookkeeping (ADR-0014). Passed clean on first review.
Non-blocking observations noted, not corrected (optional): `C-SAFE-RICH-CONTENT`'s `consumers` list doesn't yet name
`F-PLATFORM-LIVE-STATUS`, though the new changelog dialogs render through it; `F-SYSTEM-UPDATES`'s two "not migrated"
gap lines (ignoring a version, the automatic-update notice) are now stale since both are implemented here, but that
record was outside this task's `Files Allowed To Modify`. Candidates for a future quickfix.

FM-081 (Live Downloader Footer And In-App Notifications) added `C-DOWNLOADER-STATUS`' cross-route footer (state, queue,
title, themed sparkline over a 200-point rolling window with legacy's `lastUpdateForNow` self-advance) and the
`/topic/notifications` toast surface, both permanent shell subscribers of `C-LIVE-TRANSPORT`, which gains outgoing
STOMP frames for `API-LIVE-DOWNLOADER-CONNECT` and `API-LIVE-NOTIFICATION-READ` — replacing legacy's callback-where-
headers-belong trap with a real `client.publish`. Closes `F-PLATFORM-LIVE-STATUS`' last unmigrated websocket capability
(FM-062's noted follow-up) and fixes two legacy bugs along the way: the self-advance stop condition that never fired
(`_.every` compared point objects to a number) and notification bodies that injected HTML instead of escaping newlines.
Passed with minor findings, not corrected (optional): the new `downloader-status-rates` selector isn't recorded
alongside its five siblings; `NotificationToasts` deliberately bypasses `C-TOAST-SERVICE` (documented as a gap, but the
component itself doesn't say why) — widening that shared service to accept rich content and queue rather than replace
concurrent toasts, then folding this and FM-079's VIP-expiry toasts onto it, is proposed as its own packet; `C-LIVE-
TRANSPORT` moved to `done` while still opening one STOMP client per subscription rather than one shared socket
(defensible as legacy parity, proposed as its own consolidation packet); `UpdateFooterBanners`' new `bottomOffset` prop
isn't directly asserted by its own test (only indirectly via `AppShell.test.tsx`), though the default preserves FM-080's
behavior. Candidates for a future quickfix.

FM-082 (Result Detail Links And NFO Viewer) added the last unadopted HTTP internal API, `API-SEARCH-NFO`, plus the
`maySeeDetailsDl`-gated Binsearch/comments/details links and the full grabs + seeders/peers Details cell, to each
search-result row's existing Actions cell (not a new column, preserving ADR-0011's no-horizontal-scroll rule). NFO
content renders as a plain React text node in a monospace block — no `dangerouslySetInnerHTML` anywhere on the path,
proven by a hostile-content test and a whole-tree grep. Passed with minor findings, not corrected (optional): the
packet's `tests/system` lint/format verification commands don't exist as npm scripts there (ESLint has no config;
Prettier does but lacks a script) — substituted `npx prettier --check .`, correct in outcome though the handoff
initially misattributed the gap to missing Prettier config too; the handoff cited a system-test run directory the
runner deletes on success rather than the retained junit artifact; the links-cell screenshot evidence is a tight
element crop with no row/card layout context; a stale STATUS.md batch-completion note was briefly dropped during the
implementer's mechanical `validate:migration` edit (restored above). Candidates for a future quickfix. First of the
2026-08-23 batch FM-082..FM-086; later members stay planned packets in `tasks/` until dependency-ordered.

FM-083 (Search Cancellation) added `F-SEARCH-PROGRESS`'s one recorded gap: a Cancel button in the
`search-status-modal`, reusing `SearchPage.tsx`'s existing `activeSubmission`/`releaseSubmission` abandon-tracking
rather than a new mechanism — every post-await write site is gated behind the same identity check, so an abandoned
search's late resolve/reject or a cancel-then-new-search race both leave the screen untouched, proven by dedicated
tests including one that resolves the abandoned promise after the new one. No server-side cancellation request is
sent (client-only abandon, legacy parity) and the two-button layout (vs. legacy's single morphing button) are both
recorded as deliberate `F-SEARCH-PROGRESS` gap lines. Passed clean on first review.

FM-084 (Toast Service Queueing And Rich Content) widened `C-TOAST-SERVICE` from a single replace-on-arrival Snackbar
into the app's one toast surface: concurrent toasts now stack in arrival order in one fixed overlay, each with its
own 5s lifetime and close button; `showToast` gained optional rich `content` (React node, never HTML), `persistent`,
per-toast `onClose`, and now returns an idempotent dismiss handle, while every existing caller's signature and tests
stayed unchanged. The overlay is pointer-transparent with `auto` restored per-alert, closing FM-065's dialog-action
interception (proven by a real click reaching a Dialog's Submit button with a long toast open). `NotificationToasts`
gave up its private `Snackbar` for the shared service with its ack/overflow/newline behaviors pinned unchanged, and
FM-079's VIP-expiry toasts now stack instead of replacing each other. Passed with minor findings, not corrected
(optional): `F-PLATFORM-LIVE-STATUS.selectors` still lists the removed `notification-toasts` id instead of the live
`toasts` overlay; `F-CONFIG-INDEXERS`' now-false "one toast at a time" justification for its acknowledgement dialog;
a toast raised over an open dialog is `aria-hidden`d by MUI's modal manager (pre-existing gap, surfaced not
introduced); the 5s lifetime no longer pauses on hover/focus, matching legacy growl but losing `Snackbar`'s
auto-hide pause. Candidates for a future quickfix.

FM-085 (Shared Live-Transport Connection) closed FM-081's consolidation caveat: `C-LIVE-TRANSPORT` now multiplexes
every subscription over one shared SockJS/STOMP client per base URL, pooled module-scoped, instead of opening one
client and socket per `subscribe()` call — an idle admin session drops from three server websocket sessions to one.
Per-subscription semantics (settled/closed flags, ready timeout, per-destination STOMP unsubscribe on close,
per-subscription `onReady` fan-out on reconnect) stayed per-subscription; activation became shared, deactivating
only when the last open subscription closes. No consumer production file changed (`SearchPage.tsx`,
`DownloaderStatusFooter`, `NotificationToasts`, message modules all untouched); the public `LiveTransport` interface
is unchanged. Passed with minor findings, not corrected (optional): an unguarded `unsubscribe()` call (pre-existing,
not introduced here) throws if a subscription closes during an outage, orphaning the shared connection rather than
just one subscriber's slot; a connection-level STOMP/websocket error now fans out to every open subscription's
`onUnavailable` instead of just the affected one, an inherent consequence of consolidation the acceptance wording
doesn't quite reflect; the packet's cited server-side unsubscribe trigger (`NotificationsWeb.java`) actually fires
on session disconnect, not per-destination STOMP unsubscribe, so the implemented unsubscribe is harmless but not
the load-bearing mechanism the packet asserted. Candidates for a future quickfix.

FM-086 (Notification Test-Send Event Coverage) closed the backend defect FM-062 surfaced and this proposed as its own
packet: `NotificationsWeb.NOTIFICATION_EVENTS` now registers `EXTERNAL_TOOL_CONFIGURATION`
(`ExternalToolConfigResultEvent`, which already had a `getTestInstance()`), so
`GET /internalapi/notifications/test/EXTERNAL_TOOL_CONFIGURATION` answers 2xx instead of 500. A new completeness
test iterates the `NotificationEventType` enum itself (not the registered set) and asserts exactly one registration
per value, red-first proven against the unfixed seven-event registration before the fix landed, so a future ninth
event type can't silently reopen this gap. This closes the last item of the 2026-08-23 batch FM-082..FM-086.
Passed clean on first review.

FM-087 (Search Form Bar-And-Chips Redesign) restructured `SearchWorkspace` to the owner-approved 2026-08-23
"bar + status chips" design (`search-form-redesign.md`): a four-peer input row (category, query, submit, icon-only
Advanced toggle), a live constraint-chips row (title/season/episode/age/size/filter/indexers, each rendering only
when non-empty, clicking one opens Advanced and focuses its section), and an Advanced `Collapse` holding Media / Age
& Size / Indexers, so every non-empty constraint stays visible while collapsed. Focus is sequenced open-then-focus
so a chip click never focuses into a still-collapsed panel; `advancedOpen` persists to guarded localStorage on
explicit toggle only, never on auto-open. Form schema, `valuesFromSearch`/`canonicalSearch`/`nonIdentifierQueryText`,
the submit path, and `SearchPage.tsx` production code are unchanged, proven by diff hunks that skip over those
functions entirely. The chip look is a `constraint` `MuiChip` theme variant, no literals in feature code (ADR-0014).
Passed with minor findings, not corrected (optional): a title/filter chip on a non-media category can open Advanced
with no focus target (pre-existing invisibility, not a regression); the open-then-focus sequencing has no test that
would catch a naive synchronous-focus regression (jsdom doesn't model `Collapse`'s hidden state); `tests/system`'s
`npx prettier --check .` fails on nine pre-existing files this task doesn't own (no pinned Prettier dependency
there); a `focus-indication.spec.ts` "anchor family" strict-mode violation on `/system/news`, independent of this
diff; a system-test `minimumWidth` guard loosened to 180 when the new fixed-width section no longer meaningfully
needs a floor that wide. Candidates for a future quickfix.

FM-088 (Numeric Filter Apply Removal And Inline Clear) removed the refine sidebar `NumericFilter`'s dead "Apply"
button (no `onClick`; the min/max fields already commit on every keystroke) and moved "Clear" up beside the min/max
fields as a single-row icon-only `IconButton`, keeping its `data-testid`, `disabled` rule, and `onClear` wiring, and
gaining a section-named `aria-label`. The `F-SEARCH-SORT-FILTER` selectors entry for the removed testid was dropped.
Passed with a minor finding, not corrected (optional): the desktop screenshot strip only shows the Size row scrolled
into view, not Age/Grabs, though the same component instance is proven correct for all three via the mobile-drawer
capture and the uniform code diff. First of the 2026-08-23 owner-triage batch FM-088..FM-090.

FM-089 (Refine Section Collapse Persistence) lifted `categoryOpen`/`indexerOpen` ownership from `RefineSidebar.tsx` to
`SearchResults.tsx`, persisting both via two new optional keys (`refineCategoryOpen`/`refineIndexerOpen`) folded into
the existing `hydra.search-results.table` payload, matching the `sidebarCollapsed` precedent -- no second storage
mechanism. An old-shape stored payload still loads cleanly, defaulting both sections expanded, and the preference
applies to both the docked and drawer refine branches since they share one `sections` render. A real-backend system
test collapses one section, reloads, re-runs the search, and confirms the collapsed section stays collapsed while the
other stays expanded. First review failed on one small, mechanical, required finding: `STATUS.md`'s Review-section
entry was written as prose instead of the `- FM-089: ...` bullet the registry validator's parser requires, so
`validate:migration` failed despite every other check passing; a one-file fix cycle reformatted it and re-review
passed clean. Second of the 2026-08-23 owner-triage batch.

FM-090 (Floating-Label Notch Font-Load Fix) found the packet's own title and the ledger's diagnosis were wrong: the
notch overlap is not a font-load race but a permanent size mismatch between an outlined field's two rendered label
copies (visible `InputLabel` at `body1` 16px x `scale(0.75)`, notch `legend` at `0.75em` of the themed 14px input),
present with the web font fully loaded and merely worsened by the fallback font, growing with label length. Fixed
app-wide in `theme.ts` by stating one control font size for both label copies (effective 12px -> 10.5px, closer to the
mock's ~11px caption intent); pinned by `tests/system/tests/notched-label-geometry.spec.ts`, which holds and releases
`**/*.woff2` and measures both states -- proven red-first (reproduces the ledger's own 112.67px/117.34px pair exactly)
and green post-fix on two fields across two routes. The app-wide label-size reduction was reviewed against a
before/after screenshot strip and approved by the owner. One pre-existing, unrelated `search.spec.ts` failure (a stale
`>= 36px` button height against `c3bb56318`'s 32px controls) reproduced with FM-090 reverted, confirmed unrelated, and
correctly left alone (outside this packet's files); logged as a single-session fix candidate, along with the
unexplored alternative of widening the notch instead of shrinking the label. Third and last of the 2026-08-23
owner-triage batch (FM-088..FM-090).

FM-091 (Group-Episodes One-Time Help Dialog) reproduces legacy's one-time "Sorting of TV episodes" dialog behind
`C-SERVER-PREFERENCES`' per-user `isGroupEpisodesHelpShown` flag, read through `isRaisedFlag` so neither the inverted
polarity (raised means "do not show") nor legacy's `!response.data` truthiness bug is reproduced; the flag is written
only after the dialog closes, and every close path (button, escape, backdrop) resolves identically for the
`acknowledge` variant. Flips F-SEARCH-SORT-FILTER to `done` and corrects C-SERVER-PREFERENCES, whose `consumers` had
been anticipating the wrong feature. The first real-backend run exposed a cross-test regression the implementer's own
manual reproduction could not: most of `results.spec.ts`'s fixture data is category "TV", so the new dialog opened on
the first eligible search and intercepted pointer events in 11 unrelated tests. Fixed in that file's shared
`beforeEach` (pre-raising the flag), which the reviewer judged legitimate fixture setup rather than defect-masking —
the file already did the same for the welcome dialog, no case body or assertion changed, and a real user genuinely
does see this dialog once. Passed with two minor findings, not corrected (optional): no integration test drives a
rejected `readFlag` through the mounted component (only the pure function), and no test exercises the escape/backdrop
close path for this dialog specifically — its correctness rests on inspection of the shared, out-of-scope
`DialogProvider`. Candidates for a future quickfix.

FM-092 (Indexer Colour Picker And Clear Button) restores legacy's colour picker and clear button beside the indexer
Color field as a feature-local `ColorSetting` composite, keeping the stored contract exactly `rgb(r,g,b)`-or-`null`. The
packet's named trap is closed at the source: the native `<input type="color">` is left uncontrolled and given no
`defaultValue` when the model is null, so its own `#000000` default can never be read back, and only an explicit pick
writes. Hex exists only as an internal conversion. No picker library was added (ADR-0002) and no colour literal entered
feature code (ADR-0014). Flips F-CONFIG-INDEXERS to `done`, with the un-reproduced 0.5-alpha field tint recorded as a
`deliberate -` line. Passed clean on first review, no findings.

FM-093 (Registry Retirement And Reachability Rulings) records ADR-0022's retirement — `F-SEARCH-TOUR` becomes the
registry's first `retired` record, with `target: null` and the deciding ADR named, and the four `API-TOUR-*`/`API-DEMO-*`
records gain a retirement note — and reclassifies eight bare/`not migrated -` gap lines to `deliberate -` with their
evidence verified rather than merely preserved. `F-SYSTEM-UPDATES`, `F-SYSTEM-LOG`, `F-SEARCH-PROGRESS` and
`F-PLATFORM-LIVE-STATUS` flip to `done`; `F-AUTH-LOGIN` deliberately stays `partial`. It also fixed a latent YAML bug
nobody had asked for: `F-AUTH-LOGIN`'s BASIC-logout line contained an unquoted `(verified live):`, which the `yaml`
package parsed as a single-pair *mapping* rather than a string. The reviewer confirmed it independently — one mapping at
the baseline, 90 string entries and zero mappings after — and `validate:migration` does not inspect `gaps[]`
structurally, so it had been silently misrepresenting that line. Passed with five minor findings, none corrected
(optional): `GUI-STATUS.md:9`'s "does not yet take effect" on BASIC logout now contradicts ADR-0023's permanent-limitation
ruling; 19 of 21 `partial` records overstate outstanding work pending the unapproved `gaps:`/`deviations:` split;
`F-SEARCH-FORM`'s bare "guided tour" line is correctly FM-095's, but is stale during the FM-094 window; the packet's own
two `F-AUTH-LOGIN` acceptance bullets contradict each other; and `scripts/validate-migration.test.mjs` is excluded from
vitest and wired into no npm script, so the parity validator's own 9 tests never run in any routine check (they pass when
run directly). Candidates for a future quickfix.

FM-096 (Indexer Colour On Result Rows) makes the per-indexer Color setting visible again: React had edited and
round-tripped the value since the config tabs shipped but consumed it nowhere, so the setting had no effect at all.
Each row's indexer name now carries a small `divider`-outlined swatch fed by `indexerColorsFromSafeConfig`, read off the
same live safe config (ADR-0017) the `dereferer` already uses and threaded into the memoized `ResultRow` as a stable
prop, so its memoization is not silently defeated. Deliberately a bounded swatch rather than legacy's whole-row
0.5-alpha tint: an arbitrary user-chosen colour cannot sit behind row text, and the left-edge channel already belongs to
FM-054's recency stripe — both recorded as `deliberate -` lines, along with the un-reproduced search-form checkbox
colouring. The Color field is free text, so only a strict `rgb(r,g,b)` shape renders; hex, `rgba(...)`, empty and
garbage all yield no swatch and no throw. Passed with one minor finding, not corrected (optional): a component test's
name promises more coverage than it asserts (it checks the row background but not the stripe or cell styles it names) —
the criterion itself is independently satisfied by the untouched `sx` diff and the system test's stripe assertion.
Candidate for a future quickfix.

FM-094 (React Default Shell And Legacy-Test Disposition) makes a cookie-less request serve the React shell on every
mapping, ADR-0001's first removal stage, unblocked by ADR-0023's acceptance. `/ui/react`, `/ui/legacy` and the cookie they
write are untouched, so the rollback path stays intact and is visibly proven in the screenshot strip. The real work was the
per-test disposition: twelve legacy-shell tests deleted and the rest retargeted, with the suite dropping 166 -> 154 exactly.
Its first attempt would have deleted two `search-history` tests citing React siblings that covered less; the designer caught
it, and three assertions (the category cell, the source cell, and both indexers' `^\d+ms$` response times) were moved into a
named survivor before the deletions, the reviewer confirming them byte-equivalent rather than weakened in transit. Two traps
were found by invariant rather than luck: `getByTestId("search-category-control")`'s text is `"CategoryAllCategory"`, because
the testid sits on the MUI `TextField` root and so contains the label and the notch's duplicate legend (swept: no other test
reads that node's text), and two further bare `goto("/")` in `results.spec.ts` cannot be routed through
`ui/react?redirect=/` at all, since Playwright rewrites only a navigation's initial request and the redirect hop would deliver
an un-rewritten document — `page.reload()` satisfies both the invariant and the interception. Full suite green, 154 passed,
no failures, skips or flaky. Passed with eight minor findings, none corrected (optional); all are carried into
`MAINTENANCE.md`'s open candidates rather than left in the deleted packet, including two that need an owner ruling and are
therefore packets rather than quickfixes: the SABnzbd default-category gap and `loadLimitInternal`.

FM-095 (Legacy UI And Selector Removal) is ADR-0001's final stage, authorised by ADR-0023: `core/ui-src`, the gulp/bower
toolchain, the checked-in legacy `static/` assets, the `index`/`login` Thymeleaf shells, the `/ui/...` selector endpoints and
the `nzbhydra-ui` cookie are gone in one commit -- 306 deleted paths -- with every `tests/system` navigation rewritten to a
direct canonical route and `MainWeb` serving `react` unconditionally, logout flows included. That last part is the one that
would have broken the product: `POST /logout` and `/loggedout` still rendered the legacy `index` view, so deleting the
templates without it breaks logout; it is now proven by a unit test and a real-backend test asserting the posted response is
the React shell. `GuidedTourWeb`/`DemoDataProvider` stay standing (ADR-0022). Two writes outside the allowlist were forced by
the packet's own acceptance and ratified by a designer; `core/.bowerrc` was deliberately NOT deleted, which turned out to be
right on the facts rather than only in spirit -- `docker/uiDev/Dockerfile:16` COPYs it -- so the acceptance bullet was
corrected instead of the file removed. Passed with four minor findings, none corrected (optional), all carried into
`MAINTENANCE.md`. The sharpest is that the GraalVM `resource-config.json` include list still names the deleted
`templates/index.html` and never named `templates/react.html`, so a **native** build may now have no shell template; the JVM
suite cannot catch it, and it is fixed separately below.

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-108: Dead Export Pruning And Knip Guard — first of the 2026-08-24 behavior-preserving cleanup batch
  (FM-108..FM-112: dead-export pruning + knip gate, the shared guarded-storage helper, stats-history helper dedup, and
  the SearchResults/SearchWorkspace decompositions). Sequenced ahead of the config-improvements batch where files
  overlap: FM-097 now depends on FM-108/FM-109, FM-103 and FM-106 on FM-108; FM-105/FM-107 stay independent. Later
  members of both batches stay `planned` until promoted; the config batch (FM-097..FM-107, designed from the owner
  backlog `docs/config-ui-improvements.md`, fed into design; the packets, not that file, are the contracts) follows:
  FM-098/FM-099 chain off FM-097, FM-100/FM-101/FM-102 off those, FM-103..FM-107 are per-section.

The 2026-08-21 batch FM-077..FM-081 and the 2026-08-23 batch FM-082..FM-086 are complete (see above).

FM-073's, FM-074's, FM-075's, and FM-076's minor findings (see above) are candidates for a future quickfix.

Not yet packaged: a backend fix for `NotificationsWeb.NOTIFICATION_EVENTS` missing `EXTERNAL_TOOL_CONFIGURATION`
(surfaced by FM-062; see above). The live in-app notification channel it also flagged is migrated by FM-081 under
`F-PLATFORM-LIVE-STATUS`.

FM-024's minor findings (see above) are candidates for a future quickfix.

FM-033 (Durable Visual Evidence Output) was retired unrun on 2026-08-19: its evidence-relocation outcome had already shipped
ad-hoc in `5c36a7a14`, ADR-0014 removed the `FEATURES.yaml` visual machinery it was anchored to, and its one undelivered
criterion — the containment regression guard — landed as a quickfix (`12b615863`, see `MAINTENANCE.md`).
