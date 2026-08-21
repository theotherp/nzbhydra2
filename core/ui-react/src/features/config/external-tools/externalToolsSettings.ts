import type {ExternalToolSyncResult} from "../../../api/config/externalTools";
import {patternValidator} from "../components";
import type {ConfigFieldPath, SettingOption} from "../components";

/**
 * `F-CONFIG-EXTERNAL-TOOLS`' vocabulary-independent data: legacy's five add
 * choices, its option lists, the per-type and per-sync-type field sets, and
 * the way a sync result is turned into a message. Kept out of the components
 * so the parity comparison against `formly-external-tools.js` is a comparison
 * of data, not of JSX.
 */

/** The list of tools inside `C-CONFIG-FORM`'s whole-config form. */
export const EXTERNAL_TOOLS_PATH: ConfigFieldPath =
    "externalTools.externalTools";

/**
 * The `data-testid` stem shared by the list's own elements, derived from the
 * config path exactly as `C-CONFIG-FIELDS` derives a control's — hence the
 * doubled word: the section `externalTools` holds the array `externalTools`.
 */
export const EXTERNAL_TOOLS_TEST_ID = "externalTools-externalTools";

/**
 * The path the edit dialog's *draft* form binds to. As in FM-064 it is
 * deliberately not `externalTools.externalTools.<index>`: the draft lives in
 * its own throwaway form, and reusing an index path would give the dialog's
 * controls the same `data-testid`s as the list row behind it.
 */
export const EXTERNAL_TOOL_DRAFT_PATH = "externalTools.externalToolDraft";

/** `externalTools.externalToolDraft.<field>` for a control in the dialog. */
export function draftFieldPath(field: string): ConfigFieldPath {
    return `${EXTERNAL_TOOL_DRAFT_PATH}.${field}` as ConfigFieldPath;
}

/**
 * An external-tool entry as it travels between the form, the dialog, and the
 * two external-tool endpoints. It stays an open record on purpose:
 * `ConfigWeb.setConfig` writes the whole file back, so a key this UI has no
 * control for must survive an edit untouched (ADR-0003).
 */
export type ExternalToolValues = Record<string, unknown>;

/** `ExternalToolConfig.ExternalToolType`. */
export const EXTERNAL_TOOL_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "Sonarr", value: "SONARR"},
    {label: "Radarr", value: "RADARR"},
    {label: "Lidarr", value: "LIDARR"},
    {label: "Readarr", value: "READARR"},
];

/** `formly-external-tools.js:250-253`. */
export const SYNC_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "Single entry for all indexers", value: "SINGLE"},
    {label: "Separate entry per indexer", value: "PER_INDEXER"},
];

/**
 * The categories legacy writes when the type changes
 * (`formly-external-tools.js:180-196`), which are also the ones each preset
 * seeds and the ones `ExternalToolConfig.prepareForSaving` falls back to.
 */
export const DEFAULT_CATEGORIES: Readonly<Record<string, string>> = {
    LIDARR: "3000",
    RADARR: "2000",
    READARR: "7020,8010",
    SONARR: "5030,5040",
};

/**
 * The two entry fields NZBHydra itself parses as numbers before it writes them
 * into the *arr instance: `ExternalTools:266` reads `minimumSeeders` with
 * `Integer.parseInt` and `ExternalTools.mapCategories` reads every
 * comma-separated `categories` token the same way. Legacy declared no pattern
 * for either, so any text was sent and the failure came back as an
 * unattributed refusal. Neither is `required` — an empty value is the
 * documented default on both sides (`ExternalToolConfig.minimumSeeders = "1"`,
 * and `prepareForSaving` refills empty categories), and `patternValidator`
 * always accepts one.
 */
export const minimumSeedersValidator = patternValidator(
    /^\d+$/,
    (value) => `${value} is not a whole number`,
);

export const categoriesValidator = patternValidator(
    /^\d+(,\s*\d+)*$/,
    (value) => `${value} is not a comma-separated list of category IDs`,
);

/**
 * Legacy's four presets plus its "Custom" entry
 * (`formly-external-tools.js:20-50` and `external-tool-config.html`'s
 * dropdown, whose last item calls `addEntry` with no preset at all).
 */
export type ExternalToolPreset = {
    /** The menu label; for a preset it is also the seeded name. */
    label: string;
    seed: ExternalToolValues;
    /** Used for the menu option's `data-testid`. */
    value: string;
};

export const EXTERNAL_TOOL_PRESETS: readonly ExternalToolPreset[] = [
    {
        label: "Sonarr",
        value: "SONARR",
        seed: {
            name: "Sonarr",
            type: "SONARR",
            host: "http://localhost:8989",
            categories: DEFAULT_CATEGORIES.SONARR,
            syncType: "PER_INDEXER",
        },
    },
    {
        label: "Radarr",
        value: "RADARR",
        seed: {
            name: "Radarr",
            type: "RADARR",
            host: "http://localhost:7878",
            categories: DEFAULT_CATEGORIES.RADARR,
            syncType: "PER_INDEXER",
        },
    },
    {
        label: "Lidarr",
        value: "LIDARR",
        seed: {
            name: "Lidarr",
            type: "LIDARR",
            host: "http://localhost:8686",
            categories: DEFAULT_CATEGORIES.LIDARR,
            syncType: "PER_INDEXER",
        },
    },
    {
        label: "Readarr",
        value: "READARR",
        seed: {
            name: "Readarr",
            type: "READARR",
            host: "http://localhost:8787",
            categories: DEFAULT_CATEGORIES.READARR,
            syncType: "PER_INDEXER",
        },
    },
    {label: "Custom", value: "CUSTOM", seed: {}},
];

/**
 * `formly-external-tools.js:106-121`: every new entry starts from these
 * defaults and a preset is then merged over them. A "Custom" entry is the
 * defaults alone, with no name, type, or host — the dialog's `required` rules
 * are what make the admin supply them.
 */
export function newExternalToolDraft(presetValue: string): ExternalToolValues {
    const preset = EXTERNAL_TOOL_PRESETS.find(
        (candidate) => candidate.value === presetValue,
    );
    return {
        enabled: true,
        syncType: "PER_INDEXER",
        configureForUsenet: true,
        configureForTorrents: false,
        addDisabledIndexers: false,
        enableRss: true,
        enableAutomaticSearch: true,
        enableInteractiveSearch: true,
        useHydraPriorities: true,
        priority: 25,
        nzbhydraName: "NZBHydra2",
        nzbhydraHost: "http://host.docker.internal:5076",
        ...(preset?.seed ?? {}),
    };
}

/**
 * The nine `boolean` primitives of `ExternalToolConfig`, normalized on the way
 * into the configuration so a switch the admin never saw (an advanced row, or
 * a field this type does not show) is still persisted as a real boolean rather
 * than left absent. Everything else is passed through untouched, so unmodeled
 * keys survive an edit.
 */
export function externalToolEntry(
    draft: ExternalToolValues,
): ExternalToolValues {
    return {
        ...draft,
        addDisabledIndexers: draft.addDisabledIndexers === true,
        configureForTorrents: draft.configureForTorrents === true,
        configureForUsenet: draft.configureForUsenet === true,
        enableAutomaticSearch: draft.enableAutomaticSearch === true,
        enableInteractiveSearch: draft.enableInteractiveSearch === true,
        enableRss: draft.enableRss === true,
        enabled: draft.enabled === true,
        removeYearFromSearchString: draft.removeYearFromSearchString === true,
        useHydraPriorities: draft.useHydraPriorities === true,
    };
}

export function externalToolsOf(config: unknown): ExternalToolValues[] {
    return Array.isArray(config) ? (config as ExternalToolValues[]) : [];
}

export function asExternalTool(entry: unknown): ExternalToolValues {
    return typeof entry === "object" && entry !== null
        ? (entry as ExternalToolValues)
        : {};
}

export function externalToolText(value: unknown): string {
    return typeof value === "string" ? value : "";
}

/** The heading a list row shows; legacy shows `entry.name`. */
export const UNNAMED_EXTERNAL_TOOL = "External tool";

export function externalToolLegend(entry: ExternalToolValues): string {
    const name = externalToolText(entry.name);
    return name === "" ? UNNAMED_EXTERNAL_TOOL : name;
}

/** The tool's display name, for the messages the configure step produces. */
export function externalToolTypeLabel(entry: ExternalToolValues): string {
    const type = externalToolText(entry.type);
    return (
        EXTERNAL_TOOL_TYPE_OPTIONS.find((option) => option.value === type)
            ?.label ?? UNNAMED_EXTERNAL_TOOL.toLowerCase()
    );
}

/**
 * `external-tool-config.html:31`: the list is shown ordered by name. The
 * *array* index travels with each row, because that is what the row's controls
 * bind to and what Delete removes — sorting the display must not renumber the
 * configuration.
 */
export function sortedExternalTools(
    entries: ExternalToolValues[],
): {entry: ExternalToolValues; index: number}[] {
    return entries
        .map((entry, index) => ({entry, index}))
        .sort((left, right) =>
            externalToolLegend(left.entry).localeCompare(
                externalToolLegend(right.entry),
            ),
        );
}

/**
 * The fields whose change makes legacy re-run the connection test before
 * closing the box (the `watcher` listeners that set `needsConnectionTest`,
 * `formly-external-tools.js:199-231`). A brand-new entry is always tested
 * (legacy's `isInitial`).
 */
export const CONNECTION_FIELDS = ["host", "apiKey"] as const;

export function connectionSettingsChanged(
    initial: ExternalToolValues,
    current: ExternalToolValues,
): boolean {
    return CONNECTION_FIELDS.some((field) => initial[field] !== current[field]);
}

/**
 * The editable fields of an external tool, in legacy's order
 * (`getExternalToolBoxFields`). The per-type and torrent-only groups are
 * legacy's `if (model.type === ...)` / `if (model.configureForTorrents)`
 * blocks; unlike legacy, which computes the field set once when the box opens,
 * this is evaluated on every render, so switching the type or turning torrent
 * syncing on reveals the matching fields immediately instead of only after
 * reopening the dialog.
 */
export type ExternalToolField =
    | "additionalParameters"
    | "addDisabledIndexers"
    | "animeCategories"
    | "apiKey"
    | "categories"
    | "configureForTorrents"
    | "configureForUsenet"
    | "discographySeedTime"
    | "earlyDownloadLimit"
    | "enableAutomaticSearch"
    | "enableInteractiveSearch"
    | "enableRss"
    | "enabled"
    | "host"
    | "minimumSeeders"
    | "name"
    | "nzbhydraHost"
    | "nzbhydraName"
    | "priority"
    | "removeYearFromSearchString"
    | "seasonPackSeedTime"
    | "seedRatio"
    | "seedTime"
    | "syncType"
    | "type"
    | "useHydraPriorities";

export function visibleExternalToolFields(
    draft: ExternalToolValues,
): readonly ExternalToolField[] {
    const type = externalToolText(draft.type);
    const fields: ExternalToolField[] = [
        "enabled",
        "name",
        "type",
        "host",
        "apiKey",
        "syncType",
        "nzbhydraName",
        "nzbhydraHost",
        "configureForUsenet",
        "configureForTorrents",
        "addDisabledIndexers",
        "useHydraPriorities",
    ];
    // `hideExpression: 'model.useHydraPriorities && model.syncType ===
    // "PER_INDEXER"'` — a per-indexer sync that maps Hydra's own priorities
    // has nothing to default to.
    if (
        !(draft.useHydraPriorities === true && draft.syncType === "PER_INDEXER")
    ) {
        fields.push("priority");
    }
    fields.push(
        "enableRss",
        "enableAutomaticSearch",
        "enableInteractiveSearch",
    );
    fields.push("categories");
    if (type === "SONARR") {
        fields.push("animeCategories");
    }
    if (type === "RADARR") {
        fields.push("removeYearFromSearchString");
    }
    if (type === "LIDARR" || type === "READARR") {
        fields.push("earlyDownloadLimit");
    }
    fields.push("additionalParameters");
    if (draft.configureForTorrents === true) {
        fields.push("minimumSeeders", "seedRatio", "seedTime");
        if (type === "SONARR") {
            fields.push("seasonPackSeedTime");
        }
        if (type === "LIDARR" || type === "READARR") {
            fields.push("discographySeedTime");
        }
    }
    return fields;
}

export type SyncMessage = {
    message: string;
    severity: "error" | "success" | "warning";
};

/**
 * `formly-external-tools.js:87-104`, branch for branch: no failure at all is a
 * success (including the "synced to 0 tools" the backend answers when syncing
 * on config change is switched off), no success at all is an error, and a
 * mixture is a warning naming both counts.
 */
export function syncResultMessage(result: ExternalToolSyncResult): SyncMessage {
    if (result.failureCount === 0) {
        return {
            message: `Successfully synced to ${result.successCount} external tool(s)`,
            severity: "success",
        };
    }
    if (result.successCount === 0) {
        return {
            message: `Failed to sync to all ${result.failureCount} external tool(s)`,
            severity: "error",
        };
    }
    return {
        message: `Synced to ${result.successCount} tool(s), ${result.failureCount} failed`,
        severity: "warning",
    };
}
