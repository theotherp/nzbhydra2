import {z} from "zod";

import {ApiError, ApiTransport} from "../transport";

const DEBUG_ZIP_PATH = "internalapi/debuginfos/createAndProvideZipAsBytes";
const DEBUG_UPLOAD_PATH = "internalapi/debuginfos/createAndUploadDebugInfos";
const THREAD_DUMP_PATH = "internalapi/debuginfos/logThreadDump";
const SENSITIVE_LOGGING_PATH = "internalapi/debuginfos/sensitiveDataLogging";
const SQL_QUERY_PATH = "internalapi/debuginfos/executesqlquery";
const SQL_UPDATE_PATH = "internalapi/debuginfos/executesqlupdate";
const THREAD_CPU_PATH = "internalapi/debuginfos/threadCpuUsage";
const ENDPOINTS_PATH = "internalapi/debuginfos/endpoints";

/**
 * `actuator/heapdump` is Spring Boot's own endpoint, not an NZBHydra one, so
 * it never appears in the generated OpenAPI document. Legacy linked it
 * relative to the document base (`bugreport.html:65`) and so does this.
 */
const HEAP_DUMP_PATH = "actuator/heapdump";

export class MalformedDebugResponseError extends Error {
    constructor() {
        super("The debug response has an invalid format");
    }
}

/** `GenericResponse`: a refusal arrives inside an HTTP 200 body. */
const genericResponseSchema = z.looseObject({
    message: z.string().nullish(),
    successful: z.boolean().nullish(),
});

/**
 * `DebugInfosWeb.ThreadCpuUsageChartData`: one series per thread, each a list
 * of `TimeAndValue` records. `time` is a Jackson `Instant`, which serializes
 * either as an epoch number or as an ISO string depending on the mapper's
 * date configuration, so both are accepted and resolved by `C-DATE-TIME`.
 */
const threadCpuUsageSchema = z.array(
    z.looseObject({
        key: z.string().nullish(),
        values: z
            .array(
                z.looseObject({
                    time: z.union([z.string(), z.number()]).nullish(),
                    value: z.number().nullish(),
                }),
            )
            .nullish(),
    }),
);

type ThreadCpuPoint = {
    /** Epoch seconds, epoch millis, or a zoned string; see `C-DATE-TIME`. */
    time: number | string;
    value: number;
};

export type ThreadCpuSeries = {
    label: string;
    points: ThreadCpuPoint[];
};

export type DebugUploadResult =
    | {kind: "failed"; message: string | null}
    | {kind: "successful"; url: string};

export type SqlResult =
    | {kind: "failed"; message: string | null}
    | {kind: "successful"; output: string};

export type ThreadDumpResult = {kind: "failed"} | {kind: "successful"};

/**
 * `API-SYSTEM-DEBUG-ZIP`: the anonymized log and configuration archive. It is
 * produced as `application/zip`, so it goes through the transport's binary
 * path rather than `request`, which would ask for JSON.
 */
export async function downloadDebugInfos(
    transport: ApiTransport,
): Promise<Blob> {
    return transport.requestBlob(DEBUG_ZIP_PATH);
}

/** Legacy's download name (`system-controller.js:102`), in the browser's zone. */
export function debugInfosFileName(now: Date): string {
    const part = (value: number) => String(value).padStart(2, "0");
    return `nzbhydra-debuginfos-${now.getFullYear()}-${part(
        now.getMonth() + 1,
    )}-${part(now.getDate())}-${part(now.getHours())}-${part(
        now.getMinutes(),
    )}.zip`;
}

/**
 * `API-SYSTEM-DEBUG-UPLOAD`: creates the same archive and puts it on an
 * external file share, answering with the share's URL as `text/plain`.
 *
 * The URL is returned as *data*. Legacy built an anchor as an HTML string and
 * handed it to `ng-bind-html` (`system-controller.js:118`), which is an
 * injection-shaped hazard that is deliberately not reproduced: the caller
 * renders the value inside a React anchor, where it can only ever be an
 * attribute value and a text node.
 */
export async function uploadDebugInfos(
    transport: ApiTransport,
): Promise<DebugUploadResult> {
    let body: unknown;
    try {
        body = await transport.request<unknown>(DEBUG_UPLOAD_PATH);
    } catch (error) {
        // Legacy showed the failing response's body verbatim
        // (`system-controller.js:121`). It is only shown when it is text; a
        // structured error body is not a message for a human.
        return {kind: "failed", message: errorText(error)};
    }
    if (typeof body !== "string" || body.trim() === "") {
        return {kind: "failed", message: null};
    }
    return {kind: "successful", url: body.trim()};
}

/**
 * `API-SYSTEM-THREAD-DUMP`: writes a thread dump into the log file. Legacy
 * fired this and reported nothing at all (`system-controller.js:126-131`); the
 * outcome is reported here because a button that gives no sign of having run
 * cannot be told apart from a broken one.
 *
 * The dump itself is the response body and is not rendered, so the call goes
 * through the transport's blob path: `DebugInfosWeb.logThreadDump` declares no
 * `produces`, and the raw dump comes back labelled `application/json` without
 * being JSON, which `request` would fail to parse and report as an error even
 * though the dump was written.
 */
export async function logThreadDump(
    transport: ApiTransport,
): Promise<ThreadDumpResult> {
    try {
        await transport.requestBlob(THREAD_DUMP_PATH);
    } catch {
        return {kind: "failed"};
    }
    return {kind: "successful"};
}

/**
 * `API-SYSTEM-SENSITIVE-GET`: whether the log encoder's masking is currently
 * switched off. The endpoint answers with a bare boolean, which reaches the
 * transport as `true`/`false` or as the same word in text form depending on
 * the negotiated content type.
 */
export async function getSensitiveDataLogging(
    transport: ApiTransport,
): Promise<boolean> {
    return readBoolean(
        await transport.request<unknown>(SENSITIVE_LOGGING_PATH),
    );
}

/**
 * `API-SYSTEM-SENSITIVE-PUT`: switches masking off or on and answers with the
 * state the server ended up in. That returned state is what the caller shows —
 * never the optimistic flip that was requested, because the server is the only
 * thing that knows whether the encoder actually changed.
 */
export async function setSensitiveDataLogging(
    transport: ApiTransport,
    enabled: boolean,
): Promise<boolean> {
    const query = new URLSearchParams({enabled: String(enabled)});
    return readBoolean(
        await transport.request<unknown>(`${SENSITIVE_LOGGING_PATH}?${query}`, {
            method: "PUT",
        }),
    );
}

/**
 * `API-SYSTEM-SQL-QUERY`: runs a read query and answers with its result as
 * CSV inside a `GenericResponse`. The SQL is posted as the raw request body
 * (`@RequestBody String sql`), not as a JSON document or a form field.
 */
export async function executeSqlQuery(
    transport: ApiTransport,
    sql: string,
): Promise<SqlResult> {
    return sqlResult(transport, SQL_QUERY_PATH, sql, (message) => message);
}

/**
 * `API-SYSTEM-SQL-UPDATE`: runs a modifying statement and answers with the
 * affected row count, which legacy labelled in the output area
 * (`system-controller.js:168`).
 */
export async function executeSqlUpdate(
    transport: ApiTransport,
    sql: string,
): Promise<SqlResult> {
    return sqlResult(
        transport,
        SQL_UPDATE_PATH,
        sql,
        (message) => `${message} rows affected`,
    );
}

/**
 * `API-SYSTEM-THREAD-CPU`: the recorded per-thread CPU usage samples. The
 * server already drops every thread that never reached 1%, and returns an
 * empty list when the `Performance` logging marker is off — which is what the
 * chart's help text tells the reader to enable.
 */
export async function getThreadCpuUsage(
    transport: ApiTransport,
): Promise<ThreadCpuSeries[]> {
    const parsed = threadCpuUsageSchema.safeParse(
        await transport.request<unknown>(THREAD_CPU_PATH),
    );
    if (!parsed.success) {
        throw new MalformedDebugResponseError();
    }
    return parsed.data
        .filter((series) => typeof series.key === "string")
        .map((series) => ({
            label: series.key as string,
            points: (series.values ?? [])
                .filter(
                    (point) =>
                        point.time !== null &&
                        point.time !== undefined &&
                        typeof point.value === "number",
                )
                .map((point) => ({
                    time: point.time as number | string,
                    value: point.value as number,
                })),
        }))
        .filter((series) => series.points.length > 0);
}

/**
 * `API-SYSTEM-ENDPOINTS`: the running instance's request mappings, rendered by
 * the browser itself from the JSON the endpoint answers with — legacy opened
 * the address in a new tab rather than displaying it (`bugreport.html:107`).
 */
export function endpointsUrl(transport: ApiTransport): string {
    return transport.browserTransferUrl(ENDPOINTS_PATH);
}

/** `API-SYSTEM-HEAP-DUMP`: the JVM heap dump the browser downloads itself. */
export function heapDumpUrl(transport: ApiTransport): string {
    return transport.browserTransferUrl(HEAP_DUMP_PATH);
}

async function sqlResult(
    transport: ApiTransport,
    path: string,
    sql: string,
    output: (message: string) => string,
): Promise<SqlResult> {
    let body: unknown;
    try {
        body = await transport.request<unknown>(path, {
            body: sql,
            headers: {"Content-Type": "text/plain;charset=UTF-8"},
            method: "POST",
        });
    } catch {
        return {kind: "failed", message: null};
    }
    const parsed = genericResponseSchema.safeParse(body);
    if (!parsed.success) {
        return {kind: "failed", message: null};
    }
    if (parsed.data.successful === false) {
        return {kind: "failed", message: parsed.data.message ?? null};
    }
    return {kind: "successful", output: output(parsed.data.message ?? "")};
}

function readBoolean(value: unknown): boolean {
    if (typeof value === "boolean") {
        return value;
    }
    if (value === "true") {
        return true;
    }
    if (value === "false") {
        return false;
    }
    throw new MalformedDebugResponseError();
}

function errorText(error: unknown): string | null {
    if (!(error instanceof ApiError)) {
        return null;
    }
    return typeof error.data === "string" && error.data.trim() !== ""
        ? error.data.trim()
        : null;
}
