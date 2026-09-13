import type {
    IndexerImportResult,
    IndexerImportSource,
    IndexerValues,
} from "../../../api/config/indexers";
import type {ConfigFieldPath} from "../components";
import {baseIndexerDraft} from "./indexerPresets";

/**
 * `F-CONFIG-INDEXERS`' Jackett and Prowlarr config imports as data: what each
 * importer is called, what it is seeded with, and what its counts read like
 * afterwards (`readJackettConfig`/`readProwlarrConfig` in
 * `formly-indexers.js:746-801`).
 *
 * The two differ in one way that matters beyond wording: Prowlarr's importer
 * *removes* the entries it manages that it no longer knows about, so its
 * response carries a removal count and Jackett's does not.
 */

/**
 * The path the import dialog's throwaway form binds to. Deliberately its own
 * key rather than `indexerDraft`, so the import controls and the edit dialog's
 * controls can never share a `data-testid`.
 */
export const INDEXER_IMPORT_PATH = "indexerImport" as ConfigFieldPath;

/** `indexerImport.<field>` for a control in the import dialog. */
export function importFieldPath(field: string): ConfigFieldPath {
    return `${INDEXER_IMPORT_PATH}.${field}` as ConfigFieldPath;
}

export type IndexerImportDescriptor = {
    /** Legacy's default host for this importer's local instance. */
    defaultHost: string;
    /** The application being read from, as it is named in prose. */
    label: string;
    /** The seeded entry's `name`, which is also the dialog's heading. */
    name: string;
    /** The button that opens the dialog (`indexer-config-selection.html`). */
    openLabel: string;
};

export const INDEXER_IMPORT_SOURCES: Readonly<
    Record<IndexerImportSource, IndexerImportDescriptor>
> = {
    jackett: {
        defaultHost: "http://127.0.0.1:9117",
        label: "Jackett",
        name: "Jackett config",
        openLabel: "Read from Jackett",
    },
    prowlarr: {
        defaultHost: "http://127.0.0.1:9696",
        label: "Prowlarr",
        name: "Prowlarr config",
        openLabel: "Read from Prowlarr (all)",
    },
};

export const INDEXER_IMPORT_ORDER: readonly IndexerImportSource[] = [
    "jackett",
    "prowlarr",
];

/**
 * `readJackettConfig`/`readProwlarrConfig`'s seeded model: the same base every
 * added indexer starts from (`createIndexerModel`), addressed at the importer
 * and marked `IMPORT_CONFIG`.
 *
 * The marker is not cosmetic. `SearchModuleType.IMPORT_CONFIG` exists purely so
 * this request deserializes, and both retrievers clone the posted entry as the
 * template for every indexer they return — so the base's `state`, `score`,
 * `preselect`, and `enabledForSearchSource` are what the imported entries
 * inherit.
 */
export function importConfigDraft(source: IndexerImportSource): IndexerValues {
    const descriptor = INDEXER_IMPORT_SOURCES[source];
    return {
        ...baseIndexerDraft(),
        host: descriptor.defaultHost,
        name: descriptor.name,
        searchModuleType: "IMPORT_CONFIG",
    };
}

/**
 * Because the response replaces the *whole* list, an indexer the importer does
 * not return is gone from the form. Legacy never said so; the admin is told
 * before the request runs.
 */
export function importReplacementWarning(
    source: IndexerImportSource,
): readonly string[] {
    const what = INDEXER_IMPORT_SOURCES[source].label;
    return [
        `Importing replaces the whole indexer list with what ${what} returns.`,
        `Any indexer ${what} does not return is removed from the list. Nothing is saved until you save the configuration.`,
    ];
}

/** The heading of the dialog reporting what a finished import did. */
export function importResultTitle(source: IndexerImportSource): string {
    return `Imported from ${INDEXER_IMPORT_SOURCES[source].label}`;
}

/** Its message; the counts themselves are `importResultLines`. */
export function importResultSummary(source: IndexerImportSource): string {
    return `The indexer list was replaced with the configuration ${INDEXER_IMPORT_SOURCES[source].label} returned.`;
}

/**
 * The counts legacy growls after a successful import
 * (`formly-indexers.js:763-794`), verbatim. Prowlarr's removal line is shown
 * only when something was actually removed, and Jackett has no removal line at
 * all.
 */
export function importResultLines(
    source: IndexerImportSource,
    result: IndexerImportResult,
): string[] {
    if (source === "jackett") {
        return [
            `Added ${result.added} new trackers from Jackett`,
            `Updated ${result.updated} trackers from Jackett`,
        ];
    }
    const lines = [
        `Added ${result.added} indexers from Prowlarr`,
        `Updated ${result.updated} indexers from Prowlarr`,
    ];
    if (result.removed !== null && result.removed > 0) {
        lines.push(`Removed ${result.removed} indexers no longer in Prowlarr`);
    }
    return lines;
}
