import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../transport";
import {
    debugInfosFileName,
    downloadDebugInfos,
    endpointsUrl,
    executeSqlQuery,
    executeSqlUpdate,
    getSensitiveDataLogging,
    getThreadCpuUsage,
    heapDumpUrl,
    logThreadDump,
    MalformedDebugResponseError,
    setSensitiveDataLogging,
    uploadDebugInfos,
} from "./debug";

function respondingTransport(response: Response) {
    const fetchImplementation = vi.fn().mockResolvedValue(response);
    return {
        fetchImplementation,
        transport: new ApiTransport("/hydra/", fetchImplementation),
    };
}

function jsonTransport(body: unknown, status = 200) {
    return respondingTransport(
        new Response(JSON.stringify(body), {
            headers: {"Content-Type": "application/json"},
            status,
        }),
    );
}

function textTransport(body: string, status = 200) {
    return respondingTransport(
        new Response(body, {
            headers: {"Content-Type": "text/plain"},
            status,
        }),
    );
}

describe("debug API", () => {
    it("should stream the debug archive through the binary path", async () => {
        const {transport, fetchImplementation} = respondingTransport(
            new Response(new Blob(["zip"]), {
                headers: {"Content-Type": "application/zip"},
            }),
        );

        const blob = await downloadDebugInfos(transport);

        expect(blob.size).toBeGreaterThan(0);
        expect(fetchImplementation.mock.calls[0][0]).toContain(
            "/hydra/internalapi/debuginfos/createAndProvideZipAsBytes",
        );
        // The binary path does not ask for JSON.
        const headers = new Headers(
            fetchImplementation.mock.calls[0][1].headers as HeadersInit,
        );
        expect(headers.get("Accept")).toBeNull();
    });

    it("should name the archive the way legacy did", () => {
        expect(debugInfosFileName(new Date(2026, 7, 9, 4, 5))).toBe(
            "nzbhydra-debuginfos-2026-08-09-04-05.zip",
        );
    });

    it("should return the uploaded archive's URL as data", async () => {
        const {transport} = textTransport("https://file.io/abc123\n");

        await expect(uploadDebugInfos(transport)).resolves.toEqual({
            kind: "successful",
            url: "https://file.io/abc123",
        });
    });

    it("should report the upload failure's response text", async () => {
        const {transport} = textTransport("Upload rejected by the share", 500);

        await expect(uploadDebugInfos(transport)).resolves.toEqual({
            kind: "failed",
            message: "Upload rejected by the share",
        });
    });

    it("should not offer a structured error body as an upload message", async () => {
        const {transport} = jsonTransport(
            {error: "Internal Server Error"},
            500,
        );

        await expect(uploadDebugInfos(transport)).resolves.toEqual({
            kind: "failed",
            message: null,
        });
    });

    it("should report a thread dump's success and its failure", async () => {
        const {transport} = textTransport("thread dump written");
        await expect(logThreadDump(transport)).resolves.toEqual({
            kind: "successful",
        });

        const failing = respondingTransport(new Response("", {status: 403}));
        await expect(logThreadDump(failing.transport)).resolves.toEqual({
            kind: "failed",
        });
    });

    it("should accept a dump the server labels as JSON without it being JSON", async () => {
        // What the real endpoint answers: it declares no `produces`, so the
        // raw dump arrives under a JSON content type. Parsing it would fail
        // and report a dump that was in fact written as an error.
        const {transport} = respondingTransport(
            new Response('"main" #1 prio=5 os_prio=0 tid=0x00 nid=0x1', {
                headers: {"Content-Type": "application/json"},
            }),
        );

        await expect(logThreadDump(transport)).resolves.toEqual({
            kind: "successful",
        });
    });

    it("should read the sensitive-logging state as a boolean or as its text form", async () => {
        await expect(
            getSensitiveDataLogging(jsonTransport(true).transport),
        ).resolves.toBe(true);
        await expect(
            getSensitiveDataLogging(textTransport("false").transport),
        ).resolves.toBe(false);
        await expect(
            getSensitiveDataLogging(jsonTransport({enabled: true}).transport),
        ).rejects.toBeInstanceOf(MalformedDebugResponseError);
    });

    it("should put the requested state and answer with the server's own", async () => {
        // The request asks to enable it; the server reports that it did not.
        const {transport, fetchImplementation} = jsonTransport(false);

        await expect(setSensitiveDataLogging(transport, true)).resolves.toBe(
            false,
        );
        expect(fetchImplementation.mock.calls[0][0]).toContain(
            "/hydra/internalapi/debuginfos/sensitiveDataLogging?enabled=true",
        );
        expect(fetchImplementation.mock.calls[0][1].method).toBe("PUT");
    });

    it("should post the raw SQL text and fill the output from the response", async () => {
        const {transport, fetchImplementation} = jsonTransport({
            message: "ID,NAME\n1,foo",
            successful: true,
        });

        await expect(
            executeSqlQuery(transport, "SELECT * FROM INDEXER"),
        ).resolves.toEqual({kind: "successful", output: "ID,NAME\n1,foo"});
        expect(fetchImplementation.mock.calls[0][0]).toContain(
            "/hydra/internalapi/debuginfos/executesqlquery",
        );
        expect(fetchImplementation.mock.calls[0][1].method).toBe("POST");
        expect(fetchImplementation.mock.calls[0][1].body).toBe(
            "SELECT * FROM INDEXER",
        );
    });

    it("should label an update's row count the way legacy did", async () => {
        const {transport} = jsonTransport({message: "3", successful: true});

        await expect(
            executeSqlUpdate(transport, "UPDATE INDEXER SET ENABLED=TRUE"),
        ).resolves.toEqual({kind: "successful", output: "3 rows affected"});
    });

    it("should treat an unsuccessful GenericResponse as a refusal with its message", async () => {
        const {transport} = jsonTransport({
            message: "Error while executing SQL Syntax error",
            successful: false,
        });

        await expect(executeSqlQuery(transport, "SELECT")).resolves.toEqual({
            kind: "failed",
            message: "Error while executing SQL Syntax error",
        });
    });

    it("should treat a transport failure as a refusal without a message", async () => {
        const {transport} = jsonTransport({}, 500);

        await expect(executeSqlUpdate(transport, "SELECT 1")).resolves.toEqual({
            kind: "failed",
            message: null,
        });
    });

    it("should keep only named CPU series that carry usable samples", async () => {
        const {transport} = jsonTransport([
            {
                key: "HTTP thread #1",
                values: [
                    {time: 1755600000, value: 4.5},
                    {time: "2026-08-19T10:00:05Z", value: 6},
                    {time: null, value: 9},
                    {time: 1755600010},
                ],
            },
            {key: "empty", values: []},
            {values: [{time: 1755600000, value: 1}]},
        ]);

        await expect(getThreadCpuUsage(transport)).resolves.toEqual([
            {
                label: "HTTP thread #1",
                points: [
                    {time: 1755600000, value: 4.5},
                    {time: "2026-08-19T10:00:05Z", value: 6},
                ],
            },
        ]);
    });

    it("should reject a CPU response that is not a series list", async () => {
        const {transport} = jsonTransport({series: []});

        await expect(getThreadCpuUsage(transport)).rejects.toBeInstanceOf(
            MalformedDebugResponseError,
        );
    });

    it("should build base-URL-aware addresses for the browser-followed links", () => {
        const transport = new ApiTransport("/hydra/", vi.fn());

        expect(heapDumpUrl(transport)).toContain("/hydra/actuator/heapdump");
        expect(endpointsUrl(transport)).toContain(
            "/hydra/internalapi/debuginfos/endpoints",
        );
    });
});
