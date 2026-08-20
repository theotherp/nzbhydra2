# FM-069: Web Mapper Primitive Leniency

Status: planned Owner:
Feature IDs: F-CONFIG-DOWNLOADING Component IDs: None API IDs: API-DOWNLOAD-CHECK-CONNECTION Depends on: None Blocks: None

## Outcome

An HTTP request body that omits — or explicitly nulls — a primitive field is accepted and the primitive takes its Java default, instead of being rejected with HTTP 400. `POST /internalapi/downloader/checkConnection` and
`PUT /internalapi/config` accept a `DownloaderConfig` without `enabled`/`addPaused`, and the registry stops documenting the rejection as the contract.

## Boundary Rationale

ADR-0018 is one line of mapper configuration whose whole cost is proving its blast radius, so the proof ships with it: the change, tests pinning the new behaviour on more than the class that surfaced it, the inventory of what else now
defaults silently, and the registry note that currently states the opposite. Splitting the edit from its evidence would land an unbounded deserialization change with nothing attached. Distinct from FM-068 in file, mechanism and stage:
FM-068 owns `ConfigWeb`/`SensitiveDataConfigValidator` and runs after conversion, this packet owns `WebConfiguration`'s mapper and runs before any validator; they share `APIS.yaml` only through different records, so either order works and
no `Depends on` is needed. FM-064's client-side default (`downloadingSettings.ts:130-136`) becomes redundant once this ships but stays — a client sending the fields explicitly is still valid input, so removing it is later cleanup.

## Decision Dependencies

- Accepted: ADR-0018. Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/src/main/java/org/nzbhydra/web/WebConfiguration.java`
- `core/src/test/java/org/nzbhydra/web/WebConfigurationTest.java` **additively only** — no existing test may be changed, relaxed, or removed
- The `API-DOWNLOAD-CHECK-CONNECTION` record in `docs/frontend-migration/APIS.yaml` only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- `DownloaderConfig.java` and every other Lombok class: no `@Jacksonized`, `@JsonCreator`, `@JsonProperty`, boxed-type or field-initializer change. ADR-0018 chose the mapper fix over the per-class one; a class edit here would re-litigate it.
- `Jackson.java` (already correct — it is the reference, not a target) and the private write-only mapper inside `NewznabAndTorznabResponseNamespaceFixer` (`canRead` returns `false`, so no deserialization reaches it).
- Anything under `core/ui-react/**` or `tests/system/tests/**`, including removing FM-064's client-side default. FM-068's files (`ConfigWeb.java`, `config/validation/**`, `core/src/test/java/org/nzbhydra/config/**`, `API-CONFIG-PUT`) are its own.

## Context To Read

- `core/src/main/java/org/nzbhydra/Jackson.java:19-29` (the `.disable(...)` this restores) and `web/WebConfiguration.java:152-164` (the web mapper) plus `:167-172` (the write-only converter that must not change)
- `core/src/test/java/org/nzbhydra/web/WebConfigurationTest.java` in full — the established pattern for testing this class without a Spring context: instantiate `WebConfiguration`, call the protected override, drive the result
- `shared/mapping/.../config/downloading/DownloaderConfig.java:19-43`, `searching/dtoseventsenums/SearchRequestParameters.java:14-45`, `config/indexer/IndexerCategoryConfig.java:79-97`, `historystats/stats/HistoryRequest.java:12-21`,
  `historystats/stats/StatsRequest.java:13-36` — the creator-bound, primitive-bearing request bodies this change reaches
- `DECISIONS.md` ADR-0018 in full, and `APIS.yaml:33` (`API-DOWNLOAD-CHECK-CONNECTION`, whose note states the behaviour being replaced)

## Acceptance

- `configureMessageConverters`' `JsonMapper.builder()` chain gains `.disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)`, matching `Jackson.JSON_MAPPER:26-29`. Nothing else about that mapper changes: the `EmptyStringToNull` module
  and `SerializationFeature.INDENT_OUTPUT` stay, and `registerDefaults()`/`addCustomConverter(...)` are untouched.
- Proven through the converter Spring actually installs, never through a mapper the test builds for itself: the test calls `configureMessageConverters` on a `HttpMessageConverters.forServer()` builder, takes the
  `JacksonJsonHttpMessageConverter` out of the built `HttpMessageConverters`, and reads bodies with it (`MockHttpInputMessage`). A test that constructs its own `JsonMapper` proves nothing and fails this criterion.
- Missing primitive: `{"name":"d1","downloaderType":"SABNZBD","url":"http://localhost:8080"}` read as `DownloaderConfig` yields `enabled == false` and `addPaused == false` rather than throwing. Not class-specific: the same body shape for
  `SearchRequestParameters` omitting `loadAll` and `searchRequestId` yields `false` and `0`.
- Explicit null: a `DownloaderConfig` body carrying `"enabled": null` also yields `false` instead of throwing — the feature governs explicit null as well as an absent creator parameter, and both reach `internalapi` callers.
- Serialization is unaffected: one assertion that the same converter still writes indented JSON, so the fix cannot be mistaken for a mapper rebuild that dropped `INDENT_OUTPUT`.
- The handoff records the blast-radius inventory (in the handoff, not a new document): the Lombok `@AllArgsConstructor` types reachable as a `@RequestBody` body or nested in one that carry primitive fields, with the primitives that now
  default silently. Verified at design time as `DownloaderConfig` (`enabled`, `addPaused`), `SearchRequestParameters` (`loadAll`, `searchRequestId`), `IndexerCategoryConfig.MainCategory`/`SubCategory` (`id`), `HistoryRequest` (`distinct`,
  `onlyCurrentUser`, `page`, `limit`), `StatsRequest` (its 17 booleans); re-verify rather than copy, and correct FM-064's escalation in the same list — `NotificationConfigEntry` and `SavedSearch` carry no primitive and were never exposed,
  `SearchRequestParameters` was never named and is. Call out `HistoryRequest`: its `page = 1`/`limit = 100` initializers never applied to a creator-bound body, so an omitted `limit` moves from HTTP 400 to `0`, not `100`. Recording that in
  `STATUS.md` as a follow-up candidate is the whole obligation here — do not change that class.
- Nothing relied on the strict rejection, re-confirmed by a recorded search: no test under `core/src/test` asserts an HTTP 400 or a `MismatchedInputException` for a missing or null primitive (at design time the only `BAD_REQUEST` assertions
  are `IndexerWebProwlarrTest.java:178` and `:194`, both on a `ResponseEntity` the controller builds itself). The handoff also records why the public surface carries no request-parsing risk: `ExternalApi.api` (`/api`, `/rss`,
  `/torznab/api`) binds `NewznabParameters` from query parameters, so no newznab/torznab request passes through a message converter inbound.
- `API-DOWNLOAD-CHECK-CONNECTION`'s note stops presenting the 400 as the contract and states that a body omitting `enabled`/`addPaused` is accepted with both defaulting to `false` (ADR-0018), while keeping what is still true: unknown keys
  such as legacy's `nzbAccessType` are ignored, the response is `GenericResponse`, and a failed check is HTTP 200 with `successful=false`. No other registry record is edited; `API-CONFIG-PUT` makes no primitive claim and is FM-068's.
- No screenshot strip: nothing rendered changes (`../README.md` *Visual Gate*).

## Verification

- From repository root: `mvn -pl core -am test` succeeds (fall back per `/AGENTS.md` §3 if the IntelliJ MCP tools are unavailable). Record the new `WebConfigurationTest` cases and their results individually.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900` — the **whole** suite, not a subset. `core/src/test` contains no `MockMvc` or `@WebMvcTest`, so no JVM test exercises HTTP message conversion
  end to end; the real-backend suite is the only regression evidence for the endpoints this change reaches (`search.spec.ts`/`results.spec.ts` for `SearchRequestParameters`, `stats.spec.ts` for `StatsRequest`,
  `search-history.spec.ts`/`notification-history.spec.ts`/`downloads.spec.ts` for `HistoryRequest`, the `config*.spec.ts` set for `BaseConfig`). No spec file may be edited; a run with an edited spec does not count.
- In `core/ui-react`: `npm run validate:migration` succeeds (the packet changes `APIS.yaml` and `STATUS.md`); no other frontend gate applies because no frontend source changes. Run `git diff --check`; confirm changed files match the allowlist.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the edit is one line, but the deliverable is a bounded blast radius for a global deserialization change: an inventory that has to distinguish creator-bound from setter-based classes, and a test that must assert
  through the converter Spring installs rather than a mapper of its own.
- Reviewer: `opus` — at least the implementer's tier: this changes the request contract of every `@RequestBody` endpoint and rewrites an `APIS.yaml` record, and judging whether the inventory is complete means re-deriving it, not reading a diff.
- Fixer: `opus` — the likely findings are an inventory entry that misclassifies a class or a test proving the wrong mapper, neither of which is a mechanical correction.

Implementer prompt: Reproduce before you fix — read a `DownloaderConfig` body without `enabled` through the converter and watch it throw, then add the `.disable(...)`.
Trap: `NewznabAndTorznabResponseNamespaceFixer` carries its own `JsonMapper`; it is write-only and is the wrong one to touch. Second trap: an inventory built by grepping `@AllArgsConstructor` alone over-reports — a class needs both a
creator and a primitive field to be affected. Prove the `SearchRequestParameters` case too, so the fix is not read as downloader-specific.
Reviewer prompt: Check hardest that the new tests fail without the one-line change — revert it locally and rerun before trusting them. Distrust an inventory that names classes without stating which are creator-bound, and any system-test
result whose spec files are not byte-identical to the baseline.
