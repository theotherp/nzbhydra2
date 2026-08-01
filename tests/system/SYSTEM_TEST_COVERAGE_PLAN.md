# System Test Coverage Plan

## Purpose

This document tracks missing system-test coverage for NZBHydra2. Proposed tests use dedicated class names so progress can be checked by looking for the corresponding file under:

`tests/system/src/test/java/org/nzbhydra`

System tests have two distinct responsibilities:

1. Verify complete behavior across HTTP, Spring wiring, configuration, persistence, files, and external services.
2. Verify that representative production paths work in the GraalVM native executable shipped to users.

Unit tests remain the preferred place for exhaustive branch combinations and isolated business rules. They do not replace a system test for behavior that depends on native-image reachability metadata, reflection, serialization, resources,
proxies, application startup, or production packaging.

## Coverage Baseline

The JVM system-test run `20260728_160035_142253` reported:

| Metric       | Coverage |
|--------------|---------:|
| Instructions |    25.1% |
| Branches     |    14.8% |
| Lines        |    38.5% |
| Methods      |    34.3% |
| Classes      |    64.5% |

These percentages should not be used as targets without interpretation:

- Spring AOT CGLIB classes and generated JPA accessors significantly reduce the raw percentage.
- The report came from the Windows JVM-coverage runner. `ExternalToolsTest` is disabled on Windows, so its production paths appear uncovered even though the Linux system suite exercises them.
- JaCoCo cannot instrument a native executable. JVM system coverage identifies exercised application code; separate native system runs prove representative scenarios work in the release binary.
- Low system coverage is acceptable for logic already covered exhaustively by unit tests when one representative native system path proves the production wiring.

## Existing System Tests

The following files already exist and provide the current deployment smoke suite:

| Class                                | Main coverage                                                         |
|--------------------------------------|-----------------------------------------------------------------------|
| `AuthLoginTest`                      | Basic authentication for an admin endpoint                            |
| `BackupTest`                         | Backup creation, listing, and download                                |
| `DebugInfosTest`                     | Log and debug ZIP downloads                                           |
| `DownloaderTest`                     | SABnzbd connection, status, and NZB submission                        |
| `ExternalApiDownloadSystemTest`      | Newznab `t=get`, API-key enforcement, invalid-ID errors, and NFOs     |
| `ExternalApiJsonSystemTest`          | JSON Newznab search, attributes, enclosure download, and JSON errors  |
| `ExternalApiSearchingTest`           | XML Newznab search, API key check, and NZB download                   |
| `ExternalToolsLifecycleSystemTest`   | Persisted Sonarr/Radarr indexer configuration and synchronization     |
| `ExternalToolsTest`                  | Sonarr and Radarr configuration on Linux                              |
| `GenericStorageTest`                 | Generic storage GET and PUT                                           |
| `HistoryTest`                        | Search and download history                                           |
| `IndexerWebTest`                     | Indexer capability detection                                          |
| `IndexerFailureResilienceSystemTest` | Partial results, failure history, and repeated-failure status updates |
| `MediaInfoTest`                      | TV and movie autocomplete                                             |
| `MediaSearchSystemTest`              | Movie, TV, book, and caps external API search contracts               |
| `NewsTest`                           | News loading                                                          |
| `NotificationsTest`                  | Notification test and history storage                                 |
| `NzbHandlingTest`                    | NZB retrieval, blackhole saving, and ZIP creation                     |
| `StaticResourcesLoadableTest`        | Static resource availability                                          |
| `StatsTest`                          | Search and download statistics                                        |

## Proposed System Tests

The list is ordered by value. Each class should run against the JVM coverage job and at least one native system-test target unless its prerequisites are platform-specific.

### Priority 1: Core Search and API Contracts

#### `ExternalApiJsonSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/ExternalApiJsonSystemTest.java`

Proposed methods:

- `shouldReturnNewznabSearchResultsAsJson`
- `shouldReturnJsonAttributesAndDownloadEnclosure`
- `shouldReturnStructuredJsonErrorForInvalidRequest`

Assertions should include total count, title, GUID, category, size, attributes, enclosure URL, and content type.

Why this needs a system test:

- `NewznabJsonTransformer` was effectively uncovered by the measured system suite.
- Jackson serialization is sensitive to native-image reflection metadata.
- It validates the complete request-to-response contract, not only transformer logic.

#### `MediaSearchSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/MediaSearchSystemTest.java`

Proposed methods:

- `shouldSearchMovieByImdbId`
- `shouldSearchTvByTvMazeIdAndSeasonEpisode`
- `shouldReturnResultsForBookSearch`
- `shouldReturnCapsResponse`

Why this needs a system test:

- Movie and TV requests currently create history but their returned contracts are not asserted.
- It exercises parameter binding, search request creation, mock-indexer mapping, XML serialization, and native metadata together.

#### `IndexerFailureResilienceSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/IndexerFailureResilienceSystemTest.java`

Proposed methods:

- `shouldReturnPartialResultsWhenOneIndexerTimesOut`
- `shouldReturnPartialResultsWhenOneIndexerReturnsMalformedXml`
- `shouldRecordIndexerFailureInSearchHistory`
- `shouldUpdateIndexerStatusAfterRepeatedFailures`

Why this needs a system test:

- Returning useful results despite a failing provider is a core aggregator guarantee.
- It crosses HTTP clients, asynchronous indexer execution, error analysis, status persistence, result aggregation, and response serialization.

#### `ExternalApiDownloadSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/ExternalApiDownloadSystemTest.java`

Proposed methods:

- `shouldDownloadNzbUsingGetAction`
- `shouldRejectDownloadWithoutApiKey`
- `shouldRejectInvalidOrExpiredDownloadIdentifier`
- `shouldReturnNfoForResult`

Why this needs a system test:

- The existing test follows a generated link but does not cover the complete external `t=get` contract or failure cases.
- Download identifiers, URL generation, persisted search context, and binary responses cross multiple production boundaries.

### Priority 2: Torrent Support

#### `TorrentHandlingSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/TorrentHandlingSystemTest.java`

Proposed methods:

- `shouldReturnTorznabSearchResults`
- `shouldDownloadTorrentFileByGuid`
- `shouldReturnMagnetLinkByGuid`
- `shouldSaveTorrentToBlackhole`
- `shouldSendTorrentToConfiguredDownloader`
- `shouldRejectInvalidTorrentIdentifier`

Why this needs a system test:

- Torrent handling had almost no measured system coverage.
- No current system test proves Torznab XML, torrent resources, magnet handling, download URLs, or downloader dispatch work in the native executable.

Prerequisites:

- Add deterministic Torznab mock responses.
- Add a torrent-capable mock downloader or extend the existing mockserver.

### Priority 3: Configuration and Security

#### `ConfigurationPersistenceSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/ConfigurationPersistenceSystemTest.java`

Proposed methods:

- `shouldPersistConfigurationChanges`
- `shouldRejectInvalidConfigurationWithoutReplacingCurrentConfiguration`
- `shouldReturnRedactedSafeConfiguration`
- `shouldReloadConfigurationFromDisk`

Why this needs a system test:

- Current setup saves configuration but does not assert round-trip persistence or failure safety.
- YAML serialization, validation, sensitive-data handling, file access, and configuration proxies are native-sensitive boundaries.

#### `AuthorizationSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/AuthorizationSystemTest.java`

Proposed methods:

- `shouldRejectMissingInternalApiKey`
- `shouldRejectWrongInternalApiKey`
- `shouldAllowCorrectInternalApiKey`
- `shouldRestrictAdminEndpointForUserRole`
- `shouldAllowStatsEndpointForStatsRole`
- `shouldEnforceExternalApiKeyForSearchAndDownload`
- `shouldInvalidateSessionOnLogout`

Why this needs a system test:

- Security behavior depends on the complete Spring Security filter chain and runtime configuration.
- The current suite covers only one Basic-auth admin request.
- Security filter wiring and configured authentication mechanisms must be proven in the production application, including native mode.

#### `UrlBaseSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/UrlBaseSystemTest.java`

Proposed methods:

- `shouldServeInternalAndExternalApisUnderConfiguredUrlBase`
- `shouldGenerateDownloadLinksContainingUrlBase`
- `shouldRedirectRootToConfiguredUrlBase`

Why this needs a system test:

- Generated URLs, redirects, static resources, and security matchers must agree in the packaged application.

### Priority 4: Backup and Restore

#### `BackupRestoreSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/BackupRestoreSystemTest.java`

Proposed methods:

- `shouldRestoreConfigurationAndDatabaseFromBackup`
- `shouldRejectCorruptBackup`
- `shouldRejectBackupWithPathTraversalEntry`
- `shouldPreserveLastValidBackupAfterRestoreFailure`

The successful restore test should create known configuration and history, create a backup, mutate the state, restore, restart the application, and verify the original state.

Why this needs a system test:

- Existing tests prove only backup creation and download.
- Restore crosses ZIP handling, database replacement, configuration files, process restart, and startup initialization.
- Successful restart after restore is especially important to prove against the native executable.

### Priority 5: Downloader and External Tool Lifecycles

#### `DownloaderIntegrationSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/DownloaderIntegrationSystemTest.java`

Proposed methods:

- `shouldSendExpectedNzbContentNameCategoryAndPriority`
- `shouldReportDownloaderAuthenticationFailure`
- `shouldReportUnavailableDownloader`
- `shouldReturnConfiguredDownloaderCategories`
- `shouldRequireReasonForDuplicateMovieDownload`

Why this needs a system test:

- Existing tests trust NZBHydra's success response but do not inspect the downloader request.
- This validates multipart encoding, binary content, configuration, HTTP behavior, and error mapping in the production runtime.

#### `NzbGetIntegrationSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/NzbGetIntegrationSystemTest.java`

Proposed methods:

- `shouldCheckNzbGetConnection`
- `shouldSendNzbToNzbGet`
- `shouldReadNzbGetQueueAndHistory`
- `shouldMapNzbGetErrorResponse`

Why this needs a system test:

- `NzbGet` had no system coverage and its focused tests currently cover only category-name extraction.
- It is a separate production integration from SABnzbd and has different JSON-RPC serialization and response mapping.

Prerequisite:

- Add deterministic NZBGet JSON-RPC behavior to the mockserver.

#### `ExternalToolsLifecycleSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/ExternalToolsLifecycleSystemTest.java`

Proposed methods:

- `shouldCreateCorrectSonarrIndexerConfiguration`
- `shouldCreateCorrectRadarrIndexerConfiguration`
- `shouldReconfigureWithoutCreatingDuplicates`
- `shouldSynchronizeChangedIndexerConfiguration`
- `shouldReportInvalidExternalToolCredentials`

Assertions should query Sonarr/Radarr after configuration and verify URL, API key, categories, priority, RSS, and search flags.

Why this needs a system test:

- The existing tests assert only NZBHydra's boolean response.
- The real external system must confirm that the resulting configuration is correct and usable.
- These tests should run in Linux native and Linux JVM-coverage jobs; they remain unsuitable for the local Windows runner without equivalent container networking.

### Priority 6: Lower-Risk Production Boundaries

#### `GenericStorageUserIsolationSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/GenericStorageUserIsolationSystemTest.java`

Proposed methods:

- `shouldIsolateUserScopedValues`
- `shouldKeepGlobalValuesShared`

#### `NotificationDeliverySystemTest`

File: `tests/system/src/test/java/org/nzbhydra/NotificationDeliverySystemTest.java`

Proposed methods:

- `shouldDeliverNotificationToConfiguredEndpoint`
- `shouldRecordFailedNotificationDelivery`
- `shouldMarkNotificationAsRead`

#### `CacheBehaviorSystemTest`

File: `tests/system/src/test/java/org/nzbhydra/CacheBehaviorSystemTest.java`

Proposed methods:

- `shouldReuseCachedExternalApiSearch`
- `shouldSeparateCacheEntriesBySearchParameters`
- `shouldRepeatSearchAfterCacheExpiry`

The mockserver should expose call counts so these tests can prove whether an indexer was contacted.

## Focused Unit Tests to Add or Expand

These are valuable, but they do not replace the system tests above.

| Existing class                                   | Recommended additions                                                    |
|--------------------------------------------------|--------------------------------------------------------------------------|
| `TorrentFileHandlerTest`                         | Torrent retrieval, magnet handling, blackhole writes, partial failures   |
| `NzbGetTest`                                     | Connection, append, queue/history mapping, malformed responses           |
| `ExternalToolsTest`                              | Supported-version rules, error parsing, add modes, additional parameters |
| `BackupAndRestoreTest` or new focused equivalent | Certificate restore, ZIP extraction, retention, traversal rejection      |
| `ExternalApiTest`                                | `t=get`, malformed parameters, structured errors, cache boundaries       |

No additional system tests should be added solely to cover every branch in `SearchResultAcceptor` or `IndexerForSearchSelector`. Their branch-heavy rules already have extensive focused unit tests. The proposed resilience, filtering, and
torrent scenarios are sufficient to prove those components are connected correctly in the production/native application.

## Suggested Implementation Order

1. `ExternalApiJsonSystemTest`
2. `IndexerFailureResilienceSystemTest`
3. `ConfigurationPersistenceSystemTest`
4. `TorrentHandlingSystemTest`
5. `BackupRestoreSystemTest`
6. `AuthorizationSystemTest`
7. `DownloaderIntegrationSystemTest`
8. `ExternalToolsLifecycleSystemTest`
9. Remaining lower-risk boundary tests

## Completion Convention

For a proposed class to count as complete:

- The listed Java file exists.
- Its proposed scenarios are implemented or explicitly documented as intentionally excluded.
- It runs in the JVM system-coverage job.
- At least one corresponding scenario runs against a native binary.
- Test artifacts contain Surefire XML and relevant application/service logs on failure.

## Running tests

cmd.exe /c "cd /d C:\Users\strat\IdeaProjects\nzbhydra2 && py misc\run_windows_systemtest.py --jvm-coverage --test <TestClass>"
cmd.exe /c "cd /d C:\Users\strat\IdeaProjects\nzbhydra2 && py misc\run_windows_systemtest.py --test <TestClass>"
