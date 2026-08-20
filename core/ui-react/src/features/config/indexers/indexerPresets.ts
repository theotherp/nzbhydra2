import type {IndexerValues} from "../../../api/config/indexers";

/**
 * `F-CONFIG-INDEXERS`' add presets, verbatim from
 * `IndexerConfigSelectionBoxInstanceController` (`formly-indexers.js:807-1151`).
 *
 * They are data, not JSX, so the parity comparison against legacy is a
 * comparison of values. Each preset seeds a *new* entry with exactly its own
 * keys on top of `newIndexerDraft`'s base — nothing else, because a key legacy
 * leaves absent (notably `supportedSearchIds`/`supportedSearchTypes`) is what
 * makes the close sequence run the capability check.
 */
export type IndexerPreset = {
    /** The menu/button label, which is also the seeded `name` when it has one. */
    label: string;
    /**
     * Extra prose legacy shows in a panel at the top of the edit box
     * (`indexer-config-box.html`, `model.info`). Legacy authors it as an HTML
     * fragment piped through `unsafe`; the lines are modeled as text here so no
     * preset string is ever interpreted as markup.
     */
    info?: readonly string[];
    seed: IndexerValues;
    /** Stable `data-testid` suffix, derived from the label. */
    slug: string;
};

/**
 * `createIndexerModel` (`formly-indexers.js:807-836`): the base every new entry
 * starts from, before a preset is merged over it.
 *
 * `supportedSearchIds` and `supportedSearchTypes` are deliberately **absent**
 * rather than empty arrays — `checkCapsWhenClosing` runs the capability check
 * exactly when either is `undefined`, so a preset that already knows its
 * capabilities (Binsearch, NZBIndex, ...) declares them and skips the check,
 * while a plain newznab or torznab entry does not and is checked.
 */
export function baseIndexerDraft(): IndexerValues {
    return {
        allCapsChecked: false,
        apiKey: null,
        backend: "NEWZNAB",
        color: null,
        configComplete: false,
        categoryMapping: null,
        downloadLimit: null,
        enabledCategories: [],
        enabledForSearchSource: "BOTH",
        generalMinSize: null,
        hitLimit: null,
        hitLimitResetTime: 0,
        host: null,
        loadLimitOnRandom: null,
        name: null,
        password: null,
        preselect: true,
        score: 0,
        searchModuleType: "NEWZNAB",
        showOnSearch: true,
        state: "ENABLED",
        timeout: null,
        username: null,
        userAgent: null,
    };
}

/** `addEntry` (`formly-indexers.js:838-856`): the base extended by the preset. */
export function newIndexerDraft(preset?: IndexerPreset): IndexerValues {
    return {...baseIndexerDraft(), ...(preset?.seed ?? {})};
}

function slugOf(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function hostPreset(label: string, host: string): IndexerPreset {
    return {label, seed: {name: label, host}, slug: slugOf(label)};
}

/**
 * A preset that carries a full, already-checked configuration for one of the
 * special (non-newznab) search modules. `allCapsChecked`/`configComplete` are
 * `true` and the two capability lists are empty *arrays*, which is what stops
 * the close sequence from checking capabilities these modules do not have.
 */
function specialPreset(
    label: string,
    searchModuleType: string,
    host: string | null,
    extra: IndexerValues = {},
): IndexerPreset {
    return {
        label,
        slug: slugOf(label),
        seed: {
            allCapsChecked: true,
            enabledForSearchSource: "INTERNAL",
            categories: [],
            configComplete: true,
            downloadLimit: null,
            hitLimit: null,
            hitLimitResetTime: null,
            host,
            loadLimitOnRandom: null,
            name: label,
            password: null,
            preselect: true,
            score: 0,
            showOnSearch: true,
            state: "ENABLED",
            supportedSearchIds: [],
            supportedSearchTypes: [],
            timeout: null,
            searchModuleType,
            username: null,
            ...extra,
        },
    };
}

function byLabel(left: IndexerPreset, right: IndexerPreset): number {
    return left.label.toLowerCase() < right.label.toLowerCase() ? -1 : 1;
}

/**
 * `$scope.newznabPresets`, sorted by lower-cased name exactly as legacy sorts
 * it (`formly-indexers.js:1101-1103`).
 */
export const NEWZNAB_PRESETS: readonly IndexerPreset[] = [
    hostPreset("abNZB", "https://abnzb.com/"),
    hostPreset("altHUB", "https://api.althub.co.za"),
    hostPreset("ameNZB", "https://amenzb.moe"),
    hostPreset("BlurayNZB", "https://www.bluraynzb.org"),
    hostPreset("Digital Carnage", "https://digitalcarnage.info"),
    hostPreset("DogNZB", "https://api.dognzb.cr"),
    hostPreset("Drunken Slug", "https://api.drunkenslug.com"),
    hostPreset("FastNZB", "https://fastnzb.com"),
    hostPreset("LuluNZB", "https://lulunzb.com"),
    hostPreset("miatrix", "https://www.miatrix.com"),
    hostPreset("NZB Finder", "https://nzbfinder.ws"),
    hostPreset("NZBCat", "https://nzb.cat"),
    hostPreset("nzb.life", "https://api.nzb.life"),
    hostPreset("NZBGeek", "https://api.nzbgeek.info"),
    hostPreset("NzbNdx", "https://www.nzbndx.com"),
    hostPreset("NzBNooB", "https://www.nzbnoob.com"),
    hostPreset("NzbNation", "http://www.nzbnation.com/"),
    hostPreset("nzbplanet", "https://nzbplanet.net"),
    hostPreset("omgwtfnzbs", "https://api.omgwtfnzbs.org"),
    {
        ...hostPreset("Treasure Maps", "https://treasure-maps.com"),
        info: [
            "If you want german or spanish (or other language specific) results make sure to add the newznab IDs in the categories config.",
            "For example for german UHD movies add 2145.",
            "You can find out the IDs by browsing https://treasure-maps.com/rss.",
        ],
    },
    hostPreset("spotweb.com", "https://spotweb.me"),
    hostPreset("Tabula-Rasa", "https://www.tabula-rasa.pw/api/v1/"),
    {
        label: "Torbox (Newznab)",
        slug: slugOf("Torbox (Newznab)"),
        seed: {
            name: "Torbox (Newznab)",
            host: "https://search-api.torbox.app/newznab",
            searchModuleType: "NEWZNAB",
        },
    },
    specialPreset("Binsearch", "BINSEARCH", "https://binsearch.info"),
    specialPreset("NZBIndex", "NZBINDEX", "https://nzbindex.com", {
        generalMinSize: 1,
    }),
    specialPreset("NZBIndex API", "NZBINDEX_API", "https://api.nzbindex.com", {
        generalMinSize: 1,
    }),
    specialPreset(
        "NZBIndex Beta",
        "NZBINDEX_BETA",
        "https://beta.nzbindex.com/search",
        {generalMinSize: 1},
    ),
    specialPreset("NZBKing.com", "NZBKING", "https://www.nzbking.com/search"),
    specialPreset("WtfNzb", "WTFNZB", null, {
        generalMinSize: 1,
        userAgent: null,
    }),
].sort(byLabel);

/** `$scope.torznabPresets`, sorted the same way (`:1133-1135`). */
export const TORZNAB_PRESETS: readonly IndexerPreset[] = [
    {
        label: "Jackett/Cardigann",
        slug: slugOf("Jackett/Cardigann"),
        seed: {
            allCapsChecked: false,
            configComplete: false,
            name: "Jackett/Cardigann",
            host: "http://127.0.0.1:9117/api/v2.0/indexers/YOURTRACKER/results/torznab/",
            searchModuleType: "TORZNAB",
            state: "ENABLED",
            enabledForSearchSource: "BOTH",
        },
    },
    {
        label: "Torbox (Torrents)",
        slug: slugOf("Torbox (Torrents)"),
        seed: {
            name: "Torbox (Torrents)",
            host: "https://search-api.torbox.app/torznab",
            searchModuleType: "TORZNAB",
        },
    },
].sort(byLabel);

/** `$scope.emptyTorznabPreset` — "Add custom torznab indexer" (`:1124-1132`). */
export const CUSTOM_TORZNAB_PRESET: IndexerPreset = {
    label: "Add custom torznab indexer",
    slug: "custom-torznab",
    seed: {
        allCapsChecked: false,
        configComplete: false,
        searchModuleType: "TORZNAB",
        state: "ENABLED",
        enabledForSearchSource: "BOTH",
    },
};

/**
 * "Add custom newznab indexer" is legacy's `select()` with *no* preset at all
 * (`indexer-config-selection.html:31`), so the entry is exactly
 * `createIndexerModel`'s base.
 */
export const CUSTOM_NEWZNAB_PRESET: IndexerPreset = {
    label: "Add custom newznab indexer",
    slug: "custom-newznab",
    seed: {},
};

/** `$scope.specialPresets` (`:1137-1150`). */
export const SPECIAL_PRESETS: readonly IndexerPreset[] = [
    {
        label: "Torbox",
        slug: "torbox",
        info: [
            "Torbox supports Newznab and Torznab requests. You may want to add those instead (or additionally).",
        ],
        seed: {
            allCapsChecked: true,
            configComplete: true,
            name: "Torbox",
            host: "https://search-api.torbox.app",
            supportedSearchIds: ["IMDB"],
            supportedSearchTypes: ["MOVIE", "SEARCH"],
            searchModuleType: "TORBOX",
            state: "ENABLED",
            enabledForSearchSource: "INTERNAL",
        },
    },
];

/**
 * `checkAddingAllowed` (`formly-indexers.js:858-865`): the four search modules
 * that may only exist once are rejected when an indexer of the preset's name is
 * already configured. Everything else — including a second Jackett torznab
 * entry or a second newznab indexer — may be added freely.
 */
const SINGLE_INSTANCE_MODULES = ["ANIZB", "BINSEARCH", "NZBINDEX", "NZBCLUB"];

export const ALREADY_CONFIGURED_MESSAGE =
    "That predefined indexer is already configured.";

export function isAddingAllowed(
    existing: readonly IndexerValues[],
    preset: IndexerPreset | undefined,
): boolean {
    const seed = preset?.seed;
    if (
        seed === undefined ||
        typeof seed.searchModuleType !== "string" ||
        !SINGLE_INSTANCE_MODULES.includes(seed.searchModuleType)
    ) {
        return true;
    }
    return !existing.some((entry) => entry.name === seed.name);
}
