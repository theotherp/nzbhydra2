# Code health plan

Written 2026-11-14 against master at `3c558a656`. Scope is cleanup, stability, RAM and CPU. No new features.

## Overview

I read the backend search path, the HTTP layer, the scheduled tasks, the caches, the logging encoder and the stats code, and I skimmed the React build output. I did not profile a running instance. Every finding below comes from reading
code, so each task says how sure I am and what the agent should confirm first.

The code is in decent shape. There are few swallowed exceptions, one shared Jackson mapper, bounded caches in most places. The waste sits in three spots:

1. Work repeated per search result. Regexes get compiled for every item, lists get rebuilt for every title, and the result merge rescans all indexers after every popped item. A "load all" search with 50,000 results multiplies each of these.
2. Threads created and thrown away. One indexer query currently costs two short-lived thread pools. A request with IP-to-host mapping costs another.
3. Work done while nobody benefits. Two WebSocket pollers hit the database and the downloader once a second for as long as a browser tab is open. Thymeleaf re-parses the page template on every request.

Stability findings are fewer but more interesting. The indexer map is cleared and refilled without any synchronisation while searches read it. `Indexer` has an `@EventListener` on a prototype bean, which makes Spring build a fresh,
uninitialised indexer for every config change event. `InfoProvider` keys a cache by an int hash, so two different IDs can collide and return the wrong movie.

The frontend went through the FM migration with its own review gates, so I left it mostly alone. One packaging task is listed.

Things I looked at and would leave: the Hikari and Tomcat pool sizes, the H2 settings covered by the September growth analysis, the `Searcher` per-round executor, the unhashed `index.js` entry which `vite.config.ts`
explains.

## How to use this document

Each task is written for one agent in one session. Tasks in the same segment touch nearby code, so run them one after another, not in parallel. Segments are independent of each other except where a task says otherwise.

Rules that apply to every task:

- Read `AGENTS.md` first. Never delete or ignore a failing test.
- Confirm the finding before changing anything. If the code no longer matches the description, stop and report.
- Keep behaviour identical unless the task says otherwise. Add or extend a unit test that would have caught the problem.
- `mvn test` skips tests in this repo. Pass `-DskipTests=false` and check that "Tests run" is above zero.
- Add a `changelog-unreleased.yaml` entry only when a user would notice the change.

Priority means the order I would do them in. P1 first.

| ID | Task                                                | Gain               | Priority | Confidence |
|----|-----------------------------------------------------|--------------------|----------|------------|
| A1 | Precompile acceptor regexes                         | CPU                | P1       | high       |
| A2 | Fix `Indexer` prototype listener and title cleanup  | CPU, stability     | P1       | high       |
| A3 | Make result merge linear                            | CPU                | P2       | high       |
| A4 | Trim work in the web result transformer             | CPU, DB            | P2       | medium     |
| A5 | Precompile log sanitiser regexes                    | CPU                | P1       | high       |
| B1 | Replace per-call executor with OkHttp call timeout  | threads            | P1       | medium     |
| B2 | Cache IP-to-host lookups                            | threads, latency   | P2       | high       |
| B3 | Slow down or event-drive the WebSocket pollers      | CPU, DB, network   | P2       | high       |
| B4 | Clean up performance metric logging                 | CPU, threads       | P3       | high       |
| B5 | Share one OkHttp base client                        | RAM, threads       | P3       | medium     |
| C1 | Filter uniqueness scores in SQL                     | RAM                | P2       | high       |
| C2 | Batch the old search result delete                  | stability, RAM     | P2       | medium     |
| C3 | Fix `InfoProvider` locking and cache key            | stability, latency | P1       | high       |
| C4 | Stop the login attempt cache from growing on reads  | RAM                | P3       | high       |
| C5 | Replace the request-keyed URL builder cache         | cleanliness, RAM   | P3       | medium     |
| C6 | Tidy `DiskCache` bookkeeping                        | CPU, cleanliness   | P3       | medium     |
| D1 | Swap the indexer map atomically                     | stability          | P1       | high       |
| D2 | Interrupt and shutdown hygiene                      | stability          | P2       | high       |
| D3 | Turn on Thymeleaf template caching                  | CPU                | P1       | high       |
| D4 | Fix scheduler interval cast and trigger capture     | stability          | P3       | medium     |
| E1 | Delete dead logging classes                         | cleanliness        | P2       | high       |
| E2 | Remove the 8 MB binary `test.ts` from the repo root | cleanliness        | P1       | high       |
| E3 | Triage disabled tests                               | cleanliness        | P3       | high       |
| E4 | Remove raw types in the search path                 | cleanliness        | P3       | high       |
| F1 | Ship only woff2 Font Awesome files                  | package size       | P3       | medium     |

---

## Segment A. Search hot path

All paths are under `core/src/main/java/org/nzbhydra/`.

### A1. Precompile acceptor regexes

File: `searching/SearchResultAcceptor.java`, method `checkRegexes`.

`checkRegexes` calls `Pattern.compile` for the required and the forbidden regex on every item. `acceptResults` calls it twice per item, once for the global searching config and once for the item's category. A page of 100 results with both
regexes set compiles 400 patterns.

Do this:

- Compile each distinct regex string once per `acceptResults` run. A local `Map<String, Pattern>` passed down like `titleWordCache` is enough and keeps the singleton free of shared state.
- Keep the flags `CASE_INSENSITIVE | DOTALL`.
- An invalid user regex currently throws `PatternSyntaxException` out of the loop. Keep whatever happens today, do not start swallowing it silently. If nothing sensible happens today, log once per run and treat the regex as not set, and say
  so in your report.

While you are in the file, look at two smaller things and fix them only if the tests agree:

- `itemsWithoutActualDuplicates` is a `HashSet`, so accepted results come back in hash order, not indexer order. `LinkedHashSet` keeps the indexer's order at no cost.
- `checkRequiredWords` and `checkForForbiddenWords` call `toLowerCase()` on the title and on each word inside the loops. Lowercase the title once per item.

Verify with `SearchResultAcceptorTest`. Add a test that runs two items through one regex and asserts both verdicts.

### A2. Fix the `Indexer` prototype listener and title cleanup

File: `indexers/Indexer.java`, `handleNewConfig` and `cleanUpTitle`.

Two problems that belong together.

First, `Indexer` subclasses are prototype beans. `handleNewConfig` carries `@EventListener`. For a prototype bean Spring resolves the listener target with `getBean`, which builds a new instance for every event. So each `ConfigChangedEvent`
creates one uninitialised indexer per subclass, calls the method on it and discards it. The live instances never see the event. Confirm this with a breakpoint or a log line in the constructor before you change anything. The reset is not
needed anyway, because `SearchModuleProvider.loadIndexers` replaces all live instances on a config change.

Second, `cleanUpTitle` runs once per search result. Each call streams `getRemoveTrailing()`, lowercases and trims every entry and collects a list, only to check whether it is empty. The compiled `cleanupPattern` is cached, the list is not.

Do this:

- Remove the `@EventListener` method from `Indexer`. Check `Torbox` and the other subclasses for the same pattern.
- Build the pattern once per instance, lazily, and store "no pattern" as a distinct state so the empty case returns early without streaming.
- `cleanupPattern` is written from several search threads. Make the field `volatile` or build it in `initialize`.
- The comment "Tests need to reset pattern or something" points at tests that poke the field. Keep them passing.

Verify with the Newznab, Binsearch and NzbKing tests, and add a test that changes `removeTrailing`, reloads indexers and sees the new pattern applied.

### A3. Make the result merge linear

File: `searching/SearchCacheEntry.java`, method `mergeCachedResults`.

For every popped item the loop streams all indexer cache entries to find the newest head, then calls `getIndexersWithCachedResults()` again, which streams and collects a new list. With k indexers and n results that is n list allocations and
about 2·n·k comparisons. A load-all search reaches n = 50,000.

Do this:

- Keep the candidates in a `PriorityQueue<IndexerSearchCacheEntry>` ordered by `peek()` with `SearchResultItem.NEWEST_FIRST`. Poll the entry, pop its item, and re-insert the entry if it still has cached results.
- Keep the early break exactly as it is. It fires when the entry that just ran dry has more results on the indexer and the search is not `INTERNAL`.
- Ties between indexers must resolve the same way as today, or the API paging order changes. `Stream.min` returns the first minimum in map iteration order. Either reproduce that with a secondary comparator or show with a test that the order
  of equal-dated items does not reach the caller.

Verify with the existing `SearchCacheEntry` and `Searcher` tests. Add one test with three indexers and interleaved dates that asserts the full merged order.

### A4. Trim work in the web result transformer

File: `searching/InternalSearchResultProcessor.java`.

Three separate costs in one class.

1. `transformSearchResults` finds the matching download for each item with `alreadyDownloaded.stream().filter(...)`. That is items times downloads. Build a `Map<Long, FileDownloadEntity>` keyed by search result hash once.
2. `findBySearchResult_HashIn(guids)` gets every guid in one `IN` list. A load-all response can pass tens of thousands of parameters. Split the list into chunks of about 1,000 with Guava `Lists.partition`.
3. `createIndexerLimitWarnings` calls `indexerStatusesAndLimits.getSortedStatuses()`, which queries the limits table and sometimes the short-term access table for every configured indexer, then throws away all that were not searched. Add a
   method on `IndexerStatusesAndLimits` that takes the set of names and only loads those.

Also check the movie quality block. It calls `qualityAnalyzer.getQualityRating`, `getRatingExplanation` and `analyze` on the same `ReleaseInfo`. If those three repeat the same analysis internally, compute it once. If they do not, leave it
and say so.

Verify with `InternalSearchResultProcessorTest`. Keep the output JSON identical.

### A5. Precompile log sanitiser regexes

File: `logging/SensitiveDataRemovingPatternLayoutEncoder.java`, method `removeSensitiveData`.

Every log line goes through three `String.replaceAll` calls. Each one compiles its regex again. With debug logging on, this runs thousands of times per search.

Do this:

- Move the three patterns into `private static final Pattern` fields and use `matcher(txt).replaceAll(...)`.
- Add a cheap guard for the two JSON patterns. They can only match if the line contains `"name"`. Skip them otherwise.
- Do not weaken what gets redacted. This class keeps API keys out of log files.

Verify with the existing encoder test. Add cases for each of the three patterns if they are missing, plus one line with nothing to redact.

---

## Segment B. Threads and HTTP

### B1. Replace the per-call executor with an OkHttp call timeout

Files: `indexers/IndexerWebAccess.java`, `webaccess/WebAccess.java`, `webaccess/HydraOkHttp3ClientHttpRequestFactory.java`.

`IndexerWebAccess.get` creates a single-thread executor for every indexer call, submits the HTTP call and waits `timeout + 1` seconds. `Searcher.queryIndexers` already runs each indexer on its own pool thread. So every indexer query starts
and stops two threads. The inner executor exists because the OkHttp client only has connect, read and write timeouts, and a slow trickle of bytes can outlive all three.

Do this:

- Set `callTimeout` on the client built in `getOkHttpClient(host, timeout)`. It bounds the whole call including the body read.
- Run the call directly on the calling thread and map the resulting `InterruptedIOException` to the same `IndexerUnreachableException` message the `TimeoutException` branch produces today.
- Keep the mapping of `SocketTimeoutException`, `HydraUnmarshallingFailureException` and `WebAccessException` unchanged. ADR-0019 is mentioned in a comment there, read it.
- `Searcher.shortcutSearch` cancels with `future.cancel(true)`, which interrupts the pool thread. Check that an interrupt still aborts a blocked OkHttp call promptly. If it does not, keep the executor and report why.

This is the riskiest task in the segment. Unmarshalling currently runs inside the timed block too, so a huge response that parses slowly is cut off today and would not be after the change. Decide whether that matters and say so.

Verify with `IndexerWebAccessTest` and one system test run of a normal search and a shortcut search.

### B2. Cache IP-to-host lookups

File: `web/Interceptor.java`, method `getHostFromIp`.

With "map IP to host" enabled, every request creates an executor, does a reverse DNS lookup with a 500 ms cap and shuts the executor down. Successful lookups are not cached. Failed ones go into `skipHostnameMappingFor`, which never shrinks.
A lookup that times out is not remembered, so a client with broken reverse DNS adds 500 ms to each of its requests.

Do this:

- Cache results per IP in a Caffeine cache with a size cap of a few hundred entries and an expiry of about an hour. Cache the negative and the timed-out outcome too, with a shorter expiry.
- Use one shared daemon executor for the lookups, not one per request.
- Remove `skipHostnameMappingFor` once the cache covers its job.

Verify with a unit test that calls the method twice for one IP and asserts a single lookup.

### B3. Slow down or event-drive the WebSocket pollers

Files: `notifications/NotificationsWeb.java`, `downloading/downloaders/DownloaderWebSocket.java`, `downloading/downloaders/DownloaderStatusRetrieval.java`.

While at least one browser tab is subscribed:

- `NotificationsWeb` runs `findAllByDisplayedFalseOrderByTimeDesc` every second. If unread notifications exist, it resends the whole list every second.
- `DownloaderWebSocket` calls the downloader's HTTP status API every second. When the downloader is offline, `DownloaderStatusRetrieval` logs at error level every second.

Do this:

- Notifications. Send when a notification is saved, by listening to the same events that create `NotificationEntity` rows, and once on subscribe. If that is more than a small change, raise the interval to 5 seconds and only send when the
  set of unread IDs changed since the last send.
- Downloader status. Poll every second only while the last status was `DOWNLOADING`. Otherwise back off to 5 seconds. After a failed call back off further and log the error once per state change, then at debug.
- The React footer shows this status. Read `core/ui-react/src/app/status/DownloaderStatusFooter.tsx` to see what it expects, including the `lastUpdateForNow` flag, and keep that contract.

Verify with the existing tests for both classes and a manual look at the footer during a download.

### B4. Clean up performance metric logging

File: `debuginfos/DebugInfosProvider.java`, method `logMetrics`.

This only runs when the PERFORMANCE logging marker is on, so the gain is small. The code is still wrong in four ways:

- The first scheduled task calls `threadMxBean.dumpAllThreads(true, true)` and ignores the result. A full thread dump with monitors is expensive.
- Three executors are created and never shut down.
- `timeAndThreadCpuUsagesList` is an `ArrayList` written by one thread and returned to web threads without a copy.
- `lastThreadCpuTimes` is keyed by thread name and never pruned. Pool threads with numbered names accumulate.

Do this: delete the unused dump, use one scheduler and stop it in a `@PreDestroy` method, return a copy of the list under a lock or use a concurrent deque, and drop entries from `lastThreadCpuTimes` for threads that no longer exist.

### B5. Share one OkHttp base client

File: `webaccess/HydraOkHttp3ClientHttpRequestFactory.java`, method `getBaseBuilder`.

`new OkHttpClient().newBuilder()` creates a throwaway client first. Each cached client then carries its own `Dispatcher` with its own thread pool. The connection pool is already shared, the dispatcher is not.

Do this: keep one base `OkHttpClient` in a field and derive all others with `base.newBuilder()`. They then share dispatcher and connection pool. Rebuild the base when the logging marker for HTTP changes, since `clientCache` is already
cleared on `ConfigChangedEvent`.

Low priority. Hydra uses synchronous calls, so the dispatcher pools stay mostly idle. Check with a thread dump whether any `OkHttp Dispatcher` threads exist at all before spending time here.

---

## Segment C. Memory and caches

### C1. Filter uniqueness scores in SQL

File: `historystats/Stats.java`, method `indexerScores`.

`uniquenessScoreEntityRepository.findAll()` loads the whole table as entities, then filters by `dataVersion >= 3` and by date in Java. The table grows with every download.

Do this:

- Add a repository query that applies the version filter and the date range from `isWithinScoreDateRange`. Read that method first, the date logic has to match exactly, including open-ended ranges.
- If `calculateIndexerScores` only needs a few columns, select a projection and not full entities. That is optional.

Verify with `StatsComponentTest`. One test there is `@Disabled` at line 291, look at why before relying on the class.

### C2. Batch the old search result delete

File: `searching/cleanup/OldResultsCleanupTask.java`.

The task deletes all expired rows from `SEARCHRESULT` in one statement and one transaction, with `ID not in (select ...)`. On a large database that is one long write transaction. `HistoryCleanupTask` next to it already solves the same
problem with `rownum() < 10000`, a commit and a short sleep per batch.

Do this:

- Delete in batches the same way. Reuse the helper from `HistoryCleanupTask` if it can be shared without contortions.
- Replace `not in` with `not exists`. `NOT IN` with a subquery is slow in H2 and wrong if the subquery ever returns null.
- Bind the cutoff as a parameter. The string replace of `:epochSecond` is not needed.

I did not measure this. Before changing it, load a copy of a large database and time the current statement. If it finishes in well under a second with a million rows, only do the
`not exists` change.

`HistoryCleanupTask` also logs "Starting deletion of old history entries" at info every hour. Lower it to debug unless rows were deleted.

### C3. Fix `InfoProvider` locking and cache key

File: `mediainfo/InfoProvider.java`.

- `convert(String, MediaIdType)` is `synchronized` and calls TMDB or TVMaze inside the lock. One slow lookup blocks every other conversion, so parallel API searches from Sonarr and Radarr queue up behind each other.
- `mediaInfoMap` is keyed by `Objects.hash(value, fromType)`. That is a 32-bit hash used as identity. Two different IDs with the same hash return each other's media info.
- The method is also `@Cacheable` on the Caffeine cache `infos`. Two caches cover the same data.

Do this:

- Key by a record of `(value, fromType)`.
- Drop one of the two caches. Check first whether the self-call from `convert(Map)` bypasses the Spring proxy. If it does, the `@Cacheable` on the inner method never fires for that path and `mediaInfoMap` is the cache that works. Keep the
  one that works and delete the other.
- Lock per key, not per instance. Caffeine's `cache.get(key, loader)` does that, and so does `ConcurrentHashMap.computeIfAbsent` on a key record. Failed lookups must not be cached as successes.

Verify with `InfoProviderTest`. Add a test with two keys whose `Objects.hash` values are equal.

### C4. Stop the login attempt cache from growing on reads

File: `auth/LoginAndAccessAttemptService.java`.

`isBlocked` and probably `wasUnsuccessfulBefore` call `attemptsCache.getUnchecked(key)`. The loader returns 0, and Guava stores it. Every distinct client IP that makes a request gets an entry for 24 hours. The cache has no size limit.

Do this: use `getIfPresent` for reads and treat null as 0. Add `maximumSize(10_000)`. Keep `accessFailed` as the only writer.

### C5. Replace the request-keyed URL builder cache

File: `web/UrlCalculator.java`, field `builderCache`.

The cache maps `HttpServletRequest` objects to URI builders for one minute. Request objects are per request and wrapped by Spring Security, so a second lookup for the same key only happens inside the same request. Meanwhile the map holds up
to 50 finished request objects for a minute, each with its buffers. If the servlet container recycles a request object, a stale builder for another host could be returned.

Do this: store the builder as a request attribute and read it from there. Delete the `ExpiringMap`. Confirm first with a counter or a debugger that cross-request hits do not happen today.

`UrlCalculatorTest` is disabled as a whole class. Re-enable what you can as part of this task.

### C6. Tidy `DiskCache` bookkeeping

File: `cache/DiskCache.java`.

- `ACCESS_MAP` is static, so two `DiskCache` instances would share one map keyed by bare file names. There is one instance today. Make the field an instance field.
- `cleanAfterPut` calls `getCacheSizeInMb()` in a loop, and each call lists the directory and stats every file. Compute the size once, then subtract the length of each deleted file.
- `deleteOldestEntry` scans the whole map for the minimum each time. With 500 entries that is fine. Leave it.

Small task, low gain. Do it after the others.

---

## Segment D. Stability

### D1. Swap the indexer map atomically

File: `searching/SearchModuleProvider.java`.

`searchModuleInstances` is a plain `HashMap`. `loadIndexers` clears it and refills it one indexer at a time, with database calls in between. Search threads read it through `getIndexers`, `getEnabledIndexers` and `getIndexerByName` without
any lock. A search that starts during a config save sees no indexers or half of them, and concurrent access to a `HashMap` during writes can throw or loop.

Do this:

- Build the new map in a local variable. Assign it to a `volatile` field as an unmodifiable map when it is complete.
- Readers take the field once per call.
- `apiHitsToStoreInitially` is also an unsynchronised `HashMap`. Look at who calls `registerApiHitLimits` and from which thread, and fix it the same way if needed.

Verify with a test that calls `loadIndexers` in one thread while another thread calls `getIndexers` in a loop and never sees an empty list after the first load.

### D2. Interrupt and shutdown hygiene

Several small defects of one kind.

- `misc/Sleep.java` catches `InterruptedException` and calls `printStackTrace`. The interrupt flag is lost, so loops like the one in `HistoryCleanupTask.deleteOldEntries` keep going during shutdown. Restore the flag with
  `Thread.currentThread().interrupt()`, and make that loop stop when the thread is interrupted.
- `config/BaseConfigHandler.java` creates `new Timer("delayedConfigSave", false)`. It is a non-daemon thread and only the task is cancelled, never the timer. Keep the timer in a field and cancel it in `onShutdown`.
- `downloading/DownloadStatusUpdater.java` reads and writes `lastDownload`, `queueCheckEnabled` and `historyCheckEnabled` from the scheduler thread and from event listener threads. Make them `volatile`.
- The same class opens a transaction every 10 seconds before it checks whether status updates are enabled, because `@Transactional` sits on the task method. Move the transactional work into a separate bean method, or do the cheap checks in
  a non-transactional caller.
- `problemdetection/OutdatedWrapperDetector.java:111` prints to `System.out`. Check whether it is a leftover debug helper and remove it or log it.

### D3. Turn on Thymeleaf template caching

File: `core/src/main/resources/config/application.properties`, line `spring.thymeleaf.cache=false`.

With the cache off, Thymeleaf reads and parses `templates/react.html` for every page load. The setting is for development.

Do this: remove the line or set it to `true` in the main file. If developers need it off, put `spring.thymeleaf.cache=false` in a dev profile. Check how `react.html` gets its dynamic values first. They must come from model attributes at
render time, which caching does not affect.

Verify by loading the UI twice in a system test run and checking that a base URL change still shows up after a restart.

### D4. Fix scheduler interval cast and trigger capture

File: `tasks/HydraTaskScheduler.java`, method `scheduleTask`.

- `plusMillis((int) getIntervalForTask(task))` casts a long to int. An interval above about 24.8 days, set through a `hydraTasks.*` property, overflows to a negative number and the task fires in a tight loop. Remove the cast.
- The trigger lambda captures `runNow`. Tasks scheduled at startup have `runNow == true` forever, so `triggerContext.lastCompletion()` is never used and the shown "last execution" is the time the trigger was evaluated. Use `runNow` for the
  first evaluation only.
- `scheduler.setRemoveOnCancelPolicy(true)` is called inside the method on every `runNow`. Move it to `afterSingletonsInstantiated`.

Verify with the scheduler tests. Timing between runs must stay "interval after completion".

---

## Segment E. Cleanup

### E1. Delete dead logging classes

`logging/ProgressLogger.java` has 673 lines and `logging/Util.java` has 326. A grep over `core/src/main`, `core/src/test` and `shared` finds no reference to either outside the two files. Neither appears in `reflect-config.json`.

Do this: confirm with a fresh search, including string references in the native-image metadata under `core/src/main/resources/META-INF/native-image`. Delete both. Build the project.

Then look for more of the same. IntelliJ's unused declaration inspection is the right tool if the MCP server is reachable. Report candidates you are not sure about and do not delete them.

### E2. Remove the binary `test.ts` from the repo root

`test.ts` in the project root is tracked and 8.4 MB. It is an MPEG transport stream, not TypeScript. It arrived with commit `5d3dd4dd0` "Fix recent searches from before 9.0.0", which looks like an accident.

Do this: `git rm test.ts`. Do not rewrite history. Check that nothing references the file.

While there, list other root files that look stale and report them without deleting: `compileCore.cmd`, `buildCore.cmd`, `nativeNotes.md`, `_config.yml`, `system.iml`. The owner decides.

### E3. Triage disabled tests

Whole test classes are disabled: `UrlCalculatorTest`, `DownloaderTest`, `TorboxTest`, `ConfigWebTest`, `ThreadedTest`. Single tests are disabled in `StatsComponentTest` and `OutOfMemoryDetectorTest`. `Experiments`, `SslTest` and
`OkHttpHandshakeAlert` are manual tools and fine as they are.

Do this for each of the first seven: run it, find out why it fails or why it was disabled, then either fix and enable it or write the reason into the `@Disabled` annotation. AGENTS.md forbids deleting tests, so do not delete any.
`ConfigWebTest` says it fails only in CI and links a run, start with that log.

### E4. Remove raw types in the search path

`Indexer` is generic but used raw in `IndexerForSearchSelector`, `SearchModuleProvider`, `SearchCacheEntry` and `Stats`. `Stats.getAllStats` uses raw `Future`, and `IndexerForSearchSelector.checkTooManyFrequentHits` uses raw `List`.

Do this: add `<?>` or the real type argument, one class at a time, compiling after each. No behaviour change. Stop where a fix would need a redesign and list what is left.

---

## Segment F. Frontend packaging

### F1. Ship only woff2 Font Awesome files

`core/ui-react/src/App.tsx` imports `@fortawesome/fontawesome-free/css/all.min.css`. The build copies every font format into the bundle. The SVG, EOT, TTF and WOFF files add about 3 MB to `dist/assets` and to the release jar. Every browser
the React UI supports loads woff2.

Do this:

- Read `core/ui-react/AGENTS.md` first. Find out which Font Awesome classes the UI uses. Downloader icons are user-configured class names, so the full icon set has to stay available.
- Replace the CSS import with a local stylesheet that declares the same `@font-face` families with woff2 sources only and reuses the package's icon class rules. Keep the v4 shims.
- Run `npm run build` and `npm run validate:production-assets`. Compare `dist/assets` before and after.

This changes no behaviour and saves no RAM at runtime. It only makes the download smaller. Route it through `fm-quickfix` like other small frontend changes.

---

## What I would not do

- Replace the per-round executor in `Searcher.queryIndexers` with a shared pool. Cancelling a search relies on `shutdownNow` and on interrupting those threads. A shared pool makes that harder to get right for a small saving.
- Stream indexer responses into JAXB without the intermediate string. It would halve peak memory per response, but the error path needs the raw text for the parse excerpt and for ADR-0019.
- Touch H2 settings or primary key generation. The September growth analysis already measured those.
