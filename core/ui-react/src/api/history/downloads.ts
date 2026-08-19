import type {HistoryDimension} from "./filters";
import {
    requestHistoryPage,
    type HistoryPage,
    type HistoryQuery,
} from "./request";
import {ApiTransport} from "../transport";

export type DownloadHistorySort = {
    column:
        | "time"
        | "name"
        | "title"
        | "status"
        | "access_source"
        | "age"
        | "username"
        | "ip";
    sortMode: 1 | 2;
};

// Keep in sync with server org.nzbhydra.downloading.FileDownloadStatus; labels
// match the legacy download-history filter/status text exactly.
export const DOWNLOAD_STATUSES = [
    {value: "NONE", label: "None"},
    {value: "REQUESTED", label: "Requested"},
    {value: "INTERNAL_ERROR", label: "Internal error"},
    {value: "NZB_DOWNLOAD_SUCCESSFUL", label: "NZB downloaded successful"},
    {value: "NZB_DOWNLOAD_ERROR", label: "NZB download error"},
    {value: "NZB_ADDED", label: "NZB added"},
    {value: "NZB_NOT_ADDED", label: "NZB not added"},
    {value: "NZB_ADD_ERROR", label: "NZB add error"},
    {value: "NZB_ADD_REJECTED", label: "NZB add rejected"},
    {
        value: "CONTENT_DOWNLOAD_SUCCESSFUL",
        label: "Content download successful",
    },
    {value: "CONTENT_DOWNLOAD_WARNING", label: "Content download warning"},
    {value: "CONTENT_DOWNLOAD_ERROR", label: "Content download error"},
] as const;

export type DownloadStatus = (typeof DOWNLOAD_STATUSES)[number]["value"];

export type DownloadHistorySearchResult = {
    id: string;
    title: string;
    indexer?: string;
    details?: string;
    downloadType?: string;
    indexerGuid?: string;
};

export type DownloadHistoryEntry = {
    id: number;
    time?: number | string;
    status: DownloadStatus;
    accessSource?: "INTERNAL" | "API";
    age?: number;
    username?: string;
    ip?: string;
    searchResult: DownloadHistorySearchResult;
};

const STATUS_VALUES: ReadonlySet<string> = new Set(
    DOWNLOAD_STATUSES.map((status) => status.value),
);

/**
 * The route's own filter dimensions, in the shared `C-HISTORY-REQUEST`
 * vocabulary. Every dimension keeps the server column and accessible label the
 * route already shipped; `Indexer` and `Result` are multi-select `checkboxes`
 * on `name`/`status`, matching legacy's own `checkboxes-filter` columns
 * (`download-history.html`) under ADR-0016's semantics.
 *
 * `indexerNames` are the configured indexer names, which legacy builds the same
 * way (`download-history-controller.js:21-24` iterates the safe config's
 * indexers unfiltered), so this needs no endpoint of its own.
 */
export function downloadHistoryDimensions(options: {
    indexerNames: readonly string[];
    showsUsername: boolean;
    showsIp: boolean;
}): HistoryDimension[] {
    return [
        {
            kind: "time",
            id: "time",
            column: "time",
            label: "Time",
            afterLabel: "After",
            beforeLabel: "Before",
        },
        {
            kind: "checkboxes",
            id: "indexer",
            column: "name",
            label: "Indexer",
            options: options.indexerNames.map((name) => ({
                value: name,
                label: name,
            })),
        },
        {kind: "freetext", id: "title", column: "title", label: "Title"},
        {
            kind: "checkboxes",
            id: "result",
            column: "status",
            label: "Result",
            options: DOWNLOAD_STATUSES.map((status) => ({
                value: status.value,
                label: status.label,
            })),
        },
        {
            kind: "boolean",
            id: "source",
            column: "access_source",
            label: "Source",
            allLabel: "All sources",
            options: [
                {value: "INTERNAL", label: "Internal"},
                {value: "API", label: "API"},
            ],
        },
        {
            kind: "numberRange",
            id: "age",
            column: "age",
            label: "Age",
            minLabel: "Minimum age (days)",
            maxLabel: "Maximum age (days)",
        },
        ...(options.showsUsername
            ? ([
                  {
                      kind: "freetext",
                      id: "username",
                      column: "username",
                      label: "Username",
                  },
              ] as const)
            : []),
        ...(options.showsIp
            ? ([
                  {
                      kind: "freetext",
                      id: "ip",
                      column: "ip",
                      label: "IP address",
                  },
              ] as const)
            : []),
    ];
}

export async function getDownloadHistory(
    transport: ApiTransport,
    query: HistoryQuery,
): Promise<HistoryPage<DownloadHistoryEntry>> {
    return requestHistoryPage(transport, {
        path: "internalapi/history/downloads",
        label: "Download history",
        query,
        parseEntry: downloadHistoryEntry,
    });
}

function downloadHistoryEntry(
    value: unknown,
): DownloadHistoryEntry | undefined {
    if (!value || typeof value !== "object") return undefined;
    const entry = value as Record<string, unknown>;
    const id = Number(entry.id);
    if (!Number.isInteger(id)) return undefined;
    if (typeof entry.status !== "string" || !STATUS_VALUES.has(entry.status))
        return undefined;
    const searchResult = downloadHistorySearchResult(entry.searchResult);
    if (!searchResult) return undefined;
    const accessSource =
        entry.accessSource === "INTERNAL" || entry.accessSource === "API"
            ? entry.accessSource
            : undefined;
    const age =
        typeof entry.age === "number" && Number.isInteger(entry.age)
            ? entry.age
            : undefined;
    const optionalText = (field: string) =>
        typeof entry[field] === "string" && entry[field]
            ? (entry[field] as string)
            : undefined;
    return {
        id,
        time:
            typeof entry.time === "number" || typeof entry.time === "string"
                ? entry.time
                : undefined,
        status: entry.status as DownloadStatus,
        accessSource,
        age,
        username: optionalText("username"),
        ip: optionalText("ip"),
        searchResult,
    };
}

function downloadHistorySearchResult(
    value: unknown,
): DownloadHistorySearchResult | undefined {
    if (!value || typeof value !== "object") return undefined;
    const result = value as Record<string, unknown>;
    if (typeof result.id !== "string" || !result.id) return undefined;
    if (typeof result.title !== "string" || !result.title) return undefined;
    const indexer =
        result.indexer &&
        typeof result.indexer === "object" &&
        typeof (result.indexer as Record<string, unknown>).name === "string"
            ? ((result.indexer as Record<string, unknown>).name as string)
            : undefined;
    const optionalText = (field: string) =>
        typeof result[field] === "string" && result[field]
            ? (result[field] as string)
            : undefined;
    return {
        id: result.id,
        title: result.title,
        indexer,
        details: optionalText("details"),
        downloadType: optionalText("downloadType"),
        indexerGuid: optionalText("indexerGuid"),
    };
}
