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
    // Owner (2026-09-18): "Expand groups by default", legacy's
    // `expandGroupsByDefault` (`search-results-controller.js:199,289`), which
    // defaulted *off* there and here. It seeds title-group expansion only;
    // duplicates keep their own control and start collapsed either way, as
    // they did in legacy (`directives/search-result.js:23`).
    expandGroupsByDefault?: boolean;
    // FM-189 (ADR-0054): "Group TV episodes", legacy's `groupEpisodes`
    // (`search-results-controller.js`), which defaulted *on* there and here.
    groupEpisodes?: boolean;
    // FM-189 (ADR-0054): "Group torrent and Usenet results", legacy's
    // `groupTorrentAndNewznabResults`, which defaulted *off* there and here.
    groupTorrentAndUsenet?: boolean;
    // Owner (2026-09-18): "Group same titles", which gates the title grouping
    // that was unconditional before. Defaults *on*, so an existing stored
    // payload without the key keeps the grouping it had.
    groupTitles?: boolean;
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
    // FM-197 (ADR-0054): "Show button to download results as ZIP", legacy's
    // preference (`search-results-controller.js:171,317-320` at
    // `3ce28441e^`), which defaulted *on* there and here. Offered only while
    // `downloadSettings().zip` (proxied downloads) holds; the stored value
    // survives while the option is hidden.
    showZipButton?: boolean;
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
