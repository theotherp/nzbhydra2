import {z} from "zod";

import {ApiTransport} from "../transport";

const CHECK_CONNECTION_PATH = "internalapi/indexer/checkConnection";
const CHECK_CAPS_PATH = "internalapi/indexer/checkCaps";
const CHECK_CAPS_MESSAGES_PATH = "internalapi/indexer/checkCapsMessages";

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

/** `CapsCheckRequest.CheckType`. FM-066 only ever sends `SINGLE`. */
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
 */
export async function checkIndexerCaps(
    transport: ApiTransport,
    indexerConfig: IndexerValues,
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
