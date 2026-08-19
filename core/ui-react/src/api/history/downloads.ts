import {ApiTransport} from "../transport";

export type DownloadHistoryFilters = {
    after?: string;
    before?: string;
    indexer?: string;
    title?: string;
    status?: DownloadStatus | "all";
    source?: "all" | "INTERNAL" | "API";
    minAge?: string;
    maxAge?: string;
    username?: string;
    ip?: string;
};

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

export type DownloadHistoryResult = {
    downloads: DownloadHistoryEntry[];
    totalElements: number;
    malformedCount: number;
};

const STATUS_VALUES: ReadonlySet<string> = new Set(
    DOWNLOAD_STATUSES.map((status) => status.value),
);

export function downloadHistoryRequest(
    page: number,
    limit: number,
    filters: DownloadHistoryFilters,
    sort: DownloadHistorySort,
) {
    const filterModel: Record<
        string,
        {filterType: string; filterValue: unknown; isBoolean: false}
    > = {};
    // The server's shared org.nzbhydra.historystats.FilterDefinition has a
    // vestigial third `isBoolean` field (never read by the actual filter
    // logic in History.java) that Jackson's implicit-constructor binding
    // nonetheless requires every entry to supply -- omitting it, even for a
    // non-boolean filter, rejects the whole request with a 400 "Cannot map
    // `null` into type `boolean`". Send a constant `false` for every entry.
    const text = (column: string, value: string | undefined) => {
        if (value?.trim())
            filterModel[column] = {
                filterType: "freetext",
                filterValue: value.trim(),
                isBoolean: false,
            };
    };
    if (filters.after || filters.before) {
        filterModel.time = {
            filterType: "time",
            filterValue: {
                after: toServerTime(filters.after),
                before: toServerTime(filters.before),
            },
            isBoolean: false,
        };
    }
    text("name", filters.indexer);
    text("title", filters.title);
    if (filters.status && filters.status !== "all")
        filterModel.status = {
            filterType: "checkboxes",
            filterValue: [filters.status],
            isBoolean: false,
        };
    if (filters.source && filters.source !== "all")
        filterModel.access_source = {
            filterType: "boolean",
            filterValue: filters.source,
            isBoolean: false,
        };
    const ageRange: Record<string, string> = {};
    if (filters.minAge?.trim()) ageRange.min = filters.minAge.trim();
    if (filters.maxAge?.trim()) ageRange.max = filters.maxAge.trim();
    if (Object.keys(ageRange).length > 0)
        filterModel.age = {
            filterType: "numberRange",
            filterValue: ageRange,
            isBoolean: false,
        };
    text("username", filters.username);
    text("ip", filters.ip);
    return {
        page,
        limit,
        filterModel,
        sortModel: sort,
        distinct: false,
        onlyCurrentUser: false,
    };
}

export async function getDownloadHistory(
    transport: ApiTransport,
    page: number,
    limit: number,
    filters: DownloadHistoryFilters,
    sort: DownloadHistorySort,
): Promise<DownloadHistoryResult> {
    const response = await transport.request<unknown>(
        "internalapi/history/downloads",
        {
            method: "POST",
            json: downloadHistoryRequest(page, limit, filters, sort),
        },
    );
    if (
        !response ||
        typeof response !== "object" ||
        !Array.isArray((response as {content?: unknown}).content) ||
        !Number.isInteger((response as {totalElements?: unknown}).totalElements)
    ) {
        throw new Error("Download history response has an invalid format");
    }
    const downloads: DownloadHistoryEntry[] = [];
    let malformedCount = 0;
    for (const entry of (response as {content: unknown[]}).content) {
        const parsed = downloadHistoryEntry(entry);
        if (parsed) downloads.push(parsed);
        else malformedCount++;
    }
    return {
        downloads,
        totalElements: (response as {totalElements: number}).totalElements,
        malformedCount,
    };
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

function toServerTime(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
