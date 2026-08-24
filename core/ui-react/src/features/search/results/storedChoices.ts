// FM-111: the `hydra.search-results.table` persistence helpers, moved
// verbatim out of `SearchResults.tsx`. The stored payload, its key, and
// FM-109's shared `readItem` adoption are unchanged. `isRecord` lives here
// with its original consumer `loadChoices` rather than being copied into
// both files.
import type {SortingState} from "@tanstack/react-table";

import {readItem} from "../../../domain/storage/browserStorage";
import type {ResultFilters} from "./resultTable";

export const STORAGE_KEY = "hydra.search-results.table";

// The refine filters whose selection is scoped to the results of one single
// search and therefore never persisted and never carried into the next
// search. All three default to "every value the current results actually
// contain" (see `defaultFilters`, and `RefineSidebar`'s `downloadTypeOptions`
// for the chip group those values are offered through), so a selection made
// in one search is meaningless in the next one: it silently hides every
// result from an indexer, category, or download type the earlier search
// happened not to return -- and a value that no longer occurs at all is not
// even listed in the sidebar, so the user cannot re-enable it. Every other
// refine filter (title, ranges, quick filters) is a value the user typed or
// picked independently of the result set and stays persisted.
type SearchScopedFilter = "categories" | "downloadTypes" | "indexers";

export type StoredChoices = {
    compactRows?: boolean;
    filters?: Partial<Omit<ResultFilters, SearchScopedFilter>>;
    highlightRecent?: boolean;
    refineCategoryOpen?: boolean;
    refineIndexerOpen?: boolean;
    sidebarCollapsed?: boolean;
    sorting?: SortingState;
};

export function loadChoices(): StoredChoices {
    try {
        const value: unknown = JSON.parse(readItem(STORAGE_KEY) ?? "null");
        if (!isRecord(value)) {
            return {};
        }
        const stored = value as StoredChoices;
        // Payloads written before `SearchScopedFilter` covered a key (and
        // hand-edited ones) can still carry a selection for it; drop them
        // here rather than at every read site.
        return stored.filters
            ? {...stored, filters: withoutSearchScopedFilters(stored.filters)}
            : stored;
    } catch {
        return {};
    }
}

// The persistable part of a filter set: everything except the selections
// scoped to one search's own results. See `SearchScopedFilter`.
export function withoutSearchScopedFilters(
    filters: Partial<ResultFilters>,
): Partial<Omit<ResultFilters, SearchScopedFilter>> {
    const rest = {...filters};
    delete rest.categories;
    delete rest.downloadTypes;
    delete rest.indexers;
    return rest;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
