# FM-068: Config Secret Round Trip Correctness

Status: planned Owner:
Feature IDs: F-CONFIG-MAIN, F-CONFIG-AUTH, F-CONFIG-DOWNLOADING Component IDs: C-SECRET-INPUT API IDs: API-CONFIG-GET, API-CONFIG-PUT Depends on: None Blocks: None

## Outcome

Saving the configuration stops disclosing credentials and stops reattaching them to the wrong record: `PUT /internalapi/config` answers with the same masked configuration `GET /internalapi/config` returns, and an `***UNCHANGED***` marker is
resolved only against the record it actually came from, so removing one entry from a list of users, downloaders, or indexers can no longer move a neighbour's password onto the entry that shifted into its index.

## Boundary Rationale

One mechanism, both of its directions. `SensitiveDataConfigValidator` masks on the way out (`prepareForDisplay`, reached only from `BaseConfigValidator.updateAfterLoading:152-157`, which `ConfigWeb.setConfig:96` never calls) and unmasks on the
way in (`processSensitiveFieldsForSaving`, whose `findCorrespondingOldItem:205-238` falls back to the list index). Same class, same call chain, same request/response pair, one test surface, one security concern: a credential either leaves the
server in clear text or lands on the wrong account, and splitting them would split a round trip by direction. FM-064's third escalation — `DownloaderConfig` rejecting bodies that omit `enabled`/`addPaused` — is deliberately excluded: it is
HTTP message conversion, before any validator runs, and its fix strategy is an open decision (see `STATUS.md`, *Upcoming*).

## Decision Dependencies

- Accepted: ADR-0004, ADR-0017. Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/src/main/java/org/nzbhydra/config/ConfigWeb.java` and, in `.../config/validation/`, `SensitiveDataConfigValidator.java`, `BaseConfigValidator.java`, and `UserAuthConfigValidator.java`
- `core/src/test/java/org/nzbhydra/config/**`; `tests/system/tests/config-auth.spec.ts` and `config-main.spec.ts` **additively only** — no existing assertion may be changed, relaxed, or removed
- The `API-CONFIG-PUT` record in `docs/frontend-migration/APIS.yaml` only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Any change under `core/ui-react/**` or `shared/mapping/**`. The React client already treats the save response's secrets as untrusted and round-trips the marker byte-for-byte (`C-SECRET-INPUT`); if a frontend change looks necessary, the
  server fix is wrong. Encryption at rest (`SensitiveDataHandler`) is untouched — this packet is about the wire and about record identity.
- `DownloaderConfig`'s Jackson creator, `WebConfiguration.configureMessageConverters`, and `POST /internalapi/downloader/checkConnection` (pending decision). Re-enabling `ConfigWebTest`, which is `@Disabled("Works only locally for some
  reason")` — leave it as it is and do not put this packet's evidence in it.

## Context To Read

- `core/src/main/java/org/nzbhydra/config/ConfigWeb.java:57-111`, `validation/BaseConfigValidator.java:135-157`, `validation/SensitiveDataConfigValidator.java` and `validation/UserAuthConfigValidator.java` in full, and
  `ConfigReaderWriter.java:212-252` (`getCopy`, the only existing deep copy of a `BaseConfig`)
- `shared/mapping/.../config/MainConfig.java` (`proxyUsername`, `proxyPassword`), `indexer/IndexerConfig.java` (`apiKey`, `username`, `password`), `downloading/DownloaderConfig.java` (`apiKey`, `username`, `password`),
  `auth/UserAuthConfig.java` — note its `password` is `@SensitiveData` but **not** `@HiddenInUI`, and that it has no `name` field
- `tests/system/tests/config-auth.spec.ts:193-290` (FM-060's rename-with-bystander case, which documents this defect from the client side), `tests/system/tests/fixtures.ts:140-244`, and `APIS.yaml`'s `API-CONFIG-GET`/`API-CONFIG-PUT` notes —
  the latter already claims the server "re-masks secrets" on save, which is what this packet makes true

## Acceptance

- `PUT /internalapi/config`'s `ConfigValidationResult.newConfig` masks exactly what `GET /internalapi/config` masks, for the same input: `main.proxyUsername`, `main.proxyPassword`, every `indexers[].apiKey`/`username`/`password`, every
  `downloading.downloaders[].apiKey`/`username`/`password`, and every `auth.users[].password`. The `auth.users[]` case is masked by `UserAuthConfigValidator.updateAfterLoading`, not by the generic `@HiddenInUI` pass, so the response must go
  through the whole `updateAfterLoading` path, not through `prepareForDisplay` alone.
- Masking the response does not mutate server state. `prepareForDisplay` writes the marker into the object it is handed, and `ConfigProvider.getBaseConfig()` hands out the live instance — so the response is built from a copy. Proven by a test
  that saves, then asserts the in-memory config still holds the real secrets and that an immediately following save carrying only markers still resolves them to those same values.
- Removing a list entry can no longer bind a marker to a different record: with users `[a, b, c]` (distinct passwords) and a save of `[a, c]` where `c.password` is the marker, `c` keeps `c`'s stored password and never receives `b`'s; same for
  `downloading.downloaders` and `indexers`, whose entries do carry `name`. The rule is that the generic pass never resolves a marker positionally across a length change — when `newList.size() != oldList.size()` and no identity match is found
  it leaves the marker in place instead of guessing an index. Equal-length lists keep today's positional behaviour, which is what makes a plain rename work.
- `UserAuthConfigValidator`'s username-based matching becomes reachable again. Today `BaseConfigValidator.prepareForSaving:137-149` runs the generic pass first, and because `processSensitiveFieldsForSaving` resolves the marker on *any* String
  field — not only `@HiddenInUI` ones — a user's password is already overwritten by the positional guess before the correct matcher ever sees the marker. Fix the ordering or the scope so the type-specific matcher wins; assert with a test that
  a save removing a user resolves each surviving password by username.
- A marker that survives the whole `prepareForSaving` is never persisted literally. The save is rejected through the existing contract — `ConfigValidationResult.ok == false` with an `errorMessages` entry naming the setting — and neither the
  in-memory config nor `nzbhydra.yml` changes. The React client already renders this as its `config-validation-errors` dialog (`useConfigSave.ts`); no client change is needed.
- Tests live in `core/src/test/java/org/nzbhydra/config/validation/` and run without a Spring context wherever the collaborator graph allows it (`SensitiveDataConfigValidator` has none). Every criterion above has a named test; no existing test
  is weakened, skipped, or deleted. `API-CONFIG-PUT`'s registry note is updated to state what the response now guarantees, consistently with `API-CONFIG-GET`'s.
- Screenshot strip per `../README.md` *Visual Gate*, 1280x800 only (layout is identical, so no mobile capture): `/config/auth` and `/config/main` **immediately after a successful save, before any reload** — the secret fields now return to the
  "Value unchanged" placeholder instead of holding the stored credential, which the reveal button would otherwise show in clear text.

## Verification

- From repository root: `mvn -pl core -am test` succeeds (fall back per `/AGENTS.md` §3 if the IntelliJ MCP tools are unavailable). Record the new test classes and their results individually.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts tests/config-main.spec.ts tests/config-auth.spec.ts tests/config-downloading.spec.ts` succeeds, with `config.spec.ts` and
  `config-downloading.spec.ts` byte-identical to their state at this packet's baseline.
- In `core/ui-react`: `npm run validate:migration` succeeds (the packet changes `APIS.yaml` and `STATUS.md`); no other frontend gate is required because no frontend source changes. Run `git diff --check`; confirm changed files match Files
  Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a reflective, type-agnostic validator whose two directions are scoped inconsistently, an ordering interaction with a second validator, and a fix whose failure mode is silent credential corruption rather than a crash.
- Reviewer: `opus` — at least the implementer's tier: this changes the response contract of `API-CONFIG-PUT` and the resolution rule for every masked config secret, and judging whether a marker can still cross records needs the whole call
  chain held at once, not a diff read.
- Fixer: `opus` — expected findings land in the matching rule or in what the response is built from, not in markup.

Implementer prompt: Start by proving the bug, not the fix — write the failing three-user removal test first, then read `BaseConfigValidator.prepareForSaving` top to bottom to see which pass wins. Trap: calling `prepareForDisplay` on
`configProvider.getBaseConfig()` masks the *running* configuration in memory and destroys the real secrets; `ConfigReaderWriter.getCopy` exists for this. Prove the round trip survives two consecutive marker-only saves.
Reviewer prompt: Check hardest that no code path can still resolve a marker against a record it cannot identify, and that the live config is untouched by response masking. Distrust a green system-test run whose `config.spec.ts` or
`config-downloading.spec.ts` was edited at all.
