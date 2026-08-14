# ADR-0005: Recent-History Complete Criteria Contract

Status: accepted

## Decision Question

Should recent-search history persist and return the age, size, and explicitly selected indexer criteria required for complete React refill and repeat?

## Context And Evidence

- `FM-017` requires complete supported-criteria refill and repeat and is blocked for a recent-history criteria contract.
- `API-HISTORY-RECENT-SEARCHES` is `POST /internalapi/history/searches/forsearching`, implemented by `HistoryWeb.searchHistoryForSearchPage`.
- The endpoint maps persisted `SearchEntity` records to `SearchEntityTO`; neither currently contains `minAge`, `maxAge`, `minSize`, `maxSize`, or selected indexers.
- The legacy recent-history mapping recognizes age and size fields when present, but the current persistence/response path does not retain them. FM-016 established canonical explicit indexer criteria that FM-017 must be able to restore.

## Options

### Option 1: Persist And Expose Complete Recent Criteria

- Persist `minAge`, `maxAge`, `minSize`, `maxSize`, and selected indexers with each search and expose them through `API-HISTORY-RECENT-SEARCHES`.
- Preserve compatibility for existing records that lack the values: refill/repeat uses default indexers and default age/size filters.
- Do not display age, size, or indexer values inline in the recent-search dropdown. Use hover tooltips only where existing dropdown tooltip conventions make that workable; otherwise hide them.

### Option 2: Retain The Existing Partial Recent-History Contract

- Avoids persistence and API-contract changes.
- Cannot provide complete criteria refill/repeat for age, size, or explicit indexer selection.

## Recommendation

Option 1, because FM-017 requires complete supported-criteria reuse and the current persisted DTO and endpoint omit the criteria needed to satisfy it.

## Human Decision

- Accepted Option 1: persist and expose `minAge`, `maxAge`, `minSize`, `maxSize`, and selected indexers through the existing recent-history endpoint.
- Existing records without these values must remain usable and refill/repeat with default indexers and default age/size filters.
- Do not show age, size, or indexer values inline in the recent-search dropdown. Use hover tooltips only if existing dropdown tooltip conventions make that workable; otherwise hide those values.

## Consequences

- The existing recent-history persistence and response contract must carry the selected criteria for newly recorded searches.
- Consumers must tolerate absent criteria for pre-existing entries and apply the specified defaults.
- The dropdown presentation must follow the specified non-inline visibility constraint.
- Implementation and verification remain for the task designer and the affected task owners; this ADR does not change task scope.

## Affected Work

- FM-017: Recent Search Reuse.
- API-HISTORY-RECENT-SEARCHES.
- FM-019 and FM-021 consume FM-017's shared criteria transformation and may need task-designer review after FM-017 is refined.

## Supersession

- Supersedes: `None`.
- Superseded by: `None` until a later ADR replaces this decision.
