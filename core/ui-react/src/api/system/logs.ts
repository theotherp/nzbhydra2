import {z} from "zod";

import {ApiTransport} from "../transport";

const JSON_LOGS_PATH = "internalapi/debuginfos/jsonlogs";
const CURRENT_LOG_PATH = "internalapi/debuginfos/currentlogfile";
const LOG_FILE_NAMES_PATH = "internalapi/debuginfos/logfilenames";
const DOWNLOAD_LOG_PATH = "internalapi/debuginfos/downloadlog";

/** Legacy's page size (`hydra-log.js:23`), also the server's own default. */
export const LOG_PAGE_SIZE = 500;

/**
 * `JsonLogResponse` (`LogContentProvider`): `lines` are whole logstash records
 * whose keys depend on what the logging pipeline attached to the event, so
 * every line is validated as an open record and the fields the viewer reads
 * are picked out of it. `hasMore` is the server's "the reversed reader still
 * had a line after this page" flag, which is what gates paging further back.
 */
const jsonLogResponseSchema = z.looseObject({
    hasMore: z.boolean().nullish(),
    lines: z.array(z.record(z.string(), z.unknown())).nullish(),
});

const logFileNamesSchema = z.array(z.string());

/**
 * One log record. `fields` keeps the untouched line so the entry dialog can
 * show everything the server logged, not only the columns the table renders.
 */
export type LogEntry = {
    fields: Record<string, unknown>;
    ipAddress: string | null;
    level: string | null;
    logger: string | null;
    message: string | null;
    stackTrace: string | null;
    /** `@timestamp`: epoch seconds, epoch millis, or a zoned string. */
    timestamp: number | string | null;
    username: string | null;
};

export type LogPage = {
    entries: LogEntry[];
    hasMore: boolean;
    offset: number;
};

export class MalformedLogResponseError extends Error {
    constructor() {
        super("The log response has an invalid format");
    }
}

/** `API-SYSTEM-LOG-JSON`: one page of records, newest first. */
export async function getJsonLogs(
    transport: ApiTransport,
    offset: number,
): Promise<LogPage> {
    const query = new URLSearchParams({
        limit: String(LOG_PAGE_SIZE),
        offset: String(offset),
    });
    return parseLogPage(
        await transport.request<unknown>(`${JSON_LOGS_PATH}?${query}`),
        offset,
    );
}

/**
 * `API-SYSTEM-LOG-CURRENT`: the raw current log file. The endpoint produces
 * `text/plain` only, so it is fetched through `requestBlob` — `request` would
 * send `Accept: application/json` and the server would answer 406.
 */
export async function getCurrentLogFile(
    transport: ApiTransport,
): Promise<string> {
    return blobText(await transport.requestBlob(CURRENT_LOG_PATH));
}

/**
 * `FileReader` rather than `Blob.text()`: the file is decoded the same way in
 * every environment the code runs in, including the jsdom build the component
 * tests use, whose `Blob` predates `text()`.
 */
function blobText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () =>
            reject(reader.error ?? new Error("Unable to read the log file"));
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.readAsText(blob);
    });
}

/** `API-SYSTEM-LOG-FILES`: the log directory's files, newest first. */
export async function getLogFileNames(
    transport: ApiTransport,
): Promise<string[]> {
    const parsed = logFileNamesSchema.safeParse(
        await transport.request<unknown>(LOG_FILE_NAMES_PATH),
    );
    if (!parsed.success) {
        throw new MalformedLogResponseError();
    }
    return parsed.data;
}

/**
 * `API-SYSTEM-LOG-DOWNLOAD`: the browser fetches the file itself from this
 * base-URL-aware address (legacy `log.html:79`), so no blob round trip is
 * needed and the download keeps the file's own name.
 */
export function logFileDownloadUrl(
    transport: ApiTransport,
    logFileName: string,
): string {
    const query = new URLSearchParams({logfilename: logFileName});
    return transport.browserTransferUrl(`${DOWNLOAD_LOG_PATH}?${query}`);
}

/**
 * Legacy `getOlderFormatted` (`hydra-log.js:66-71`): one page further back.
 * Only reachable while the server reports `hasMore`.
 */
export function olderLogOffset(offset: number): number {
    return offset + LOG_PAGE_SIZE;
}

/**
 * Legacy `getNewerFormatted` (`hydra-log.js:73-77`): one page towards the
 * newest entries, clamped at the newest page rather than going negative.
 */
export function newerLogOffset(offset: number): number {
    return Math.max(offset - LOG_PAGE_SIZE, 0);
}

export function parseLogPage(response: unknown, offset: number): LogPage {
    const parsed = jsonLogResponseSchema.safeParse(response);
    if (!parsed.success) {
        throw new MalformedLogResponseError();
    }
    return {
        entries: (parsed.data.lines ?? []).map(parseLogEntry),
        hasMore: parsed.data.hasMore === true,
        offset,
    };
}

function parseLogEntry(fields: Record<string, unknown>): LogEntry {
    const timestamp = fields["@timestamp"];
    return {
        fields,
        ipAddress: stringField(fields.IPADDRESS),
        level: stringField(fields.level),
        logger: stringField(fields.logger_name),
        message: stringField(fields.message),
        stackTrace: stringField(fields.stack_trace),
        timestamp:
            typeof timestamp === "number" || typeof timestamp === "string"
                ? timestamp
                : null,
        username: stringField(fields.USERNAME),
    };
}

function stringField(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}
