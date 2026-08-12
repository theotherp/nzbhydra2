import {describe, expect, it, vi} from "vitest";

import {ApiTransport, ForbiddenError, UnauthorizedError} from "./transport";

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

    it("should resolve browser transfer URLs through the configured application base", () => {
        const transport = new ApiTransport("/hydra/");
        expect(transport.browserTransferUrl("getnzb/user/1.2")).toBe(
            "http://localhost:3000/hydra/getnzb/user/1.2",
        );
    });
});
