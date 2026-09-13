import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../transport";
import {
    getCurrentLogFile,
    getJsonLogs,
    getLogFileNames,
    logFileDownloadUrl,
    LOG_PAGE_SIZE,
    MalformedLogResponseError,
    newerLogOffset,
    olderLogOffset,
    parseLogPage,
} from "./logs";

function textResponse(body: string): Response {
    return new Response(body, {
        headers: {"Content-Type": "text/plain"},
        status: 200,
    });
}

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
        status: 200,
    });
}

function transportFor(answer: () => Response) {
    const fetchMock = vi.fn<typeof fetch>(async () => answer());
    return {
        fetchMock,
        transport: new ApiTransport("/hydra/", fetchMock),
    };
}

describe("log paging offsets", () => {
    it("should walk a page back and forward, clamped at the newest page", () => {
        expect(olderLogOffset(0)).toBe(LOG_PAGE_SIZE);
        expect(olderLogOffset(LOG_PAGE_SIZE)).toBe(2 * LOG_PAGE_SIZE);
        expect(newerLogOffset(2 * LOG_PAGE_SIZE)).toBe(LOG_PAGE_SIZE);
        expect(newerLogOffset(LOG_PAGE_SIZE)).toBe(0);
        // Legacy's `Math.max(currentJsonIndex - 500, 0)`: the newest page is
        // the end of the road, never a negative offset.
        expect(newerLogOffset(0)).toBe(0);
        expect(newerLogOffset(200)).toBe(0);
    });
});

describe("parseLogPage", () => {
    it("should pick the viewer's fields out of a line and keep the whole record", () => {
        const page = parseLogPage(
            {
                hasMore: true,
                lines: [
                    {
                        "@timestamp": 1_579_374_757,
                        IPADDRESS: "127.0.0.1",
                        USERNAME: "someuser",
                        level: "ERROR",
                        logger_name: "org.nzbhydra.searching.Searcher",
                        message: "It broke",
                        stack_trace: "java.lang.Exception",
                        thread_name: "main",
                    },
                ],
            },
            0,
        );

        expect(page.hasMore).toBe(true);
        expect(page.offset).toBe(0);
        expect(page.entries[0]).toEqual({
            fields: {
                "@timestamp": 1_579_374_757,
                IPADDRESS: "127.0.0.1",
                USERNAME: "someuser",
                level: "ERROR",
                logger_name: "org.nzbhydra.searching.Searcher",
                message: "It broke",
                stack_trace: "java.lang.Exception",
                thread_name: "main",
            },
            ipAddress: "127.0.0.1",
            level: "ERROR",
            logger: "org.nzbhydra.searching.Searcher",
            message: "It broke",
            stackTrace: "java.lang.Exception",
            timestamp: 1_579_374_757,
            username: "someuser",
        });
    });

    it("should treat missing values as absent rather than as data", () => {
        const page = parseLogPage({lines: [{"@timestamp": {}, level: 7}]}, 500);

        expect(page.hasMore).toBe(false);
        expect(page.entries[0]).toMatchObject({
            ipAddress: null,
            level: null,
            message: null,
            stackTrace: null,
            timestamp: null,
            username: null,
        });
    });

    it("should treat an empty response as an empty page", () => {
        expect(parseLogPage({}, 0)).toEqual({
            entries: [],
            hasMore: false,
            offset: 0,
        });
    });

    it("should refuse a response that is not a log page", () => {
        expect(() => parseLogPage("nope", 0)).toThrow(
            MalformedLogResponseError,
        );
        expect(() => parseLogPage({lines: ["a line"]}, 0)).toThrow(
            MalformedLogResponseError,
        );
    });
});

describe("getJsonLogs", () => {
    it("should request the asked-for page with legacy's page size", async () => {
        const {fetchMock, transport} = transportFor(() =>
            jsonResponse({hasMore: false, lines: []}),
        );

        await getJsonLogs(transport, 1000);

        const url = new URL(String(fetchMock.mock.calls[0][0]));
        expect(url.pathname).toBe("/hydra/internalapi/debuginfos/jsonlogs");
        expect(url.searchParams.get("offset")).toBe("1000");
        expect(url.searchParams.get("limit")).toBe("500");
    });
});

describe("getCurrentLogFile", () => {
    it("should read the raw file without asking for JSON", async () => {
        // The endpoint produces `text/plain` only, so a JSON `Accept` header
        // would be answered with 406 rather than the log file.
        const {fetchMock, transport} = transportFor(() =>
            textResponse("a log line"),
        );

        expect(await getCurrentLogFile(transport)).toBe("a log line");
        const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
        expect(headers.get("Accept")).toBeNull();
    });
});

describe("getLogFileNames", () => {
    it("should return the server's file list", async () => {
        const {transport} = transportFor(() =>
            jsonResponse(["nzbhydra2.log", "nzbhydra2.log.1"]),
        );

        expect(await getLogFileNames(transport)).toEqual([
            "nzbhydra2.log",
            "nzbhydra2.log.1",
        ]);
    });

    it("should refuse a response that is not a list of names", async () => {
        const {transport} = transportFor(() => jsonResponse([{name: "x"}]));

        await expect(getLogFileNames(transport)).rejects.toBeInstanceOf(
            MalformedLogResponseError,
        );
    });
});

describe("logFileDownloadUrl", () => {
    it("should build a base-URL-aware download address with an encoded name", () => {
        const transport = new ApiTransport("/hydra/", vi.fn<typeof fetch>());

        const url = new URL(logFileDownloadUrl(transport, "nzbhydra2.log.1"));
        expect(url.pathname).toBe("/hydra/internalapi/debuginfos/downloadlog");
        expect(url.searchParams.get("logfilename")).toBe("nzbhydra2.log.1");

        const escaped = new URL(logFileDownloadUrl(transport, "a b&c.log"));
        expect(escaped.searchParams.get("logfilename")).toBe("a b&c.log");
    });
});
