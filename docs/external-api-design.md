# External API v1 — design

Status: implemented 2026-09-09; the *As built* section at the end records where the implementation deviates from the
design below and why. Owner decision: stats consumers must stop using `/internalapi`
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
| `to` | ISO-8601 instant | none | inclusive upper bound (`History` filters with `<=`) |
| `order` | `asc` \| `desc` | `desc` | by entry time |

Route-specific optional filters, all case-insensitive substring matches unless stated:

- searches: `query`, `username`, `ip`, `userAgent`. (No `indexer` filter in v1: the selected indexers live in a
  collection table `History.getHistory` cannot join; an additive v1 change later.)
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
deserialise them). Lombok `@Data @NoArgsConstructor @AllArgsConstructor`, `@ReflectionMarker` for the native image
(enums included), `@Schema(description = ...)` on every class and field so the swagger UI is self-explanatory
(`shared/mapping` depends on `swagger-annotations-jakarta` for that), and `@JsonFormat(shape = STRING, timezone =
"UTC")` on every `Instant` because `WebConfiguration` builds its own `JsonMapper` outside Spring's date settings. Fields are listed in the
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
   — `ExternalDownloadsPerAgeStats { List<ExternalDownloadPerAge> downloadsPerAge; ... }` with
     `ExternalDownloadPerAge` mirroring the internal element type.
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
                               Long sizeBytes; Integer ageDays;   // category and sizeBytes are always null in
                                                                  // v1: the download entity stores neither;
                                                                  // kept so they can be filled additively String accessType; String accessSource;
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
- `ExternalApiConfiguration`: two springdoc `GroupedOpenApi` beans, `externalapi` (paths `/externalapi/**`) and
  `newznab` (`/api`, `/api/**`, `/rss`, `/rss/**`, `/torznab/api`, `/torznab/api/**`), and a global `OpenAPI`
  customiser declaring the `apiKey` security scheme (`in: header`, name
  `X-Api-Key`) so `components.securitySchemes` exists in every document including `core/openapi.json`. Every
  operation carries an explicit `operationId` prefixed `external` so it cannot collide with internal controllers'
  method names.
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

`WebConfiguration.addResourceHandlers` used to map `/swagger-ui/**` to the webjar `swagger-ui/4.10.3`, which springdoc
3.1.0 no longer ships, so `/swagger-ui/index.html` was a 404. Because `WebConfiguration` extends
`WebMvcConfigurationSupport`, springdoc's own `WebMvcConfigurer` is never consulted; the handler now delegates to
springdoc's `SwaggerWebMvcConfigurer` bean (null-guarded for the bare unit test), which registers the right webjar
and the index-page transformer. Verified on a running instance. The user docs refer to `<base url>/swagger-ui/index.html` and to selecting the "externalapi" group.
Both `/v3/api-docs/**` and `/swagger-ui/**` stay behind the normal UI login (admin area), which is intended: the
docs are for the person who administers the instance.

## What the documentation exposes

Only the two APIs meant for other programs appear in the swagger UI and in `/v3/api-docs`: the Newznab/Torznab API
(`/api`, `/api/**` — which includes `/api/stats*` and `/api/history/*` from `ExternalApiStats` —, `/rss`, `/rss/**`,
`/torznab/api`, `/torznab/api/**`) and the external API (`/externalapi/**`). Nothing under `/internalapi`,
`/actuator`, `/getnzb`, `/gettorrent`, `/login`, `/dev`, `/fortests`, `/cache` or `/error` is documented: it is an
implementation detail of the web interface, changes without notice and must not look like an offer.

Two mechanisms enforce that:

- the two `GroupedOpenApi` beans, which are what the UI's selector offers (`externalapi` and `newznab`);
- `springdoc.packages-to-scan=org.nzbhydra.api,org.nzbhydra.externalapi` in
  `core/src/main/resources/config/application.properties`, which limits the *default* document. Package scanning, not
  `springdoc.paths-to-match`: springdoc lets a global `paths-to-match` override each group's own *patterns*
  (`AbstractOpenApiResource.isPathToMatch`), which would make both groups show the union, while a global
  `packages-to-scan` leaves the path patterns alone. Note that the global package list *is* applied to the grouped
  documents too — `isPackageToScan` falls back to a group's own list only when the global one is empty. The two
  public groups survive it because everything they match lives in the two scanned packages; a group for anything
  else, such as `internal`, would come out empty, which is why the development property clears the list rather than
  only widening the default document.

The `newznab` group additionally runs an `OpenApiCustomizer` that strips every operation which is not GET or POST:
the Newznab controllers map their routes with a bare `@RequestMapping`, so springdoc emits all seven verbs for each
of the nine paths (63 operations). No mapping or method restriction changes — this is the document only.
`ExternalApi` and the four `ExternalApiStats` methods carry `@Operation` descriptions, and the fields of
`NewznabParameters` carry `@Schema` descriptions, so the group says what the routes are for and what `t`, `q`,
`cat`, `o` and the rest mean; the group's info text points at the Newznab specification, which remains the
authority.

`ExternalApiConfigurationTest` asserts the group patterns, the property, and — by scanning `org.nzbhydra.api`
reflectively — that no mapping there falls outside the `newznab` group's patterns.

## OpenAPI artefact and React types

`core/openapi.json` is generated by the springdoc maven plugin and `core/ui-react` derives `src/api/generated/openapi.ts`
from it (`npm run generate:api`, checked by `npm run check:api`). That file needs the internal endpoints, which the
restriction above removes, so it is regenerated with the development property `nzbhydra.dev.exposeInternalApiDocs`
(default false, never set in a release). When it is true the default document is unrestricted again and an
additional `internal` group (`/internalapi/**`) appears in the selector.

Recipe:

All commands are run from the repository root; the instance stays up while the plugin reads `/v3/api-docs` from
it, so it is started in the background and stopped at the end.

```
mvn -pl shared/mapping -o install -DskipTests -q
mvn -pl core -o compile -Dexec.skip=true -q
mvn -o -pl core dependency:build-classpath -Dmdep.outputFile=/tmp/cp.txt -q

(cd core && java -Dnzbhydra.dev.exposeInternalApiDocs=true -cp "target/classes:$(cat /tmp/cp.txt)" \
    org.nzbhydra.NzbHydra directstart --datafolder /tmp/hydradata --nobrowser &)
until curl -sf -o /dev/null http://127.0.0.1:5076/v3/api-docs; do sleep 2; done

mvn -o -pl core org.springdoc:springdoc-openapi-maven-plugin:1.5:generate     # writes core/openapi.json
(cd core/ui-react && npm run generate:api && npm run check:api && npm run typecheck)

pkill -f "org.nzbhydra.NzbHydra directstart"
```

Compare the regenerated file with the committed one before committing: no operation may disappear, and
`git diff --stat -- core/ui-react` must list nothing but `src/api/generated/openapi.ts`. The React app must not
import anything from the external API schemas.

## Examples in the swagger UI

Every operation carries an `@ExampleObject` per response code (success and each documented error), every query and
path parameter an `example`, and every contract class field a `@Schema(example = ...)`. The bodies live in
`ExternalApiExamples` as text blocks so they stay readable and can be reused. All values are invented: indexers
"Example Indexer" and "Sample Indexer", releases like `Example.Show.S01E01.1080p.WEB-DL-EXMPL`, users alice and bob,
IPs from the documentation ranges of RFC 5737, and error messages copied from what the code really produces. Nothing
in there may be a real release, indexer, host, user or address.

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
- 404 on auth failure has an empty body and no `Set-Cookie`, `WWW-Authenticate` or redirect. This requires the key
  filter to run before `CsrfFilter`: with `setCsrfRequestAttributeName(null)` Spring resolves the deferred token
  eagerly inside `CsrfFilter`, which writes the cookie on every request that reaches it.
- The key never appears in any log line at any level.
- `/externalapi/**` is CSRF-exempt and excluded from the CSRF cookie filter; `/internalapi/**` is untouched.
- `openapi.json` and the generated React types are regenerated and `check:api` passes; `validate:migration`
  passes (no React source change).
- Native image: every new class Jackson touches carries `@ReflectionMarker`.
- The system test class passes against a running instance and is listed by the runner.

## As built (2026-09-09)

- `ExternalApiKeyFilter` is registered before `CsrfFilter` (see the cookie note above) and matches with the same
  `PathPatternRequestMatcher` the authorization rule uses, so encoded prefixes get the same bodyless 404.
- The key filter installs its authentication in a fresh `SecurityContext` rather than mutating the current one, so a
  request that carries both a browser session and a valid key never writes `externalApi`/`ROLE_ADMIN` into that
  session (the API key is a lower-trust credential than an admin password). A valid-key response still receives the
  XSRF cookie because `CsrfFilter` resolves the token eagerly; that is accepted.
- `shared/mapping` depends on `swagger-annotations-jakarta` at `provided` scope with an explicit version property
  rather than a parent-managed compile dependency: the managed form shifted Maven's mediation of `jaxb-core` in
  core's test scope and broke the offline build. Annotations whose class is absent are dropped by the JVM, so
  consumers of the mapping jar without swagger on the classpath are unaffected (verified against the system tests'
  classpath).
- `BackupAndRestore.getBackupFolder()` became public for the download route.
- Regenerating `core/openapi.json` also picked up three internal paths that had drifted out of the committed file
  (`/internalapi/debuginfos/{clearlog,rotatelog}`, `/internalapi/systemtest/reset`) and `FilterDefinition.isBoolean`.
- System tests: `tests/system/src/test/java/org/nzbhydra/ExternalApiV1SystemTest.java`, 19 cases, run with
  `mvn -o -pl org.nzbhydra:mapping install -DskipTests -q` first (the runner packages core without installing the
  mapping module the system tests resolve) and then
  `python3 misc/run_gui_systemtest.py --runtime local --skip-install --java-test ExternalApiV1SystemTest`.
- User documentation: `docs/external-api.md`.

## As built (documentation pass, 2026-09-09)

- The `all` group is gone; the selector offers `externalapi` and `newznab`, and the default document is limited by
  `springdoc.packages-to-scan` (see *What the documentation exposes*). `nzbhydra.dev.exposeInternalApiDocs=true`
  lifts the restriction and adds the `internal` group; it is applied by an `InitializingBean` in
  `ExternalApiConfiguration` that clears `SpringDocConfigProperties.packagesToScan`, because a boolean property
  cannot select a value list in `application.properties`. Clearing it is not cosmetic: the global package list is
  applied to grouped documents as well, so without it the `internal` group would be empty.
- The `newznab` group drops all verbs but GET and POST from its document (`onlyGetAndPostCustomizer`), which takes it
  from 63 operations to 18 (a GET and a POST per path).
- Success responses that carry an `@ExampleObject` also need `useReturnTypeSchema = true`: springdoc replaces the
  calculated content with what the annotation declares, so without it the response schema (and with it the
  `ExternalPage…` component schemas) disappeared from `core/openapi.json`.
- Example bodies live in `org.nzbhydra.externalapi.ExternalApiExamples`; the download route also documents an
  example HTTP request in its `@Operation` description.
- `ExternalApiConfigurationTest` (6 cases) covers the group patterns, the absence of the `internal` group unless the
  property is set, the `application.properties` restriction, and a reflective scan of `org.nzbhydra.api` and
  `org.nzbhydra.externalapi` against the group patterns.
