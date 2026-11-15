# Code health plan, part 2

Written 2026-11-15 against `code-health` at `78420db28`. It follows `docs/code-health-plan.md`, whose 25 tasks are done. Scope is the same: bugs, stability, tests and structure. No new features.

## Overview

For this round I read the code the first plan skipped: the download path (`FileHandler`, `Downloader`), the external API, backup and restore, the task scheduler, the indexer base class, the Torbox indexer and the HTTP helper `WebAccess`. I
did not profile a running instance and I did not read `SecurityConfig`, `UpdateManager`, `ExternalTools` or the frontend. Every finding comes from reading code, so each task says how sure I am.

The areas that had been reviewed for security before held up. Backup file names are checked against the list of existing backups, zip extraction is bounded to its target folder, and the indexer selector keeps its per-search state in a
request-scoped bean. I found no new security problem.

What I found falls into four groups:

1. Bugs. Nine tasks. Two matter in daily use: every successful indexer call makes the config file get rewritten, and each reload of the indexers can leak two threads per Torbox indexer. The rest are rare or small.
2. Verification the first plan still owes. The native image metadata was edited by hand and never built. The SOCKS proxy path and search cancel were never run. These are test runs, not code changes, but they can turn into bug fixes.
3. Test coverage. Unit coverage is better than I expected: of the classes with 150 lines or more, only a handful have no test. The gaps are listed by name.
4. Structure. Two tasks. I am not proposing to split the large classes (`Newznab`, `Stats`, `IndexerChecker`). They are long but each does one job, and splitting them is risk without a clear gain.

## How to use this document

Same rules as the first plan:

- Read `AGENTS.md` first. Never delete or ignore a failing test.
- Confirm the finding before changing anything. If the code no longer matches the description, stop and report.
- For a bug, write the failing test first, watch it fail, then fix.
- `mvn test` skips tests in this repo. Pass `-DskipTests=false` and check that "Tests run" is above zero.
- Add a `changelog-unreleased.yaml` entry only when a user would notice the change. Tasks that need one say so.
- One implementer at a time. Tasks in one segment touch nearby code.

Use Fable for A4 and D1.

Priority is the order I would do them in.

| ID | Task                                                      | Kind      | Priority | Confidence |
|----|-----------------------------------------------------------|-----------|----------|------------|
| A1 | Stop rewriting the config after every indexer call        | bug       | P1       | high       |
| A2 | Stop the Torbox indexer from leaking its thread pool      | bug       | P1       | high       |
| A3 | Don't return a null body when reading the response fails  | bug       | P1       | high       |
| A4 | Don't disable an indexer for an error in Hydra's own code | bug       | P2       | medium     |
| A5 | Always shut down the stats executor                       | bug       | P2       | high       |
| A6 | Close the direct socket in `SocksSocket.connect`          | bug       | P2       | medium     |
| A7 | Small defects in `ExternalApi`                            | bug       | P3       | high       |
| A8 | Thread safety and input checks in `HydraTaskScheduler`    | bug       | P3       | high       |
| A9 | Bound the per-host OkHttp client cache                    | bug       | P3       | medium     |
| B1 | Build the native image and run its system tests           | verify    | P1       | n/a        |
| B2 | Test that the native metadata matches the code            | test      | P1       | high       |
| B3 | Exercise the SOCKS proxy and search cancel                | verify    | P2       | n/a        |
| B4 | Check the icon font in a browser                          | verify    | P3       | n/a        |
| C1 | Measure coverage once and record the gaps                 | test      | P2       | n/a        |
| C2 | Unit tests for `MinAgeOffsetSearch`                       | test      | P1       | high       |
| C3 | Unit tests for the log reader and `StoredRecordMatcher`   | test      | P2       | high       |
| C4 | Regression test for the restart exit code                 | test      | P2       | high       |
| C5 | Remove lenient Mockito strictness where it hides waste    | test      | P3       | medium     |
| D1 | Keep database transactions out of network calls           | structure | P2       | medium     |
| D2 | Finish removing raw types                                 | structure | P3       | high       |
| D3 | Housekeeping                                              | cleanup   | P3       | high       |

## Segment A. Bugs

### A1. Stop rewriting the config after every indexer call

**Where:** `core/src/main/java/org/nzbhydra/indexers/Indexer.java`, `handleSuccess` (about line 327); `config/BaseConfigHandler.java`, `save(boolean)`.

**What happens:** `getAndStoreResultToDatabase` calls `handleSuccess` after every successful indexer call. `handleSuccess` sets state, last error, disabled-until, disabled level and disabled-at to their "healthy" values and then calls
`baseConfigHandler.save(false)`. That marks the config as dirty whether or not anything changed, and the delayed-save timer writes the whole YAML file (including re-encrypting the sensitive values) within 10 seconds. While searches run, the
config file is rewritten every 10 seconds for no change.

**Effect:** needless disk writes, which matter on SD cards and on NAS drives that would otherwise sleep. It also widens the window in which a crash can catch a half-written file.

**Change:** in `handleSuccess`, save only when one of the five values differs from its healthy value before the call. `handleFailure` really changes state, so it keeps saving.

**Test:** an indexer test where `handleSuccess` runs on an already healthy config and `baseConfigHandler.save` is never called, and one where the indexer was disabled and it is called once.

**Related, not part of this task:** indexer threads change the live `IndexerConfig` object. If the user saves the config at the same moment, the change made by the search thread can land in the old object and be lost. I did not find a
report of
this and would leave it unless it shows up.

### A2. Stop the Torbox indexer from leaking its thread pool

**Where:** `core/src/main/java/org/nzbhydra/indexers/torbox/Torbox.java`, lines 60, 79 and 240.

**What happens:** the class is a prototype bean with the field `Executors.newFixedThreadPool(2)` and a `@PreDestroy tearDown()` that shuts it down. Spring never calls destroy callbacks on prototype beans. `SearchModuleProvider.loadIndexers`
creates new indexer instances on every config save, so the old instance's pool is never shut down. Its two threads are non-daemon and stay parked forever once a search has started them.

**Effect:** two leaked threads per Torbox indexer per config save that followed a Torbox search. Only users with a Torbox indexer are affected.

**Change:** share one executor for all instances. A static daemon pool, or better a singleton bean injected into the prototype, shut down by Spring. Remove the `@PreDestroy` that never runs. Check the other `Indexer` subclasses and the
`Downloader` subclasses for the same pattern (a resource held in a field of a prototype bean); I only checked for executors.

**Test:** create and discard several `Torbox` instances, run a search on each with the web access mocked, and assert the number of live threads with the pool's name does not grow.

**Changelog:** yes, a fix entry.

### A3. Don't return a null body when reading the response fails

**Where:** `core/src/main/java/org/nzbhydra/webaccess/WebAccess.java`, lines 114 to 124.

**What happens:** when `body.string()` throws an `IOException`, the code sets the body to null and carries on, unless a call timeout was given. For a 200 response this returns null to the caller as if the server had sent nothing. The
typed overloads then pass null to Jackson, which throws an `IllegalArgumentException` that hides the real cause, a read timeout or a dropped connection in the middle of the body.

**Change:** rethrow when the response was successful. For an unsuccessful response keep the current behaviour (the status code is the useful information and the body is optional). Wrap a `SocketTimeoutException` in a
`WebAccessException` the way the outer catch already does for the connect phase.

**Confirm first:** list the callers of `callUrl` and check none relies on null for "no content". I did not go through them.

**Test:** a MockWebServer response that sends headers and then stalls or cuts the body, asserting an exception with the timeout as its cause.

### A4. Don't disable an indexer for an error in Hydra's own code

**Where:** `Indexer.java`, `search` (the last `catch (Exception e)`, about line 187) and `handleIndexerAccessException` (about line 378).

**What happens, part one:** an unexpected exception in `search`, for example a `NullPointerException` while reading results, calls `handleFailure(..., CONNECTION_ERROR)`. That disables the indexer temporarily and raises its disable level,
so a bug in Hydra takes a working indexer out of rotation for up to hours. The comment on that line already says "LATER depending on type of error, perhaps not at all because it might be a bug". `handleIndexerAccessException` does the
opposite for the same kind of error: it records a `HYDRA_ERROR` and leaves the indexer enabled.

**What happens, part two:** `getAndStoreResultToDatabase` records the call as successful before the response is processed. If processing then throws an `IndexerParsingException`, `handleIndexerAccessException` records a second access for
the same call. One HTTP call counts as two hits against the indexer's API limit. I am less sure how often this path is reached, because the Newznab XML is parsed inside the web access, before the first record.

**Change:** treat the unexpected exception like the `HYDRA_ERROR` branch: log it, tell the user, do not disable. For part two, record the access once, after processing.

**Test:** an indexer whose result processing throws a `RuntimeException` stays enabled, and one whose processing throws `IndexerParsingException` leaves exactly one access row.

**Changelog:** yes, a fix entry.

### A5. Always shut down the stats executor

**Where:** `core/src/main/java/org/nzbhydra/historystats/Stats.java`, `getAllStats` (line 84 onwards).

**What happens:** the method creates a single-thread executor, runs four count queries on the calling thread in between the submits, and shuts the executor down at the end. There is no `finally`. If one of those count queries throws, or
`awaitTermination` is interrupted, the executor is never shut down and its non-daemon thread lives on.

**Change:** `try` / `finally` with `shutdownNow()` in the `finally`. Restore the interrupt flag if interrupted.

**Test:** make the entity manager throw on a count query and assert the executor's thread ends.

### A6. Close the direct socket in `SocksSocket.connect`

**Where:** `other/sockslib/src/main/java/sockslib/client/SocksSocket.java`. This is the vendored SOCKS library; `AGENTS.md` says to leave `other` alone unless told to, so this task needs the maintainer's go-ahead.

**What the earlier review reported:** for a target on 127.0.0.1 the `connect` method opens a direct socket and does not close it on the paths that fail. I have this from the B1 review of the first plan and did not re-read the code for
this document.

**Change:** confirm, then close the socket on every failure path. The first plan already had to work around a second bug in this class (its `close()` does nothing), in `HydraOkHttp3ClientHttpRequestFactory.SockProxySocketFactory`.
Fixing both in the library and removing the workaround is the cleaner end state.

### A7. Small defects in `ExternalApi`

**Where:** `core/src/main/java/org/nzbhydra/api/ExternalApi.java`.

- Line 84: `@Value("${nzbhydra.dev.noApiKey:false}") private final boolean noApiKeyNeeded = false;`. A final field with a constant initializer is inlined by the compiler, so the property has no effect. Remove the `final` and the
  initializer, or delete the flag if nobody uses it. Ask the maintainer which.
- Line 109 and `NewznabParameters.cacheKey`: the search cache is keyed by a 32-bit hash of the parameters' string form. Two different searches with the same hash would share an entry. With at most five entries the chance is tiny, but the
  string itself is a correct key at no cost. This is the same pattern C3 of the first plan fixed in `InfoProvider`.
- `handleUnexpectedError` (line 328) always answers in XML, even for a call with `o=json`. The other error path honours the output type.
- `t=details` with a non-numeric `id` ends in the generic handler through a `NumberFormatException`. Answer with the "invalid ID" error the download path uses.

**Test:** `ExternalApiTest` has cache tests to extend. One of them reaches into the map with integer keys and needs updating.

### A8. Thread safety and input checks in `HydraTaskScheduler`

**Where:** `core/src/main/java/org/nzbhydra/tasks/HydraTaskScheduler.java`.

- `runNow(taskName)` dereferences `taskSchedules.get(taskName)` without a null check. An unknown name from the web endpoint gives a `NullPointerException` and a 500.
- `taskSchedules` and `runtimeInformationMap` are plain `HashMap`s, written from request threads (`runNow`) and read during shutdown.
- `shutdownRequested` is read by the task thread and written by the shutdown thread without `volatile`. `Searcher.shutdownRequested` (line 79) has the same problem and decides whether a running search loop stops.

**Change:** null check with a clear error, concurrent maps, `volatile` on both flags.

### A9. Bound the per-host OkHttp client cache

**Where:** `core/src/main/java/org/nzbhydra/webaccess/HydraOkHttp3ClientHttpRequestFactory.java`, `clientCache` (line 83).

**What happens:** clients are cached by host and timeout in a map that is only cleared on a config change. `FileHandler.downloadFile` follows redirects itself and asks for a client per redirect target host. Indexers that redirect
downloads to changing hosts add an entry per host.

**How sure:** medium. The clients share the base client's pool and dispatcher since B5 of the first plan, so each entry is small. I do not know how many distinct hosts a real installation sees.

**Change:** a size-bounded cache (Caffeine is already a dependency) of a few hundred entries.

### Left over from segment A

Segment A is done (`11eb56e69` to `21436fda6`). The reviews found the following and left it alone, either because it was outside the task or because it is too small to fix on its own. None is urgent.

- **A1, test gap.** The tests in `IndexerTest` cover a healthy indexer, a fully disabled one and one with only `lastError` set. Nothing tests the cases where only `state`, `disabledUntil`, `disabledLevel` or `disabledAt` is unhealthy, so
  dropping one clause from the check in `handleSuccess` would go unnoticed. A parameterized test over the five fields would close the gap.
- **A2, search cancel lost in Torbox.** `Torbox.getResultWithTimeout` (the indexer) swallows `InterruptedException` without restoring the interrupt flag, and it does not cancel the futures when it times out. A search cancel can be lost
  there. This was already the case before A2.
- **A3, Prowlarr error message.** `ProwlarrConfigRetriever` (line 46) catches only `WebAccessException`. Since A3, a connection dropped in the middle of the body arrives as a plain `IOException`, which ends up in the generic handler in
  `IndexerWeb` (line 141). The user still sees an error, but it says "Error reading Prowlarr config" instead of "Error accessing Prowlarr". Widen the catch to `IOException`.
- **A4, Newznab error responses still count twice.** `Newznab.getAndStoreResultToDatabase` (line 342) records the call as successful and then throws for an error response from the indexer, which records a second access. Because
  `handleSuccess` also resets the disable level just before `handleFailure` raises it, the level never climbs for Newznab error codes, and a spurious "re-enabled" notification can fire. Fixing it changes when indexers get disabled,
  so it needs the same care as A4.
- **A6, sockslib constructors.** The `SocksSocket` constructors that connect immediately (lines 75 and 102) leak the proxy socket when the connect fails. Core does not use them. Separately, a proxy that answers "no acceptable
  method" (0xFF) makes `Socks5.buildConnection` (line 201) throw a `NullPointerException` instead of a `SocksException`.

## Segment B. Verification the first plan still owes

### B1. Build the native image and run its system tests

`python3 misc/run_systemtest.py`, with `native-image` on `PATH`. The first plan changed reflection metadata by hand for `OldResultsCleanupTask` (C2), `DownloadStatusUpdater` (D2) and `DebugInfosProvider` (B4) in
`core/src/main/resources/META-INF/native-image/org.nzbhydra/core-manual/`. CI run 43693012733 on `27a0e0ec6` built the native image on Linux and Windows and passed the native system tests on both, so the metadata edits hold. What is
left of this task is the cleanup below, which needs a local native build per removal.

While there, remove what is known to be stale: the `OldResultsCleanupTask$$SpringCGLIB$$0` and `DownloadStatusUpdater$$SpringCGLIB$$0` entries (neither class is proxied any more) and the `handleNewConfig` entry for `Indexer` in
`reflect-config.json`. Remove them one at a time and rebuild, since a wrong removal only shows at runtime.

### B2. Test that the native metadata matches the code

**Why:** twice in the first plan a reviewer had to notice by reading that a renamed field or a new lifecycle method was missing from the hand-written metadata. Nothing fails at build time.

**Change:** a unit test next to `NativeHintsTest` that reads `reachability-metadata.json` and `reflect-config.json` under `core-manual` and asserts, for every entry naming an `org.nzbhydra` class, that the class exists and that each listed
field and method exists on it with the listed parameter types. Skip generated names containing `$$`.

**Expect:** it will fail on the stale entries from B1. Fix those in the same task, or do B1 first.

**Limit:** this catches entries that point at nothing. It cannot catch a missing entry. A second assertion can cover part of that: every method annotated `@PreDestroy`, `@PostConstruct` or `@EventListener` on a class that has an entry
is listed.

### B3. Exercise the SOCKS proxy and search cancel

B1 of the first plan moved indexer calls onto the calling thread with an OkHttp call timeout and fixed `SocksSocket.close`. Two things were never run against a real instance:

- A search through a SOCKS proxy. A local one is enough (`ssh -D 1080 localhost`, or `microsocks`). Check a search works, and that a hanging indexer (the mock server can delay) is cut off at the timeout and leaves no thread behind.
- Cancelling a running search from the web UI while an indexer is slow. Check the request ends promptly and the indexer is not marked as failed.

If either can be scripted against the mock server, add it as a system test.

### B4. Check the icon font in a browser

F1 of the first plan was checked in the built CSS only. Add a Playwright assertion to an existing spec, with a downloader icon configured, that `document.fonts.check('900 1em "Font Awesome 5 Free"')` is true and that the icon element has
a non-zero width. The suite passed against the new build, which makes a breakage unlikely but does not prove the glyphs render.

### Results of segment B

- **B1 and B2.** `NativeMetadataTest` checks the metadata against the code. `reflect-config.json` is in
  `META-INF/native-image/`, not under `core-manual`. The test found 300 stale entries, almost all in
  `reflect-config.json`, and they were removed with the CGLIB entries named above. A local native build passed all 108
  Java system tests. The lifecycle check suggested under "Limit" was left out: Spring AOT registers the init, destroy and
  `@EventListener` methods of beans itself.
- **Native folder browser.** The local runner used to start the native core from `core/target`, where the build also
  leaves `libawt.so`. With that library present, the folder browser loads AWT, and AWT's `JNI_OnLoad` aborts the
  process because `java.awt.GraphicsEnvironment` is not registered for JNI. Released builds ship the executable alone and
  are not affected. The runner now starts a copy. If AWT is ever shipped or wanted, the JNI metadata needs that class.
- **B3.** Checked against a JVM instance with a logging SOCKS5 proxy and the mock server. A search goes through the
  proxy. A hanging indexer is cut off at its timeout, its connection is closed, and three such searches left no thread
  behind. Cancelling a search ends it at once with the other indexers' results and leaves the hanging indexer enabled;
  its call still ends at the timeout. `SearchCancelSystemTest` covers the cancel. The SOCKS part stays manual because
  the CI setup has no proxy.
- **B4.** Nothing to add. `downloads.spec.ts` (the Font Awesome test at line 595) already checks
  `document.fonts.check` and the icon's width.

## Segment C. Test coverage

### C1. Measure coverage once and record the gaps

There is no coverage tooling in the build. Run JaCoCo once from the command line, without adding it to the POM:
`mvn -pl core org.jacoco:jacoco-maven-plugin:prepare-agent test org.jacoco:jacoco-maven-plugin:report -DskipTests=false -o`. Record the ten classes with the most uncovered lines in this document and add tasks for those worth
testing. Do not chase a percentage.

I looked for classes without a test by name only. That finds classes with no dedicated test, not weakly tested ones, which is why this task exists.

### C2. Unit tests for `MinAgeOffsetSearch`

**Where:** `core/src/main/java/org/nzbhydra/searching/MinAgeOffsetSearch.java`, 194 lines, no test references it.

It is a state machine with five states that bisects indexer offsets to find the first result old enough for a minimum age. It has no dependencies, so it is cheap to test, and an off-by-one in it means missing or duplicated results
that nobody would trace back to it. Cover: the first page already old enough, a clean bisection, an indexer that does not sort newest first (the `RESUMING` path), an indexer with nothing old enough, a failed page, and the boundary where
the range is no larger than one page.

A test that finds a bug here should report it, not adjust the expectation.

### C3. Unit tests for the log reader and `StoredRecordMatcher`

- `logging/ReversedLinesFileReader.java` (345 lines, no test) and `logging/LogContentProvider.java` (252 lines, referenced by three tests but with none of its own). They read the log file backwards for the log viewer. Cover multi-byte
  characters across a block boundary, an empty file, a file without a trailing newline and lines longer than the block size.
- `config/validation/StoredRecordMatcher.java` (313 lines, no test). Read it first; I only know it by size and name.

### C4. Regression test for the restart exit code

The first plan's D2 broke restarts: the JVM exited with code 0 before `System.exit(22)` ran, because the exit thread inherited daemon status from a Tomcat thread. Only the full system test caught it. `ddd747e9c` fixed it with
`setDaemon(false)`.

Add a unit test for `SystemControl` that calls `exitWithReturnCode` from a daemon thread and asserts the thread it starts is not a daemon. `System.exit` has to be replaced for the test, so extract the exit call behind a small seam (a
`IntConsumer` field defaulting to `System::exit`).

### C5. Remove lenient Mockito strictness where it hides waste

57 test classes use `Strictness.LENIENT`. That silences the "unnecessary stubbing" check, so stubs for removed behaviour pile up, and several tests that the first plan re-enabled had exactly such leftovers. This is a long tail, not one
task.
Do it per class when the class is touched anyway, starting with `DownloaderWebSocketTest`, where the reviewer asked for it. Do not do all 57 in one go.

## Segment D. Structure

### D1. Keep database transactions out of network calls

**Where:** `downloading/FileHandler.java` (`getFileByGuid`, `getFileByResult`, `handleContentDownload` are `@Transactional` and download the NZB from the indexer inside the transaction); `downloading/downloaders/Downloader.java`
(`addBySearchResultIds` is `@Transactional` and, for a list of results, downloads each NZB and uploads it to the downloader inside one transaction); `backup/BackupWeb.java`.

**Why it matters:** a transaction holds a pooled database connection for its whole length. An indexer that takes 30 seconds to deliver an NZB holds one for 30 seconds. The pool has 40 connections and Tomcat has 40 threads, so requests
alone cannot exhaust it, but the search threads and scheduled tasks draw from the same pool. A tool that grabs many releases at once from a slow indexer can make searches wait for a connection.

**How sure:** medium. The code does this; I have not seen it cause a problem and did not measure.

**Change:** load the entity, do the network call outside any transaction, then write the history rows in a short transaction. `spring.jpa.open-in-view` is false, so entities are detached after the first step; check which lazy
associations the later code touches (`result.getIndexer().getName()` is one) and fetch them up front.

**Risk:** this changes transaction boundaries in the download path, the path users notice most. It needs the full system tests before and after, and its own review.

### D2. Finish removing raw types

E4 of the first plan took compiler warnings from 65 to 14. What is left: `IndexerHandlingStrategy` in `SearchModuleProvider`, `IndexerInstantiator.instantiateIndexer`, raw lists in `Stats`, raw `Indexer` in callers such as `FileHandler`
and `DetailsProvider`, `ScheduledFuture` in `HydraTaskScheduler`. Bring the count to zero, then consider `-Xlint:rawtypes -Werror` for `core` so it stays there.

### D3. Housekeeping

- Three agent worktrees are left under `.claude/worktrees/`, all at `2f1cb5993`. Check each for uncommitted work, then remove them with `git worktree remove`. They also make repository-wide searches return every file four times.
- `docs/code-health-plan.md` says the H2 growth harness is in `misc/h2growth`. That directory does not exist. Correct or drop the reference.
- `Torbox.java` (the downloader) carries five dated TODOs from December 2024, and `TempFileProvider` one from May 2024. Decide for each whether it is still wanted and delete the ones that are not.

## What I would not do

- Split `Newznab.java` (770 lines), `Stats.java` (730) or `IndexerChecker.java` (610). Long, but cohesive.
- Replace the hand-written redirect handling in `FileHandler.downloadFile` with OkHttp's own. It exists to pass headers through and to detect magnet links.
- Touch `SecurityConfig`. I did not review it, and it should not be changed as a side effect of cleanup.
- Add JaCoCo to the build permanently. It slows every test run for a number nobody has asked for.
