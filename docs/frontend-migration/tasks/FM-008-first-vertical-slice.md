# FM-008: First Vertical Slice

Status: done Owner: OpenCode
Feature IDs: F-SYSTEM-NEWS Component IDs: C-APP-SHELL, C-API-TRANSPORT, C-SAFE-RICH-CONTENT API IDs: API-NEWS-LIST Depends on: FM-001, FM-004, FM-005, FM-006, FM-007 Blocks: FM-009

## Outcome

Migrate the admin-protected canonical `/system/news` route and its read-only `GET /internalapi/news` data through routing, typed shared transport, safe presentation, tests, and React/legacy comparison.

Selection basis: FM-004 through FM-007 delivered the shell selector, role-preserving canonical mappings, transport, UI/loading foundation, and generated types. `F-SYSTEM-NEWS`, `API-NEWS-LIST`, the legacy directive/template, `NewsWeb`, `NewsEntryForWeb`, and `NewsTest` prove this bounded list route and response; the existing `C-SAFE-RICH-CONTENT` decision governs its server-authored HTML.

## Files Allowed To Modify

- `core/ui-react/package.json`
- `core/ui-react/package-lock.json`
- `core/ui-react/src/main.tsx`
- `core/ui-react/src/App.tsx`
- `core/ui-react/src/App.test.tsx`
- `core/ui-react/src/router.tsx`
- `core/ui-react/src/router.test.tsx`
- `core/ui-react/src/api/news.ts`
- `core/ui-react/src/api/news.test.ts`
- `core/ui-react/src/features/system/news/**`
- `core/ui-react/src/components/content/**`
- `tests/system/tests/news.spec.ts`
- The `F-SYSTEM-NEWS`, `C-SAFE-RICH-CONTENT`, and `API-NEWS-LIST` records only in their existing registries
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Search, configuration, statistics, About, update/news acknowledgement, user-news, or other System routes
- Changes to Spring mappings, Java/OpenAPI contracts, generated API types, the shared transport, or existing shell/navigation
- A general rich-text API: `C-SAFE-RICH-CONTENT` is limited here to sanitized server-authored news HTML and must not recreate AngularJS `unsafe` trust behavior
- Opportunistic migration of neighboring routes or shared abstractions beyond the named component

## Context To Read

- `CONTEXT.md`; all accepted ADRs; FM-001, FM-004, FM-005, FM-006, and FM-007 handoffs
- `F-SYSTEM-NEWS`, `F-SYSTEM-SHELL`, `C-APP-SHELL`, `C-API-TRANSPORT`, `C-SAFE-RICH-CONTENT`, and `API-NEWS-LIST`
- `core/ui-src/js/nzbhydra.js` (`root.system.news`), `core/ui-src/js/system-controller.js`, `core/ui-src/js/directives/hydra-news.js`, `core/ui-src/html/states/system.html`, and `core/ui-src/html/directives/news.html`
- `core/src/main/java/org/nzbhydra/news/NewsWeb.java`, `shared/mapping/src/main/java/org/nzbhydra/news/NewsEntryForWeb.java`, `tests/system/src/test/java/org/nzbhydra/NewsTest.java`, and the generated `NewsEntryForWeb` type
- Existing React bootstrap, App, shell, transport, generated-type, and test conventions; `tests/system/tests/shell-selector.spec.ts`

## Acceptance

- TanStack Router recognizes canonical base-aware `/system/news`; all other routes retain the FM-004 migration placeholder and legacy-switch behavior.
- Spring's existing admin protection remains unchanged, and the page fetches only `API-NEWS-LIST` through `C-API-TRANSPORT` using generated response types and TanStack Query.
- Loading uses the FM-006 convention; an empty response, successful entries, malformed data, and request failure each have intentional accessible rendering.
- Success rendering preserves entry order, version text, `(This version)` and `(Newer version)` markers, and the legacy `No news yet ;-)` empty message.
- Server-authored news HTML is sanitized before rendering; executable content, inline event handlers, and unsafe URL schemes cannot survive. No unrestricted HTML-trust helper is introduced.
- Focused component tests cover loading, empty, success, error, malformed data, markers, and sanitization. Playwright compares a deterministic mocked payload in legacy and React shells at `/system/news`, proves no horizontal overflow at desktop and 390 px widths, and keyboard-activates a safe link from the mocked news content.
- Only the named registry records change; they identify FM-008 ownership, concrete target/test evidence, and achieved parity/contract state without claiming acknowledgement behavior.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration`.
- From the repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/news.spec.ts`; the spec must exercise both shells at the canonical route with deterministic network data and must not depend on the external news service.
- From the repository root: `git diff --check` and `git status --short`; inspect every changed/generated path and confirm it is listed under Files Allowed To Modify. Any unexpected generated file or change fails scope verification.
- No backend test is required because backend/API-contract changes are prohibited; report rather than broaden scope if the existing contract proves insufficient.

## Handoff

### Outcome

- Added the base-aware React `/system/news` route using TanStack Router, Query, generated news response types, and `C-API-TRANSPORT`; all other paths retain the legacy-switch placeholder.
- The page renders accessible loading, empty, success, request-failure, and malformed-data states. Server-authored news HTML is narrowly sanitized before rendering.

### Files Modified

- React router/providers, news API/page/content tests, `tests/system/tests/news.spec.ts`, and the named registry records.
- Scope confirmation: all task-owned paths are listed in `Files Allowed To Modify`; pre-existing `.opencode/**` modifications were not touched.

### Toolchain

- Node: `v26.6.0`; package manager: `npm 11.18.0`; other material tools: Maven `3.9.16`, Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 12 files / 28 tests; lint reports a non-failing router Fast Refresh warning and build reports Vite's non-failing chunk-size warning. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/news.spec.ts` | Passed: 1 Playwright test exercises deterministic mocked news in both shells, desktop/390 px overflow checks, and keyboard link activation. |
| repository root | `git diff --check` | Passed. |
| IntelliJ | focused React files build | Passed with no problems. |

### Dependency Decisions

- Runtime: TanStack Router/Query and DOMPurify were added for the route, server state, and safe HTML boundary. Development: none.

### Assumptions

- Spring continues to enforce the canonical route's admin protection; the read-only API remains `ROLE_USER` as implemented by `NewsWeb`.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-SYSTEM-NEWS`, `C-SAFE-RICH-CONTENT`, and `API-NEWS-LIST` now identify FM-008 ownership, target/test evidence, and validated generated fields. Acknowledgement behavior remains out of scope.

### Follow-Up Work

- None.
