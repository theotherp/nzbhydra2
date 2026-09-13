import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../transport";
import {getApiHelp, getConfig, saveConfig} from "./config";
import {getSafeConfig} from "./safeConfig";

const config = {
    main: {host: "0.0.0.0", port: 5076, futureSetting: {a: 1}},
    emby: {host: "http://emby"},
    genericStorage: {key: "value"},
    indexers: [{name: "Mock", unmodeled: true}],
};

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
    });
}

describe("config API", () => {
    it("should load the whole configuration", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(jsonResponse(config));
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        expect(await getConfig(transport)).toEqual(config);
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/config",
        );
    });

    it("should PUT back exactly what it loaded", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(config))
            .mockResolvedValueOnce(
                jsonResponse({
                    ok: true,
                    restartNeeded: false,
                    errorMessages: [],
                    warningMessages: [],
                    newConfig: config,
                }),
            );
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        const loaded = await getConfig(transport);
        const result = await saveConfig(transport, loaded);

        const request = fetchImplementation.mock.calls[1][1];
        expect(request.method).toBe("PUT");
        expect(JSON.parse(request.body as string)).toEqual(config);
        expect(result.ok).toBe(true);
        expect(result.newConfig).toEqual(config);
    });

    it("should surface a transport failure instead of a validation result", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({error: "nope"}), {
                headers: {"Content-Type": "application/json"},
                status: 500,
            }),
        );
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(saveConfig(transport, config)).rejects.toThrow(
            "Request failed with status 500",
        );
    });

    it("should read the API help endpoints", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            jsonResponse({
                newznabApi: "http://host/",
                torznabApi: "http://host/torznab",
                apiKey: "key",
            }),
        );
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        expect(await getApiHelp(transport)).toEqual({
            newznabApi: "http://host/",
            torznabApi: "http://host/torznab",
            apiKey: "key",
        });
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/config/apiHelp",
        );
    });

    it("should read the safe configuration", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(jsonResponse({keepHistory: true}));
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        expect(await getSafeConfig(transport)).toEqual({keepHistory: true});
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/config/safe",
        );
    });
});
