# Migration Status

Entries are ≤ 5 lines; details live in the task packets and git history. FM-001 through FM-059, FM-022, and FM-023 are done;
their packets were removed from `tasks/` during the 2026-08-19 governance compaction (FM-001–FM-053) or on completion
(FM-054, FM-055, FM-056, FM-057, FM-058, FM-059, FM-022, FM-023) (see `DECISIONS.md` ADR-0014/0015 and git history).

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-060 (Auth), FM-061 (Categories), FM-062 (Notifications), FM-063 (Searching), FM-064 (Downloading), FM-065 (External
  Tools), FM-066 (Indexers list and edit modal) — each now depends only on the `C-CONFIG-FIELDS`/`C-SECRET-INPUT` vocabulary
  FM-059 shipped, so each is independently ready to promote. FM-067 (bulk caps recheck and Jackett/Prowlarr import) still
  needs FM-066.

Planned but not next: FM-024 (Statistics Dashboard).

FM-033 (Durable Visual Evidence Output) was retired unrun on 2026-08-19: its evidence-relocation outcome had already shipped
ad-hoc in `5c36a7a14`, ADR-0014 removed the `FEATURES.yaml` visual machinery it was anchored to, and its one undelivered
criterion — the containment regression guard — landed as a quickfix (`12b615863`, see `MAINTENANCE.md`).
