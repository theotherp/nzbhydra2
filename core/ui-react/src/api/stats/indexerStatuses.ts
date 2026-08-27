import {z} from "zod";

import type {paths} from "../generated/openapi";
import {ApiTransport} from "../transport";

type IndexerStatusesResponse =
    paths["/internalapi/indexerstatuses"]["get"]["responses"][200]["content"]["*/*"];

export type IndexerStatus = {
    indexer: string;
    state:
        | "ENABLED"
        | "DISABLED_SYSTEM_TEMPORARY"
        | "DISABLED_SYSTEM"
        | "DISABLED_USER";
    disabledUntil?: number | string | null;
    lastError?: string | null;
    apiResetTime?: number | string | null;
    downloadResetTime?: number | string | null;
    apiHits?: number | null;
    apiHitLimit?: number | null;
    downloadHits?: number | null;
    downloadHitLimit?: number | null;
    vipExpirationDate?: string | null;
};

export type IndexerStatusList = {
    statuses: IndexerStatus[];
    malformedCount: number;
};

// Jackson serialises with its default ALWAYS inclusion, so every unset field of
// IndexerStatusesAndLimits.IndexerStatus arrives as an explicit null rather than
// being omitted. In zod 4 `.optional()` rejects null, so every nullable field
// uses `.nullish()`. Limits are legitimately configurable as 0 and the backend
// may report an empty last error, so neither is narrowed further.
const timestamp = z.union([z.number().finite(), z.string()]).nullish();
const statusSchema = z.object({
    indexer: z.string().min(1),
    state: z.enum([
        "ENABLED",
        "DISABLED_SYSTEM_TEMPORARY",
        "DISABLED_SYSTEM",
        "DISABLED_USER",
    ]),
    disabledUntil: timestamp,
    lastError: z.string().nullish(),
    apiResetTime: timestamp,
    downloadResetTime: timestamp,
    apiHits: z.number().int().nonnegative().nullish(),
    apiHitLimit: z.number().int().nonnegative().nullish(),
    downloadHits: z.number().int().nonnegative().nullish(),
    downloadHitLimit: z.number().int().nonnegative().nullish(),
    vipExpirationDate: z.string().nullish(),
});

export async function getIndexerStatuses(
    transport: ApiTransport,
): Promise<IndexerStatusList> {
    const response = await transport.request<IndexerStatusesResponse>(
        "internalapi/indexerstatuses",
    );
    return parseIndexerStatuses(response);
}

export function parseIndexerStatuses(response: unknown): IndexerStatusList {
    if (!Array.isArray(response))
        throw new MalformedIndexerStatusesResponseError();
    const statuses: IndexerStatus[] = [];
    let malformedCount = 0;
    for (const entry of response) {
        const parsed = statusSchema.safeParse(entry);
        if (parsed.success) statuses.push(parsed.data);
        else malformedCount++;
    }
    return {statuses: statuses.sort(statusOrder), malformedCount};
}

class MalformedIndexerStatusesResponseError extends Error {
    constructor() {
        super("The indexer statuses response has an invalid format");
    }
}

function statusOrder(left: IndexerStatus, right: IndexerStatus): number {
    const states = [
        "ENABLED",
        "DISABLED_SYSTEM_TEMPORARY",
        "DISABLED_SYSTEM",
        "DISABLED_USER",
    ];
    return (
        states.indexOf(left.state) - states.indexOf(right.state) ||
        left.indexer.localeCompare(right.indexer, undefined, {
            sensitivity: "base",
        })
    );
}
