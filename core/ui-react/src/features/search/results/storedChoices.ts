// FM-111: the `hydra.search-results.table` persistence helpers, moved
// verbatim out of `SearchResults.tsx`. The stored payload, its key, and
// FM-109's shared `readItem` adoption are unchanged. `isRecord` lives here
// with its original consumer `loadChoices` rather than being copied into
// both files.
import type {SortingState} from "@tanstack/react-table";

import {readItem} from "../../../domain/storage/browserStorage";
import {
    readSection,
    userPreferences,
} from "../../../services/preferences/userPreferences";

// ADR-0057: the choices are the `searchResults` section of the user's
// preferences. This key is read once, to migrate this browser's payload.
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
    // FM-198 (ADR-0054): "Hide downloaded results", legacy's preference
    // (`search-results-controller.js:170,210,311` at `3ce28441e^`), which
    // defaulted *on* there; the owner asked for off (2026-09-19), as with
    // `showCovers`.
    hideDownloaded?: boolean;
    highlightRecent?: boolean;
    // FM-199 (ADR-0054): whether the per-indexer summary above the toolbar is
    // expanded -- legacy's `indexerStatusesExpanded`
    // (`search-results-controller.js:161,980-982` at `3ce28441e^`), which it
    // kept under its own storage key and defaulted *off*, as here.
    indexerSummaryOpen?: boolean;
    refineCategoryOpen?: boolean;
    refineIndexerOpen?: boolean;
    // FM-176 (ADR-0054): "Show duplicate expand controls", the opt-in that
    // gates the results rows' duplicate expand control. It joins the other
    // display options in this browser-local payload rather than becoming a
    // server-side per-user preference.
    showDuplicateControls?: boolean;
    // FM-200 (ADR-0054): the Display popover's "Columns" subsection -- whether
    // the results table renders its Category and Details columns. Owner
    // (2026-09-27): both shown by default, which is the table every earlier
    // payload was written under. Legacy had no such switch.
    showCategoryColumn?: boolean;
    showDetailsColumn?: boolean;
    // FM-177 (ADR-0054): "Show covers", the opt-in that gates the cover image
    // in a result's title cell. Legacy kept the same preference in browser
    // storage under its own `showCovers` key
    // (`search-results-controller.js:153`); here it joins the other display
    // options in this one payload.
    showCovers?: boolean;
    // FM-199 (ADR-0054): "Show indexer summary", whether the per-indexer
    // summary renders at all. Owner (2026-09-26): shown by default; legacy
    // had no such switch, its accordion always rendered.
    showIndexerSummary?: boolean;
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
    return choicesOf(readSection("searchResults", legacyChoices));
}

export function saveChoices(choices: StoredChoices): void {
    userPreferences().write("searchResults", choices);
}

function legacyChoices(): unknown {
    try {
        return JSON.parse(readItem(STORAGE_KEY) ?? "null") ?? undefined;
    } catch {
        return undefined;
    }
}

const BOOLEAN_CHOICES = [
    "compactRows",
    "expandGroupsByDefault",
    "groupEpisodes",
    "groupTitles",
    "groupTorrentAndUsenet",
    "hideDownloaded",
    "highlightRecent",
    "indexerSummaryOpen",
    "refineCategoryOpen",
    "refineIndexerOpen",
    "showCategoryColumn",
    "showCovers",
    "showDetailsColumn",
    "showDuplicateControls",
    "showIndexerSummary",
    "showZipButton",
    "sidebarCollapsed",
] as const satisfies readonly Exclude<keyof StoredChoices, "sorting">[];

/**
 * The stored payload, keeping only values of the right type: it may have been
 * written by another version of this UI or by hand. FM-178: refine filters
 * (`ResultFilters`, formerly the `filters` key here) reset on every new search
 * and are therefore never persisted; a `filters` key in a payload written by
 * an earlier build is dropped here like any other unknown key.
 */
function choicesOf(value: unknown): StoredChoices {
    if (!isRecord(value)) {
        return {};
    }
    const choices: StoredChoices = {};
    for (const key of BOOLEAN_CHOICES) {
        const choice = value[key];
        if (typeof choice === "boolean") {
            choices[key] = choice;
        }
    }
    if (
        Array.isArray(value.sorting) &&
        value.sorting.every(
            (sort: unknown) =>
                isRecord(sort) &&
                typeof sort.id === "string" &&
                typeof sort.desc === "boolean",
        )
    ) {
        choices.sorting = value.sorting as SortingState;
    }
    return choices;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
