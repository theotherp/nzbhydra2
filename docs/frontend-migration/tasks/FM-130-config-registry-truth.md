# FM-130: Config Registry Truth

Status: planned Owner:
Feature IDs: F-CONFIG-MAIN, F-CONFIG-AUTH, F-CONFIG-SHELL, F-CONFIG-SEARCHING
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: FM-131

## Outcome

Four shipped facts a future reader would otherwise miss or "fix" are recorded where parity readers look. Registry-only —
no code behavior changes. (1) The label-derived testid convention is declared: `config-fieldset-<label lowercased
verbatim>` keeps spaces and punctuation (`config-fieldset-external tools`, `config-fieldset-media ids / query generation /
query processing`). The 2026-08-20 ledger candidate presumed a slugified rename; the 2026-08-29 evidence check found the
space form entrenched, working, and already contractual — 12 shipped multi-word labels, literal assertions
(`config-searching.spec.ts:61`, `config-auth.spec.ts:473`, `AuthConfigTab.test.tsx:189`,
`SearchingConfigTab.test.tsx:165-179`), and recorded selectors (`FEATURES.yaml:590,800-801`; prose at `:613`) — so the
defect is the undocumented rule, not the ids. (2) Likewise `config-input-<path>` placement: seven text-like controls put it
on the native input via `slotProps.htmlInput`; `SelectSetting.tsx:48`, `MultiSelectSetting.tsx:71`, `SwitchSetting.tsx:38`
put it on the MUI root — declared intended, because shipped tests *exploit* root placement
(`IndexersConfigTab.test.tsx:421` `toHaveTextContent`; the `within(...).getByRole("combobox")` drill at `:440,679`;
`config-indexers.spec.ts:457` bounding boxes). (3) `F-CONFIG-SHELL.gaps` is `[]` although FM-097 deliberately dropped
legacy's pristine/dirty save-colour switch. (4) FM-105's username-uniqueness refusal lives only in a handoff.

## Decision Dependencies

None (ADR-0014 context only). The declare-don't-rename direction rests on `README.md` *Registries* ("existing
`data-testid` values are compatibility contracts") plus the entrenchment evidence above; if the owner wants the rename
instead, stop and say so — that is a different, much larger packet.

## Files Allowed To Modify

- `docs/frontend-migration/COMPONENTS.yaml`, `docs/frontend-migration/FEATURES.yaml`
- `core/ui-react/src/features/config/components/settings.ts` — doc comments only, zero code diff
- This task packet

## Out Of Scope

- Renaming or relocating any testid; any behavior change; any test change
- `CustomMappingsSection` disclosure and the `C-CONFIG-FIELDS` boundary sentence at `COMPONENTS.yaml:374` (FM-131 owns it)
- The `F-PLATFORM-LIVE-STATUS` / history-table records (FM-127/FM-126 own those)

## Context To Read

`settings.ts:61-64,72-74`; `ConfigFieldset.tsx:159-161,199`; `COMPONENTS.yaml:352-406` (`C-CONFIG-FIELDS`, esp. 356-359);
`FEATURES.yaml`: `F-CONFIG-MAIN:501-536`, `F-CONFIG-AUTH:537-594`, `F-CONFIG-SHELL:411-486` (nav-anchor note 477-484),
`F-CONFIG-SEARCHING:595-630`; gap-entry format exemplars at `FEATURES.yaml:31,94,137`; `ConfigSaveBar.tsx` (FM-097's
site justification) and `C-CONFIG-FORM` in `COMPONENTS.yaml`; `UserAuthConfigValidator.java:73-82`;
`reviewChangesDiff.ts:250-278`; `STATUS.md`'s FM-097/FM-105 entries.

## Acceptance

- `C-CONFIG-FIELDS.responsibility` states the label-derived rule — lowercased verbatim, spaces/punctuation preserved,
  shared suffix across `config-fieldset-`, `config-advanced-expander-`, `config-fieldset-tooltip-` (and, with its distinct
  prefix, `config-nav-anchor-`) — and names it deliberate, citing ADR-less entrenchment briefly (one sentence, no essay).
- `C-CONFIG-FIELDS.responsibility` states the `config-input-<path>` placement rule (native input for text-like kinds; MUI
  root for Select/MultiSelect/Switch) and the sanctioned drill-in usage; `F-CONFIG-MAIN`'s selectors prose (501-534) stays
  consistent with it. `settings.ts:61-64`'s doc comment gains the same one-line rule.
- `F-CONFIG-SHELL.gaps` gains one `deliberate - ...` entry: FM-097 replaced legacy `config.html:21`'s pristine/dirty
  save-button colour with the save bar's worded summary and dirty-only Discard button (satisfying ADR-0014's
  colour-never-sole-carrier rule), justified at the `ConfigSaveBar.tsx` site and in `C-CONFIG-FORM`.
- `F-CONFIG-AUTH` records FM-105's refusal of duplicate usernames: why (`findCorrespondingOldUserConfig`'s
  `String.equals`+`findFirst` hands both rows the same stored record, so an `***UNCHANGED***` marker can resolve to the
  other user's hash; `reviewChangesDiff.ts:268-278` independently degrades duplicate-keyed lists to positional) and the
  consequence that a config seeded with duplicate usernames outside the UI is unsaveable from the dialog until renamed.
- No rendering change, no strip; `git diff` touches only the two YAML files, `settings.ts` comments, and this packet.

## Verification

- `core/ui-react`: `npm run validate:migration` passes; `npm run typecheck && npm test -- --run` pass (proves the comment-only claim)
- Root: `git diff --stat` shows only allowlisted files; `git diff core/ui-react/src` contains no non-comment line; `git diff --check` clean

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — the acceptance settles every open question; the work is precise registry prose.
- Reviewer: `opus` — this *declares* a shared selector contract; the reviewer must independently confirm the entrenchment
  evidence still holds at head and that no recorded sentence contradicts a shipped behavior.
- Fixer: `sonnet` — wording-level corrections.

Implementer prompt: Start from `COMPONENTS.yaml:352-406` and the four `FEATURES.yaml` records. The trap: registry prose
that restates file paths or line numbers that will rot — record rules and IDs, cite code by symbol. Verify the
`config-input-` placement table against head before writing it down; FM-126/127 may have landed ahead of you.
Reviewer prompt: Check hardest that every declared rule matches a grep of head, not the packet's snapshot. Distrust the
packet's line numbers; re-derive them.
