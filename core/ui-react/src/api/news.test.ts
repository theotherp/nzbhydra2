import {describe, expect, it, vi} from "vitest";

import {getNews, MalformedNewsResponseError} from "./news";
import {ApiTransport} from "./transport";

describe("getNews", () => {
    it("should request generated news response types through the shared transport", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify([
                    {
                        forCurrentVersion: true,
                        forNewerVersion: false,
                        news: "<p>News</p>",
                        version: "2.0.0",
                    },
                ]),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(getNews(transport)).resolves.toEqual([
            {
                forCurrentVersion: true,
                forNewerVersion: false,
                news: "<p>News</p>",
                version: "2.0.0",
            },
        ]);

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/news",
            expect.objectContaining({
                credentials: "same-origin",
                method: "GET",
            }),
        );
    });

    it("should reject malformed generated response data", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([{version: "2.0.0"}]), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(getNews(transport)).rejects.toBeInstanceOf(
            MalformedNewsResponseError,
        );
    });
});
