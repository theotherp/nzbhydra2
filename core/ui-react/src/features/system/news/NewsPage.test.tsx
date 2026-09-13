import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {MalformedNewsResponseError} from "../../../api/news";
import type {NewsEntry} from "../../../api/news";
import {NewsPage} from "./NewsPage";

const entries: NewsEntry[] = [
    {
        forCurrentVersion: true,
        forNewerVersion: false,
        news: '<p>First <a href="https://example.test/news">safe link</a></p>',
        version: "2.0.0",
    },
    {
        forCurrentVersion: false,
        forNewerVersion: true,
        news: "<p>Second</p>",
        version: "2.1.0",
    },
];

function renderNews(loadNews: () => Promise<NewsEntry[]>) {
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <NewsPage loadNews={loadNews} />
        </QueryClientProvider>,
    );
}

afterEach(cleanup);

describe("NewsPage", () => {
    it("should render the loading convention", () => {
        renderNews(() => new Promise<NewsEntry[]>(() => undefined));

        expect(screen.getByRole("status")).toHaveTextContent("Loading…");
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should render the legacy empty message", async () => {
        renderNews(async () => []);

        expect(await screen.findByText("No news yet ;-)")).toBeVisible();
    });

    it("should render ordered entries and version markers", async () => {
        renderNews(async () => entries);

        const headings = await screen.findAllByRole("heading", {level: 2});
        expect(headings.map((heading) => heading.textContent)).toEqual([
            "2.0.0 (This version)",
            "2.1.0 (Newer version)",
        ]);
        expect(screen.getByRole("link", {name: "safe link"})).toHaveAttribute(
            "href",
            "https://example.test/news",
        );
    });

    it("should render a request failure and allow retry", async () => {
        const loadNews = vi
            .fn<() => Promise<NewsEntry[]>>()
            .mockRejectedValueOnce(new Error("network unavailable"))
            .mockResolvedValueOnce([]);
        renderNews(loadNews);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Unable to load news.",
        );
    });

    it("should render malformed data as an error", async () => {
        renderNews(async () => {
            throw new MalformedNewsResponseError();
        });

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "News data could not be displayed.",
        );
    });
});
