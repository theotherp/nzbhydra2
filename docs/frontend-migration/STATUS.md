# Migration Status

Entries are ≤ 5 lines; details live in the task packets and git history. FM-001 through FM-065, FM-022, and FM-023 are done;
their packets were removed from `tasks/` during the 2026-08-19 governance compaction (FM-001–FM-053) or on completion
(FM-054, FM-055, FM-056, FM-057, FM-058, FM-059, FM-060, FM-061, FM-062, FM-063, FM-064, FM-065, FM-022, FM-023) (see
`DECISIONS.md` ADR-0014/0015 and git history).

FM-060 (Config Auth Tab) added a `RepeatSection` primitive to `C-CONFIG-FIELDS` for list-of-records editing (available to
FM-066). It also escalated, without fixing (outside its Java write scope), two pre-existing backend defects proposed as one
future backend packet: `ConfigWeb.setConfig()` returns unmasked secrets in its save response (affects every `@HiddenInUI`
field — Main's proxy credentials, Auth's user passwords, and later the Indexers/Downloading tabs' credentials), and
`SensitiveDataConfigValidator.findCorrespondingOldItem`'s positional fallback can swap two users' passwords when removing a
user shifts later rows (identical in legacy `repeatSection.html`, not fixable from the frontend).

FM-061 (Config Categories Tab) passed with minor findings, not corrected (optional): the size-preset row's legacy
"Size preset" label isn't rendered in the DOM (min/max inputs' own MUI labels stand in for it), and its two inputs lack
`aria-describedby` wiring to their help text, unlike other `C-CONFIG-FIELDS` controls. Candidates for a future quickfix.

FM-062 (Config Notifications Tab) reconstructed legacy's event-type table (`notifications-service.js`) into one module
whose completeness is asserted against the backend `NotificationEventType` enum source, and added a multiline text setting
and an optional add-from-a-menu mode to `C-CONFIG-FIELDS`. It passed with minor findings, not corrected (optional): the
`RepeatSection` menu button lacks `aria-expanded`/`aria-controls`/menu `id`, and the new test-id naming is inconsistent
between the test action and the unknown-event warning (both documented in `F-CONFIG-NOTIFICATIONS.selectors`). It also
surfaced two follow-up candidates, not yet packaged: a backend fix so `NotificationsWeb.NOTIFICATION_EVENTS` covers
`EXTERNAL_TOOL_CONFIGURATION` (the test-send endpoint 500s for that event type today), and a feature record for the
legacy-only live in-app notification channel (`hydra-checks-footer.js`, `/topic/notifications`) that consumes the settings
this tab now edits.

FM-063 (Config Searching Tab) reconstructed legacy's nine setting groups plus the custom-mapping list, whose entries are
edited entirely through a help-and-test modal dialog (clone-on-open, discard-on-cancel, commit-on-submit) rather than
legacy's mix of inline rows and a modal — a deliberate boundary decision, not an omission. It passed with minor findings,
not corrected (optional): a handoff arithmetic typo, a dropped `placeholder` on one numeric field, selectors recorded as
YAML comments rather than list entries for `F-CONFIG-SEARCHING`, and two undocumented-but-tested outcome improvements over
legacy (a distinct transport-failure message; quick-filter presets no longer include blank display names). Candidates for
a future quickfix.

FM-064 (Config Downloading Tab) established the modal-transaction pattern (`FM-065`/`FM-066` follow it): a downloader
dialog edits a clone over its own form, with a connection check (`API-DOWNLOAD-CHECK-CONNECTION`) that can veto or be
overridden on close, and only a resolved, still-current transaction commits into the whole-config form. A first review
found the dialog's Cancel/Reset/Delete stayed live during an in-flight check and the commit path used a stale closure, so
Cancel or Delete during a pending check could still write or resurrect an entry; a fix cycle blocked the dialog for the
check's duration and added a per-transaction token so a resolved check for a superseded transaction is discarded, with
new tests proving both reproductions are closed. Re-review passed clean. Non-blocking observations noted, not corrected
(optional): `gaps` is otherwise only used for unmigrated capability, not documented deviations, so the two entries added
here (no legacy auto-select of the primary downloader on view; no name-sort of the downloader list) read atypically —
worth a distinct registry key if this pattern recurs; the connection-failure dialog's long backend reason text clips on
mobile (a `C-DIALOG-SERVICE` wrapping issue, outside this packet's files). Candidates for a future quickfix.

FM-065 (Config External Tools Tab) followed FM-064's modal-transaction pattern for Sonarr/Radarr/Lidarr/Readarr entries,
whose submit tests the connection and then writes NZBHydra's settings into the *arr instance, closing only on a truthy
configure response. It re-pointed the suite's only real-backend config system test (`external-tools.spec.ts`) at React
without losing an assertion, verified line-by-line against the legacy spec. `API-CONFIG-EXTERNAL-DIALOG` and
`API-CONFIG-EXTERNAL-MESSAGES`'s dead "Configure NZBHydra in ..." wizard path was correctly left unmigrated (`target:
null`). Passed clean on first review. Non-blocking observations noted, not corrected (optional): `C-TOAST-SERVICE`'s
`Snackbar` overlaps `DialogActions` on a long connection-failure message, leaving Cancel/Submit unclickable and the toast
itself unreachable for its duration (a `C-TOAST-SERVICE` issue, outside this packet's files, worth prioritizing since it
blocks real dialog actions); verbose backend connection-test failure text; `connectionSettingsChanged` compares current
vs. initial values rather than legacy's change-event tracking (undocumented deviation, arguably better, worth a
`F-CONFIG-EXTERNAL-TOOLS.gaps` line). Candidates for a future quickfix.

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-066 (Indexers list and edit modal) — depends only on the `C-CONFIG-FIELDS`/`C-SECRET-INPUT` vocabulary FM-059
  shipped, so it is ready to promote; it can also follow FM-064's and FM-065's modal-transaction shape. FM-067 (bulk caps
  recheck and Jackett/Prowlarr import) still needs FM-066.
- FM-068 (Config secret round trip) — backend-only, no dependencies, ready to promote whenever a Java slot is free. It packages
  the two `@HiddenInUI` marker defects FM-060 escalated: `ConfigWeb.setConfig()`'s unmasked save response (re-confirmed for
  downloader credentials by FM-064) and `SensitiveDataConfigValidator.findCorrespondingOldItem`'s positional credential swap on
  list removal.
- FM-069 (Web mapper primitive leniency) — backend-only, no dependencies, ready to promote. It implements ADR-0018 for
  FM-064's third escalation: `WebConfiguration`'s web mapper gets the `FAIL_ON_NULL_FOR_PRIMITIVES` leniency `Jackson.java`
  already sets, so a body omitting a primitive (`DownloaderConfig.enabled`/`addPaused`) stops being rejected with HTTP 400.
  Its blast-radius inventory covers every creator-bound request body with primitives, and is expected to surface one
  follow-up candidate: `HistoryRequest`'s `page = 1`/`limit = 100` initializers never apply to a creator-bound body.

- FM-070 (External-tool numeric input guards) — no dependencies, ready to promote. It packages the second backend defect
  FM-065 escalated: `ExternalTools:266` parses `minimumSeeders` with a null-only guard, so a cleared field (reachable from
  the dialog and from any saved entry's automatic sync) throws a `NumberFormatException` that the module's blanket catch
  turns into an unattributed refusal; `mapCategories:327-332` has the same defect for a spaced or non-numeric category ID.
  It adds the matching client-side validators so the admin is told which field is wrong.

- FM-071 (Bounded WebAccessException message) — backend-only, no dependencies, ready to promote. It implements ADR-0019 for
  FM-065's first escalation: `WebAccessException` gains a short-form accessor (response message plus `Code: N`, no body) and
  the four boundaries the ADR names switch to it, while `getMessage()`/`getBody()` keep their current content for logs and
  body-inspecting callers. It also guards the one behaviour this narrowing would otherwise break — `IndexerChecker`'s
  `"Incorrect parameter"` caps heuristic, which reads that string out of the message today. Per ADR-0019's addendum, folded
  in on the owner's request: `ExternalTools.handleXdarrError`'s fallback branch and `ExternalToolsSyncService`'s per-tool
  sync-failure message (both leak the same body into `POST .../syncAll`'s JSON `messages` list; the persisted notification's
  own body is the generic count text and is unaffected). The `ExternalTools.java` touch is a narrow, disclosed exception to
  FM-070's otherwise-exclusive ownership of that file — one `else` branch only, no overlap with FM-070's guards.

Not yet packaged: a backend fix for `NotificationsWeb.NOTIFICATION_EVENTS` missing `EXTERNAL_TOOL_CONFIGURATION`, and a
feature record for the legacy-only live in-app notification channel (both surfaced by FM-062; see above).

Planned but not next: FM-024 (Statistics Dashboard).

FM-033 (Durable Visual Evidence Output) was retired unrun on 2026-08-19: its evidence-relocation outcome had already shipped
ad-hoc in `5c36a7a14`, ADR-0014 removed the `FEATURES.yaml` visual machinery it was anchored to, and its one undelivered
criterion — the containment regression guard — landed as a quickfix (`12b615863`, see `MAINTENANCE.md`).
