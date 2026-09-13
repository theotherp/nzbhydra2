import {useQuery} from "@tanstack/react-query";
import {useMemo} from "react";

import {safeConfigQueryOptions} from "../api/config/safeConfig";
import {ApiTransport} from "../api/transport";
import {SafeConfigContext, type BootstrapData} from "../bootstrap";

/**
 * ADR-0017: publishes `C-BOOTSTRAP-CONTEXT`'s safe configuration as reactive
 * server state. The query is seeded with the bootstrap value, so the first
 * render costs no request and behaves exactly like the old static read; a
 * successful config save invalidates `SAFE_CONFIG_QUERY_KEY` and every
 * consumer re-renders with the new value instead of the page being reloaded.
 */
export function SafeConfigProvider({
    bootstrap,
    children,
}: {
    bootstrap: BootstrapData;
    children: React.ReactNode;
}) {
    const transport = useMemo(
        () => new ApiTransport(bootstrap.baseUrl),
        [bootstrap.baseUrl],
    );
    const {data} = useQuery(
        safeConfigQueryOptions(transport, bootstrap.safeConfig),
    );
    return (
        <SafeConfigContext.Provider value={data}>
            {children}
        </SafeConfigContext.Provider>
    );
}
