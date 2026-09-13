import {describe, expect, it, vi} from "vitest";

import {ApiTransport, ForbiddenError, UnauthorizedError} from "./transport";

/**
 * A minimal `XMLHttpRequest` stand-in: jsdom's own would need a server to
 * answer, and the upload path is exercised through the events the browser
 * fires rather than through a real request.
 */
function fakeXhr() {
    const listeners = new Map<string, ((event: unknown) => void)[]>();
    const uploadListeners = new Map<string, ((event: unknown) => void)[]>();
    const headers: Record<string, string> = {};
    const state = {
        opened: [] as string[],
        sent: undefined as unknown,
        responseHeaders: {} as Record<string, string>,
    };
    const add =
        (target: Map<string, ((event: unknown) => void)[]>) =>
        (type: string, listener: (event: unknown) => void) => {
            target.set(type, [...(target.get(type) ?? []), listener]);
        };
    const instance = {
        addEventListener: add(listeners),
        getResponseHeader: (name: string) =>
            state.responseHeaders[name] ?? null,
        open: (method: string, url: string) => {
            state.opened = [method, url];
        },
        responseText: "",
        send: (body: unknown) => {
            state.sent = body;
        },
        setRequestHeader: (name: string, value: string) => {
            headers[name] = value;
        },
        status: 0,
        upload: {addEventListener: add(uploadListeners)},
        withCredentials: false,
    } as unknown as XMLHttpRequest;
    const emit = (type: string, event: unknown = {}) => {
        for (const listener of listeners.get(type) ?? []) {
            listener(event);
        }
    };

    return {
        emit,
        emitUploadProgress(event: {
            lengthComputable: boolean;
            loaded: number;
            total: number;
        }) {
            for (const listener of uploadListeners.get("progress") ?? []) {
                listener(event);
            }
        },
        get headers() {
            return headers;
        },
        instance,
        get opened() {
            return state.opened;
        },
        respond(status: number, body: string, contentType: string | null) {
            const mutable = instance as unknown as {
                responseText: string;
                status: number;
            };
            mutable.status = status;
            mutable.responseText = body;
            state.responseHeaders = contentType
                ? {"Content-Type": contentType}
                : {};
            emit("load");
        },
        get sent() {
            return state.sent;
        },
    };
}

describe("ApiTransport", () => {
    it("should derive JSON requests from the bootstrap base with credentials and CSRF", async () => {
        document.cookie = "HYDRA-XSRF-TOKEN=csrf-value";
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({saved: true}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(
            transport.request("internalapi/config", {
                method: "PUT",
                json: {enabled: true},
            }),
        ).resolves.toEqual({saved: true});

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/config",
            expect.objectContaining({
                credentials: "same-origin",
                method: "PUT",
            }),
        );
        const request = fetchImplementation.mock.calls[0][1] as RequestInit;
        expect(request.headers).toBeInstanceOf(Headers);
        expect((request.headers as Headers).get("Content-Type")).toBe(
            "application/json",
        );
        expect((request.headers as Headers).get("X-XSRF-TOKEN")).toBe(
            "csrf-value",
        );
        expect(request.body).toBe('{"enabled":true}');
    });

    it("should keep unauthorized and forbidden responses distinguishable", async () => {
        const unauthorized = new ApiTransport(
            "/hydra/",
            vi.fn().mockResolvedValue(
                new Response('{"message":"login"}', {
                    status: 401,
                    headers: {"Content-Type": "application/json"},
                }),
            ),
        );
        const forbidden = new ApiTransport(
            "/hydra/",
            vi.fn().mockResolvedValue(
                new Response('{"message":"denied"}', {
                    status: 403,
                    headers: {"Content-Type": "application/json"},
                }),
            ),
        );

        await expect(
            unauthorized.request("internalapi/userinfos"),
        ).rejects.toBeInstanceOf(UnauthorizedError);
        await expect(
            forbidden.request("internalapi/config"),
        ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should reject root-relative paths that bypass the configured application base", async () => {
        const transport = new ApiTransport("/hydra/", vi.fn());

        await expect(transport.request("/internalapi/config")).rejects.toThrow(
            "API paths must be application-base-relative",
        );
    });

    it("should reject requests that specify both a body and form", async () => {
        const fetchImplementation = vi.fn();
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(
            transport.request("internalapi/config", {
                body: "raw request body",
                form: new URLSearchParams({enabled: "true"}),
            }),
        ).rejects.toThrow("A transport request may specify only one body type");

        expect(fetchImplementation).not.toHaveBeenCalled();
    });

    it("should reject requests that specify both a body and JSON", async () => {
        const fetchImplementation = vi.fn();
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(
            transport.request("internalapi/config", {
                body: "raw request body",
                json: {enabled: true},
            }),
        ).rejects.toThrow("A transport request may specify only one body type");

        expect(fetchImplementation).not.toHaveBeenCalled();
    });

    it("should reject requests that specify both form and JSON", async () => {
        const fetchImplementation = vi.fn();
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(
            transport.request("internalapi/config", {
                form: new URLSearchParams({enabled: "true"}),
                json: {enabled: true},
            }),
        ).rejects.toThrow("A transport request may specify only one body type");

        expect(fetchImplementation).not.toHaveBeenCalled();
    });

    it("should reject requests that specify body, form, and JSON", async () => {
        const fetchImplementation = vi.fn();
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(
            transport.request("internalapi/config", {
                body: "raw request body",
                form: new URLSearchParams({enabled: "true"}),
                json: {enabled: true},
            }),
        ).rejects.toThrow("A transport request may specify only one body type");

        expect(fetchImplementation).not.toHaveBeenCalled();
    });

    it("should retrieve binary downloads through the configured base and CSRF contract", async () => {
        document.cookie = "HYDRA-XSRF-TOKEN=csrf-value";
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response("zip bytes"));
        const transport = new ApiTransport("/hydra/", fetchImplementation);
        await expect(
            transport.requestBlob("internalapi/nzbzipDownload", {
                method: "POST",
                json: "/tmp/file.zip",
            }),
        ).resolves.toBeInstanceOf(Blob);
        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/nzbzipDownload",
            expect.objectContaining({method: "POST"}),
        );
        expect(
            (fetchImplementation.mock.calls[0][1].headers as Headers).get(
                "X-XSRF-TOKEN",
            ),
        ).toBe("csrf-value");
    });

    it("should upload through the configured base with credentials and CSRF, reporting progress", async () => {
        document.cookie = "HYDRA-XSRF-TOKEN=csrf-value";
        const xhr = fakeXhr();
        const transport = new ApiTransport("/hydra/");
        const progress: {loaded: number; total: number | null}[] = [];
        const body = new FormData();
        body.append("file", new Blob(["backup"]), "backup.zip");

        const result = transport.upload(
            "internalapi/backup/restorefile",
            body,
            {
                onProgress: (event) => progress.push(event),
                xhrImplementation: () => xhr.instance,
            },
        );
        xhr.emitUploadProgress({
            loaded: 512,
            total: 1024,
            lengthComputable: true,
        });
        xhr.respond(200, '{"successful":true}', "application/json");

        await expect(result).resolves.toEqual({successful: true});
        expect(xhr.opened).toEqual([
            "POST",
            "http://localhost:3000/hydra/internalapi/backup/restorefile",
        ]);
        expect(xhr.instance.withCredentials).toBe(true);
        expect(xhr.headers).toEqual({
            Accept: "application/json",
            "X-XSRF-TOKEN": "csrf-value",
        });
        // The browser must set the multipart Content-Type itself so the
        // boundary matches the body it serializes.
        expect(Object.keys(xhr.headers)).not.toContain("Content-Type");
        expect(xhr.sent).toBe(body);
        expect(progress).toEqual([{loaded: 512, total: 1024}]);
    });

    it("should report an unknown upload total as null rather than a bogus number", async () => {
        const xhr = fakeXhr();
        const transport = new ApiTransport("/hydra/");
        const progress: {loaded: number; total: number | null}[] = [];

        const result = transport.upload(
            "internalapi/backup/restorefile",
            new FormData(),
            {
                onProgress: (event) => progress.push(event),
                xhrImplementation: () => xhr.instance,
            },
        );
        xhr.emitUploadProgress({
            loaded: 64,
            total: 0,
            lengthComputable: false,
        });
        xhr.respond(200, "", null);

        await expect(result).resolves.toBeUndefined();
        expect(progress).toEqual([{loaded: 64, total: null}]);
    });

    it("should reject an upload the server refuses with a status", async () => {
        const xhr = fakeXhr();
        const transport = new ApiTransport("/hydra/");

        const result = transport.upload(
            "internalapi/backup/restorefile",
            new FormData(),
            {xhrImplementation: () => xhr.instance},
        );
        xhr.respond(403, '{"message":"denied"}', "application/json");

        await expect(result).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should reject an upload whose transport fails outright", async () => {
        const xhr = fakeXhr();
        const transport = new ApiTransport("/hydra/");

        const result = transport.upload(
            "internalapi/backup/restorefile",
            new FormData(),
            {xhrImplementation: () => xhr.instance},
        );
        xhr.emit("error");

        await expect(result).rejects.toThrow(
            "Upload to internalapi/backup/restorefile failed",
        );
    });

    it("should reject an upload path that escapes the application base", async () => {
        const transport = new ApiTransport("/hydra/");

        await expect(
            transport.upload("/internalapi/backup/restorefile", new FormData()),
        ).rejects.toThrow("API paths must be application-base-relative");
    });

    it("should resolve browser transfer URLs through the configured application base", () => {
        const transport = new ApiTransport("/hydra/");
        expect(transport.browserTransferUrl("getnzb/user/1.2")).toBe(
            "http://localhost:3000/hydra/getnzb/user/1.2",
        );
    });
});
