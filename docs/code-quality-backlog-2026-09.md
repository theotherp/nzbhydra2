# Code quality backlog, September 2026

Findings from a four-part survey of `core/src/main/java` and `core/ui-react/src` on 2026-09-08, verified against the
working tree on `newUi2026`. Ordered by bang for the buck. Each item is worked in this order; the *Status* column is
updated as items land, with the commit that closed them.

Routing rules for the work:

- Core (Java): one implementer subagent per item or bundle, ships a regression test, then an independent reviewer
  subagent reads the complete diff and reruns the tests. Commit per item or bundle.
- React single-module bugfixes with a regression test: the single-session fix route from
  `docs/frontend-migration/README.md` (*Choosing A Mechanism*), executed by a subagent, then an independent reviewer,
  then a `MAINTENANCE.md` entry.
- React cross-module refactorings (items 21 to 23, 29): task packets through `/fm-orchestrate`.
- Deliberately excluded by the owner: `SensitiveDataObfuscator`'s fixed key and IV (a config format migration).

Status values: `open`, `in progress`, `done <sha>`, `skipped (<reason>)`.

## Tier 1: small fixes, real bugs

| # | Item | Where | Status |
|---|------|-------|--------|
| 1 | Newznab parsing robustness: inverted enclosure condition, nullable `total`/`offset` unboxed, unguarded `Integer.valueOf` on attributes (also in Torznab and `InternalSearchResultProcessor`). One odd result fails the whole indexer search and temporarily disables the indexer. | `indexers/Newznab.java:441-450, 500-514, 564-577, 629-643`, `indexers/torznab/Torznab.java:54-64, 90-91`, `searching/InternalSearchResultProcessor.java:201-202` | done `0235e9af5`. Review minors recorded: parsing now trims whitespace (leniency beyond null-on-bad-input); `setIfNotNull` lives on `Newznab` rather than a util; `getEnclosureTypes().contains(null)` NPE on a null enclosure type is pre-existing (now a skipped item, not an aborted response); no direct test of the volume-factor guard in `InternalSearchResultProcessor`. |
| 2 | `BaseConfigHandler.save`/`saveToSave` take `saveLock` without try/finally; one Jackson failure deadlocks every later save including shutdown. | `config/BaseConfigHandler.java:102-113, 126-134` | done `67bec2fd4` |
| 3 | `HydraOkHttp3ClientHttpRequestFactory.clientCache` is never cleared on config change, so proxy, SSL-verify and timeout changes are inert for already-contacted hosts until restart. | `webaccess/HydraOkHttp3ClientHttpRequestFactory.java:77, 86-89, 162` | done `f6a8e84f0`. Review note: the event fires on every config PUT, not only on change; clearing is cheap because clients rebuild lazily and the connection pool is shared. |
| 4 | Folder listing endpoint is `ROLE_USER`; any user (or anonymous with unrestricted search) can list arbitrary server directories. Make it `ROLE_ADMIN`. | `config/ConfigWeb.java:134` | done `693bd55e3` |
| 5 | `MainConfigValidator.prepareForSaving` undoes its own URL-base normalization on the last line. | `config/validation/MainConfigValidator.java:101-117` | done `8c1dab575`. Review minor recorded: `urlBaseChanged` stays false when the old base is absent and a new one is set, so no restart warning on first-time URL base (pre-existing). |
| 6 | Live websocket transport: a 1.5 s ready timeout on the first connect removes the only subscriber, deactivates the STOMP client, and the consumers never retry. Footer and toasts dead for the visit. | `ui-react/src/api/live/transport.ts:179, 236-241`; consumers `app/status/DownloaderStatusFooter.tsx`, `app/status/NotificationToasts.tsx` | done `ad1cc8152`, ledger entry in `MAINTENANCE.md`. Review minors recorded there. |
| 7 | `DialogProvider` holds one confirmation; a second `confirm()` orphans the first promise forever. Also memoise the context value. | `ui-react/src/components/dialogs/DialogProvider.tsx:19-28` | done `ef23626b3`, ledger entry in `MAINTENANCE.md`. |
| 8 | `Indexer.dbLock` is the interned empty string: one JVM-wide monitor serializes result persistence for all indexers. | `indexers/Indexer.java:70` | done `6d3ea6467` |
| 9 | `<remove>` custom mapping mutates the live config object; the next save persists the corruption. | `searching/CustomQueryAndTitleMappingHandler.java:162-164` | done `bdb05ea93`. Deviation: the pre-existing test class `CustomQueryAndTitleCustomQueryAndTitleMappingHandlerTest` keeps its doubled name; the new tests live in a correctly named class. |
| 10 | `HttpStatus.valueOf(int)` throws on Cloudflare 52x codes, turning a download failure into a 500 and skipping the similar-result fallback. | `downloading/FileHandler.java:186` | done `247cf36e2`. The commit also normalizes FileHandler.java's mixed CRLF/LF endings to LF per `.gitattributes`; the content diff is two lines. |
| 11 | Username spliced into a regex without `Pattern.quote`; a dot or plus breaks the debug-info download. | `logging/LogAnonymizer.java:43` | done `8b1a917f2` |
| 12 | Load-all searches have no circuit breaker: an indexer reporting a large total with zero items per page loops forever on the same offset. | `searching/Searcher.java:98-131`, `searching/SearchCacheEntry.java:104-108` | done `3e4050641` |
| 13a | Core grab bag: TV infos never cached (`Collection == null`), API cache eviction `==` instead of `>=`, `categoryMapByMultipleNumber` not cleared on reload, NPE on evicted search state, caps-check NPE when `downloadsMax` is null, `downloadRates` live list handed to the serializer and an exception cancelling the status scheduler, `getLatestRelease` null dereference, startup error message always overwritten. | `mediainfo/InfoProvider.java:195`, `api/ExternalApi.java:229`, `searching/CategoryProvider.java:77-93`, `searching/SearchWeb.java:85-91`, `indexers/capscheck/IndexerChecker.java:276-285`, `downloading/downloaders/Downloader.java:78, 332-337` + `DownloaderWebSocket.java:196-218`, `update/UpdateManager.java:129-141, 422-431`, `NzbHydra.java:260-284` | done `4a9e47d99` `ea573301f` `dbccd9f01` `1aba3bd06` `93304ddd4` `db6a058fa` `5f38d4f0d` `80c16100e` (one commit per sub-item, in the order listed). Review minor recorded: `UpdatesWeb.versionsInfoSupplier` rewraps the new `UpdateException("No release found")` as a plain RuntimeException, so the UI still sees a generic error for an empty release list (not a regression). |
| 13b | React grab bag: config-save fallback GET outside the try so a persisted save can surface as nothing; `showUserAgent` starts false so a shared history link with a user-agent filter applies nothing. | `ui-react/src/features/config/useConfigSave.ts:125`, `ui-react/src/features/stats/history/SearchHistoryPage.tsx:106-121` | done `6ad6b1b7f` and `ff8ddcf64`, ledger entries in `MAINTENANCE.md`. |
| 13c | `SearchResultIdCalculator` hashes with the platform default charset; pin UTF-8 so result GUIDs are stable across JVMs and locales. Owner accepted the one-time re-hash of non-ASCII entries. | `searching/SearchResultIdCalculator.java:96-99` | done `02c65c009` |

## Tier 2: cheap wins with noticeable effect

| # | Item | Where | Status |
|---|------|-------|--------|
| 14 | CSRF is permanently off: the gate reads a `main.useCsrf` system property nothing in production sets. Derive from config, keep the property as a test override, add `ignoringRequestMatchers` for the API-key paths, verify with the system tests. The React transport already sends `X-XSRF-TOKEN`. | `auth/SecurityConfig.java:94-107` | done (36d8c8a0b) |
| 15 | Results table hot path: memoise the selected-results filter; hoist the 280-line inline `sx` and `ResultRow`'s per-cell `sx`; return the same `Set` from the pruning effect when unchanged; pass `filterDefaults` into `activeFilterCount`; `push` instead of spread-accumulate in `groupResults`; hoist `selectedByGroup` out of the per-result predicate. | `ui-react/src/features/search/results/SearchResults.tsx:440-443, 802-810, 1057-1060, 1650-1653, 1769-2051`, `ResultRow.tsx:295-345`, `resultTable.ts:34-55, 246, 413-441`, `RefineSidebar.tsx:183-186` | done `92a90787d`, ledger entry in `MAINTENANCE.md`. |
| 16 | Title autocomplete is an incomplete combobox: no `role="combobox"`, `aria-expanded`, `aria-autocomplete`; no scroll-into-view; ArrowUp from nothing jumps to the first option. | `ui-react/src/features/search/workspace/SearchWorkspace.tsx:389-441, 690-741` | done `fd0475508`, ledger entry in `MAINTENANCE.md`. |
| 17 | `NotificationsWeb` lacks the locking `DownloaderWebSocket` has; two concurrent subscribes leak a duplicate one-second pusher. Copy the lock or extract the shared pusher. | `notifications/NotificationsWeb.java:58-59, 106-111`, `downloading/downloaders/DownloaderWebSocket.java:177-187, 220-257` | done (2e511332f) |
| 18 | Vitest setup: the Map-backed localStorage stub is copy-pasted in ten test files and the matchMedia stub in seven, with no global mock reset. Move them into `vitest.setup.ts`. | `ui-react/vitest.setup.ts` and the ten test files | done (47345c34d) |
| 19 | Only the stats dashboard passes React Query's abort `signal`; thread it through the history request choke point and the system/stats queries. | `ui-react/src/api/history/request.ts:60-76`, the three history pages' `queryFn` | done (ce4fbfdad) |
| 20 | `FileHandler` zip and redirect handling: streams and temp dirs leak on error, `temporaryZipFiles` is an unsynchronized ever-growing set, the redirect branch writes the redirect target into the managed entity's `link` column and has no depth limit. | `downloading/FileHandler.java:228-249, 311-366, 419-432` | done (b1380f2fd) |

## Tier 3: refactorings that pay for themselves

| # | Item | Where | Status |
|---|------|-------|--------|
| 21 | Collapse the three history pages' ~140 duplicated lines each into a `useHistoryPage` hook plus a frame component. | `ui-react/src/features/stats/history/{Search,Download,Notification}HistoryPage.tsx` | open |
| 22 | One `useListEditorTransaction` hook for the five config list editors; `CustomMappingsSection` has no token guard and `NotificationEntriesSection` only `write`. | `ui-react/src/features/config/{auth/AuthUsersSection,categories/CategoriesTable,downloading/DownloadersSection,external-tools/ExternalToolsSection,indexers/IndexersConfigTab,searching/CustomMappingsSection,notifications/NotificationEntriesSection}.tsx` | open |
| 23 | Split `SearchResults.tsx` (2783 lines) at verified seams: `ResultsAlerts` (1243-1319), `ResultsToolbar` (1320-1702), `ResultsTable` (1745-2588), `ResultsPagingFooter` (2601-2632), plus `useResultDisplayChoices` and `useResultSelection` hooks. | `ui-react/src/features/search/results/SearchResults.tsx` | open |
| 24 | Downloader scaffolding: `addBySearchResultIds` is a 115-line method with a dead null check, wrong error iteration and overwritten messages; error throttle and offline fallback copy-pasted between Sabnzbd and NzbGet; null Torbox torrent id NPEs inside a swallowed catch. | `downloading/downloaders/Downloader.java:101-217, 326-352`, `sabnzbd/Sabnzbd.java:194-198, 245-253`, `nzbget/NzbGet.java:181-185, 234-246`, `torbox/Torbox.java:161-174` | open |
| 25 | `checkIfHitLimitIsExceeded`: `oldestAccessFromApi` is always true so the else branch is dead; split into two functions with a result type. Also the swapped format arguments at line 192 (and `SearchResultAcceptor.java:388`). | `searching/IndexerForSearchSelector.java:192, 336-438` | open |
| 26 | `SearchResultAcceptor.titleWordCache`: a field declared concurrent, replaced with a plain HashMap by every caller thread, guarded by a singleton-wide synchronized on the hot path. Make it a local map. | `searching/SearchResultAcceptor.java:51, 63, 318-328` | open |
| 27 | `IndexerWebAccess` builds a thread pool per HTTP call and leaks the thread on timeout. | `indexers/IndexerWebAccess.java:86-127` | open |
| 28 | Connection-failure dialog duplicated verbatim between `IndexerDialog` and `DownloaderDialog`; extract one helper. | `ui-react/src/features/config/indexers/IndexerDialog.tsx:75-86, 336-399`, `downloading/DownloaderDialog.tsx:45-57, 138-186` | done (6a2f99479) |
| 29 | Invert `settingsIndex.ts`: make the index the source of labels and help and have the setting components read from it. | `ui-react/src/features/config/settingsSearch/settingsIndex.ts` | open |
| 30 | Split `theme.ts` into tokens, palettes and components. | `ui-react/src/app/theme.ts` | done (b03e8d47d) |

## Verified but not scheduled

Smaller findings recorded for later, each verified against the code:

- `NzbHandlingWeb.downloadNzbZip` (item 20 review): a zip path handed to the browser now expires after an hour, and an expired path gets the same misleading "not created by NZBHydra" 500 as an unknown one; distinguish the two and answer 404/410. `FileHandlerTest.shouldDeleteTempDirectoryWhenNoFilesCouldBeRetrieved` diffs the shared `java.io.tmpdir` listing, which a concurrent Hydra process could disturb; inject the base dir to make it hermetic.
- `NotificationsWeb` and `DownloaderWebSocket` (item 17 review): `scheduler.shutdown()` runs outside the scheduler lock, so a subscribe racing shutdown throws `RejectedExecutionException` out of the event listener; and `cancel(true)` on last disconnect can interrupt a pusher mid-call, which is then logged at ERROR without restoring the interrupt flag. Both pre-date item 17 and are identical in the two classes; fix together with a `shutDown` flag under the lock and an interrupt check before the ERROR log.
- `IndexerChecker.retrieveJackettIndexers` returns null; `checkCaps` timeout after `invokeAll` is dead; `fillIndexerConfigFromXmlCapsResponse` and `singleCheckCaps` dereference nullable caps fields.
- `IndexerSearchCacheEntry.isAllPulled`, `SearchCacheEntry.getNumberOfFoundResults`, `SearchResultItem.comparator`, `SearchModuleProvider.java:115` `indexerNames`, `CategoryProvider.java:208-210, 265`: dead code.
- `Newznab.java:148-152, 213-218` custom parameters parsed with `split("=")[1]` unguarded; `verifyIdentifiersNotUnhandled` substring-matches the whole URI.
- `Newznab.addForbiddenWords` resolves `IndexerChecker` through the application context mid-search and does two synchronous HTTP probes plus a config save.
- `InfoProvider.convert` is synchronized on the singleton around remote calls; `canConvert` NPEs for absent id types.
- `ExternalApi.noApiKeyNeeded` is a compile-time constant; search request ids come from `random.nextInt(100000)`.
- `CategoryProvider.fromResultNewznabCategories`/`getCategory` sort the caller's list in place.
- `Stats.indexerApiAccesses` filters `findById(id) != null` (a no-op query per indexer) and then `.get()`s; `getAllStats` is a 100-line if-chain.
- `Ssl.initSocketFactory` ignores its parameter, leaks `keystoreStream`, NPEs on `listFiles()` null; `newEmptyKeyStore` and `KeyAndTrustManagers` dead.
- `HydraTaskScheduler` truncates the interval to `int`; `runNow` NPEs on an unknown task name.
- `NotificationHandler.java:103-110` `return` where `continue` is meant.
- `ExternalTools` mutable singleton fields raced by two callers.
- `DebugInfosProvider` creates three executors never shut down.
- `ConfigMigration` logs a failed step and then fails later with a misleading version message.
- `BackupAndRestore.getBackupFolder` misclassifies `C:/backups` as relative.
- `TorrentFileHandler` duplicates `getTorrentByGuid` and bypasses the fallback logic the NZB path has.
- `Interceptor.getHostFromIp` creates an executor per request.
- `NzbKing` scraping dereferences nullable elements and carries sizes through `Float`.
- `ui-react`: `CapsCheckDialog` poll has no in-flight guard; entry dialogs are unclosable while a check is in flight and checks have no timeout; `SearchHistoryPage` recreates the category catalog every render so the `dimensions` memo never hits; `SearchPage` remounts `SearchWorkspace` via `key={JSON.stringify(initialValues)}`; `SearchResults`' `searchRequestId` reset machinery is unreachable because the component remounts per search; `AppShell` mobile nav button lacks `aria-expanded`; the Actions header cell restates the sorted header's `sx`.
- Owner decision needed: `SensitiveDataObfuscator` fixed key and IV (excluded from this round).
