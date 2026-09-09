# External API v1 — design

Status: approved for implementation, 2026-09-09. Owner decision: stats consumers must stop using `/internalapi`
(CSRF is enforced there since 36d8c8a0b) and `/api` keeps its Newznab specification, so a separate, stable,
API-key-authenticated surface is added under `/externalapi`.

## Goals

- A stable, documented HTTP API for automation and dashboards that exposes stats, history, the current log file and
  backup creation/download.
- Dedicated request/response classes that are part of the contract. They never expose JPA entities, `Page`, the
  internal `FilterModel`/`SortModel` or `StatsRequest`/`StatsResponse`; those may change freely underneath.
- Authentication with the configured API key only (`main.apiKey`). No session, no CSRF, no roles, no `allowApiStats`.
- A missing or wrong key answers **404 with an empty body**, indistinguishable from an unknown path, on every route
  under `/externalapi/**`, including unknown sub-paths.
- Discoverable in the swagger UI shipped with the app.

## Non-goals

- Restore, config editing, search, downloads, indexer administration. Restore stays UI/`/internalapi` only.
- Replacing `/api/stats` (the Newznab-flavoured JSON endpoints in `ExternalApiStats`). They stay as they are and
  keep honouring `auth.allowApiStats`; the user docs point new integrations at `/externalapi/v1`.
- Any change to `/internalapi` or the React UI.

## Base path and versioning

All routes live under `/externalapi/v1/`. Breaking changes go to `/externalapi/v2/`; additive changes (new optional
fields, new optional query parameters, new routes) are allowed in v1. Response classes carry no version field; the
path is the version. `main.urlBase` applies as everywhere else.

## Authentication

- The key is read from the `X-Api-Key` request header; if absent, from the `apikey` query parameter (same name and
  value as `/api`). Header wins when both are present.
- Compared with `MessageDigest.isEqual` against `main.apiKey`. A configured key with no text disables the whole
  surface (every request 404s), so a fresh install without a key cannot be reached by accident.
- Implemented as one servlet filter, `ExternalApiKeyFilter`, registered in `SecurityConfig` before
  `HeaderAuthenticationFilter` and matched on `/externalapi/**`:
  - valid key → sets an authenticated `UsernamePasswordAuthenticationToken` for principal `externalApi` with
    `ROLE_ADMIN` and continues the chain (so `@Secured` on the controllers works and audit details are attached via
    `HydraWebAuthenticationDetails` exactly as the internal API key does);
  - anything else → `response.setStatus(404)`, no body, chain not continued. Do not use `sendError`, which would
    render the HTML error page. Log at debug only; never log the offered key.
- `SecurityConfig`: `/externalapi/**` is added to the CSRF exemption list (`CSRF_EXEMPT_PATH_PATTERNS`, the same
  list as `/api/**`) and to the cookie-filter skip list, and its authorization rule is `hasRole("ADMIN")` placed
  before `anyRequest()` in both the auth-configured and the no-auth branches, so the filter is the only way in.
- `nzbhydra.dev.noApiKey` is honoured the same way `ExternalApi` honours it (dev convenience, default false).

## Routes

All JSON responses use `application/json`, `Instant`s as ISO-8601 strings in UTC, and omit nothing (nulls are
serialised). Query parameters are the only input; there are no request bodies in v1.

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/externalapi/v1/ping` | Verify key and reachability | `ExternalPingResponse` |
| GET | `/externalapi/v1/stats` | Aggregated statistics for a time range | `ExternalStatsResponse` |
| GET | `/externalapi/v1/history/searches` | Search history, paged | `ExternalPage<ExternalSearchHistoryEntry>` |
| GET | `/externalapi/v1/history/downloads` | Download history, paged | `ExternalPage<ExternalDownloadHistoryEntry>` |
| GET | `/externalapi/v1/history/notifications` | Notification history, paged | `ExternalPage<ExternalNotificationHistoryEntry>` |
| GET | `/externalapi/v1/log/current` | Current log file, whole content | `text/plain; charset=UTF-8` |
| POST | `/externalapi/v1/backups` | Create a backup now | `ExternalBackupEntry` (201) |
| GET | `/externalapi/v1/backups` | List existing backups | `ExternalBackupListResponse` |
| GET | `/externalapi/v1/backups/{filename}` | Download one backup | `application/zip`, `Content-Disposition: attachment` |

### Common query parameters for the three history routes

| Name | Type | Default | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | |
| `limit` | int 1..500 | 100 | above 500 → 400 |
| `from` | ISO-8601 instant | none | inclusive lower bound on the entry time |
| `to` | ISO-8601 instant | none | exclusive upper bound |
| `order` | `asc` \| `desc` | `desc` | by entry time |

Route-specific optional filters, all case-insensitive substring matches unless stated:

- searches: `query`, `username`, `ip`, `userAgent`, `indexer` (an indexer name among the selected ones).
- downloads: `title`, `indexer` (exact name), `status` (one of `FileDownloadStatus`), `username`, `ip`, `userAgent`.
- notifications: `eventType` (one of `NotificationEventType`), `messageType` (one of `NotificationMessageType`).

They are translated into the internal `HistoryRequest`/`FilterModel`/`SortModel` by one mapper class
(`ExternalHistoryRequestMapper`); the column names it uses are the ones `History.getHistory` already understands.
An unknown enum value → 400.

### Stats query parameters

| Name | Type | Default | Notes |
|---|---|---|---|
| `after` | ISO-8601 instant | now − 30 days | |
| `before` | ISO-8601 instant | now | must be after `after` → else 400 |
| `includeDisabled` | boolean | false | include disabled indexers |
| `section` | repeated enum `ExternalStatsSection` | all | limits the computation to the named sections; others are `null` in the response |

`Stats.getAllStats` aborts after 30 seconds; that surfaces as 503 with an error body.

## Contract classes

Package `org.nzbhydra.externalapi.v1` in `shared/mapping` (so the system tests, which depend on `mapping` only, can
deserialise them). Lombok `@Data @NoArgsConstructor @AllArgsConstructor`, `@ReflectionMarker` for the native image,
`@Schema(description = ...)` on every class and field so the swagger UI is self-explanatory. Fields are listed in the
order they are serialised.

```
ExternalPingResponse      { String version; Instant serverTime; }

ExternalStatsResponse     { Instant after; Instant before; boolean includeDisabled;
                            Integer numberOfConfiguredIndexers; Integer numberOfEnabledIndexers;
                            List<ExternalIndexerApiAccessStats> indexerApiAccessStats;
                            List<ExternalIndexerScore> indexerScores;
                            List<ExternalAverageResponseTime> avgResponseTimes;
                            List<ExternalIndexerDownloadShare> indexerDownloadShares;
                            List<ExternalCountPerDayOfWeek> downloadsPerDayOfWeek;
                            List<ExternalCountPerHourOfDay> downloadsPerHourOfDay;
                            List<ExternalCountPerDayOfWeek> searchesPerDayOfWeek;
                            List<ExternalCountPerHourOfDay> searchesPerHourOfDay;
                            List<ExternalSuccessfulDownloadsPerIndexer> successfulDownloadsPerIndexer;
                            List<ExternalSharePerUserOrIp> downloadSharesPerUser, downloadSharesPerIp,
                                                            searchSharesPerUser, searchSharesPerIp;
                            List<ExternalUserAgentShare> userAgentSearchShares, userAgentDownloadShares;
                            ExternalDownloadsPerAgeStats downloadsPerAgeStats; }
   — each nested class mirrors the corresponding `org.nzbhydra.historystats.stats.*` class field for field, with
     the same names and primitive/boxed types. The mapping is explicit (no `convertValue` from the internal class),
     so a rename inside the internal class breaks compilation, not the contract.

enum ExternalStatsSection { INDEXER_API_ACCESS, INDEXER_SCORES, AVG_RESPONSE_TIMES, INDEXER_DOWNLOAD_SHARES,
                            DOWNLOADS_PER_DAY_OF_WEEK, DOWNLOADS_PER_HOUR_OF_DAY, SEARCHES_PER_DAY_OF_WEEK,
                            SEARCHES_PER_HOUR_OF_DAY, DOWNLOADS_PER_AGE, SUCCESSFUL_DOWNLOADS_PER_INDEXER,
                            DOWNLOAD_SHARES_PER_USER, DOWNLOAD_SHARES_PER_IP, SEARCH_SHARES_PER_USER,
                            SEARCH_SHARES_PER_IP, USER_AGENT_SEARCH_SHARES, USER_AGENT_DOWNLOAD_SHARES }

ExternalPage<T>           { int page; int limit; long totalElements; int totalPages; List<T> entries; }
   — declared once, generic; springdoc renders the three concrete shapes through the controller return types.

ExternalIdentifier        { String key; String value; }
ExternalSearchHistoryEntry { int id; Instant time; String source; String searchType; String category;
                             String query; String title; String author; Integer season; String episode;
                             Integer minAge; Integer maxAge; Integer minSize; Integer maxSize;
                             List<ExternalIdentifier> identifiers; List<String> selectedIndexers;
                             String username; String ip; String userAgent; }
ExternalDownloadHistoryEntry { int id; Instant time; String title; String indexer; String category;
                               Long sizeBytes; Integer ageDays; String accessType; String accessSource;
                               String status; String error; String externalId;
                               String username; String ip; String userAgent; }
ExternalNotificationHistoryEntry { int id; Instant time; String eventType; String messageType; String title;
                                   String body; List<String> urls; boolean displayed; }
   — `source`, `searchType`, `accessType`, `accessSource`, `status`, `eventType`, `messageType` are the enum
     names as strings (stable even if the enum classes move).

ExternalBackupEntry       { String filename; Instant createdAt; long sizeBytes; }
ExternalBackupListResponse { List<ExternalBackupEntry> backups; }   — newest first

ExternalApiError          { int status; String code; String message; Instant timestamp; }
   codes: INVALID_PARAMETER (400), NOT_FOUND (404, only for a backup filename that does not exist — the key check
   never produces a body), STATS_TIMEOUT (503), INTERNAL_ERROR (500)
```

## Controllers and wiring

Package `org.nzbhydra.externalapi` in `core`:

- `ExternalApiV1Controller` (`@RestController`, `@RequestMapping("/externalapi/v1")`, `@Secured("ROLE_ADMIN")` on
  the class, `@Tag(name = "External API v1")`, `@Operation`/`@ApiResponse` on every method, a class-level
  `@SecurityRequirement(name = "apiKey")`).
- `ExternalApiConfiguration`: a springdoc `GroupedOpenApi` bean `externalapi` (paths `/externalapi/**`) and an
  `OpenAPI` customiser declaring the `apiKey` security scheme (`in: header`, name `X-Api-Key`) plus title/version
  for that group; the default group keeps everything else.
- `ExternalApiExceptionHandler` (`@RestControllerAdvice(assignableTypes = ExternalApiV1Controller.class)`): maps
  `IllegalArgumentException`/`MethodArgumentTypeMismatchException`/`ConstraintViolation` → 400,
  `ExternalBackupNotFoundException` → 404, `InterruptedException` from stats → 503, everything else → 500, always
  with an `ExternalApiError` body. It must not affect other controllers.
- Mappers: `ExternalStatsMapper`, `ExternalHistoryMapper`, `ExternalHistoryRequestMapper`, `ExternalBackupMapper`
  — pure functions, unit-tested field by field.
- Backups: `POST` calls `BackupAndRestore.backup(true)` and returns the entry for the created file; `GET /backups`
  uses `getExistingBackups()`; download validates the filename against that list (never against the file system
  directly) and streams `FileSystemResource` with `Content-Length` and `Content-Disposition`.
- Log: `LogContentProvider.getCurrentLogfile(false)` streamed as `text/plain; charset=UTF-8` with
  `Content-Length`. Not anonymised (same as the internal endpoint); the user docs say so.

## Swagger UI

`WebConfiguration.addResourceHandlers` maps `/swagger-ui/**` to the webjar `swagger-ui/4.10.3`, while springdoc 3.1.0
ships a much newer swagger-ui and serves `/swagger-ui/index.html` itself. Verify against a running instance whether
`/swagger-ui/index.html` currently works; if it does not, remove that resource handler (springdoc registers its own)
and re-verify. The user docs refer to `<base url>/swagger-ui/index.html` and to selecting the "externalapi" group.
Both `/v3/api-docs/**` and `/swagger-ui/**` stay behind the normal UI login (admin area), which is intended: the
docs are for the person who administers the instance.

## OpenAPI artefact and React types

`core/openapi.json` is generated by the springdoc maven plugin and `core/ui-react` derives `src/api/generated/openapi.ts`
from it (`npm run generate:api`, checked by `npm run check:api`). After adding the routes, regenerate both and commit
them; `check:api` must be green. The React app must not import anything from the new schemas.

## Tests

Core unit tests (`core/src/test/java/org/nzbhydra/externalapi/`):

- `ExternalApiKeyFilterTest`: header wins over query; valid key authenticates `externalApi` with `ROLE_ADMIN`;
  missing, wrong, and empty-configured key → 404 with empty body and the chain not called; no key logged.
- `ExternalApiV1ControllerTest` (standalone MockMvc with mocked `Stats`, `History`, `LogContentProvider`,
  `BackupAndRestore`): every route's happy path, every 400 (limit 501, bad instant, bad enum, `before ≤ after`),
  backup filename not in list → 404 body, stats timeout → 503, `ExternalApiError` shape.
- `SecurityConfigTest` gains cases: `/externalapi/v1/ping` without key → 404 and no CSRF token needed for `POST
  /externalapi/v1/backups` with a key.
- Mapper tests: field-by-field for one populated instance of each internal class, plus `ExternalHistoryRequestMapper`
  producing the exact `HistoryRequest` (filter keys, sort model, page/limit) the internal endpoint would build.

System tests (`tests/system/src/test/java/org/nzbhydra/ExternalApiV1SystemTest.java`, `@SystemTest`, run with
`python3 misc/run_gui_systemtest.py --runtime local --skip-install --java-test ExternalApiV1SystemTest`; the
configured key on the rigs is `apikey`):

- ping with header key and with query key → 200 and a version; without key, with a wrong key, and on an unknown
  `/externalapi/v1/nothing` → 404 with an empty body, for GET and POST.
- stats after one external-API search and one download (reuse `Searcher`/`TestDownloader` as `StatsTest` does):
  non-empty `indexerApiAccessStats` and the `section` filter leaving the others `null`.
- history: the search just made appears in `history/searches` with its query; the download in `history/downloads`;
  `limit=501` → 400 with `INVALID_PARAMETER`; `order=asc` reverses the first entry; `from`/`to` exclude it.
- log: `GET log/current` is `text/plain`, non-empty and contains a line the test just caused (call ping with a
  distinctive query parameter first and look for it in the log).
- backups: `POST backups` → 201 with a filename; `GET backups` lists it; `GET backups/{filename}` starts with `PK`
  and has `Content-Disposition`; `GET backups/does-not-exist.zip` → 404 with `NOT_FOUND` body.
- CSRF: `POST backups` with only the key and no cookie/header succeeds (this is the reason the surface exists).

`HydraClient` gains nothing; the tests pass the key explicitly with `get(endpoint, Map.of("X-Api-Key", "apikey"))`
and `"apikey=apikey"` where the query form is under test.

## Documentation and changelog

- `docs/external-api.md`: short, user-facing, no endpoint specifics; explains what the API is for, how to
  authenticate, where the swagger UI is, and what is deliberately not exposed. Referenced from the changelog.
- `changelog.yaml` (v9.0.0, unreleased): one `feature` entry announcing `/externalapi/v1` and pointing at the doc,
  placed next to the CSRF notes so users who hit the CSRF change find the replacement.

## Review checklist

- No JPA entity, `Page`, `FilterModel`, `SortModel`, `StatsRequest`, `StatsResponse` or any
  `org.nzbhydra.historystats.stats.*` type appears in a controller signature or in `openapi.json` under
  `/externalapi/**`.
- 404 on auth failure has an empty body and no `Set-Cookie`, `WWW-Authenticate` or redirect.
- The key never appears in any log line at any level.
- `/externalapi/**` is CSRF-exempt and excluded from the CSRF cookie filter; `/internalapi/**` is untouched.
- `openapi.json` and the generated React types are regenerated and `check:api` passes; `validate:migration`
  passes (no React source change).
- Native image: every new class Jackson touches carries `@ReflectionMarker`.
- The system test class passes against a running instance and is listed by the runner.
