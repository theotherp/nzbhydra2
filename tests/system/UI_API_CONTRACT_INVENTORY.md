# UI API Contract Inventory

## Purpose

This document inventories AngularJS frontend HTTP calls and their Java backend contracts. Use it to incrementally introduce typed request builders and contract tests. Do not attempt a mechanical wrapper around every endpoint: prioritize
requests that serialize bodies or primitive query parameters.

## Existing Contract Builders

- `HistoryRequestFactory` in `core/ui-src/js/history-request-service.js`
  constructs the Java `HistoryRequest` payload used by search, download, and notification history.
- It supplies required primitive defaults: `distinct: false` and
  `onlyCurrentUser: false`.

## Priority 1: Request Bodies With Primitive Fields

| UI endpoint                                              | Java contract                                             | Frontend source                                 | Risk / recommended builder                                                                                                             |
|----------------------------------------------------------|-----------------------------------------------------------|-------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `POST internalapi/search`                                | `SearchRequestParameters`                                 | `search-service.js`                             | `searchRequestId` is a primitive `long`; normalize required ID and `loadAll`. Reuse for saved searches.                                |
| `POST internalapi/savedsearches`                         | `SavedSearchRequest` containing `SearchRequestParameters` | `search-results-controller.js`                  | Build `{request: normalizedSearchRequest}` through the search builder.                                                                 |
| `POST internalapi/stats`                                 | `StatsRequest`                                            | `stats-service.js`                              | `includeDisabled` and all requested statistic switches are primitive booleans. Build an explicit complete request with false defaults. |
| `POST internalapi/history/searches`                      | `HistoryRequest`                                          | `search-history-service.js`                     | Already migrated to `HistoryRequestFactory`.                                                                                           |
| `POST internalapi/history/downloads`                     | `HistoryRequest`                                          | `stats-service.js`                              | Already migrated to `HistoryRequestFactory`.                                                                                           |
| `POST internalapi/history/notifications`                 | `HistoryRequest`                                          | `stats-service.js`                              | Already migrated to `HistoryRequestFactory`.                                                                                           |
| `POST internalapi/config/folderlisting`                  | `FileSystemBrowser.DirectoryListingRequest`               | `file-selection-service.js`                     | Three inline payloads. Centralize `{fullPath, type, goUp}`; `goUp` is primitive boolean.                                               |
| `POST internalapi/externalTools/testConnection`          | `AddRequest`                                              | `formly-external-tools.js`                      | Two duplicated `DELETE_ONLY` request builders. Normalize tool type, host, key, and explicit booleans.                                  |
| `POST internalapi/externalTools/configure`               | `AddRequest`                                              | `formly-external-tools.js`, `config-service.js` | Two configuration builders. Consolidate and default all primitive fields intentionally.                                                |
| `PUT internalapi/downloader/addNzbs`                     | `AddFilesRequest`                                         | `nzb-download-service.js`                       | Share builder with duplicate-movie preflight; preserve intentional nullable category/reason fields.                                    |
| `PUT internalapi/downloader/checkDuplicateMovieDownload` | `AddFilesRequest`                                         | `nzb-download-service.js`                       | Same as above.                                                                                                                         |
| `POST internalapi/indexer/checkCaps`                     | `CapsCheckRequest`                                        | `formly-indexers.js`                            | Add DTO-specific builder after inspecting required primitive fields.                                                                   |
| `POST internalapi/indexer/readProwlarrConfig`            | `ProwlarrConfigReadRequest`                               | `formly-indexers.js`                            | Normalize `{existingIndexers, prowlarrConfig}`.                                                                                        |
| `POST internalapi/indexer/readJackettConfig`             | `JackettConfigReadRequest`                                | `formly-indexers.js`                            | Normalize `{existingIndexers, jackettConfig}`.                                                                                         |
| `POST internalapi/stats`                                 | `StatsRequest`                                            | `stats-service.js`                              | Do not spread an arbitrary `switchState` object directly into the request without normalizing known booleans.                          |

## Priority 2: Primitive Query Parameters

| UI endpoint                                                | Java contract                     | Frontend source                | Recommendation                                                  |
|------------------------------------------------------------|-----------------------------------|--------------------------------|-----------------------------------------------------------------|
| `GET/PUT internalapi/genericstorage/{key}?forUser=`        | `boolean forUser`                 | `generic-storage-service.js`   | Default `forUser` to `false` before supplying query parameters. |
| `PUT internalapi/debuginfos/sensitiveDataLogging?enabled=` | `boolean enabled`                 | debug UI service/controller    | Explicitly normalize to `true` or `false`.                      |
| `GET internalapi/debuginfos/jsonlogs?offset=&limit=`       | `Integer offset`, `Integer limit` | debug UI service/controller    | Validate numeric values before composing parameters.            |
| `GET internalapi/history/searches/details/{id}`            | `int searchId`                    | `search-history-controller.js` | Validate integer path value.                                    |
| `GET internalapi/nfo/{guid}`                               | `long guid`                       | NFO UI code                    | Validate numeric path value.                                    |

## Priority 3: Simple Body Or Collection Requests

| UI endpoint                                    | Java contract | Frontend source           | Notes                                                                                   |
|------------------------------------------------|---------------|---------------------------|-----------------------------------------------------------------------------------------|
| `PUT internalapi/saveOrSendTorrents`           | `Set<String>` | `save-or-send-torrent.js` | Normalize/validate an array of IDs.                                                     |
| `PUT internalapi/saveNzbsToBlackhole`          | `Set<String>` | `download-nzbs-button.js` | Normalize/validate an array of IDs.                                                     |
| `POST internalapi/debuginfos/executesqlquery`  | raw `String`  | `system-controller.js`    | Keep explicit raw-string behavior; do not wrap as JSON object.                          |
| `POST internalapi/debuginfos/executesqlupdate` | raw `String`  | `system-controller.js`    | Same.                                                                                   |
| `PUT internalapi/config`                       | `BaseConfig`  | config UI                 | Existing Playwright coverage must validate `ConfigValidationResult`, not only HTTP 200. |

## No-Body Endpoints

These endpoints generally need no request builder. Keep direct calls unless a shared API client adds observable value:

- Health/config reads: `internalapi/config`, `/safe`, `/reload`, `/apiHelp`.
- External tool reads/sync: `internalapi/externalTools/getDialogInfo`,
  `/messages`, `/syncAll`.
- History lookup: `internalapi/history/searches/forsearching`.
- Status, task, backup, news, update, welcome, guided-tour, and system-control endpoints with no request body.

## Legacy Or Unverified Frontend Calls

Confirm or remove these before encoding them into a typed client; no matching current controller was found under `core/src/main/java`:

- `internalapi/migration/url`
- `internalapi/migration/files`
- `internalapi/migration/messages`
- `internalapi/test_downloader`
- `internalapi/test_newznab`
- `internalapi/mayseeadminarea`

Also verify the legacy `internalapi/redirect_rid` link in
`search-history-service.js`; the current backend route is
`internalapi/redirectRid/{rid}`.

## Suggested Implementation Pattern

1. Create one small AngularJS factory per Java request DTO, for example
   `StatsRequestFactory`, `DirectoryListingRequestFactory`, and
   `ExternalToolRequestFactory`.
2. Expose a `build(...)` function returning every required primitive explicitly.
3. Replace all inline payload creation for that DTO.
4. Add a focused Playwright or backend contract regression test that fails on an omitted/null primitive.
5. Keep nullable Java fields nullable only when the API contract intentionally supports null.

## Longer-Term Direction

There is no active OpenAPI toolchain in this repository. A future migration can publish Spring OpenAPI schemas and generate TypeScript types for system tests and new frontend code. Do not block the incremental builders above on that larger
project.
