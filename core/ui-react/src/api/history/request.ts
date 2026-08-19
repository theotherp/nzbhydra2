import {historyFilterModel, type HistoryDimension} from "./filters";
import type {HistoryFilterModel, HistoryFilterValues} from "./filters";
import {ApiTransport} from "../transport";

/**
 * `C-HISTORY-REQUEST`, part two: the whole `org.nzbhydra.historystats.stats.HistoryRequest`
 * body and the paged envelope every `HistoryWeb` endpoint answers with.
 *
 * A history route supplies its declared dimensions (`filters.ts`), the current
 * filter input, paging and sorting, plus a parser for one entry of its own DTO;
 * everything else -- the `filterModel`, the `distinct`/`onlyCurrentUser` flags,
 * the `content`/`totalElements` envelope check and the per-entry
 * `malformedCount` -- is built here, so no route restates it.
 */

export type HistorySortModel = {
    column: string;
    /** 1 ascending, 2 descending -- `History.java`'s own encoding. */
    sortMode: 1 | 2;
};

export type HistoryRequestBody = {
    page: number;
    limit: number;
    filterModel: HistoryFilterModel;
    sortModel: HistorySortModel;
    distinct: boolean;
    onlyCurrentUser: boolean;
};

export type HistoryQuery = {
    dimensions: readonly HistoryDimension[];
    values: HistoryFilterValues;
    /** 1-based, as `History.java` expects. */
    page: number;
    limit: number;
    sort: HistorySortModel;
    distinct?: boolean;
    onlyCurrentUser?: boolean;
};

export type HistoryPage<TEntry> = {
    entries: TEntry[];
    totalElements: number;
    /** Entries the route's own parser rejected; never silently dropped. */
    malformedCount: number;
};

export function historyRequestBody(query: HistoryQuery): HistoryRequestBody {
    return {
        page: query.page,
        limit: query.limit,
        filterModel: historyFilterModel(query.dimensions, query.values),
        sortModel: query.sort,
        distinct: query.distinct ?? false,
        onlyCurrentUser: query.onlyCurrentUser ?? false,
    };
}

export async function requestHistoryPage<TEntry>(
    transport: ApiTransport,
    request: {
        /** The `HistoryWeb` endpoint, relative to the application base. */
        path: string;
        /** Names the surface in the invalid-format error, e.g. "Download history". */
        label: string;
        query: HistoryQuery;
        parseEntry: (value: unknown) => TEntry | undefined;
    },
): Promise<HistoryPage<TEntry>> {
    const response = await transport.request<unknown>(request.path, {
        method: "POST",
        json: historyRequestBody(request.query),
    });
    return historyPage(response, request.label, request.parseEntry);
}

/**
 * Validates Spring's `Page` envelope and applies the route's entry parser. A
 * malformed entry is counted rather than thrown on, so one bad row never hides
 * the rest of a page.
 */
export function historyPage<TEntry>(
    response: unknown,
    label: string,
    parseEntry: (value: unknown) => TEntry | undefined,
): HistoryPage<TEntry> {
    if (
        !response ||
        typeof response !== "object" ||
        !Array.isArray((response as {content?: unknown}).content) ||
        !Number.isInteger((response as {totalElements?: unknown}).totalElements)
    ) {
        throw new Error(`${label} response has an invalid format`);
    }
    const entries: TEntry[] = [];
    let malformedCount = 0;
    for (const entry of (response as {content: unknown[]}).content) {
        const parsed = parseEntry(entry);
        if (parsed === undefined) malformedCount++;
        else entries.push(parsed);
    }
    return {
        entries,
        totalElements: (response as {totalElements: number}).totalElements,
        malformedCount,
    };
}
