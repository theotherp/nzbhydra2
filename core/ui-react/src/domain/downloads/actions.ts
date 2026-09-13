import type {SearchResult} from "../../api/search";
import {ApiTransport} from "../../api/transport";
import {z} from "zod";

export type Downloader = {
    name: string;
    enabled?: boolean;
    defaultCategory?: string | null;
    downloadType?: string;
    downloaderType?: string;
};
export type AddFilesRequest = {
    downloaderName: string;
    searchResults: Array<{
        searchResultId: string;
        originalCategory?: string;
        mappedCategory: string;
    }>;
    category: string | null;
    reason: string | null;
};
// FM-128: every download action's `addedIds`/`missedIds` is a
// `Collection<Long>` of search-result ids server-side
// (`AddNzbsResponse.java:23`, `SaveOrSendResultsResponse.java:22`,
// `FileZipResponse.java:22`), and those ids are 64-bit hashes -- a live one is
// `-4934754469460477069`. Zod 4's `.int()` bounds integers by
// `Number.MAX_SAFE_INTEGER`, so it rejected every real response and turned
// each successful bulk action into a `MalformedDownloadResponseError` the UI
// reported as "Unable to complete the download action.". Integrality is still
// checked here, without the safe-range bound `.int()` adds; a non-integer
// (and a non-number) is still rejected.
const resultIdSchema = z
    .number()
    .refine(Number.isInteger, {message: "Expected an integer result id"});
const actionResponseSchema = z.object({
    successful: z.boolean(),
    message: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    addedIds: z
        .array(resultIdSchema)
        .nullish()
        .transform((value) => value ?? []),
    missedIds: z
        .array(resultIdSchema)
        .nullish()
        .transform((value) => value ?? []),
    invalidIds: z
        .array(z.string())
        .nullish()
        .transform((value) => value ?? []),
});
const categoriesSchema = z.array(z.string().min(1));
const duplicateResponseSchema = z.object({reasonRequired: z.boolean()});
const zipResponseSchema = actionResponseSchema
    .extend({
        zipFilepath: z
            .string()
            .min(1)
            .nullish()
            .transform((value) => value ?? undefined),
    })
    .superRefine((response, context) => {
        if (response.successful && !response.zipFilepath) {
            context.addIssue({
                code: "custom",
                message:
                    "A successful ZIP preparation response requires a ZIP file path",
            });
        }
    });

export type ActionResponse = z.infer<typeof actionResponseSchema>;

export class MalformedDownloadResponseError extends Error {
    constructor() {
        super("The download service returned an invalid response");
    }
}

function validate<T>(schema: z.ZodType<T>, response: unknown): T {
    const parsed = schema.safeParse(response);
    if (!parsed.success) {
        throw new MalformedDownloadResponseError();
    }
    return parsed.data;
}

export function downloadId(result: SearchResult): string {
    return result.downloadId ?? result.searchResultId;
}

// Download-history rows (F-HISTORY-DOWNLOADS) reuse the search-results
// direct-download action against their embedded, already-downloaded search
// result rather than a live search result; only the fields the direct
// action reads (identifier, download type) are populated.
export function historyDownloadResult(searchResult: {
    id: string;
    title: string;
    downloadType?: string;
}): SearchResult {
    return {
        searchResultId: searchResult.id,
        title: searchResult.title,
        indexer: "",
        category: "",
        downloadType: searchResult.downloadType,
    };
}

export function addFilesRequest(
    downloader: Downloader,
    results: SearchResult[],
    category: string | null,
    reason: string | null,
): AddFilesRequest {
    return {
        downloaderName: downloader.name,
        category,
        reason,
        searchResults: results.map((result) => ({
            searchResultId: downloadId(result),
            originalCategory: result.originalCategory,
            mappedCategory: result.category,
        })),
    };
}

export function configuredDownloaders(safeConfig: unknown): Downloader[] {
    const downloading =
        record(safeConfig) && record(safeConfig.downloading)
            ? safeConfig.downloading
            : undefined;
    const downloaders =
        downloading && Array.isArray(downloading.downloaders)
            ? downloading.downloaders
            : [];
    return downloaders
        .filter(record)
        .filter(
            (value) => value.enabled === true && typeof value.name === "string",
        )
        .map((value) => value as Downloader);
}

/**
 * The downloader's configured default category, or `null` when it has none.
 * An unconfigured `defaultCategory` reaches the UI as `undefined` (the Java
 * field has no initializer) or as `""`; both mean "no default", and both must
 * send `null` rather than an empty category. FM-114.
 *
 * FM-186 moved this here from `features/search/results/DownloadActions.tsx`,
 * unchanged: the bulk bar and the per-row send control both resolve a
 * category with it, so it is downloader domain logic rather than one
 * component's private helper.
 */
export function configuredDefaultCategory(
    downloader: Downloader,
): string | null {
    return downloader.defaultCategory ? downloader.defaultCategory : null;
}

/**
 * Whether one result can be sent to one downloader at all.
 *
 * Legacy's `addable-nzbs.js` filtered the row's downloader list with the same
 * two rules, and the bulk bar has enforced them since FM-159: a TORBOX result
 * goes only to a TORBOX downloader, and a torrent goes to no downloader at all
 * (torrents are saved or sent by `saveOrSendTorrents` instead). Moved here by
 * FM-186 with its semantics untouched, for the same reason as
 * `configuredDefaultCategory` above.
 */
export function isCompatibleWithDownloader(
    result: SearchResult,
    downloader: Downloader,
): boolean {
    if (result.downloadType === "TORBOX") {
        return downloader.downloaderType === "TORBOX";
    }
    return result.downloadType !== "TORRENT";
}

export function downloadSettings(safeConfig: unknown): {
    saveNzbs: boolean;
    saveTorrents: boolean;
    sendMagnets: boolean;
    zip: boolean;
} {
    const downloading =
        record(safeConfig) && record(safeConfig.downloading)
            ? safeConfig.downloading
            : {};
    return {
        saveNzbs:
            typeof downloading.saveNzbsTo === "string" &&
            downloading.saveNzbsTo.length > 0,
        saveTorrents:
            typeof downloading.saveTorrentsTo === "string" &&
            downloading.saveTorrentsTo.length > 0,
        sendMagnets: downloading.sendMagnetLinks === true,
        zip:
            record(safeConfig) &&
            record(safeConfig.searching) &&
            safeConfig.searching.showResultsAsZipButton === true,
    };
}

export async function categories(
    transport: ApiTransport,
    downloader: Downloader,
): Promise<string[]> {
    return validate(
        categoriesSchema,
        await transport.request<unknown>(
            `internalapi/downloader/${encodeURIComponent(downloader.name)}/categories`,
        ),
    );
}

export async function requiresDuplicateReason(
    transport: ApiTransport,
    request: AddFilesRequest,
): Promise<boolean> {
    const response = await transport.request<unknown>(
        "internalapi/downloader/checkDuplicateMovieDownload",
        {method: "PUT", json: request},
    );
    return validate(duplicateResponseSchema, response).reasonRequired;
}

export async function sendToDownloader(
    transport: ApiTransport,
    request: AddFilesRequest,
): Promise<ActionResponse> {
    return validate(
        actionResponseSchema,
        await transport.request<unknown>("internalapi/downloader/addNzbs", {
            method: "PUT",
            json: request,
        }),
    );
}

export async function saveNzbs(
    transport: ApiTransport,
    results: SearchResult[],
): Promise<ActionResponse> {
    return validate(
        actionResponseSchema,
        await transport.request<unknown>("internalapi/saveNzbsToBlackhole", {
            method: "PUT",
            json: results.map(downloadId),
        }),
    );
}

export async function saveOrSendTorrents(
    transport: ApiTransport,
    results: SearchResult[],
): Promise<ActionResponse> {
    return validate(
        actionResponseSchema,
        await transport.request<unknown>("internalapi/saveOrSendTorrents", {
            method: "PUT",
            json: results.map(downloadId),
        }),
    );
}

export async function prepareZip(
    transport: ApiTransport,
    results: SearchResult[],
): Promise<ActionResponse & {zipFilepath?: string}> {
    return validate(
        zipResponseSchema,
        await transport.request<unknown>("internalapi/nzbzip", {
            method: "POST",
            json: results.map(downloadId),
        }),
    );
}

export async function downloadZip(
    transport: ApiTransport,
    zipFilepath: string,
): Promise<Blob> {
    return transport.requestBlob("internalapi/nzbzipDownload", {
        method: "POST",
        json: zipFilepath,
    });
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
