import {z} from "zod";

import {ApiError, ApiTransport} from "../transport";

const CHECK_CONNECTION_PATH = "internalapi/indexer/checkConnection";
const CHECK_CAPS_PATH = "internalapi/indexer/checkCaps";
const CHECK_CAPS_MESSAGES_PATH = "internalapi/indexer/checkCapsMessages";
const READ_JACKETT_CONFIG_PATH = "internalapi/indexer/readJackettConfig";
const READ_PROWLARR_CONFIG_PATH = "internalapi/indexer/readProwlarrConfig";

/**
 * An indexer entry as it travels between the config form, the edit dialog, and
 * the two checks. An open record on purpose: `ConfigWeb.setConfig` writes the
 * whole configuration file back, so a key this UI has no control for must
 * survive an edit untouched (ADR-0003).
 */
export type IndexerValues = Record<string, unknown>;

/**
 * `GenericResponse` (`shared/mapping/.../GenericResponse.java`). A failed check
 * is still an HTTP 200 carrying `successful: false` and a message; only a
 * transport-level failure is a non-2xx response.
 */
const genericResponseSchema = z.looseObject({
    message: z.string().nullish(),
    successful: z.boolean().nullish(),
});

/**
 * The three outcomes legacy distinguishes (`IndexerConfigBoxService
 * .checkConnection` in `formly-indexers.js:1304-1319`, whose rejection carries
 * a `checked` flag that `handleConnectionCheckFail` branches on):
 *
 * - `successful` — the indexer answered;
 * - `failed` — the *server* ran the check and reports why it failed
 *   (legacy's `checked: true`);
 * - `unchecked` — the check itself could not be run (legacy's `checked:
 *   false`), which is a different message and a different confirm label.
 */
export type IndexerConnectionResult =
    | {kind: "failed"; message: string}
    | {kind: "successful"}
    | {kind: "unchecked"};

/**
 * `API-CONFIG-INDEXER-CONNECTION`: asks the backend to search the indexer
 * described by `indexer` — an unsaved, in-progress `IndexerConfig` — so an
 * entry can be verified before it is accepted into the configuration. Nothing
 * is persisted by it.
 *
 * The posted entry keeps its `***UNCHANGED***` markers: `IndexerChecker
 * .resolveUnchangedSensitiveFields` looks the stored credentials up by indexer
 * name, so the browser never has to hold a real secret to run the check
 * (`C-SECRET-INPUT`'s invariant).
 */
export async function checkIndexerConnection(
    transport: ApiTransport,
    indexer: IndexerValues,
): Promise<IndexerConnectionResult> {
    let response: unknown;
    try {
        response = await transport.request<unknown>(CHECK_CONNECTION_PATH, {
            json: indexer,
            method: "POST",
        });
    } catch {
        return {kind: "unchecked"};
    }
    const parsed = genericResponseSchema.safeParse(response);
    if (!parsed.success) {
        // A body this build cannot read is not evidence that the indexer
        // works, and legacy's "checked" branch would have nothing to show.
        return {kind: "unchecked"};
    }
    if (parsed.data.successful === true) {
        return {kind: "successful"};
    }
    return {kind: "failed", message: parsed.data.message ?? ""};
}

/**
 * `CapsCheckRequest.CheckType`. `SINGLE` checks the one unsaved entry carried in
 * the request; `INCOMPLETE` and `ALL` check the *saved* indexers and carry no
 * entry at all (FM-067's bulk recheck).
 */
export type CapsCheckType = "ALL" | "INCOMPLETE" | "SINGLE";

/** `CheckCapsResponse` (`shared/mapping/.../CheckCapsResponse.java`). */
const checkCapsResponseSchema = z.looseObject({
    allCapsChecked: z.boolean().nullish(),
    configComplete: z.boolean().nullish(),
    indexerConfig: z.looseObject({}).nullish(),
});

export type IndexerCapsCheckResult = {
    allCapsChecked: boolean;
    configComplete: boolean;
    indexerConfig: IndexerValues;
};

export class CapsCheckFailedError extends Error {}

/**
 * `API-CONFIG-INDEXER-CAPS`: runs the capability check for one unsaved indexer
 * and answers the list of results (one entry for `SINGLE`). It is slow by
 * design — `IndexerChecker.checkCaps` issues seven ID searches plus a caps and
 * a forbidden-word probe against the indexer — which is why the caller shows a
 * progress dialog and polls `API-CONFIG-INDEXER-CAPS-MESSAGES` meanwhile.
 *
 * A rejected promise is legacy's `$dismiss("Unknown error")` branch: the entry
 * keeps unknown capabilities and the admin is told the indexer is unusable
 * until the check succeeds.
 *
 * `indexerConfig` is `null` for an `ALL`/`INCOMPLETE` bulk recheck, which is
 * exactly what `CapsCheckRequestFactory.build(undefined, checkType)` sends: the
 * backend then checks the indexers it has stored and answers one result per
 * checked indexer.
 */
export async function checkIndexerCaps(
    transport: ApiTransport,
    indexerConfig: IndexerValues | null,
    checkType: CapsCheckType = "SINGLE",
): Promise<IndexerCapsCheckResult[]> {
    let response: unknown;
    try {
        response = await transport.request<unknown>(CHECK_CAPS_PATH, {
            json: {checkType, indexerConfig},
            method: "POST",
        });
    } catch (error) {
        throw new CapsCheckFailedError(
            error instanceof Error ? error.message : "Unknown error",
        );
    }
    const parsed = z.array(checkCapsResponseSchema).safeParse(response);
    if (!parsed.success) {
        throw new CapsCheckFailedError(
            "The capability check response has an invalid format",
        );
    }
    return parsed.data.map((result) => ({
        allCapsChecked: result.allCapsChecked === true,
        configComplete: result.configComplete === true,
        indexerConfig: (result.indexerConfig ?? {}) as IndexerValues,
    }));
}

/**
 * `API-CONFIG-INDEXER-CAPS-MESSAGES`: the progress lines the running check has
 * published so far, keyed by indexer name (`IndexerWeb.getCheckerMessages`).
 * The map is cleared when a new check starts, so a poll of it is always about
 * the check in flight.
 */
export async function getCapsCheckMessages(
    transport: ApiTransport,
): Promise<Record<string, string[]>> {
    const response = await transport.request<unknown>(
        CHECK_CAPS_MESSAGES_PATH,
        {method: "GET"},
    );
    const parsed = z
        .record(z.string(), z.array(z.string()))
        .safeParse(response);
    return parsed.success ? parsed.data : {};
}

/**
 * The message map flattened the way `CheckCapsModalInstanceCtrl` renders it
 * (`formly-indexers.js:1264-1280`): one line per message, prefixed with the
 * indexer name only when more than one indexer is being checked.
 */
export function capsCheckMessageLines(
    messages: Record<string, string[]>,
    checkType: CapsCheckType,
): string[] {
    const lines: string[] = [];
    for (const [name, entries] of Object.entries(messages)) {
        for (const entry of entries) {
            lines.push(checkType === "SINGLE" ? entry : `${name}: ${entry}`);
        }
    }
    return lines;
}

/** Which of the two importers a request goes to. */
export type IndexerImportSource = "jackett" | "prowlarr";

/**
 * What an importer answers: the *complete* replacement list plus how the server
 * arrived at it. `removed` is `null` for Jackett, whose response type has no
 * removal count at all (`IndexerWeb.JacketConfigReadResponse`) — Jackett's
 * importer only ever adds to and updates the list it was given.
 */
export type IndexerImportResult = {
    added: number;
    indexers: IndexerValues[];
    removed: number | null;
    updated: number;
};

/** Legacy's last fallback when a failed import says nothing at all. */
export const UNKNOWN_IMPORT_ERROR = "Unknown error occurred";

/**
 * A refused import. Its `message` is what the dialog shows, resolved in
 * legacy's order (`formly-indexers.js:1180-1199`): the server's `errorMessage`,
 * then the response's status text, then an unknown-error fallback.
 */
export class IndexerImportFailedError extends Error {}

const importCountSchema = z.number().nullish();

const jackettImportResponseSchema = z.looseObject({
    addedTrackers: importCountSchema,
    newIndexersConfig: z.array(z.looseObject({})).nullish(),
    updatedTrackers: importCountSchema,
});

const prowlarrImportResponseSchema = z.looseObject({
    addedIndexers: importCountSchema,
    newIndexersConfig: z.array(z.looseObject({})).nullish(),
    removedIndexers: importCountSchema,
    updatedIndexers: importCountSchema,
});

/** The `errorMessage` `ProwlarrConfigReadResponse` carries on a 400. */
const importErrorSchema = z.looseObject({errorMessage: z.string().nullish()});

function importFailure(error: unknown): IndexerImportFailedError {
    if (!(error instanceof ApiError)) {
        // No HTTP response at all — legacy's `status: -1` with an empty
        // `statusText`, which falls straight through to the last fallback.
        return new IndexerImportFailedError(UNKNOWN_IMPORT_ERROR);
    }
    const parsed = importErrorSchema.safeParse(error.data);
    const reported = parsed.success ? (parsed.data.errorMessage ?? "") : "";
    // `ApiTransport` does not carry the response's `statusText`, so its own
    // status-derived message stands in for legacy's second fallback.
    return new IndexerImportFailedError(
        reported === "" ? error.message : reported,
    );
}

async function requestImport(
    transport: ApiTransport,
    path: string,
    body: unknown,
): Promise<unknown> {
    try {
        return await transport.request<unknown>(path, {
            json: body,
            method: "POST",
        });
    } catch (error) {
        throw importFailure(error);
    }
}

function importedCount(value: number | null | undefined): number {
    return typeof value === "number" ? value : 0;
}

function importedIndexers(
    value: readonly Record<string, unknown>[] | null | undefined,
): IndexerValues[] {
    return (value ?? []) as IndexerValues[];
}

/**
 * `API-CONFIG-INDEXER-JACKETT`: asks the backend to read the trackers a Jackett
 * instance has configured and to fold them into the indexer list it is given.
 *
 * `existingIndexers` is the *unsaved* list as the config form holds it, and
 * `jackettConfig` is legacy's `IMPORT_CONFIG` marker entry — a complete
 * `IndexerConfig` whose `host` and `apiKey` address Jackett. The marker type
 * matters on the wire: `JacketConfigRetriever` uses the posted entry as the
 * template every imported tracker is cloned from.
 */
export async function importJackettIndexers(
    transport: ApiTransport,
    existingIndexers: readonly IndexerValues[],
    jackettConfig: IndexerValues,
): Promise<IndexerImportResult> {
    const response = await requestImport(transport, READ_JACKETT_CONFIG_PATH, {
        existingIndexers,
        jackettConfig,
    });
    const parsed = jackettImportResponseSchema.safeParse(response);
    if (!parsed.success) {
        throw new IndexerImportFailedError(
            "The Jackett import response has an invalid format",
        );
    }
    return {
        added: importedCount(parsed.data.addedTrackers),
        indexers: importedIndexers(parsed.data.newIndexersConfig),
        removed: null,
        updated: importedCount(parsed.data.updatedTrackers),
    };
}

/**
 * `API-CONFIG-INDEXER-PROWLARR`: the same for a Prowlarr instance, which also
 * *removes* the entries it manages that it no longer knows about — the only
 * reason this response carries a removal count.
 *
 * A failure here is an HTTP 400 whose body is a `ProwlarrConfigReadResponse`
 * carrying only `errorMessage`, which is what `IndexerImportFailedError` shows.
 */
export async function importProwlarrIndexers(
    transport: ApiTransport,
    existingIndexers: readonly IndexerValues[],
    prowlarrConfig: IndexerValues,
): Promise<IndexerImportResult> {
    const response = await requestImport(transport, READ_PROWLARR_CONFIG_PATH, {
        existingIndexers,
        prowlarrConfig,
    });
    const parsed = prowlarrImportResponseSchema.safeParse(response);
    if (!parsed.success) {
        throw new IndexerImportFailedError(
            "The Prowlarr import response has an invalid format",
        );
    }
    return {
        added: importedCount(parsed.data.addedIndexers),
        indexers: importedIndexers(parsed.data.newIndexersConfig),
        removed: importedCount(parsed.data.removedIndexers),
        updated: importedCount(parsed.data.updatedIndexers),
    };
}

/** Dispatches to the importer the admin picked. */
export function importIndexers(
    transport: ApiTransport,
    source: IndexerImportSource,
    existingIndexers: readonly IndexerValues[],
    importConfig: IndexerValues,
): Promise<IndexerImportResult> {
    return source === "jackett"
        ? importJackettIndexers(transport, existingIndexers, importConfig)
        : importProwlarrIndexers(transport, existingIndexers, importConfig);
}
