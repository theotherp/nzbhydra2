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
surfaced two follow-up candidates, **both since closed**: a backend fix so `NotificationsWeb.NOTIFICATION_EVENTS`
covers `EXTERNAL_TOOL_CONFIGURATION`, whose test-send endpoint used to answer 500 — done by FM-086, see below — and a
feature record for the legacy-only live in-app notification channel (`hydra-checks-footer.js`, `/topic/notifications`)
that consumes the settings this tab now edits, migrated by FM-081 under `F-PLATFORM-LIVE-STATUS`.

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

FM-108 (Dead Export Pruning And Knip Guard) opens the 2026-08-24 behavior-preserving cleanup batch FM-108..FM-112
(dead-export pruning + knip gate, the shared guarded-storage helper, stats-history helper dedup, and the
SearchResults/SearchWorkspace decompositions), sequenced ahead of the config-improvements batch FM-097..FM-107 wherever
files overlap. A fresh `npx knip` run reproduced the packet's baseline exactly (58 unused exports, 29 unused exported
types), confirming the packet current rather than stale. Every reported symbol was resolved by one of two branches and
no third kind of edit appears in the diff: the `export` modifier removed where the only consumer is in-module or
imports from the concrete file, or the declaration deleted where nothing references it anywhere — which happened
exactly once, for `DownloadPerAge` in `api/stats/mainStats.ts`. The five dead `C-CONFIG-FIELDS` barrel re-exports
(`generateApiKey`, `maximumValidator`, `minimumValidator`, `settingRowTestId`, `type SettingProps`) are gone from
`features/config/components/index.ts` with its doc comment intact; every remaining consumer of those five was
grep-confirmed to import from the concrete file already. `knip` is now a permanent gate: pinned devDependency,
committed `knip.json` ignoring the generated `openapi.ts` via config rather than editing it, `npm run knip` script,
listed in `AGENTS.md`'s Verification gates. The one wrinkle worth remembering: two symbols (`HISTORY_FILTER_KINDS`,
`searchFormSchema`) are read only through `typeof` to derive an exported type that has real consumers, and
`@typescript-eslint/no-unused-vars` fires as an *error* on exactly that shape — the reviewer built an eslint `--stdin`
repro to confirm the rule limitation is real before accepting the two line-scoped disables. No system-test run: every
hunk is compiler-provable safe, and the reviewer independently reran the full gate chain (typecheck, lint at an
unchanged 0 errors / 17 warnings, format:check, 1129 tests, build, knip, validate:migration) rather than trusting the
handoff. Passed with two minor findings, both documentation-only, neither corrected (optional), both carried into
`MAINTENANCE.md`: a handoff citing the wrong precedent lines for those disables, and the handoff being reported to the
coordinator instead of written to `templates/handoff.md`.

FM-109 (Guarded Browser Storage Helper) collapses five byte-similar `getStorage()`/try-catch copies into
`core/ui-react/src/domain/storage/browserStorage.ts`, which exports exactly `readItem`/`writeItem` and is registered as
`C-BROWSER-STORAGE`. The abstraction is deliberately thin: keys, defaults, JSON encoding, and payload-shape validation
stay at the call sites, and both the module header and the registry responsibility line forbid fattening it later.
Every adopter's semantics was diffed function-by-function and holds — stats' tri-state `loadIncludeDisabled`, logs'
default-false `readFlag`, `advancedFields`' default-false `readShowAdvanced` — the mapping surviving because
`readItem`'s `undefined` and `getItem`'s `null` are both falsy and both fail the `=== "true"` tests. `loadFamilySelection`
keeps its own try-catch on purpose: it still guards `JSON.parse` and a per-family boolean check, which the shared module
must not absorb. Storage keys re-verified byte-identical against `758747cc8` by the reviewer independently of the
handoff's grep. One real behavior change, contract-directed and reviewed on its merits rather than on the implementer's
reasoning: `SearchResults`' choices write was previously guarded on the `localStorage` accessor but not on `setItem`, so
a quota or private-mode throw escaped into React's passive-effect flush and could trip an error boundary, destroying the
results view over a lost display preference. Routed through `writeItem` it is swallowed like the other four sites; the
effect has no cleanup and sets no state, `loadChoices` already treats an absent payload as `{}`, and no test asserted
propagation — so the previous behavior was strictly worse. `advancedFields` gained coverage it never had: its old form
was a bare `window.localStorage.getItem` that reached `false` by throwing into its own catch. Verified with the full
gate chain plus real-backend `search.spec.ts`/`results.spec.ts` at 45 passed; the reviewer re-ran the whole deterministic
chain itself and matched every number. Passed with two minor findings, neither corrected (optional): a stale
`getStorage()` reference in a `SearchResults.test.tsx` comment, carried into `MAINTENANCE.md`, and a one-word
`STATUS.md` cross-reference, fixed here in the same bookkeeping pass.

FM-110 (Stats History Shared Helpers) unifies the stats area's copy-pasted page plumbing where — and only where — the
copies were provably identical: `historyUserInfoType` (three copies), the `TableSortLabel`-based `SortHeader` (two), the
`Loading` block (four, differing only in the message string), and `PAGE_SIZE = 25` (three), all now in
`features/stats/shared/` with a focused unit test each. `SortHeader` is generic over each page's sort-column union and
reproduces the `sortMode === 1 ? "asc" : "desc"` derivation character-for-character. The exclusion held: `SearchHistoryPage`'s
own `SortHeader` renders a `Button` rather than a `TableSortLabel`, so folding it in would have changed visible anatomy —
it is untouched, verified by diffing its body against baseline. `SavedSearchesPage` was inspected and holds none of the
four shapes. DOM identity was proven empirically rather than argued: the implementer stashed its changes, rendered
`DownloadHistoryPage` through a throwaway probe, captured the sort header's `outerHTML` before and after, and diffed them
byte-for-byte — identical down to the emotion class hash and `aria-sort`. The reviewer re-derived every identity claim
independently from `git show 1b15a42d7:<path>` rather than trusting the handoff, and confirmed each per-page loading
message survives verbatim as an argument. Verified with the full gate chain (108 files / 1149 tests) plus real-backend
`search-history`/`downloads`/`notification-history`/`stats` specs at 16/16. Passed clean on first review, no findings.
One deliberate non-unification: `showsUsername`/`showsIp` are genuinely duplicated across two history pages but are not
named in the packet, so they were left alone rather than opportunistically folded in — the reviewer agreed that packet
scope beats a leftover duplicate, and it is logged in `MAINTENANCE.md` for a future pass.

FM-111 (Search Results Module Decomposition) takes `SearchResults.tsx` from 2579 to 1639 lines by moving its
already-independent module-level units into siblings under `results/`: `ResultRow` + `ResultColumn` into `ResultRow.tsx`,
the select-all icons + `SelectionMenu` into `SelectionMenu.tsx`, the two popovers into `ResultsPopovers.tsx`, and the
persistence helpers into `storedChoices.ts`. Pure code motion, proven rather than asserted: the reviewer tiled every
destination range back onto the base file and showed the fourteen ranges partition base:88-2580 with no gap, no overlap,
and each body surviving as one unbroken contiguous byte-identical run — `ResultRow` as a single 346-line run, the
`SearchResults` component itself as a single 1485-line run, so no hook order or memo identity was disturbed. The only
textual delta anywhere is added `export ` prefixes, new import lines, and new file-header comments. `ResultRow` keeps its
`memo` wrapper with no comparator added and FM-096's `indexerColors` stable-prop threading intact; `storedChoices.ts`
keeps FM-109's `readItem`/`writeItem` adoption and FM-089's `refineCategoryOpen`/`refineIndexerOpen` payload keys.
`SearchResults.test.tsx` is byte-unchanged — it imports only `SearchResults`, so no internal became a test dependency.
`isRecord` moved with `loadChoices` because leaving it behind would have created a `storedChoices → SearchResults →
storedChoices` cycle. Verified with the gate chain, real-backend `results`/`search`/`downloads` at 49 passed (re-run by
the reviewer, not reused, since the packet elevates the selection and persistence cases above the screenshots), and a
before/after capture pair that is byte-identical at md5 `e28a1d4e`. Two rulings were needed and both went to the
implementation. **The packet asked for something ADR-0014 forbids**: its Outcome named the shared style constants as a
unit moving to its own sibling module, but `AGENTS.md` bans per-feature `*Styles.ts` token files, FM-054 deleted three
such files, the constants carry comments saying they are local *because* of that rule, and `POPOVER_HEADING_SX` holds
font values — the squarely forbidden case. Each constant went to its sole consumer instead; the reviewer resolved all
ten definitions and references repo-wide and found every reference sits in the same file as its definition, so the
"shared" constants were never shared across the split and a module would have converted ten same-file references into
cross-module imports. **`validate:focus-affordances` failed and was correctly reported as failed**: it is red at base
too, byte-identically, on five false positives that predate this batch — see `MAINTENANCE.md`, and note the gate sits in
later packets' chains, so it will recur. The cheap silent workaround (five entries in the script's exemption list) was
available in a file FM-111 could not touch, and was not taken. Passed with three minor findings, none corrected
(optional), all carried into `MAINTENANCE.md`: the gate defect, a ~1-in-10 `DialogProvider.test.tsx` teardown flake
characterized across 15 runs and confirmed unrelated on mechanism, and the now-doubly-stale `getStorage()` comment.

FM-112 (Search Workspace Module Decomposition) closes the 2026-08-24 cleanup batch, taking `SearchWorkspace.tsx` from
1423 to 1026 lines: the pure form model into `workspace/searchFormModel.ts`, and `SeasonEpisodeInput`,
`AdvancedRangeInput` and `IndexerSelectionButton` into their own siblings. The reviewer re-derived the byte-identity
tiling with its own maximal-run matcher rather than accepting the handoff's table, and called it the cleanest code
motion audited in this batch: outside the rewritten import block, fourteen blocks partition the base file with zero
overlaps, one uncovered blank line, and thirteen uncovered lines that are nine import lines plus the four declarations
that gained `export`. The `SearchWorkspace` component body arrives as **one unbroken 937-line run**, which is what makes
the hook-order and focus-sequencing questions answerable without running anything — no insertion, deletion, or
reordering inside the component is expressible in such a diff. FM-087's frozen `valuesFromSearch`, `canonicalSearch` and
`nonIdentifierQueryText` were additionally checked as isolated extractions so the finding does not rest only on run
contiguity; all three match base modulo the `export` keyword. `SearchPage.tsx` has exactly one hunk, entirely inside its
import block. `searchFormSchema` moved together with `SearchFormValues` (keeping the `z.infer` link intra-module under
`isolatedModules`) carrying FM-108's eslint-disable verbatim, and `advancedOpen` keeps FM-109's shared-storage adoption.
The lint-warning drop from 17 to 13 was verified rather than welcomed: four `react-refresh/only-export-components`
warnings disappeared because the four non-component value exports moved to a `.ts` file with no component in it.
**The line target was missed deliberately and declared**: Acceptance asks for below ~1000 and it landed at 1026. The
reviewer ruled that acceptable — the tilde is in the contract, and the residual module scope is eight units each used
only by `SearchWorkspace`, none of them on the Acceptance's closed list of `searchFormModel.ts` contents, with the
`advancedOpen` helpers named in Out Of Scope. Closing the last 26 lines would have required either splitting the
component body, explicitly forbidden for hook-order risk, or inventing destination modules the contract does not
sanction. Note the precise reason, since the implementer's phrasing overstated it: those residuals were movable in
principle, so the justification is that the contract forbids it, not that it was impossible. Verified with the gate
chain (1149 tests) and real-backend `search`/`results` at 45/45; `validate:focus-affordances` is red at base and stays
red, with the validator and its exemption list provably untouched. Passed with minor findings, none corrected
(optional): packet drift in the Outcome's stale line numbers, two tiling figures that were understated rather than
overstated, and the visual-capture nondeterminism now in `MAINTENANCE.md`.

The cleanup batch FM-108..FM-112 is complete: dead exports pruned behind a permanent `knip` gate, one guarded-storage
helper replacing five copies, the stats/history duplicates unified, and the two largest hand-written files decomposed —
`SearchResults.tsx` 2579 → 1639 and `SearchWorkspace.tsx` 1423 → 1026. No behavior changed anywhere in it; the one
semantic difference, FM-109's swallowed `setItem` throw, was contract-directed and strictly safer. Every task passed on
first review with no fix cycle.

FM-097 (Config Sidebar Navigation And Sticky Save Bar) opens the config-improvements batch, turning the eight
horizontal config tabs into a left settings nav — vertical MUI `Tabs` deliberately kept rather than hand-built markup,
since that is what preserves `tab`/`tablist` roles, `aria-selected`, and every `config-tab-<path>` testid while still
satisfying icon-plus-label via `icon`/`iconPosition="start"` — docked at `md`+ and a temporary `Drawer` below it
(`config-nav-open`), following `RefineSidebar.tsx`'s no-duplicate-testid idiom. The advanced toggle and API button move
to its foot unchanged; each entry carries a dirty dot and an invalid dot for its own top-level config section, neither
colour-only (each has an `aria-label`). A sticky `config-save-bar` holds Save at every scroll position — verified by
the reviewer against the live instance at `scrollY 3076`, not just the zero-scroll screenshots — and adds
`config-dirty-summary` ("N settings changed") and `config-discard` while dirty, which now shares one `discardChanges()`
expression with the blocker's existing deny branch. Routes, `useConfigSave.ts`, the blocker semantics, and every tab
body are untouched; the `isDirty` colour switch on Save is deliberately dropped, recorded as the deviation it is.

**The run's first blocker, resolved in-flight.** The packet's own Acceptance clauses were conjunctive — the toggle
moves to the sidebar foot, and the sidebar becomes a drawer below `md` — which together put the toggle inside a closed
mobile drawer and broke six sibling specs (`config-main`, `config-categories`, `config-downloading`, `config-searching`,
`config-indexers`, `external-tools`) that reach it directly. The implementer stopped rather than edit files outside its
allowlist; a task designer confirmed the placement was genuinely compelled rather than one reading among several
(`RefineSidebar.tsx:97-101`'s rule that a temporary drawer exists precisely so exactly one `data-testid` is ever
mounted) and refined the packet to permit exactly a mechanical drawer-open/close repair in those six files, with a new
Acceptance bullet forbidding any weakened, skipped, or deleted assertion or desktop path. The reviewer treated this as
the seam most likely to hide a corner cut and audited it hardest: all six diffs are 16 insertions / 0 deletions, every
original line byte-identical, the drawer-open provably mobile-only by construction (`config-nav-open` renders only
inside the same `useMediaQuery` branch as the drawer itself, so the probe is false by construction at desktop, not an
unconditional open that happens to no-op), and `external-tools.spec.ts`'s two call sites both route through the one
repaired helper. Two RHF quirks were discovered by probing live `useForm`/`useFieldArray` output rather than trusting
docs — array holes appear both as true holes and as present-but-`undefined` depending on whether a structural edit
rebuilt the array, and `remove(0)` re-marks every survivor plus a trailing slot — and are pinned by tests against that
real output. A `useMemo` keyed on RHF's `errors` was found silently serving stale badges, since RHF mutates those trees
in place as often as it replaces them; fixed by recomputing per render, confirmed in the diff rather than only in the
handoff. The reviewer independently confirmed the `--runtime existing` evidence reuse was sound by `cmp`-ing the served
bundle against the local build byte-for-byte, then re-ran the system tests anyway given the packet's own instruction to
distrust jsdom badge evidence: 59/59 passed. Passed clean, no required findings; two minor findings carried into
`MAINTENANCE.md`, neither corrected (optional): the six specs' drawer-open probe has no auto-retry (stable today only
because each helper runs after an existing wait), and `ColorSetting.tsx` legitimately needs the literal `rgb(` string,
so at least one of `validate:focus-affordances`'s five false positives cannot be fixed by removing the literal.

FM-098 (Per-Fieldset Advanced Disclosure) makes hidden advanced settings announce themselves instead of vanishing. With
the global toggle off, a fieldset renders its plain rows plus one `config-advanced-expander-<label>` reading "N advanced
settings hidden"; expanding reveals those rows in place. A wholly advanced fieldset offers itself by name
("Proxy — advanced, hidden") rather than disappearing, and its `config-fieldset-<label>` testid exists only once
expanded — which is what keeps the pre-existing "advanced fieldset is absent" assertions in Categories and Searching
honest rather than passing for a new reason. **No tab file needed editing**: all eight inherit through
`C-CONFIG-FIELDS`, and the reviewer verified that by tracking `ConfigFieldset` nesting depth across every non-test
`tsx` under `features/config/` rather than by checking that the tabs import it. The count is live, not derived: a
globally-hidden advanced row stays *mounted* and registered while rendering no DOM at all (`Collapse` +
`unmountOnExit`), and `hiddenCount` is read off state every render with no memo — the packet forbade memoizing it, and
FM-097 had just proved that failure mode next door, so a test deliberately reproduces it by mounting a second advanced
row behind a `useWatch` gate and asserting the count moves 1→2→1. The registration invariant holds: `shouldUnregister:
false` untouched, and a real-backend test edits a revealed row, collapses it, switches tabs so the whole body unmounts,
returns, saves, and compares the *whole* config to prove exactly one key moved. One fix cycle, the run's first, over a
contradiction inside the packet itself: Acceptance bullet 1 promised toggle-on rendering identical to before while
bullet 3 required an `Advanced` chip on every visible advanced row. The implementer followed the specific bullet and
flagged the conflict rather than choosing quietly. The reviewer then found the substantive reason to settle it the
other way — the chip marks rows flagged advanced *individually*, so wholly advanced fieldsets render none at all while
Security renders five, and absence of a chip therefore reads as "not advanced", which is false for every row in those
five fieldsets. ADR-0027 resolves it: the chip marks revealed rows only, restoring pixel-identical toggle-on rendering.
The re-review confirmed no state produces a wrong chip, including the mixed case of an individually-flagged row inside
a wholly advanced fieldset, which does not exist in the tree today. Verified with the gate chain (1181 tests) and
real-backend `config-main.spec.ts` at 6/6. Passed with minor findings, none corrected (optional), all carried into
`MAINTENANCE.md`: the spurious expander that appears behind the Downloading and External Tools dialog backdrops because
React context crosses portals, an incomplete boundary note omitting `CustomMappingsSection`, two unannotated spacing
magnitudes, a dead conjunct in the chip guard, and a validation-error capture that no longer frames its own error.

FM-099 (Settings Search) puts a `config-search` Autocomplete in FM-097's sticky bar that filters all eight config tabs
by label and help text, grouped by tab; picking a result routes to the tab, reveals the row if an advanced gate hides
it, scrolls to it and marks it briefly, without touching the global toggle's stored preference. Because the tabs define
fields as JSX rather than data, the searchable metadata is the new hand-maintained `C-CONFIG-SETTINGS-INDEX` — 142
entries, 135 rows plus one per list section — whose only defence against silent rot is a drift test that genuinely
bites. It does: the implementer demonstrated six mutations, the reviewer independently reproduced five on a scratch
copy, and the implementer strengthened it beyond the packet to also assert each row's `advanced` flag and enclosing
fieldset against the DOM, since path-level agreement alone would not catch a mislabelled column that breaks the reveal
path. Index completeness was not sampled but proven: a static extraction of every label, name and help from the eight
tab bodies is set-identical to the index's 135 row paths with zero label or help mismatches, the 16 non-plain `help`
cases hand-compared. The mount seam into `ConfigSaveBar.tsx` is 11 insertions and 0 deletions, every original line
byte-identical, and leaves room for FM-100's summary-button change in the same `Stack`. Two things are worth carrying
forward. **The designer's mid-task refinement caught a trap the packet could not have stated**: the bar sits inside a
`<Box component="form">` whose Save is `type="submit"`, so an `Autocomplete` there gets implicit form submission and
Enter would have saved the whole config; the guard calls `preventDefault()` only, so MUI's Enter-selects still works.
**And the implementer caught its own vacuous test for that guard** — jsdom implements no implicit submission, so its
first assertion passed with or without the guard; it replaced it with a real keydown asserting `defaultPrevented` plus
a discriminating control on an ordinary field in the same form, and proved the browser consequence separately with a
zero-PUT assertion. One fix cycle, over a real defect a green suite could not see: `ConfigFieldset` seeded its
"already honoured" reveal marker from the *live* token, so any fieldset mounting after a request — every fieldset on
the target tab when search crosses tabs, since the router mounts the new body only after the token is bumped —
initialised as already-honoured and never revealed. With the toggle off by default and 81 of 135 indexed rows
advanced, most cross-tab searches routed correctly and then silently did nothing. Both existing reveal tests picked
`main.urlBase` *while already on Main*, so the fieldset was pre-mounted and the defect was structurally invisible to
them; 11 of 11 system tests passed alongside it. The fix seeds from `NO_ADVANCED_REVEAL_REQUEST.token` (`0`) against a
monotonic counter that only ever emits `>= 1`, and the regression tests cross tabs through *both* FM-098 gate shapes.
Verified with the gate chain (1244 tests) and real-backend `config.spec.ts` at 12/12. Passed with minor findings, none
corrected (optional), all carried into `MAINTENANCE.md`: a reveal request that is never retired so a fieldset
re-reveals on remount, no capture of the cross-tab reveal, a `react-refresh` warning on `SettingHighlight`, one
`conditional` entry no fixture renders, and — as a proposed packet rather than a quickfix — search offering rows whose
render condition is unmet, which route and then silently time out.

FM-100 (Review Changes Before Save) turns the sticky bar's "N settings changed" summary into a button opening
`config-review-changes`, a stock MUI dialog listing every change the admin has made, with the same Save the form runs.
The diff is a pure function over the dirty tree and the two value trees; the panel is presentational and never touches
the form, proven by a probe that serializes `dirtyFields`, `errors`, `touchedFields`, `isDirty`, `isSubmitted` and
`submitCount` and asserts byte-equality across open and close. The `ConfigSaveBar` seam held at 15 insertions and 3
deletions, the deletions being exactly the `Typography` import name and its tag pair, composing with FM-099's search
slot in the same `Stack`. **The secret defence is structural rather than enumerated**, which is what makes it durable:
`collect` dispatches on the *value's* shape, so an array of records is intercepted before any descent and every
list-entry row renders no values at all — the blanket over per-indexer, per-downloader and per-user credentials holds
for all seven sections by construction, not by a list someone must remember to extend. Three further layers cover
scalars: the `***UNCHANGED***` marker, an explicit path set, and a deliberately over-eager credential-shaped-segment
regex. The reviewer enumerated the schema itself and found the five secret-bearing scalars are exactly the five in the
explicit set. One correction of a stale premise, worth recording because it nearly propagated: the panel's positional
keying fallback was documented as mirroring a live backend defect FM-060 escalated, but **FM-068 closed that defect** —
`SensitiveDataConfigValidator` now resolves by record identity first and refuses the marker when the list length
changed, rather than guessing. The comment was corrected against the Java source, not against a summary of it. One fix
cycle, over a test that did not discriminate: "should stay open when the server rejects the configuration" resolved its
assertion *during* MUI's exit transition, so it passed whether the panel stayed open or closed — the second task
running where a test certified the comfortable path under an awkward name, and again caught only by mutating the
implementation and watching the suite stay green. The replacement does not depend on timing at all: because the shell
computes the change rows only while the panel is open, a shell-closed panel empties in the same commit, so asserting a
specific row is present distinguishes a live panel from a husk however the transition races. ADR-0029 also settled the
mobile layout against the implementer's judgement: at 390px the "Now" column sat off-canvas with the header clipped
mid-word, so a panel whose purpose is "what is about to be written" showed only what the config already said. Below
`sm` the origin column is dropped and the value pair merged, in one rendering path with no `useMediaQuery` branch, and
the masked case renders `(hidden) — changed` rather than a value. Verified with the gate chain (1274 tests) and a fresh
real-backend `config.spec.ts` at 16/16. Passed with minor findings, none corrected (optional), all carried into
`MAINTENANCE.md`: whole-list positional keying when one entry is unkeyed, `null` and `""` both rendering `(empty)` so a
row can show no visible change, the summary button's low discoverability and unjustified `sx`, the entry-row status
cell reading as an old value, the bar counting leaves while the panel counts rows, and two unreachable hardening gaps.

FM-101 (Save Feedback Banner) replaces the two blocking validation dialogs with one persistent banner region between
the sticky bar and the tab body, and turns the client-side "Config invalid" toast into a list of the offending settings
that navigate to their field through FM-099's helper. `ConfigSaveBar.tsx` was not touched — the one config task in this
chain that needed no bar surgery. The two fenced sibling-spec assertions were re-pointed and nothing else in either file
moved: three hunks total, every load-bearing assertion byte-identical, verified line by line rather than by summary. The
implementer retracted a claim mid-task rather than softening it — it had documented the invalid list as shrinking live
as fields are fixed, which it does not, because `submit()` calls `trigger()` rather than `handleSubmit` so RHF never
switches to live revalidation; the behaviour is right because it matches the inline `config-error-*` messages, and a
banner clearing while the inline error persisted would be worse. One fix cycle, over a reachability regression the first
round introduced: a save refused from FM-100's review panel reported into a subtree MUI marks `aria-hidden`, behind the
panel's backdrop, so the invalid-field entries — the only mechanism FM-101 offers for acting on a refusal — were
announced to nobody. Both affordances FM-101 replaced had rendered *above* the modal, so this was FM-101's regression to
own rather than a gap it inherited. The report now moves rather than duplicating: while the panel is open the banner
stands down and the same markup, testid and entries render on a portalled layer above it, with exactly one report in the
DOM at any moment. **Two measurements from that cycle are worth more than the fix.** First, the obvious remedy is
broken: MUI's `Snackbar` does not portal, so every toast in this application is `aria-hidden` while any modal is open —
a pre-existing, application-wide WCAG 4.1.3 defect that hits hardest where a toast is raised from inside its own dialog,
which is always. Second, the fix is honestly incomplete: the raised report is announced and clickable but **not
keyboard-focusable**, because a modal's `FocusTrap` owns focus regardless of DOM position — measured, not inferred, and
the reachability tests assert `aria-hidden` ancestry only, so they are green on a claim they establish half of. Both are
in `MAINTENANCE.md`, the first with an explicit warning that portalling the toast layer would fix only its first half.
The re-review also corrected the fix's own explanation of why it works: it credits JSX sibling order, but MUI's `Portal`
inserts a pass after `ariaHiddenSiblings` snapshots the container, so order is irrelevant — proven by moving the portal
block above the panel in a sandbox and getting 50/50 green. Verified with the gate chain (1295 tests) and real-backend
runs across all four fenced specs at 49/49. Passed with minor findings, none corrected (optional), all carried into
`MAINTENANCE.md`.

FM-102 (In-Tab Fieldset Anchor Navigation) closes the FM-097 shell chain: each tab's nav column now carries an "on
this page" list of that tab's fieldsets, headed by the tab's name, rendered as a sibling below the `Tabs` per ADR-0028
and never as a `Tabs` child — the `Tabs`/`Tab` subtree's only diff line is a removed unused import. Fieldsets
self-register their own node and the order is re-derived from live `compareDocumentPosition` on every change rather
than trusted from registration sequence, because a conditionally-mounted fieldset's effect commits after siblings that
sit later in the JSX. The real-browser run earned its keep twice over: the first scrollspy threshold required the
target's top within a pixel of the bar, which the click-scroll's deliberate gap made unreachable, and Main's last
fieldset has too little trailing content to ever scroll up to the activation line — neither is visible without real
scroll clamping. **One fix cycle, six required findings, and the review that found them is the strongest of the run.**
Two were real defects invisible to the tests as written: collapsing a revealed whole-advanced fieldset left a permanent
stale anchor, because MUI's `Collapse` keeps children mounted through the exit transition so the effect re-registered
the node it had just withdrawn and never ran again — the anchor then pointed at a detached node and clicking it
scrolled to the top; and the document-end fallback fired at scroll position 0 on any tab fitting the viewport, marking
the *last* section current while the admin looked at the first, which is four of eight tabs at 1280x800 and all of them
on a taller monitor. A third finding was a gate: `validate:migration` was red on the delivered tree and the handoff
reported it green, the cause being the `- FM-NNN:` shape the validator's regex requires. A fourth was that the single
unit test written to prove the task's contested behaviour **could not fail for the defect it targeted** — it asserted
an unregistration had happened, while the bug was a re-registration afterwards; the fourth task in this batch where a
test certified the comfortable path. The correction was structural rather than a patch: the node moved from a ref into
state via a callback ref, so the eventual unmount is a dependency change the effect must follow, and the re-review
probed three neighbouring paths (global toggle mid-reveal, unrelated unmount, unmount mid-`EXITING`) asserting no live
entry ever points at a disconnected node. ADR-0030 settled the last finding against the implementer's judgement: the
nav column was not sticky, so the list scrolled away with the page — reproducing the exact defect ADR-0028 cited when
choosing this placement. The whole docked column now sticks below the save bar with internal scrolling, keeping the tab
entries reachable too. The fixer self-caught a defect there worth remembering: it first measured the bar with
`contentRect.height`, the content box, so the padded bar came up ~24px short and the column painted over the first tab
entry. Verified with the gate chain (1308 tests) and real-backend runs at 86/86 across all ten specs in the widened
filter. Passed with nine minor findings, none corrected (optional), all carried into `MAINTENANCE.md` — including an
invalid `ul > button` content model in the anchor list, an untested short-tab guard, and a latent `contentRect` trap in
`UpdateFooterBanners.tsx` that the re-review scoped to "not yet a bug" before agreeing to log it.

FM-103 (Indexer List Table) replaces the indexer stack with a real table — name, type, search-source scope, state with
its disabled reason, priority, plus caps and config-completeness chips — filterable, sortable on three columns through a
three-state cycle that keeps the composite load order reachable, with bulk enable/disable over the shown rows as a
single form write. Sorted and filtered display never re-targets a control: the row testid and the control's field path
derive from one `index` prop, so a display-index regression corrupts both together. Two defects were found by
measurement rather than by the suite. **The whole page scrolled sideways at 390px**, because `ConfigFieldset` renders a
real `<fieldset>` whose user-agent `min-inline-size: min-content` propagated the table's 900px minimum outward — the
390px viewport rendered a 916px page. And after that, dropping the two descriptive columns was *still* not enough: the
priority field's right edge measured 515px, floored by a non-wrapping VIP-expiry chip and the search-source control, so
below `sm` the table becomes a one-column stack with sorting moved into a named select. That branch uses
`useMediaQuery`, deliberately against ADR-0029's one-rendering-path constraint, and the reviewer judged it sound on
grounds ADR-0029's case did not have: a CSS-only restack cannot solve *sorting* — hiding the headers removes the only
sort affordance — and dual-rendering the cells would put two live form controls and two copies of every testid on one
configuration path. The implementation pins that with assertions that exactly one switch and one select exist per row,
in jsdom and again at 390px against the real backend. Four deviations were declared and all four accepted, the sharpest
being that **bulk enable skips an indexer whose config is incomplete**: `IndexerStateSwitch` disables that row's own
switch, so a bulk action flipping it would be the only route in the UI past a gate every per-row path enforces. The
reviewer said it would have called the opposite behaviour a defect. Verified with the gate chain (1329 tests) and
real-backend `config-indexers` plus `config.spec.ts` at 41/41, the latter byte-untouched, which is the fence holding —
FM-100's review-panel case fills `config-input-indexers-0-score` directly at two places. Passed with six minor findings,
none corrected (optional), all carried into `MAINTENANCE.md`. This task also broke a four-task streak of unannotated
magnitudes: every one in the new file carries its justification at the site.

FM-104 (Indexer Preset Gallery) replaces the two anchor menus with a searchable gallery: every preset from all three
groups is a directly clickable button in a responsive grid under its group heading, custom newznab/torznab entries
first and marked with an icon plus emphasis rather than colour, narrowed by a case-insensitive substring filter that
hides an empty group's heading without reordering anything. The importers keep their own always-present section,
filtered against their own labels rather than the preset groups'. Two things went right by construction rather than by
effort. It needed **no fieldset workaround** — the first task after `1b24f85f9` clamped `ConfigFieldset`'s minimum width
centrally, which is that fix doing its job. And it used a plain responsive CSS grid with no `useMediaQuery` branch,
the single rendering path ADR-0029 prefers: FM-103's compact branch was justified by *controls* differing, and a
gallery has no such need. The preset testid scheme was preserved rather than renamed to suit the new markup, so
`addPreset`'s helper and the once-only refusal test carried over byte-identical — the reviewer enumerated every
`config-indexer-preset-*` reference across `src/` and `tests/` to confirm it rather than taking the claim. Verified with
the gate chain (1340 tests) and real-backend `config-indexers.spec.ts` at 12/12, including the rewritten filter-then-pick
add flow that proves a filtered pick seeds the same draft the menu path did. Passed with two minor findings, neither
corrected (optional), both carried into `MAINTENANCE.md`. Worth recording how the truncation case was settled: the test
asserts only that a `noWrap` class is present, which is weaker than the behaviour it stands for, so the reviewer built a
standalone reproduction of the exact grid nesting and measured the clipping directly (804px of text in 324px of box, no
page overflow) rather than accepting the class as proof.

FM-105 (Auth Users Table) turns the users repeat section into a table — username or the "Authless" legend, rights as
chips, and a password *state* — with editing moved into a modal transaction over a clone. **No password value can reach
the table DOM**: the Password column renders one of four fixed labels from an exhaustive pure function with no
fall-through, asserted by a test that checks the table's text contains neither the marker nor a `*` and that the table
holds no `<input>` at all. The `auth.users` shape is untouched, so FM-100's structural secret defence still covers it —
the reviewer verified that behaviourally rather than by shape, confirming `collect` still intercepts an array of records
before any descent and that `entryChange` hardcodes both value sides to `null`. **The task added a guard no contract
asked for, and the reviewer ruled it correct**: the dialog refuses a username another entry already holds exactly,
because `UserAuthConfigValidator` filters on `String.equals` and takes `.findFirst()`, so two identical usernames hand
the *same* stored record to both entries and one user's marker resolves to the other's hash. Usernames differing only by
case stay legal, since both Java matchers treat them as distinct — read from the source, not from a summary of it. The
implementer also caught an ADR-0029 defect in itself *after* every gate was green: its first four-column layout put Edit
and Delete off-canvas at 390px behind a scrollbar with no affordance, and cell padding alone eats 128px of 390 at four
columns, so it restructured to three columns with the row actions inside the User cell and pinned it with a geometry
assertion — the README's "pin a regression that actually happened". Verified with the gate chain (1375 tests) and
real-backend `config-auth.spec.ts` at 8/8. Passed with six minor findings, none corrected (optional), all carried into
`MAINTENANCE.md`. The review is worth reading for how it was conducted: it ran six mutations in a sandbox outside the
repository and reported that **four bite and two do not** — the empty-seeded clone (6 failures), a tail-instead-of-middle
delete, a raw-password render, and removing the uniqueness refusal all fail as claimed, but the case-sensitivity test
and the stale-transaction token guard survive their mutations, so the handoff's "with a test pinning that" overstated
two of its own claims.

FM-106 (Notifications Editor Rework) turns the entries list into one stock MUI accordion per entry — summary carrying
the event legend and a readable message-type chip, expanded body holding the existing fields plus insertable variable
chips, a live preview from backend sample values, and the per-event test result rendered inline instead of as a toast.
It took the **local-ownership branch**: `RepeatSection.tsx` is byte-identical, so the narrow single-spec verification
filter is honest. The reason is better than cheapness — the accordion summary needs this feature's own vocabulary, so an
opt-in would have genericized a shared component for one caller. The reviewer found the packet's premise for that branch
stale in the task's favour: it describes "other four consumers", and there is exactly **one** (`CategoriesConfigTab`);
every other hit is a comment explaining why that file owns its list locally. The strongest artefact is the drift test.
`variables` and `sampleValues` are transcribed from the Java rather than scraped from the deliberately typo-preserving
`templateHelp` prose, and the test reads the notifications *directory* filtering on `implements NotificationEvent` —
not a filename glob, because `ExternalToolConfigResultEvent` does not follow the convention — resolves constants, traces
each expression to its field, maps that field to its `@AllArgsConstructor` position, and compares against the
`getTestInstance()` argument, with non-literal fixtures handled as an exhaustive asserted set so a ninth one fails the
suite rather than being waved through. Its reviewer reproduced five mutations against it, each naming the offending
event, including adding a brand-new event class to the directory. Substitution mirrors `NotificationHandler.fillTemplate`
using `split`/`join` rather than `replaceAll`, because `replaceAll`'s string replacement interprets `$&`, `` $` `` and
`$$` — pinned by a test the reviewer confirmed by swapping the implementation and watching it corrupt output. One fix
cycle, on a finding I promoted above its reviewer's classification: the entry legend was a `<Typography component="h3">`
nested inside `AccordionSummary`, which MUI renders as a button, so it was pruned as a presentational child. **My stated
premise for that was wrong and the fixer corrected it**: MUI already wraps the summary in a real `<h3>`
(`Accordion.js:129`), so the list was never headingless — FM-106 had shipped a *duplicate* heading, two level-3 headings
where there should be one. Worse, the proof I prescribed would have been vacuous: Playwright's role engine does not
prune presentational children either, so a name-only `getByRole("heading")` assertion matched both headings before the
fix. It pinned by count instead, and the re-review reproduced the discrimination independently by server-rendering all
three variants — pre-fix 2, post-fix 1, and `component` omitted planting an `<h6>` inside the button, which is why the
explicit `span` was necessary rather than tidy. Verified with the gate chain (1408 tests) and real-backend
`config-notifications.spec.ts` at 5/5. Passed with minor findings, none corrected (optional), carried into
`MAINTENANCE.md`.

FM-107 (Categories Table) closes the 2026-08-24 config batch, replacing the categories repeat section with a table
whose rows expand in place. Its packet had to be refined first: it *offered* a shared-`ChipsSetting` branch its own
allowlist could not execute — the same internal contradiction FM-099, FM-100 and FM-101 hit, and resolved the same way,
by a designer refinement rather than an implementer quietly taking the executable path. The ruling came from the
registry rather than either argument: `COMPONENTS.yaml` states the `C-CONFIG-FIELDS` contract as one component per
*control kind*, never one per field, and chips is a kind the vocabulary already owns, so a categories-local chips
control would be a second implementation of an existing kind; FM-066 had already grown that vocabulary with three
optional props each defaulting to previous behaviour. The designer also froze a trap the winning argument had got
imprecise: this is **not** un-`Omit`ting `validate` — `ChipsSetting` never calls `settingRules`, so the whole-value
`validate` stays omitted and the new prop is a per-chip gate at entry time; wiring `settingRules` would have changed
when five other consumers block a save. And it found the packet's own "wide" verification filter was missing two
consumer specs, `config-auth` and `config-notifications`. **Two things the implementer corrected in the contract it was
given.** The packet asserted `settingsIndexDrift.test.tsx` would catch loss of the `config-repeat-categoriesConfig-categories`
anchor; it does not — the implementer deleted the testid and that file stayed 37/37 green, because
`renderedSettingTestIds()` only queries `^config-setting-` and direction (a) filters `kind: "row"`, so neither
direction can see a section anchor. The check was relocated somewhere that bites. And the expanded row's fields were
clipped at 390px, because an expansion is a cell of a table wider than its scroll container — ADR-0029's shape for the
fourth time, caught once again only in the mobile capture after every gate was green. **The implementer also caught a
vacuous test of its own**: mutating the refusal to filter the whole value rather than the rejected addition initially
*passed*, which is the data-loss path — refusing `abc` while a backend-legal `-5` sits stored — and it added the
missing round-trip assertion rather than reporting the case as covered. Verified with the gate chain (1437 tests) and a
six-spec real-backend run at 38 passed, the five foreign specs unedited. Passed with five minor findings, none
corrected (optional), all carried into `MAINTENANCE.md`. **One of those findings was a live regression in shipped
work, since fixed**: probing every section anchor across all eight tabs, the reviewer found `config-repeat-auth-users`
missing from the codebase entirely — FM-105 had replaced the users `RepeatSection` with `config-users-table` and
dropped the anchor `settingsIndex.ts:550` still points at, so settings search and the "on this page" list could not
reach Auth Users, and the drift test's blindness to `kind: "section"` entries is why nothing noticed. Both halves are
closed by the maintenance entry *Restore the Auth Users search anchor, and close the drift blindness that hid its
loss*: the anchor is back and derived from `settingTestId` so it cannot drift again, and the drift test gained a third
direction asserting every section anchor renders. The remaining seven all did.

FM-113 (Blank Category Save Refusal) opens the 2026-08-27 maintenance-ledger batch. `CategoriesConfig.setCategories`
sorts nameless categories last with `Comparator.nullsLast` — stable, so repeated round trips are byte-identical, which
matters because `ConfigReaderWriter.save`'s `convertValue` re-enters the setter on the write path — instead of throwing
inside Jackson's request-body binding, and `CategoriesConfigValidator` refuses them with a positional message, its two
previously unguarded dereferences null-guarded so the new path cannot itself throw. **The packet had to be retargeted
mid-task**: its end-to-end criterion drove the defect through the UI, but the Name field is `required` and `ConfigShell`
refuses on `form.trigger()` before any PUT, so a blank category cannot reach the server that way at all — FM-107's own
comment says so. The criterion moved to the API boundary, and the Outcome was reframed as API hardening, reachable by
every non-React caller but not by the UI. The ledger entry that had ranked this first on "reachable by an ordinary
admin on an ordinary day" is struck through with the correction. **The implementer caught two vacuous tests in its own
work**, both during red-first runs and both of which would have certified nothing: a deserialization case whose payload
held only the nameless entry passed against the bug, because TimSort never invokes the comparator on a one-element
list; and a validator fixture went green with the guard reverted, because `noneMatch` short-circuited on a matching
first category and never reached the nameless one. It rebuilt both. Its reviewer reproduced both claims independently
in a standalone harness rather than mutating the tree, and confirmed each of the two validator guards bites on its own.
One test is green before and after by construction — the all-named ordering pin — and was flagged as the deliberate
exception rather than dressed up; the reviewer checked it is a real pin (removing, reversing or re-keying the sort all
turn it red). Two packet claims were corrected on evidence: the pre-fix request answers **400**, not 500, because
`ErrorHandler` maps the binding failure to `HttpMessageNotReadableException`, which carries `@ResponseStatus(BAD_REQUEST)`;
and an Acceptance line cites a `F-CONFIG-AUTH` paragraph that does not exist. Verified with `mvn test -pl shared/mapping`
(14) and `-pl core` (481, 33 pre-existing skips), both re-run by the reviewer with the `-DskipTests=false` override the
environment's `~/.mvn/maven.config` requires, plus real-backend `config-categories` with unedited `config-main` and
`config-searching` at 14 passed. The other `core/ui-react` gates are recorded as skipped, not passed — no file under
`core/ui-react/` is touched. Passed with six minor findings, none corrected (optional), carried into `MAINTENANCE.md`.

FM-114 (Bulk Send Default Category Parity) restores a parity regression: a bulk send with no explicit category choice
again transmits the downloader's configured `defaultCategory` verbatim, resolved entirely client-side as legacy's
`NzbDownloadService.download` did. No Java file is touched, because the design pass established there is no server-side
resolution path at all — `Downloader.java` special-cases three sentinels and lets `null` through, `Sabnzbd.java` then
omits `cat` entirely — and `downloads.spec.ts`'s comment claiming the server resolves it was simply false. **The ledger
recorded one cause; there were two.** The second, found during design, is why this defect was testable-looking but not
tested: `DownloadActions.tsx` preselected the default only if it appeared verbatim in the fetched `get_cats` list, and
the mock returns `["*","movies","series","tv"]` while the configured default is `"Deterministic Category"` — so a test
seeding a default that *is* in the list passes against the bug. Both causes are closed. One non-obvious ordering
consequence: `request.category` is assigned *after* the duplicate probe, so the probe keeps the explicit `null` legacy
built it with, and a mutation moving it fails exactly one test. One deviation, ruled acceptable by two reviewers
independently: a `MenuItem` for an out-of-list default is appended after the fetched entries, because MUI otherwise
renders the select empty on an out-of-range value and the bar would read "Use downloader default" while sending
something else — verified by deleting the option and watching it happen. Existing options, order and labels are
untouched. Six cases red before the fix and 74 passing after, with three more green on both sides recorded as
non-regression pins rather than counted as proof — including the present-in-list shape the packet warned about.
**This task was also destroyed and restored.** An external `git fast-import` rewrote the branch history and hard-reset
the working tree at 17:17, discarding the implementation while it sat uncommitted in review; content survived in every
commit but every sha changed. It was rebuilt from scratchpad copies, one of them the *reviewer's* rather than the
implementer's own, and restoration fidelity was established rather than asserted: matching diffstats digit-for-digit,
hunk headers internally consistent with them, the focus-affordance line drift equal to the same insertion count, and
the identical red/green split reproduced. It was then committed *before* its re-review — recorded in the commit message
as a deliberate inversion, since leaving it uncommitted a second time was the larger risk. Verified on baseline
`a40e74de7` with the full gate chain (1456 tests) and a re-run real-backend `downloads` plus unedited `results` at 34
passed. Passed with three minor findings, none corrected (optional), carried into `MAINTENANCE.md`.

FM-115 (Toast Announcement Over Modals) closes the announcement half of an app-wide WCAG 4.1.3 defect: `Snackbar`
contains no `Portal`, so `ToastProvider` rendered in-tree and every toast sat inside the subtree MUI marks
`aria-hidden` when a modal opens — worst where a toast is raised from inside its own dialog, which is always the broken
state. **A portal alone does not fix it**, and that is the packet's central point: `ModalManager.add` →
`ariaHiddenSiblings` iterates `container.children` at modal-open time with no opt-out attribute, so a layer that
already exists when a dialog opens is swept regardless of where it sits. The fix is a `Portal` plus a
`MutationObserver` scoped to the single layer element, stripping `aria-hidden` whenever the sweep sets it. The
implementer considered and rejected a cleaner-looking alternative — MUI skips elements whose tagName is in an
ARIA-conformance blacklist, so a `<slot>` container would never be swept — on the grounds that its correctness would
depend on a module-private, unexported list transcribed from a W3C table that MUI may re-sync at any minor version.
Its reviewer confirmed the list exists and the trick would work today, and agreed the rejection was right. **The
reviewer attacked the mechanism rather than trusting it**: it read `ModalManager.js` to confirm the premise verbatim,
proved the converse by appending a bystander element and asserting it *stays* hidden, drove a two-dialog harness
through three open/close cycles, checked StrictMode double-invocation leaves exactly one layer, and verified the
implementer's claim that creating the element in an effect is a lint *error* rather than a preference by rewriting the
hook that way and running ESLint on it. **The implementer identified which of its own tests carries the contract**:
case (a) is green against a portal-without-observer half-fix, so only case (b) pins the requirement — and the reviewer
added the sharper observation that case (a)'s ordering is artificial, since `ToastProvider` mounts at boot, making
every production scenario case (b). The `ConfigShell` comment FM-101 left overstating in one direction was corrected
without overstating in the other: it now claims announcement and accessibility-tree presence, which the ancestor-chain
tests establish, and explicitly declines to claim focus, because the panel's `FocusTrap` owns focus wherever the layer
sits. The focus half remains open and recorded, `C-TOAST-SERVICE.state` still `partial`. Verified with the full unit
suite as the filter (1458 across 119 files, exactly +2 for the two new cases) plus the 13 named blast-radius files at
358/358 unedited, and a re-run real-backend set at 65 passed across four unedited specs. Passed clean with two minor
findings, neither corrected (optional), carried into `MAINTENANCE.md`.

FM-116 (Result Fetch Size Wording) closes the 2026-08-27 maintenance-ledger batch, and it exists in this shape because
its own premise collapsed. It was designed as a *removal*: the ledger recorded `searching.loadLimitInternal` as
"consumed nowhere", the owner decided to delete it, and that became ADR-0031. Designing the packet found
`SearchRequestFactory.java:26-30` substituting the setting as the **server-side page size** for every internal search
that arrives without an explicit `limit` — and `SearchPage.tsx` never sends one, then consumes the returned `limit` as
its load-more cursor. The setting governs fetch size on every install. ADR-0032 supersedes ADR-0031 on that evidence:
the setting stays and stays editable, and the defect is that its label and help describe a *display* page size, which
is what legacy used it for. The reusable lesson is recorded with it — the consumer is a default substituted
server-side for an *absent* field, so no grep for the setting name in the frontend can see it. Three surfaces
misdescribed one setting and all three are corrected: the label and help themselves, the adjacent
`loadAllCachedOnInternal` help pointing "above" at a field that sits below it, and FM-094's comment in
`results.spec.ts` asserting "React ignores it" — the durable record that seeded the false ledger claim. **The
implementer disproved a second premise, this one in the packet.** The packet asserted `settingsIndexDrift.test.tsx`
would catch a one-sided label edit and asked for a demonstration; the demonstration showed the opposite. Editing only
the index's label left the suite 46/46 green, because the drift test compares `anchorTestId`, `path`, the `advanced`
flag and fieldset placement, but never `label` or `helpText` — as the module's own doc comment says. Its reviewer
reproduced that independently. So the guarantee FM-099 built is narrower than believed, the two copies of this
setting's wording were synced and verified **by hand**, and the gap is now logged as pre-existing rather than
attributed here. Verified with the full gate chain (1458 tests, and the three affected specs run identically at base
and after) plus real-backend `config-searching` and `config` at 33/33. Passed with two findings carried into
`MAINTENANCE.md`, one of them the residual this task could not reach: the field still renders `unit="results per
page"` beside its corrected label, a fourth surface the design pass did not name and the allowlist explicitly froze.

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-125 (Autocomplete Close Flake) is **done** — `2b1930517`, accepted 2026-08-28 on a fresh independent review
  with no required findings. `waitFor` resolves at commit time, but `closeIfOutside` is attached by a passive effect
  flushed later; under whole-suite scheduling the test's outside `mousedown` could land in that gap. Closed with
  `await act(async () => {})` as a precondition — both behavioural halves independently re-mutated by the reviewer and
  still red when broken. Test-side only; `SearchWorkspace.tsx` byte-identical. Red loop 6/70 instrumented, green loop
  50/50. Packet archived at `e58bcac22`.

- **The suite-determinism batch (FM-122..FM-125) is complete**, and with it every known flake in the unit suite. What
  the batch actually found is worth keeping: `MAINTENANCE.md` recorded *one* flake at "1 in 10 to 13 runs" that nobody
  could name or fix. It was two defects at ~2% and ~12%; the blended rate described neither, which is why no single
  fix ever matched it. Alongside them, the system suite could not complete a run at all (two 300s ceilings), the JSON
  reporter deleted its own evidence on the next green run, and `tests/system`'s Prettier gate had been failing at HEAD
  unnoticed. Four separate reasons a green suite meant less than it appeared to.

- FM-123 (Failure-Evidence Preservation And Racing-Assertion Audit) is **done for two of its three concerns** —
  `23bc19aec`, accepted 2026-08-28. The `FailureArtifactReporter` and one genuine racing-assertion fix in
  `IndexersConfigTab.test.tsx` landed and were independently verified; the first review FAILED the reporter for
  missing the exit-1-with-zero-failed class and the correction was re-reviewed clean. **The autocomplete flake it was
  also scoped to fix is NOT fixed** and is re-opened as FM-125 — not carried as a silent gap. Its premise-stale
  hand-back was correct behaviour on evidence that later proved wrong: a controlled idle-machine A/B reproduces the
  flake at 5/50 and 6/50, matching FM-122's 12/100. Packet archived at `8164a8d06`.

- FM-125: Autocomplete Close Flake — Mechanism And Fix. Planned, dependency-ready, next — re-opens FM-123's undelivered
  third concern with the missing ingredient: a verified reproduction recipe (plain idle full-suite `npx vitest run`
  loop, ~22.5s wall/run, 10–12% per-run yield across three independent measurements). The packet requires red on
  demand, an observed mechanism, no suppression, and 50/50 green by the identical route (0.89⁵⁰ ≈ 0.3% at p ≈ 0.11).

- FM-124 (System Suite Server-State Restoration) is **done** — `ddc0dff58`, accepted 2026-08-28 on a fresh
  independent review with no required findings. A `sensitiveDataLogging` fixture restores the setting in teardown
  regardless of outcome, so a mid-test failure can no longer poison the shared instance and make the *next* run fail
  on its own precondition. The sweep the ledger asked for was done and independently re-derived: ~15 mutation sites,
  no gaps. Packet archived at `db140559d`.

- FM-122 (Unit Suite Teardown Race Elimination) is **done** — `c264c296e`, accepted 2026-08-28 on a fresh independent
  review with no findings. A global `afterEach(cleanup)` in `vitest.setup.ts` closes the exit-1-with-0-failed class.
  Primary evidence is deterministic (10/10 red without the guard, 10/10 green with it), not statistical: the packet's
  confidence arithmetic assumed p≈0.1 and the measured rate was p≈0.02, which the implementer caught and corrected
  against its own result. Packet archived at `339136a4f`.

- **FM-123 is now much better specified than when it was designed, and its packet should be refined before it starts.**
  It was written against an *anonymous* flake, so its honest scope was evidence-preservation plus a racing-assertion
  audit. FM-122's campaign named it: `SearchWorkspace.test.tsx › should close the autocomplete dropdown when the user
  clicks anywhere else, but not when clicking a suggestion`, 12/100 runs (~12%), always the same assertion, with 13
  preserved captures and a confirmed failure mode. It can now be scoped to a deterministic fix rather than better
  odds of catching it next time. **Refined 2026-08-28**: the packet now requires red-on-demand reproduction and a fix
  proven by the same route, forbids suppression (blanket `waitFor`, timeouts, retries, weakening the assertion), and
  keeps the evidence-preservation and audit halves — one packet, since the confirmed flake is the audit's exemplar in
  the file the audit is fenced to.

- FM-122 moved to Review, above (implemented 2026-08-28). FM-123 (vitest failure-evidence preservation and
  racing-assertion audit) remains sequenced strictly after FM-122 because both alter the substrate every vitest run
  executes in; FM-124 (Playwright server-state restoration) is a different runtime boundary and may run alongside
  either. Later members stay planned packets in `tasks/`.

- FM-121 (Stats Shell Layout Route And Caching) is **done** — `e438c1cd3`, accepted after one correction cycle and a
  fresh re-review.

- FM-117 (Config Control Treatment) is **done** — `0c6af3e32`, accepted 2026-08-28. Its correction cycle carried an
  explicit "not re-reviewed, do not treat as accepted" warning here and in its commit message; that warning is now
  discharged by a fresh independent re-review returning PASS with no required findings. The re-review recomputed every
  contrast ratio from raw values instead of quoting the handoff, re-ran every gate itself, and reproduced the mutation
  evidence in an isolated `git archive` copy — where it found the evidence real but the count off by one (7 failed,
  not 6). That is logged in `MAINTENANCE.md`; the commit message is history and stands as written. **FM-120 is
  unblocked.**

- FM-118 (Downloaders Table) is **done** — `b3b3b0300`, accepted 2026-08-28 on a fresh independent review returning
  PASS with no required and no minor findings, the batch's first clean first pass. Downloaders now present as a table
  matching the indexers one: name button as the edit control, Type, URL, Enabled switch left on the row. All five
  ADR-0033 testid families survived, so `settingsIndex.ts` and `settingsIndexDrift.test.tsx` needed no edit and were
  confirmed byte-identical and still exercised. The reviewer rebuilt the tree in a scratch copy — necessary, since
  `DownloaderTable.tsx` was untracked and `git archive HEAD` would have missed it — re-ran every gate, reproduced both
  mutations, and independently checked the Torbox *name button*, which the handoff had not discussed. Packet archived
  at `e40804c61`.

- FM-119 (Categories Edit Modals) is **done** — `d1a7dfbec`, accepted 2026-08-28 after one FAIL, a correction, and a
  fresh independent re-review returning PASS with no required and no minor findings. Categories now present as a
  summary table plus `CategoryDialog`, matching indexers and downloaders. This closed two owner observations with one
  change: the always-mounted accordions were also the reason the tab felt slow. Measured, per the packet's binding
  "measured, not asserted" acceptance — `container.querySelectorAll("input, select").length` over
  `CategoriesConfigTab` with 16 categories returns **3** (the tab's own scalar controls, zero from the summary rows)
  against ~208 before; reproduced independently by the fixer and the re-reviewer.

  The FAIL is the one worth remembering. ADR-0034 justified the modal on a *strictly better* required-name guarantee
  than the always-mounted accordions gave, and as first delivered it was weaker: `add()` pushes a `name: null`
  placeholder, Cancel/Escape/backdrop undid it, but unmounting the tab did not — so switching config tabs mid-add
  leaked a nameless category that surfaced only at Save. The reviewer reproduced it with a harness that unmounts the
  tab the way the router does. Closed with a transaction-token-gated cleanup effect. Packet archived at `31ce72a35`.

- FM-120 (Config Nav Subsection Flicker) is **done** — `789a89e16`, accepted 2026-08-28 on a fresh independent review
  returning PASS with no findings. One line: the fieldset-registering effect moved from `useEffect` to
  `useLayoutEffect`, so registration finishes inside the tab-switch commit instead of after a paint opportunity.
  `ConfigNav.tsx`, `fieldsetNav.ts` and `ConfigShell.tsx` have zero diff, so ADR-0028's frozen shape and the
  deliberate null render for a fieldset-less tab both stand. The proof had to escape React's `act()` contract to
  exist, and was checked for stability at 25 runs rather than trusted; what it cannot reach — a real compositor frame,
  and the router's own two-phase commit — is recorded in the packet's acceptance rather than implied covered. Packet
  archived at `7c5cd53e8`.

- **The 2026-08-27 owner-observation batch FM-117..FM-121 is complete.** All five are done: FM-117 (control
  treatment), FM-118 (downloaders table), FM-119 (categories modals), FM-120 (nav flicker), FM-121 (stats shell).
  Nine of the owner's ten observations are resolved. The tenth was never actionable — the reported sentence ("When
  switching between history / stats subsections the content blinks because") was cut off mid-word and the cause was
  never given; FM-121 fixed the stats/history blink on its own analysis, so it may already be covered, but nobody has
  confirmed that against what the owner actually meant. Ask before treating it as closed.

- The 2026-08-27 owner-observation batch FM-117..FM-121 is in flight; FM-120 is promoted and now `in review` (see the
  `## Review` section above). FM-120's dependency on FM-117 is satisfied.

- FM-118 (Downloaders As A Table) is **in `review`** — implemented against ADR-0033: a bespoke `DownloaderTable.tsx`
  replaces `DownloadersSection.tsx`'s list markup, `settingsIndexDrift.test.tsx` and `settingsIndex.ts` are untouched
  (`git diff --stat` shows no line for either), and every ADR-0033 testid was confirmed still resolving, including a
  rendered Torbox row whose URL cell reads "Not applicable" rather than "undefined". Per the FM-118/FM-119 sequencing
  note below, FM-119 must not start until this is out of `review`.

- **FM-118 and FM-119 were sequenced deliberately, and FM-119 is now clear to start** (FM-118 committed at
  `b3b3b0300`). The reason they could not overlap: They edit disjoint sources, but
  `config/settingsSearch/settingsIndexDrift.test.tsx` renders *every* config tab in one file, so it mounts both the
  downloading and categories tabs — run in parallel, each implementer's suite would contain the other's uncommitted
  work, which is exactly the contamination that cost FM-117/FM-121 their per-task verification runs. Sequence them;
  the cost is wall-clock only. Related: neither task needs to touch `settingsSearch/settingsIndex.ts`. Per-entry list
  fields and dialog-internal fields are deliberately outside the index's vocabulary (`settingsIndex.ts:17-20`), and
  both lists already contribute exactly one section entry (`:837` categories, `:905` downloaders). FM-119 moving ~208
  category inputs into modals therefore follows the shape indexers already set rather than inventing one. The single
  index-side contract for both is that the section's `anchorTestId` keeps rendering — which ADR-0033 already requires
  for downloaders and direction (c) of the drift test enforces for both.

- FM-119 (Categories Edit Modals) is **in `review`** — implemented against ADR-0034: `CategoriesTable.tsx`'s
  accordion (two `TableRow`s per entry, kept mounted while collapsed) is replaced by `CategoryDialog.tsx`, a
  throwaway `useForm` over a `structuredClone`d entry bound to a new `categoriesConfig.categoryDraft` path, the same
  shape `UserDialog`/`DownloaderDialog` established. `CategoryEntryFields`/`SizePresetRow` gained a path-builder prop
  (`categoryFieldPath(index, field)` retired; `categoryDraftFieldPath(field)` added) with an unchanged field list and
  order. The dialog's own `trigger()` refuses to commit a blank name, the client-side successor to the
  always-mounted-fields guarantee FM-107 relied on; Add still pushes a placeholder into the shared form the instant
  its dialog opens (so `C-CONFIG-REVIEW`'s change summary has something to report immediately, preserving
  `ConfigShell.test.tsx`'s pre-existing "added list entry" case unedited), but Cancel/Escape/backdrop on that specific
  transaction undoes the push, so a category the admin never finished naming cannot outlive the dialog. `settingsIndex.ts`
  and `settingsIndexDrift.test.tsx` were not touched; the container anchor `config-repeat-categoriesConfig-categories`
  is confirmed unchanged. Verified 119 files / 1504 tests (+5 vs the 119/1499 baseline), typecheck clean, lint 14
  warnings / 0 errors (unchanged), knip 1 pre-existing finding, build/check:api/validate:migration/
  validate:focus-affordances green, and 5/5 category-spec (plus all 29 `config.spec.ts`, unedited) against the real
  backend. Both required red-first mutations reproduced independently: the blank-name refusal against a `trigger()`-
  removed dialog, and the dialog-flow test against the pre-FM-119 accordion markup restored from git.

  **Correction cycle (independent review, 2026-08-28):** two required findings. (1) `add`'s placeholder had no
  rollback on unmount — only Cancel/Escape/backdrop routed through `cancelTransaction` undid it, so switching tabs
  after clicking Add without cancelling left a `name: null` entry in the shared form for FM-113's server-side
  validator to catch later with no dialog open to explain why. Fixed with a `useEffect` in `CategoriesTable.tsx`
  keyed on `editing` whose cleanup rolls back the placeholder only if `transactionRef.current` still equals the
  transaction's own token at unmount time — Cancel/Escape/backdrop/Submit all bump `transactionRef` first, so the
  cleanup is a no-op for all four and a committed entry can never be rolled back. Proven red first: with the effect
  removed, `should undo an add abandoned by unmounting the tab, leaving no placeholder behind` failed with
  `expected [...] to have a length of 2 but got 3`; restored, all 26 tests in `CategoriesConfigTab.test.tsx` pass,
  including the pre-existing "keep the categories array... across an unmount and remount" case, which still proves a
  *committed* Add survives unmount. Reproduced independently against the real backend too:
  `config-categories.spec.ts`'s "should refuse to commit a category with no name, and undo an abandoned add" passes.
  (2) The performance claim (~208 inputs before, summary-rows-only after) had no measurement recorded anywhere.
  Measured directly: rendering `CategoriesConfigTab` with 16 categories (the base config's count) and counting
  `input, select` elements inside the rendered container via
  `container.querySelectorAll("input, select").length` returns **3** — the tab's own three scalar controls
  (`defaultCategory`, `enableCategorySizes`, `overwriteNaWithSearchCategory`), zero contributed by any of the 16
  summary rows. Also logged Minor Finding 2 (the rewritten remount case only proved a *submitted* Add survives —
  narrower than the pre-FM-119 case, which is exactly the gap Finding 1 exploited) by adding the abandoned-add case
  above, and Minor Finding 1 (Add not `disabled` while `editing !== null`; unreachable in a real browser behind
  MUI's backdrop) to `MAINTENANCE.md`'s Single-session-fix list rather than fixing it here. Re-verified full suite:
  119 files / 1505 tests, typecheck clean, lint 14 warnings / 0 errors, format:check clean, knip 1 pre-existing
  finding, build/check:api/validate:migration/validate:focus-affordances green, `git diff --check` clean,
  `settingsIndex.ts` and `tests/system/tests/config.spec.ts` confirmed byte-identical to base
  (`git diff --stat 793da96bc --`, empty), and 34/34 real-backend `config-categories.spec.ts` +
  `config.spec.ts` (unedited). Still `review`, awaiting a fresh independent re-review.

- The 2026-08-27 maintenance-ledger batch (FM-113..FM-116) is complete.

- The 2026-08-26 batch is complete with FM-107; nothing is queued behind it. Unlike the cleanup
  batch, these change the UI deliberately, so each carries its own visual evidence. Later members stay `planned` until
  promoted. The chain was refined 2026-08-26 on an implementer `BLOCKED`: the batch was designed before FM-097 extracted the sticky
  bar into `ConfigSaveBar.tsx`, so "a search field in FM-097's sticky bar" was unreachable from the only shell file the
  allowlist named. Both FM-099 and FM-100 now allow `ConfigSaveBar.tsx` fenced to a pure composition seam (one optional
  slot prop; the summary becoming a button) with FM-097's four bar selectors, their order and props frozen — the
  FM-097 precedent of tightening rather than widening. FM-101 needed only stale `ConfigShell.tsx` line refs
  re-anchored to symbols. FM-102 had a structural conflict of the same vintage — its "on this page" anchor list cannot
  nest inside FM-097's vertical MUI `Tabs`, since a `Tab` is a button and interleaved non-`Tab` children break ARIA and
  MUI's roving tabindex — resolved by ADR-0028 (a sibling list below the `Tabs`, headed with the active tab's name,
  rather than rebuilding the nav as a `List` and discarding the role and selector guarantees FM-097 protects), and its
  packet refined to match.

The 2026-08-21 batch FM-077..FM-081 and the 2026-08-23 batch FM-082..FM-086 are complete (see above).

FM-073's, FM-074's, FM-075's, and FM-076's minor findings (see above) are candidates for a future quickfix.

Both follow-ups FM-062 surfaced are closed: `NotificationsWeb.NOTIFICATION_EVENTS` registers
`EXTERNAL_TOOL_CONFIGURATION` since FM-086, so its test-send endpoint no longer answers 500, and the live in-app
notification channel is migrated by FM-081 under `F-PLATFORM-LIVE-STATUS`.

FM-024's minor findings (see above) are candidates for a future quickfix.

FM-033 (Durable Visual Evidence Output) was retired unrun on 2026-08-19: its evidence-relocation outcome had already shipped
ad-hoc in `5c36a7a14`, ADR-0014 removed the `FEATURES.yaml` visual machinery it was anchored to, and its one undelivered
criterion — the containment regression guard — landed as a quickfix (`12b615863`, see `MAINTENANCE.md`).
