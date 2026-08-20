# FM-071: Bounded WebAccessException Message At User-Facing Boundaries

Status: planned Owner:
Feature IDs: F-CONFIG-EXTERNAL-TOOLS Component IDs: None API IDs: API-CONFIG-EXTERNAL-CONNECTION, API-CONFIG-EXTERNAL-SYNC, API-CONFIG-INDEXER-PROWLARR, API-CONFIG-INDEXER-CONNECTION Depends on: None Blocks: None

## Outcome

A failed HTTP call no longer dumps the remote server's entire response body into a message a user reads. `WebAccessException` gains a short-form accessor (response message + `Code: N`, no body); the four boundaries ADR-0019 names switch to it, while
`getMessage()` and `getBody()` keep their current content so logs and body-inspecting callers are untouched. Today a connection test against a wrong URL puts the tool's whole 404 page in the External Tools toast (which FM-065 already saw overlap the
dialog's own buttons), the Prowlarr-import error, the indexer connection check, per-indexer search-result errors, and the disabled-indexer notification. FM-066/FM-067 then inherit a bounded message on their first implementation.

Per ADR-0019's addendum, two more sites fold in: `ExternalTools.handleXdarrError`'s fallback branch and `ExternalToolsSyncService`'s per-tool sync-failure message, both of which put the same unbounded body into `POST .../syncAll`'s JSON `messages`
list (the persisted sync notification's own body is the generic count text and is unaffected either way).

## Boundary Rationale

One shared utility produces the defect and one accessor closes it; the four call sites cannot be split from the accessor because a new accessor with no caller proves nothing, and a caller change without it is impossible. `IndexerChecker` is in scope not
as an extra boundary but as the guard against this change: with the body gone from the message, its line-484 `"Incorrect parameter"` heuristic silently narrows, so the caps check must read that string off `getBody()` exactly as line 482 already reads
`"function not available"`.

`ExternalTools.handleXdarrError` and `ExternalToolsSyncService` were originally excluded as outside ADR-0019's exhaustive list, and `ExternalTools.java` is otherwise FM-070's write target. The owner explicitly extended the boundary to both (ADR-0019's
addendum) rather than leaving them as an unpackaged follow-up candidate. `ExternalToolsSyncService.java` is untouched by any other task, so it is a plain addition. `ExternalTools.java` is a narrow, disclosed exception to FM-070's exclusivity: this task
touches only `handleXdarrError`'s one `else` branch (line 368), never the `minimumSeeders`/`mapCategories` guards FM-070 owns — the two tasks change disjoint lines in the same file for unrelated reasons, and whichever of FM-070/FM-071 runs second simply
sees the other's change already in the file.

## Decision Dependencies

- `ADR-0019` — Bound `WebAccessException`'s user-facing message (accepted 2026-08-20), including its 2026-08-20 addendum extending the boundary to `ExternalTools.handleXdarrError`'s fallback branch and `ExternalToolsSyncService`'s per-tool sync-failure
  message. It pre-authorizes writes in `webaccess/`, `externaltools/`, and `indexers/`, and keeps `getBody()` available to callers wanting the raw body — the sanctioned mechanism for the `IndexerChecker` guard above.

## Files Allowed To Modify

- `core/src/main/java/org/nzbhydra/webaccess/WebAccessException.java`, `core/src/main/java/org/nzbhydra/externaltools/ExternalToolsWeb.java`, `core/src/main/java/org/nzbhydra/indexers/IndexerWebAccess.java`, and
  `core/src/main/java/org/nzbhydra/indexers/capscheck/{ProwlarrConfigRetriever.java,IndexerChecker.java}`
- `core/src/main/java/org/nzbhydra/externaltools/ExternalTools.java`, **only `handleXdarrError`'s final `else` branch (line 368)** — no other line in this file, which is otherwise FM-070's write target
- `core/src/main/java/org/nzbhydra/externaltools/ExternalToolsSyncService.java`
- New `core/src/test/java/org/nzbhydra/webaccess/WebAccessExceptionTest.java`; `core/src/test/java/org/nzbhydra/indexers/IndexerWebAccessTest.java` and `core/src/test/java/org/nzbhydra/indexers/capscheck/{ProwlarrConfigRetrieverTest.java,NewznabCheckerTest.java}`
  **additively only** — no existing case may be changed, relaxed, or removed; new `core/src/test/java/org/nzbhydra/externaltools/ExternalToolsSyncServiceTest.java` (no existing test file for this class)
- The `note` field of exactly the `API-CONFIG-EXTERNAL-CONNECTION`, `API-CONFIG-EXTERNAL-SYNC`, and `API-CONFIG-INDEXER-PROWLARR` records in `docs/frontend-migration/APIS.yaml`; regenerated files under `tests/system/visual-evidence/F-CONFIG-EXTERNAL-TOOLS/`;
  this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- `ExternalTools.java`'s other `messages.add(...)` call sites (`:357`, `:365`, and every line outside `handleXdarrError`'s final `else` branch, including the `minimumSeeders`/`mapCategories` guards) stay untouched — that is FM-070's territory, not this
  task's, and touching it would collide with FM-070's exclusive claim on the rest of the file.
- `IndexerWeb.readProwlarrConfig:141` needs no edit: it forwards the `IndexerAccessException` message that `ProwlarrConfigRetriever:47` composes, so fixing the retriever bounds it. Prove that transitively; keep `IndexerWeb.java` (including its
  `catch (Exception e)` at `:143-146`) out of the diff. Likewise `Indexer.handleIndexerAccessException:377` (`e.getCause().getMessage()`) is log-only — `error(...)` is `getLogger().error(...)` (`Indexer:505-511`) — and must stay verbose; `:386`'s `handleFailure(e.getMessage(), ...)`, which writes
  `IndexerConfig.lastError` and the disabled-indexer notification, is bounded transitively by the `IndexerWebAccess` change. Do not edit `Indexer.java`. Do not bound, truncate, or otherwise change `getMessage()` or `getBody()` — `Binsearch:69`/`NzbKing:55`
  retry on `503` found in the stack-trace string, which depends on `getMessage()` staying verbose.
- Three pre-existing findings to record in the handoff as follow-up candidates rather than fix: `IndexerWebAccess:110-111`'s `SocketTimeoutException` branch is unreachable because `WebAccess:115` wraps timeouts in a `WebAccessException`; a body-less
  `WebAccessException` renders a meaningless `. Code: 0` suffix; and `IndexerApiAccessEntity.error` (named in ADR-0019's problem statement) is declared at `IndexerApiAccessEntity.java:51` and assigned nowhere in `core/src/main` — dead today, do not add a writer.
- No `core/ui-react/src/**` change, no `tests/system/tests/**` change (the specs assert only the `/^Connection test failed: /` prefix and must stay that way), no `FEATURES.yaml` change, no downloader work (`Sabnzbd`/`NzbGet.checkConnection` never touch
  `WebAccess` — a different root cause, excluded by ADR-0019).

## Context To Read

- `docs/frontend-migration/DECISIONS.md`, ADR-0019 in full. Then `WebAccessException.java:12-45` (three constructors; `getMessage()` joins with `". "` and filters empties) and `WebAccess.java:100-116` — the only throw sites: `:106`/`:111` carry a body
  and an HTTP code, `:115` wraps `ConnectException`/`SocketTimeoutException` with no body and code `0`
- The four ADR-0019 boundaries: `ExternalToolsWeb.java:107-110` (catches bare `Exception`, so a type check is required; `:79-81`'s outer catch is unreachable and stays); `ProwlarrConfigRetriever.java:46-50`; `IndexerWebAccess.java:107-122`;
  and `IndexerChecker.java:474-487` — read `:481-482` before `:484`, they are the same question answered two ways
- The two addendum sites: `ExternalTools.java:350-371` (`handleXdarrError` — `e` is already typed `WebAccessException`, no type check needed; only the final `else` branch at `:368` changes, the two earlier branches at `:357`/`:365` build their own
  `errorMessage` from parsed JSON and are untouched) and `ExternalToolsSyncService.java:77-91` (`syncTools`'s `catch (Exception e)` at `:87`, which — unlike `handleXdarrError` — is bare and needs a type check; `:89`'s `logger.error` call keeps `e.getMessage()`
  unchanged, only `:90`'s `messages.add(...)` changes)
- The consumers that make each one user-facing: `IndexerChecker.java:150-153` (`GenericResponse.notOk(e.getMessage())`, the connection-check dialog), `IndexerWeb.java:138-142` (the Prowlarr-import error response), `Indexer.java:185-189` (per-indexer
  search-result message) and `Indexer.java:329-347` (`setLastError` plus `IndexerDisabledNotificationEvent`). Existing tests that must keep passing unchanged: `ProwlarrConfigRetrieverTest.java:131-140` (throws body `""`, so short and long forms coincide — assert why it is unaffected, do not adjust it), `NewznabCheckerTest.java:50-91` (the `@InjectMocks
  IndexerChecker` harness), `IndexerWebAccessTest.java:25-68` (the `@Mock WebAccess` harness), and `ExternalToolsConfigTab.test.tsx:545`, which asserts a string the mock supplies, not one the backend builds. Then
  `tests/system/tests/external-tools.spec.ts:14` (`BROKEN_URL` is `${mockserverInternalUrl}/definitely-not-sonarr`, so the failing test is a real HTTP 404 with a body, not a refused connection) and `:436-450`, the viewport loop that already captures
  `external-tools-connection-failed-{desktop,mobile}`

## Acceptance

- `WebAccessException` gains `public String getShortMessage()` built exactly like `getMessage()` with the body element removed — `Stream.of(message-if-not-empty, "Code: " + code)`, empties filtered, joined with `". "`; `getMessage()` and `getBody()` stay
  byte-identical to today. Pinned in a new `WebAccessExceptionTest`: `new WebAccessException("Unauthorized", "{\"error\":\"nope\"}", 401)` gives `getMessage()` `Unauthorized. {"error":"nope"}. Code: 401` and `getShortMessage()` `Unauthorized. Code: 401`;
  `new WebAccessException("", "body", 404)` gives `Code: 404`; `new WebAccessException("No response available from tool")` gives `No response available from tool. Code: 0` — the `Code: 0` wart is preserved, not introduced.
- `ExternalToolsWeb.testSimpleConnection`: a `WebAccessException` yields `ConnectionTestResult` message `"Connection failed: " + e.getShortMessage()`; any other exception keeps `e.getMessage()`. Still HTTP 200 with `successful=false` — the
  `API-CONFIG-EXTERNAL-CONNECTION` contract is otherwise unchanged, and the success message stays the literal `Connection successful`.
- `ProwlarrConfigRetriever:47` composes `"Error accessing Prowlarr: " + e.getShortMessage()` and still passes the `WebAccessException` as the `IndexerAccessException` cause. Additive test: body `{"message":"API Key invalid"}` with message `Unauthorized`
  and code 401 produces exactly `Error accessing Prowlarr: Unauthorized. Code: 401`, containing neither `{` nor `API Key invalid`.
- `IndexerWebAccess:117` uses `getShortMessage()` when `e.getCause()` is a `WebAccessException` and `getMessage()` otherwise, and still passes `e.getCause()` unchanged as the cause — `IndexerChecker:481-482` reads `getBody()` off it. `:113-114`
  (unmarshalling) is untouched. Additive `IndexerWebAccessTest` case: `webAccess.callUrl` throws `new WebAccessException("Bad Request", "<error code=\"100\" description=\"Incorrect parameter\"/>", 400)`; the resulting `IndexerUnreachableException` message
  is exactly `Error while communicating with indexer <indexer name>. Server returned: Bad Request. Code: 400`, contains no `<`, and `getCause()` is that same instance.
- No caps-check regression: `IndexerChecker.singleCheckCaps` sets `notSupported` for a `WebAccessException` cause when `getBody()` contains either `function not available` or `incorrect parameter`, compared lowercased in the style line 482 already uses;
  line 484's `e.getMessage().contains("Incorrect parameter")` check stays for the parse-failure path. Additive `NewznabCheckerTest` case: a caps call failing with a `WebAccessException` cause whose body carries `Incorrect parameter` still returns a
  `SingleCheckCapsResponse` with `supported=false` rather than propagating — the case must fail if the body check is removed.
- `ExternalTools.handleXdarrError:368` becomes `messages.add(e.getShortMessage())` (the earlier `throw e` stays); the two earlier branches (`:357`, `:365`) are untouched, since they already compose a short `errorMessage` themselves. Additive
  `ExternalToolsTest` case: `webAccess.deleteToUrl` (or another call inside `addNzbhydraAsIndexer`'s try block) throws `new WebAccessException("Internal Server Error", "<html>...a long stack trace page...</html>", 500)` with a body that starts with
  neither `[` nor `{`; `getMessages()` ends with exactly `Internal Server Error. Code: 500`, containing neither `<html>` nor the stack trace text.
- `ExternalToolsSyncService.syncTools`'s catch block (`:87-90`) uses `e instanceof WebAccessException webAccessException ? webAccessException.getShortMessage() : e.getMessage()` for the `messages.add(...)` call only; `:89`'s `logger.error(...)` keeps
  `e.getMessage()` unchanged. New `ExternalToolsSyncServiceTest` (no prior test file for this class — build it from scratch with mocked `ExternalTools`/`ConfigProvider`/`NotificationHandler`) covers: `syncToTool` throwing a `WebAccessException` with a
  long JSON body produces a `SyncResult.messages` entry ending in `Code: N` with no `{` in it; a non-`WebAccessException` throw (e.g. a plain `IOException`) still reports its full `getMessage()` unchanged, proving the type check does not over-fire; the
  persisted notification body stays the existing generic count text (`createNotification`'s `messages` parameter is unused for body content, confirm this by asserting the notification event unchanged) — do not attempt to route `messages` into the
  notification body, ADR-0019's addendum does not ask for that.
- Screenshot strip (`../README.md` *Visual Gate*), no new capture code: rerunning `external-tools.spec.ts` regenerates `external-tools-connection-failed-{desktop,mobile}.png` at 1280x800 and 390x844, and the toast in each matches
  `/^Connection test failed: Connection failed: .*Code: 404$/` with no `{`, `<`, or newline in it. Quote the pre-fix and post-fix toast literal side by side in the handoff.
- `APIS.yaml`: `API-CONFIG-EXTERNAL-CONNECTION`'s note gains `ADR-0019 bounds the failure message to WebAccessException.getShortMessage() -- the response message plus "Code: N", never the response body.`; `API-CONFIG-EXTERNAL-SYNC` gains a `note` reading
  `ADR-0019 bounds a per-tool sync-failure entry in the messages list the same way; the persisted sync notification's own body is unaffected.`; `API-CONFIG-INDEXER-PROWLARR` gains a `note`
  reading `Its failure is HTTP 400 with ProwlarrConfigReadResponse.errorMessage. ADR-0019 bounds it to "Error accessing Prowlarr: " plus WebAccessException.getShortMessage() -- response message plus "Code: N", never the body.` No other record changes.

## Verification

- From repository root: `mvn -pl core -am test` succeeds; list every new test case and its result individually, and confirm `ProwlarrConfigRetrieverTest`'s existing `shouldThrowIndexerAccessExceptionOnWebAccessError` still passes untouched. Prove each new
  case fails without the source change: revert `WebAccessException.java`, `IndexerWebAccess.java`, `ProwlarrConfigRetriever.java`, `IndexerChecker.java`, `ExternalTools.java` (the one `handleXdarrError` hunk only), and `ExternalToolsSyncService.java` in
  turn and record which cases go red.
- In `core/ui-react`: `npm run validate:migration` succeeds; record that no `core/ui-react/src/**` file changed, which is why no other ui-react gate is required. From repository root:
  `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/external-tools.spec.ts` passes in full with the spec unmodified and regenerates the feature's evidence directory.
- Run `git diff --check`; confirm every changed file is in `Files Allowed To Modify` and no stray generated files remain.

## Handoff / Review

Use `../templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a new accessor on a shared exception plus six call-site swaps across four modules, one of which silently narrows a caps-detection heuristic whose evidence lives in response bodies rather than in the diff; two of the six sites
  need a type check first, and one of six test harnesses (`ExternalToolsSyncServiceTest`) must be built from scratch.
- Reviewer: `opus` — at least the implementer's tier, and required by the role rule for a shared-contract change: judging this means deciding whether the `getBody()` guard truly restores what the message change removed, which no diff shows.
- Fixer: `opus` — not dropped a tier: the likeliest real finding is the caps-check guard being wrong or absent, which is judgment work, not a literal to retype.

Implementer prompt: Start at ADR-0019 and its addendum, then read `IndexerChecker:474-487` before touching anything — line 484 is the trap, and it is the reason this is not six one-line edits.
Prove first, with a red test, that removing the body from `IndexerWebAccess:117`'s message breaks the `"Incorrect parameter"` caps detection; then close it through `getBody()`.
Second trap: `ExternalToolsWeb` and `ExternalToolsSyncService` both catch bare `Exception`, so a naive `getShortMessage()` call will not compile at either — branch on the type and leave the non-`WebAccessException` path alone. `handleXdarrError`'s `e` is
already typed `WebAccessException`, no branch needed there.
Third trap: `ExternalTools.java` is FM-070's write target everywhere except `handleXdarrError`'s one `else` branch — touching any other line (the `minimumSeeders`/`mapCategories` guards, the two earlier `handleXdarrError` branches) is a scope violation
even though the file is in the allowlist.
Reviewer prompt: Check hardest that `getMessage()` and `getBody()` are unchanged and that the cause chain out of `IndexerWebAccess:117` still carries the original `WebAccessException` instance.
Distrust a green `NewznabCheckerTest` case that would also pass without the body check, and distrust the screenshot claim unless the captured toast text is quoted next to its pre-fix form. Confirm the `ExternalTools.java` diff touches only line 368's
`else` branch, and that `ExternalToolsSyncServiceTest`'s notification-body assertion actually proves `createNotification`'s `messages` parameter stays unused for body content rather than merely not testing it.
