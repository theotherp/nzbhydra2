// FM-111: the `hydra.search-results.table` persistence helpers, moved
// verbatim out of `SearchResults.tsx`. The stored payload, its key, and
// FM-109's shared `readItem` adoption are unchanged. `isRecord` lives here
// with its original consumer `loadChoices` rather than being copied into
// both files.
import type {SortingState} from "@tanstack/react-table";

import {readItem} from "../../../domain/storage/browserStorage";

export const STORAGE_KEY = "hydra.search-results.table";

export type StoredChoices = {
    compactRows?: boolean;
    highlightRecent?: boolean;
    refineCategoryOpen?: boolean;
    refineIndexerOpen?: boolean;
    // FM-176 (ADR-0054): "Show duplicate expand controls", the opt-in that
    // gates the results rows' duplicate expand control. It joins the other
    // display options in this browser-local payload rather than becoming a
    // server-side per-user preference.
    showDuplicateControls?: boolean;
    // FM-177 (ADR-0054): "Show covers", the opt-in that gates the cover image
    // in a result's title cell. Legacy kept the same preference in browser
    // storage under its own `showCovers` key
    // (`search-results-controller.js:153`); here it joins the other display
    // options in this one payload.
    showCovers?: boolean;
    sidebarCollapsed?: boolean;
    sorting?: SortingState;
};

export function loadChoices(): StoredChoices {
    try {
        const value: unknown = JSON.parse(readItem(STORAGE_KEY) ?? "null");
        if (!isRecord(value)) {
            return {};
        }
        // FM-178: refine filters (`ResultFilters`, formerly the `filters`
        // key here) reset on every new search and are therefore never
        // persisted; a `filters` key in a payload written by an earlier
        // build is simply not part of `StoredChoices` any more and is
        // ignored by every reader, same as any other unknown key.
        return value as StoredChoices;
    } catch {
        return {};
    }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
