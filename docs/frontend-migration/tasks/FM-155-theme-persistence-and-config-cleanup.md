# FM-155: Per-User Theme Persistence And Config Dropdown Removal

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL, F-CONFIG-MAIN
Component IDs: C-THEME-PREFERENCE, C-SERVER-PREFERENCES, C-BROWSER-STORAGE, C-CONFIG-SETTINGS-INDEX
API IDs: API-PREFERENCES-GET, API-PREFERENCES-PUT
Depends on: FM-154
Blocks: None

## Outcome

ADR-0049's persistence half: FM-154's in-session theme choice becomes durable per user through a typed theme-preference
service (`C-THEME-PREFERENCE`, registry record already added as `planned`) over `C-SERVER-PREFERENCES`
(`internalapi/genericstorage/{key}?forUser=true`), loaded at startup with a localStorage seed to minimize the wrong-theme
flash, and the now-redundant `main.theme` dropdown leaves the config UI. One packet: the selector, the service, and the
dropdown removal only make sense as one durable capability.

## Decision Dependencies

ADR-0049.

## Files Allowed To Modify

- core/ui-react/src/services/theme/** (new service + tests); core/ui-react/src/app/* theme-preference wiring from FM-154
- core/ui-react/src/features/config/main/{MainConfigTab.tsx,MainConfigTab.test.tsx,mainSettings.ts}
- core/ui-react/src/features/config/settingsSearch/{settingsIndex.ts,settingsIndexDrift.test.tsx}
- core/ui-react/src/features/config/components/configFields.test.tsx (re-point its `main.theme`/`THEME_OPTIONS` fixtures)
- tests/system/tests/{config-main.spec.ts,smoke.spec.ts} (persistence round trip; dropdown-absence assertions)
- This task packet, docs/frontend-migration/FEATURES.yaml, COMPONENTS.yaml, APIS.yaml (linked records only)

## Out Of Scope

- Any Java change: `MainConfig.theme` stays untouched (ADR-0049). The optional one-time migration of an existing
  `main.theme` value is deliberately NOT built — safe config does not expose `main.theme` and a full config read is
  admin-only, so no uniform per-user seed exists; record this as a `deliberate -` F-CONFIG-MAIN gap naming ADR-0049.
- Do not run concurrently with FM-151 (`settingsIndexDrift.test.tsx` mounts every config tab).

## Context To Read

- `services/preferences/serverPreferences.ts` and APIS.yaml's API-PREFERENCES-GET/PUT notes (client writes read back as JSON
  strings; `GenericStorageWeb.put` stores the body String JSON-encoded)
- FM-154's theme-preference context; C-BROWSER-STORAGE's thin-guard contract (`domain/storage/browserStorage.ts`)
- `MainConfigTab.tsx:180-185`, `mainSettings.ts:17-23` (THEME_OPTIONS), `settingsIndex.ts:199`, `MainConfigTab.test.tsx:37`,
  `configFields.test.tsx:162-174,437`

## Acceptance

- The typed service exposes read/write of `ThemePreference` for the current user (`forUser=true` always), on one storage key
  it names as an exported constant (recorded in C-THEME-PREFERENCE's note). Read validates untrusted data: it accepts the
  value both bare and JSON-string-encoded (`bright` and `"bright"`), returns `undefined` for anything else (garbage, unknown
  names, legacy `main.theme`-style values it doesn't know), and never throws to the caller.
- Startup: the provider seeds synchronously from a C-BROWSER-STORAGE-guarded localStorage cache of the last applied
  preference (validated the same way), then the server value wins when it arrives; with neither, the default `grey`/FM-154
  behavior stands. Selecting a theme applies immediately, writes the server preference, and updates the cache; a failed
  write leaves the applied theme in place and surfaces no crash (toast optional). Both proven by unit tests including the
  malformed-stored-value cases.
- The Theme dropdown is gone: `MainConfigTab.tsx:180-185` block, `THEME_OPTIONS`, and the `main.theme` settings-index entry
  removed; `settingsIndexDrift.test.tsx`, `MainConfigTab.test.tsx`, and `configFields.test.tsx` updated (the latter keeps
  its SelectSetting coverage on a surviving field/options set); settings search no longer finds "Theme".
- A real-backend test proves the round trip: select a non-default theme, reload, the theme is still applied — and restores
  the default afterward so the shared instance is not left re-themed (FM-124's restoration discipline).
- Registries: C-THEME-PREFERENCE flips to `done` (consumers listed); API-PREFERENCES-GET/PUT notes gain the new consumer;
  F-CONFIG-MAIN drops the Theme field from its inventory and gains the gap line above; F-PLATFORM-SHELL notes persistence.
- Screenshot strip (Visual Gate): 1280x800 config Main UI fieldset without the dropdown, and the reloaded page in the
  persisted non-default theme.

## Verification

- core/ui-react: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run knip`,
  `npm run validate:migration`, `npm run validate:focus-affordances` — all green
- tests/system: `npx playwright test tests/config-main.spec.ts tests/config.spec.ts tests/smoke.spec.ts` against a real
  backend — green
- Confirm changed files match `Files Allowed To Modify`

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks `review`; a fresh reviewer fills `../templates/review.md`; only the
coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a new persisted per-user contract, boundary validation of untrusted stored data, and a multi-file
  config-UI removal with a drift-guarded index.
- Reviewer: `opus` — at least the implementer's tier (new shared service and persisted contract).
- Fixer: `opus` — validation/persistence findings are rarely mechanical.

Implementer prompt: Start at APIS.yaml's API-PREFERENCES-PUT note — the endpoint stores your body String JSON-encoded, so
what you PUT is not what you GET; write the read-normalization test first, before the provider wiring. The other trap:
`settingsIndexDrift.test.tsx` fails on any index/tab mismatch — remove the index entry and the field in the same commit.
Reviewer prompt: Distrust the flash-minimization claim without the seed path exercised in a test; check the real-backend spec
actually restores the default theme in teardown, and that settings search for "Theme" is asserted absent, not just unindexed.
