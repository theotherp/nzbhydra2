import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "./transport";
import {getWelcomeShown, setWelcomeShown} from "./welcome";

describe("getWelcomeShown", () => {
    it("should request the typed welcome status through the shared transport", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response("true", {
                headers: {"Content-Type": "application/json"},
            }),
        );
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(getWelcomeShown(transport)).resolves.toBe(true);

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/welcomeshown",
            expect.objectContaining({
                credentials: "same-origin",
                method: "GET",
            }),
        );
    });
});

describe("setWelcomeShown", () => {
    it("should record the welcome as shown", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await setWelcomeShown(transport);

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/welcomeshown",
            expect.objectContaining({
                credentials: "same-origin",
                method: "PUT",
            }),
        );
    });
});
