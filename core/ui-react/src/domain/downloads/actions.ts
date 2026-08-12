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
const actionResponseSchema = z.object({
    successful: z.boolean(),
    message: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    addedIds: z
        .array(z.number().int())
        .nullish()
        .transform((value) => value ?? []),
    missedIds: z
        .array(z.number().int())
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
