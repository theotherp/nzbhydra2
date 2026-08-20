import {z} from "zod";

import {ApiError, ApiTransport} from "../transport";

const CONFIGURE_PATH = "internalapi/externalTools/configure";
const SYNC_ALL_PATH = "internalapi/externalTools/syncAll";
const TEST_CONNECTION_PATH = "internalapi/externalTools/testConnection";

/**
 * `AddRequest.AddType` (`shared/mapping/.../externaltools/AddRequest.java`).
 * `DELETE_ONLY` is what a *connection test* posts: the backend's
 * `testConnection` only reads `xdarrHost`/`xdarrApiKey`, and legacy sends the
 * harmless add type so the same request object serves both endpoints
 * (`external-tool-request-service.js`).
 */
export type ExternalToolAddType = "DELETE_ONLY" | "PER_INDEXER" | "SINGLE";

/**
 * `AddRequest.ExternalTool`. The wire enum is capitalized differently from
 * `ExternalToolConfig.ExternalToolType`, which is what the configuration
 * stores — hence the translation below rather than a straight pass-through.
 */
export type ExternalToolName = "Lidarr" | "Radarr" | "Readarr" | "Sonarr";

const EXTERNAL_TOOL_NAMES: Readonly<Record<string, ExternalToolName>> = {
    LIDARR: "Lidarr",
    RADARR: "Radarr",
    READARR: "Readarr",
    SONARR: "Sonarr",
};

/**
 * The body of `API-CONFIG-EXTERNAL-CONNECTION` and
 * `API-CONFIG-EXTERNAL-CONFIGURE`, mirroring `AddRequest` field for field.
 *
 * Every `boolean` below is a Java primitive on the server and is therefore
 * always sent as a real boolean, never omitted: `tests/system/tests/
 * external-tools.spec.ts` asserts exactly that for all ten of them, because a
 * missing flag silently means "off" for the *arr instance being written to.
 * The string fields are optional and are dropped from the JSON when the entry
 * has no value for them, which is what legacy does too.
 */
export type ExternalToolAddRequest = {
    additionalParameters?: string;
    addDisabledIndexers: boolean;
    addTorrent: boolean;
    addType: ExternalToolAddType;
    addUsenet: boolean;
    animeCategories?: string;
    categories?: string;
    configureForTorrents: boolean;
    configureForUsenet: boolean;
    discographySeedTime?: string;
    earlyDownloadLimit?: string;
    enableAutomaticSearch: boolean;
    enableInteractiveSearch: boolean;
    enableRss: boolean;
    externalTool?: string;
    minimumSeeders?: string;
    nzbhydraHost?: string;
    nzbhydraName?: string;
    priority?: number;
    removeYearFromSearchString: boolean;
    seasonPackSeedTime?: string;
    seedRatio?: string;
    seedTime?: string;
    useHydraPriorities: boolean;
    xdarrApiKey?: string;
    xdarrHost?: string;
};

/**
 * Legacy's `ExternalToolRequestFactory.build`
 * (`core/ui-src/js/external-tool-request-service.js`), which is a service of
 * its own there for the same reason it is one here: it is the shape the
 * backend is strict about, not a detail of the form that happens to feed it.
 *
 * `addUsenet` and `addTorrent` have no control anywhere in the UI — legacy
 * never sets them either, so they are always `false`; `ExternalTools` ignores
 * both. They are still sent because the system test pins the payload's
 * completeness.
 */
export function buildExternalToolAddRequest(
    entry: Readonly<Record<string, unknown>>,
    addType: ExternalToolAddType,
): ExternalToolAddRequest {
    // The wire field is an enum, so an entry with no type yet (legacy's
    // "Custom" start) must omit it rather than send an empty string Jackson
    // cannot map.
    const type = text(entry.type) === "" ? undefined : text(entry.type);
    return {
        additionalParameters: text(entry.additionalParameters),
        addDisabledIndexers: entry.addDisabledIndexers === true,
        addTorrent: entry.addTorrent === true,
        addType,
        addUsenet: entry.addUsenet === true,
        animeCategories: text(entry.animeCategories),
        categories: text(entry.categories),
        configureForTorrents: entry.configureForTorrents === true,
        configureForUsenet: entry.configureForUsenet === true,
        discographySeedTime: text(entry.discographySeedTime),
        earlyDownloadLimit: text(entry.earlyDownloadLimit),
        enableAutomaticSearch: entry.enableAutomaticSearch === true,
        enableInteractiveSearch: entry.enableInteractiveSearch === true,
        enableRss: entry.enableRss === true,
        externalTool:
            type === undefined
                ? undefined
                : (EXTERNAL_TOOL_NAMES[type] ?? type),
        minimumSeeders: text(entry.minimumSeeders),
        nzbhydraHost: text(entry.nzbhydraHost),
        nzbhydraName: text(entry.nzbhydraName),
        priority:
            typeof entry.priority === "number" ? entry.priority : undefined,
        removeYearFromSearchString: entry.removeYearFromSearchString === true,
        seasonPackSeedTime: text(entry.seasonPackSeedTime),
        seedRatio: text(entry.seedRatio),
        seedTime: text(entry.seedTime),
        useHydraPriorities: entry.useHydraPriorities === true,
        xdarrApiKey: text(entry.apiKey),
        xdarrHost: text(entry.host),
    };
}

/**
 * A string field as legacy passes it on: verbatim when the entry holds one
 * (an empty string included — the backend distinguishes "" from absent for
 * `categories`), and dropped by `JSON.stringify` otherwise, which the server
 * reads as the `null` legacy would have sent.
 */
function text(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

/** `ExternalToolsWeb.ConnectionTestResult`. */
const connectionTestResultSchema = z.looseObject({
    message: z.string().nullish(),
    successful: z.boolean().nullish(),
});

/**
 * The two outcomes legacy's `testConnection`/`checkConnection` distinguish
 * (`formly-external-tools.js`): the tool answered, or it did not and the
 * server says why. A failed test is still an HTTP 200 carrying
 * `successful: false`; only a transport-level failure is a non-2xx response,
 * and it lands in `failed` too, with whatever message the body carried.
 */
export type ExternalToolConnectionResult =
    | {kind: "failed"; message: string}
    | {kind: "successful"};

/**
 * `API-CONFIG-EXTERNAL-CONNECTION`: asks the backend to call
 * `<host>/api?apikey=<key>` for an unsaved, in-progress external tool and
 * report whether it looks like an *arr instance. Nothing is written anywhere,
 * on either side.
 */
export async function testExternalToolConnection(
    transport: ApiTransport,
    request: ExternalToolAddRequest,
): Promise<ExternalToolConnectionResult> {
    let response: unknown;
    try {
        response = await transport.request<unknown>(TEST_CONNECTION_PATH, {
            json: request,
            method: "POST",
        });
    } catch (error) {
        return {kind: "failed", message: errorMessage(error)};
    }
    const parsed = connectionTestResultSchema.safeParse(response);
    if (!parsed.success) {
        // A body this build cannot read is not evidence that the tool answered.
        return {kind: "failed", message: UNKNOWN_ERROR};
    }
    if (parsed.data.successful === true) {
        return {kind: "successful"};
    }
    return {kind: "failed", message: parsed.data.message ?? UNKNOWN_ERROR};
}

/**
 * `ExternalTools.addNzbhydraAsIndexer`'s three answers as legacy branches on
 * them: it worked, it ran and returned `false` (the server collected its
 * reasons in `API-CONFIG-EXTERNAL-MESSAGES`, which this UI does not read), or
 * the request itself failed.
 */
export type ExternalToolConfigureResult =
    | {kind: "configured"}
    | {kind: "failed"; message: string}
    | {kind: "refused"};

/**
 * `API-CONFIG-EXTERNAL-CONFIGURE`: writes NZBHydra into the external tool.
 * This is the one configuration request in the whole area with a side effect
 * on another running application — it creates, updates, or deletes indexer
 * entries inside Sonarr/Radarr/Lidarr/Readarr — which is why the edit dialog
 * only closes once it has answered `true`.
 */
export async function configureExternalTool(
    transport: ApiTransport,
    request: ExternalToolAddRequest,
): Promise<ExternalToolConfigureResult> {
    let response: unknown;
    try {
        response = await transport.request<unknown>(CONFIGURE_PATH, {
            json: request,
            method: "POST",
        });
    } catch (error) {
        return {kind: "failed", message: errorMessage(error)};
    }
    // The endpoint produces a bare JSON `Boolean`; anything else is not a
    // confirmation and must not be treated as one.
    return response === true ? {kind: "configured"} : {kind: "refused"};
}

/** `ExternalToolsSyncService.SyncResult`. */
const syncResultSchema = z.looseObject({
    failureCount: z.number().nullish(),
    messages: z.array(z.string()).nullish(),
    successCount: z.number().nullish(),
});

export type ExternalToolSyncResult = {
    failureCount: number;
    messages: string[];
    successCount: number;
};

/**
 * `API-CONFIG-EXTERNAL-SYNC`: pushes the configured indexers into every
 * *enabled* external tool at once. It answers `0/0` without contacting
 * anything when `externalTools.syncOnConfigChange` is off
 * (`ExternalToolsSyncService.syncTools`), so "synced to 0 tools" is a real
 * outcome and not an error.
 *
 * Throws on a transport failure or an unreadable body; the caller reports it
 * the way legacy's error callback does.
 */
export async function syncAllExternalTools(
    transport: ApiTransport,
): Promise<ExternalToolSyncResult> {
    const response = await transport.request<unknown>(SYNC_ALL_PATH, {
        method: "POST",
    });
    const parsed = syncResultSchema.safeParse(response);
    if (!parsed.success) {
        throw new Error(
            "The external-tool sync response has an invalid format",
        );
    }
    return {
        failureCount: parsed.data.failureCount ?? 0,
        messages: parsed.data.messages ?? [],
        successCount: parsed.data.successCount ?? 0,
    };
}

/** Legacy's `error.data ? error.data.message : "Unknown error"`. */
export const UNKNOWN_ERROR = "Unknown error";

export function errorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        const data = error.data;
        if (typeof data === "string" && data !== "") {
            return data;
        }
        if (typeof data === "object" && data !== null) {
            const message = (data as {message?: unknown}).message;
            if (typeof message === "string" && message !== "") {
                return message;
            }
        }
    }
    return UNKNOWN_ERROR;
}
