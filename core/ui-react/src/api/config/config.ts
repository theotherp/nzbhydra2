import {queryOptions} from "@tanstack/react-query";

import {ApiTransport} from "../transport";
import {
    parseApiHelp,
    parseConfig,
    parseConfigValidationResult,
    type ApiHelp,
    type ConfigValidationResult,
    type ConfigValues,
} from "./schema";

const CONFIG_PATH = "internalapi/config";

export const CONFIG_QUERY_KEY = ["config"] as const;

/** `API-CONFIG-GET`: the complete `BaseConfig` prepared for display. */
export async function getConfig(
    transport: ApiTransport,
): Promise<ConfigValues> {
    return parseConfig(await transport.request<unknown>(CONFIG_PATH));
}

export function configQueryOptions(transport: ApiTransport) {
    return queryOptions({
        queryKey: CONFIG_QUERY_KEY,
        queryFn: () => getConfig(transport),
        // The whole config is held in one React Hook Form for as long as the
        // config area is open; a background refetch that replaced it would
        // silently discard the admin's unsaved edits.
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

/**
 * `API-CONFIG-PUT`: replaces the entire configuration file. A rejected config
 * is reported through `ConfigValidationResult.errorMessages` with HTTP 200 —
 * only a transport/authorization failure throws.
 */
export async function saveConfig(
    transport: ApiTransport,
    config: ConfigValues,
): Promise<ConfigValidationResult> {
    return parseConfigValidationResult(
        await transport.request<unknown>(CONFIG_PATH, {
            json: config,
            method: "PUT",
        }),
    );
}

/** `API-CONFIG-API-HELP`: the request-derived newznab/torznab endpoints. */
export async function getApiHelp(transport: ApiTransport): Promise<ApiHelp> {
    return parseApiHelp(
        await transport.request<unknown>(`${CONFIG_PATH}/apiHelp`),
    );
}
