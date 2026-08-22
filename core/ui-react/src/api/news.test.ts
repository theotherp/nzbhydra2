import {describe, expect, it, vi} from "vitest";

import {
    dismissUserNews,
    getNews,
    getNewsForCurrentVersion,
    getUserNews,
    MalformedNewsResponseError,
    parseUserNewsEntries,
    saveNewsShown,
} from "./news";
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

describe("getNewsForCurrentVersion", () => {
    it("should request the current version's news through the shared transport", async () => {
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

        await expect(getNewsForCurrentVersion(transport)).resolves.toHaveLength(
            1,
        );
        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/news/forcurrentversion",
            expect.objectContaining({method: "GET"}),
        );
    });
});

describe("saveNewsShown", () => {
    it("should acknowledge the shown news", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await saveNewsShown(transport);

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/news/saveshown",
            expect.objectContaining({method: "PUT"}),
        );
    });
});

describe("getUserNews", () => {
    it("should read the undismissed notices in the server's order", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify([
                    {id: "1", newsAsHtml: "<p>a</p>", title: "A"},
                    {id: "2", newsAsHtml: "<p>b</p>", title: "B"},
                ]),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(getUserNews(transport)).resolves.toEqual([
            {id: "1", newsAsHtml: "<p>a</p>", title: "A"},
            {id: "2", newsAsHtml: "<p>b</p>", title: "B"},
        ]);
    });

    it("should reject a response that is not a list", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(getUserNews(transport)).rejects.toBeInstanceOf(
            MalformedNewsResponseError,
        );
    });
});

describe("parseUserNewsEntries", () => {
    it("should drop an entry that could never be dismissed or shown", () => {
        expect(
            parseUserNewsEntries([
                {id: "", newsAsHtml: "<p>a</p>", title: "A"},
                {newsAsHtml: "<p>b</p>", title: "B"},
                {id: "3", title: "C"},
                {id: "4", newsAsHtml: "<p>d</p>"},
            ]),
        ).toEqual([{id: "4", newsAsHtml: "<p>d</p>", title: ""}]);
    });
});

describe("dismissUserNews", () => {
    it("should dismiss one notice by ID", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await dismissUserNews(transport, "a/b");

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/usernews/a%2Fb/dismiss",
            expect.objectContaining({method: "PUT"}),
        );
    });
});
