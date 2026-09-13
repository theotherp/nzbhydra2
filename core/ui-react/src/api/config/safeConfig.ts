import {queryOptions} from "@tanstack/react-query";

import type {SafeConfig} from "../../bootstrap";
import {ApiTransport} from "../transport";

export const SAFE_CONFIG_QUERY_KEY = ["config", "safe"] as const;

/** `API-CONFIG-SAFE`: the non-sensitive projection every session may read. */
export async function getSafeConfig(
    transport: ApiTransport,
): Promise<SafeConfig> {
    const response = await transport.request<unknown>(
        "internalapi/config/safe",
    );
    return typeof response === "object" && response !== null
        ? (response as Record<string, unknown>)
        : null;
}

/**
 * ADR-0017: `C-BOOTSTRAP-CONTEXT`'s safe configuration is reactive server
 * state. The query is seeded with the value the server shell already embedded
 * in the page, so no request is made on load, and it never goes stale on its
 * own — the only thing that refetches it is an explicit invalidation after a
 * successful config save.
 */
export function safeConfigQueryOptions(
    transport: ApiTransport,
    initialData: SafeConfig,
) {
    return queryOptions({
        queryKey: SAFE_CONFIG_QUERY_KEY,
        queryFn: () => getSafeConfig(transport),
        initialData,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}
