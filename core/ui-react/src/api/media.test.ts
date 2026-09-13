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

    it("should accept explicit null optional identifier fields as the real backend serializes them", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify([
                    {
                        imdbId: null,
                        tmdbId: "424242",
                        tvmazeId: null,
                        tvrageId: null,
                        tvdbId: null,
                        title: "Hydra Browser Movie",
                        year: 2000,
                        posterUrl: null,
                    },
                ]),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        const suggestions = await getAutocomplete(
            new ApiTransport("/", fetchImplementation),
            "MOVIE",
            "Hydra Browser Movie",
        );
        expect(suggestions).toEqual([
            {title: "Hydra Browser Movie", tmdbId: "424242", year: 2000},
        ]);
        expect(suggestions[0].imdbId).toBeUndefined();
        expect(suggestions[0].tvmazeId).toBeUndefined();
        expect(suggestions[0].tvrageId).toBeUndefined();
        expect(suggestions[0].tvdbId).toBeUndefined();
        expect(suggestions[0].posterUrl).toBeUndefined();
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
