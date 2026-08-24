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
    disabledUntil?: number | string;
    lastError?: string;
    apiResetTime?: number | string;
    downloadResetTime?: number | string;
    apiHits?: number;
    apiHitLimit?: number;
    downloadHits?: number;
    downloadHitLimit?: number;
    vipExpirationDate?: string;
};

export type IndexerStatusList = {
    statuses: IndexerStatus[];
    malformedCount: number;
};

const timestamp = z.union([z.number().finite(), z.string().min(1)]).optional();
const statusSchema = z.object({
    indexer: z.string().min(1),
    state: z.enum([
        "ENABLED",
        "DISABLED_SYSTEM_TEMPORARY",
        "DISABLED_SYSTEM",
        "DISABLED_USER",
    ]),
    disabledUntil: timestamp,
    lastError: z.string().min(1).optional(),
    apiResetTime: timestamp,
    downloadResetTime: timestamp,
    apiHits: z.number().int().nonnegative().optional(),
    apiHitLimit: z.number().int().positive().optional(),
    downloadHits: z.number().int().nonnegative().optional(),
    downloadHitLimit: z.number().int().positive().optional(),
    vipExpirationDate: z.string().min(1).optional(),
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
