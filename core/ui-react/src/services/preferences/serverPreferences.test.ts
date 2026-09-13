import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {createServerPreferences, isRaisedFlag} from "./serverPreferences";

function jsonResponse(body: string): Response {
    return new Response(body, {
        headers: {"Content-Type": "application/json"},
    });
}

describe("isRaisedFlag", () => {
    it("should accept a backend-written boolean and its text form", () => {
        expect(isRaisedFlag(true)).toBe(true);
        expect(isRaisedFlag("true")).toBe(true);
    });

    it("should reject the cleared value the storage endpoint stores as a string", () => {
        // Legacy's `response.data !== "" && response.data` treated this exact
        // value as a raised flag, so a cleared warning came back forever.
        expect(isRaisedFlag("false")).toBe(false);
        expect(isRaisedFlag(false)).toBe(false);
        expect(isRaisedFlag("")).toBe(false);
        expect(isRaisedFlag(undefined)).toBe(false);
        expect(isRaisedFlag({message: "anything"})).toBe(false);
    });
});

describe("createServerPreferences", () => {
    it("should read a flag through API-PREFERENCES-GET", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(jsonResponse("true"));
        const preferences = createServerPreferences(
            new ApiTransport("/hydra/", fetchImplementation),
        );

        await expect(preferences.readFlag("belowJava17")).resolves.toBe(true);
        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/genericstorage/belowJava17?forUser=false",
            expect.objectContaining({method: "GET"}),
        );
    });

    it("should read a stored record untouched", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(
                jsonResponse('{"message":"broken","shown":false}'),
            );
        const preferences = createServerPreferences(
            new ApiTransport("/hydra/", fetchImplementation),
        );

        await expect(preferences.read("FAILED_BACKUP")).resolves.toEqual({
            message: "broken",
            shown: false,
        });
    });

    it("should clear a flag by writing legacy's false value", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        const preferences = createServerPreferences(
            new ApiTransport("/hydra/", fetchImplementation),
        );

        await preferences.clear("outOfMemoryDetected");

        const [url, init] = fetchImplementation.mock.calls[0];
        expect(url).toBe(
            "http://localhost:3000/hydra/internalapi/genericstorage/outOfMemoryDetected?forUser=false",
        );
        expect(init.method).toBe("PUT");
        expect(init.body).toBe("false");
    });

    it("should address the per-user record when asked to", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        const preferences = createServerPreferences(
            new ApiTransport("/hydra/", fetchImplementation),
        );

        await preferences.write("someKey", {a: 1}, true);

        const [url, init] = fetchImplementation.mock.calls[0];
        expect(url).toBe(
            "http://localhost:3000/hydra/internalapi/genericstorage/someKey?forUser=true",
        );
        expect(init.body).toBe('{"a":1}');
    });
});
