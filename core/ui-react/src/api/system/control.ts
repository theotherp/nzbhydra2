import {z} from "zod";

import {ApiTransport} from "../transport";

const SHUTDOWN_PATH = "internalapi/control/shutdown";
const RELOAD_CONFIG_PATH = "internalapi/config/reload";

/**
 * `GenericResponse` (`shared/mapping/.../GenericResponse.java`): both endpoints
 * answer with it, and both can report a refusal *inside* an HTTP 200 body
 * (`ConfigWeb.reloadConfig` returns `new GenericResponse(false, message)` when
 * loading the file throws). Every field is optional in the generated schema,
 * so the two values that are actually read are validated here.
 */
const genericResponseSchema = z.looseObject({
    message: z.string().nullish(),
    successful: z.boolean().nullish(),
});

export type SystemControlResult =
    | {kind: "failed"; message: string | null}
    | {kind: "successful"};

/**
 * `API-SYSTEM-SHUTDOWN`: asks the running instance to exit
 * (`SystemControlWeb.shutdown`). It answers `GenericResponse.ok()` *before*
 * the JVM goes away, so a reachable instance reports success and only an
 * unreachable one (or a session without the admin role) fails — which is
 * exactly the split legacy's two growls describe
 * (`system-controller.js:17-24`).
 */
export async function shutdownInstance(
    transport: ApiTransport,
): Promise<SystemControlResult> {
    return requestControlAction(transport, SHUTDOWN_PATH);
}

/**
 * `API-CONFIG-RELOAD`: re-reads `nzbhydra.yml` from disk into the running
 * configuration (`ConfigWeb.reloadConfig`, legacy
 * `config-service.js:41-45`). Unlike a save, it never writes, which is why
 * the settings that need a restart to take effect are called out in the
 * caller's success wording rather than being applied here.
 */
export async function reloadConfigFromFile(
    transport: ApiTransport,
): Promise<SystemControlResult> {
    return requestControlAction(transport, RELOAD_CONFIG_PATH);
}

async function requestControlAction(
    transport: ApiTransport,
    path: string,
): Promise<SystemControlResult> {
    let response;
    try {
        response = genericResponseSchema.parse(
            await transport.request<unknown>(path),
        );
    } catch {
        // A transport failure, a non-2xx status, or a body that is not a
        // `GenericResponse` at all: nothing was confirmed, so it is a failure
        // with no server-provided reason.
        return {kind: "failed", message: null};
    }
    // `successful` is only treated as a refusal when the server explicitly
    // says so; an endpoint that answers 200 with no body has still run.
    if (response.successful === false) {
        return {kind: "failed", message: response.message ?? null};
    }
    return {kind: "successful"};
}
