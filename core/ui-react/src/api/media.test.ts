import {describe, expect, it, vi} from "vitest";

import {
    getAutocomplete,
    getEmbyAvailability,
    MalformedAutocompleteResponseError,
} from "./media";
import {ApiTransport} from "./transport";

describe("media API", () => {
    it("should request and validate base-aware movie autocomplete", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([{title: "Movie", tmdbId: "42"}]), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        await expect(
            getAutocomplete(
                new ApiTransport("/hydra/", fetchImplementation),
                "MOVIE",
                "Movie title",
            ),
        ).resolves.toEqual([{title: "Movie", tmdbId: "42"}]);
        expect(fetchImplementation).toHaveBeenCalledWith(
            expect.stringMatching(
                /hydra\/internalapi\/autocomplete\/MOVIE\?input=Movie\+title$/,
            ),
            expect.anything(),
        );
    });

    it("should reject malformed autocomplete payloads", async () => {
        const transport = new ApiTransport(
            "/",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify([{title: null}]), {
                    headers: {"Content-Type": "application/json"},
                }),
            ),
        );
        await expect(
            getAutocomplete(transport, "TV", "Show"),
        ).rejects.toBeInstanceOf(MalformedAutocompleteResponseError);
    });

    it("should request the applicable Emby endpoint", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response("true", {
                headers: {"Content-Type": "application/json"},
            }),
        );
        await expect(
            getEmbyAvailability(
                new ApiTransport("/hydra/", fetchImplementation),
                "TV",
                "99",
            ),
        ).resolves.toBe(true);
        expect(fetchImplementation).toHaveBeenCalledWith(
            expect.stringMatching(/isSeriesAvailable\?tvdbId=99$/),
            expect.anything(),
        );
    });
});
