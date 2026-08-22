import {describe, expect, it, vi} from "vitest";

import {getPreference, putPreference} from "./preferences";
import {ApiTransport} from "./transport";

function jsonResponse(body: string): Response {
    return new Response(body, {
        headers: {"Content-Type": "application/json"},
    });
}

describe("getPreference", () => {
    it("should read a key through the shared transport with the forUser flag", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(jsonResponse("true"));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(getPreference(transport, "belowJava17")).resolves.toBe(
            true,
        );

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/genericstorage/belowJava17?forUser=false",
            expect.objectContaining({
                credentials: "same-origin",
                method: "GET",
            }),
        );
    });

    it("should address the per-user record when forUser is requested", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(jsonResponse("null"));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await getPreference(transport, "a key/with slash", true);

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/genericstorage/a%20key%2Fwith%20slash?forUser=true",
            expect.objectContaining({method: "GET"}),
        );
    });
});

describe("putPreference", () => {
    it("should write the value as a JSON body", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await putPreference(transport, "outOfMemoryDetected", false);

        const [url, init] = fetchImplementation.mock.calls[0];
        expect(url).toBe(
            "http://localhost:3000/hydra/internalapi/genericstorage/outOfMemoryDetected?forUser=false",
        );
        expect(init.method).toBe("PUT");
        expect(init.body).toBe("false");
        expect(new Headers(init.headers).get("Content-Type")).toBe(
            "application/json",
        );
    });
});
