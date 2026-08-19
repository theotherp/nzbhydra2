import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {DownloadHistoryPage} from "./DownloadHistoryPage";

const bootstrap = {
    username: "stats",
    authType: null,
    showLogout: true,
    maySeeSearch: true,
    adminRestricted: false,
    statsRestricted: true,
    maySeeStats: true,
    searchRestricted: false,
    maySeeDetailsDl: false,
    maySeeAdmin: false,
    authConfigured: true,
    showIndexerSelection: false,
    baseUrl: "/hydra/",
    serverTimeZone: "UTC",
    safeConfig: {
        indexers: [],
        logging: {historyUserInfoType: "BOTH"},
        dereferer: "https://dereferer.example/?url=$s",
    },
};

function renderPage(fetchImplementation: typeof fetch) {
    return render(
        <QueryClientProvider
            client={
                new QueryClient({defaultOptions: {queries: {retry: false}}})
            }
        >
            <DownloadHistoryPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />
        </QueryClientProvider>,
    );
}

function entry(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        time: "2024-01-01T00:00:00Z",
        status: "CONTENT_DOWNLOAD_SUCCESSFUL",
        accessSource: "INTERNAL",
        age: 3,
        username: "user",
        ip: "127.0.0.1",
        searchResult: {
            id: "42",
            title: "A title",
            indexer: {name: "Mock"},
            details: "https://example.com/nzb",
            downloadType: "NZB",
            indexerGuid: "guid",
        },
        ...overrides,
    };
}

describe("DownloadHistoryPage", () => {
    beforeEach(() => {
        // DirectDownloadActions (C-DOWNLOAD-ACTIONS) resolves its own
        // transport from the global bootstrap rather than a prop.
        window.__NZBHYDRA_BOOTSTRAP__ = {baseUrl: "/hydra/"};
    });
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        delete window.__NZBHYDRA_BOOTSTRAP__;
    });

    it("should retain controls while paging, filtering, sorting, and refreshing", async () => {
        const requests: RequestInit[] = [];
        const fetchImplementation = vi.fn(
            (_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) requests.push(init);
                return Promise.resolve(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 30}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            },
        );
        renderPage(fetchImplementation);
        await screen.findByTestId("download-history-row");
        // The "All results"/"All sources" sentinel selections must render
        // their label, not a blank control: MUI's Select hides the display
        // for a literal empty-string value unless `displayEmpty` is set, so
        // the default filter value must never be "".
        expect(
            screen.getByRole("combobox", {name: "Result"}),
        ).toHaveTextContent("All results");
        expect(
            screen.getByRole("combobox", {name: "Source"}),
        ).toHaveTextContent("All sources");
        fireEvent.change(screen.getByLabelText("Title"), {
            target: {value: "example"},
        });
        await screen.findByRole("button", {name: "Title"});
        fireEvent.click(screen.getByRole("button", {name: "Title"}));
        await screen.findByRole("button", {name: "Next page"});
        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(4),
        );
        expect(JSON.parse(requests.at(-1)?.body as string)).toMatchObject({
            page: 2,
            sortModel: {column: "title", sortMode: 1},
            filterModel: {
                title: {filterType: "freetext", filterValue: "example"},
            },
        });
        await screen.findByTestId("download-history-refresh");
        fireEvent.click(screen.getByTestId("download-history-refresh"));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(5),
        );
    });

    it("should show accessible status text, dereferer-transformed links, an eligible repeat action, and isolate malformed rows", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    content: [entry(), {id: "bad"}],
                    totalElements: 2,
                }),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        renderPage(fetchImplementation);
        const row = await screen.findByTestId("download-history-row");
        expect(
            screen.getByText(
                "1 malformed download history entries were not displayed.",
            ),
        ).toBeVisible();
        expect(row).toHaveTextContent("Content download successful");
        const link = screen.getByRole("link", {name: "A title"});
        expect(link).toHaveAttribute(
            "href",
            "https://dereferer.example/?url=" +
                encodeURIComponent("https://example.com/nzb"),
        );
        const nzbLink = screen.getByTestId("download-nzb");
        expect(nzbLink).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/getnzb/user/42",
        );
        expect(row).toHaveTextContent("Internal");
        expect(row).toHaveTextContent("user");
        expect(row).toHaveTextContent("127.0.0.1");
        expect(row).toHaveTextContent("3 days");
    });

    it("should show accessible feedback instead of a repeat action when the entry is not eligible", async () => {
        renderPage(
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        content: [
                            entry({
                                searchResult: {
                                    id: "42",
                                    title: "No guid",
                                    indexerGuid: undefined,
                                },
                            }),
                        ],
                        totalElements: 1,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        await screen.findByTestId("download-history-row");
        expect(screen.getByText("Repeat unavailable")).toBeVisible();
        expect(screen.queryByTestId("download-nzb")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("download-torrent"),
        ).not.toBeInTheDocument();
        expect(screen.getByText("No guid")).toBeVisible();
    });

    it("should render torrent entries with the torrent repeat action", async () => {
        renderPage(
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        content: [
                            entry({
                                searchResult: {
                                    id: "99",
                                    title: "A torrent",
                                    indexerGuid: "guid",
                                    downloadType: "TORRENT",
                                },
                            }),
                        ],
                        totalElements: 1,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        await screen.findByTestId("download-history-row");
        expect(screen.getByTestId("download-torrent")).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/gettorrent/user/99",
        );
    });

    it("should tolerate partial rows with only the required fields present", async () => {
        renderPage(
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        content: [
                            {
                                id: 7,
                                status: "NONE",
                                searchResult: {id: "7", title: "Minimal"},
                            },
                        ],
                        totalElements: 1,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        const row = await screen.findByTestId("download-history-row");
        expect(row).toHaveTextContent("Minimal");
        expect(row).toHaveTextContent("None");
        expect(screen.getByText("Repeat unavailable")).toBeVisible();
    });

    it("should hide username and IP columns when history user info is disabled", async () => {
        render(
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                <DownloadHistoryPage
                    bootstrap={{
                        ...bootstrap,
                        safeConfig: {
                            indexers: [],
                            logging: {historyUserInfoType: "NONE"},
                        },
                    }}
                    transport={
                        new ApiTransport(
                            "/hydra/",
                            vi.fn().mockResolvedValue(
                                new Response(
                                    JSON.stringify({
                                        content: [entry()],
                                        totalElements: 1,
                                    }),
                                    {
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                    },
                                ),
                            ),
                        )
                    }
                />
            </QueryClientProvider>,
        );
        await screen.findByTestId("download-history-row");
        expect(
            screen.queryByRole("columnheader", {name: "Username"}),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("columnheader", {name: "IP address"}),
        ).not.toBeInTheDocument();
    });

    it("should provide accessible empty and failure states", async () => {
        const {unmount} = renderPage(
            vi
                .fn()
                .mockResolvedValue(
                    new Response(
                        JSON.stringify({content: [], totalElements: 0}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                ),
        );
        expect(
            await screen.findByText(
                "No download history entries match the current filters.",
            ),
        ).toBeVisible();
        unmount();
        renderPage(
            vi.fn().mockResolvedValue(new Response("failed", {status: 500})),
        );
        expect(
            await screen.findByText("Unable to load download history."),
        ).toBeVisible();
    });
});
