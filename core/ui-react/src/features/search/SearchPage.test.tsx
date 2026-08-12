import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const router = vi.hoisted(() => ({
    navigate: vi.fn(),
    search: {} as Record<string, unknown>,
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => router.navigate,
    useSearch: () => router.search,
}));

import {ApiTransport} from "../../api/transport";
import {SearchPage} from "./SearchPage";

const responseEnvelope = {
    searchResults: [],
    indexerSearchMetaDatas: [],
    indexerLimitWarnings: [],
    rejectedReasonsMap: {},
    notPickedIndexersWithReason: {},
    numberOfAvailableResults: 0,
    numberOfRejectedResults: 0,
};

const bootstrap = {
    username: null,
    authType: null,
    showLogout: false,
    maySeeSearch: true,
    adminRestricted: false,
    statsRestricted: false,
    maySeeStats: false,
    searchRestricted: false,
    maySeeDetailsDl: false,
    maySeeAdmin: false,
    authConfigured: false,
    showIndexerSelection: false,
    serverTimeZone: null,
    baseUrl: "/hydra/",
    safeConfig: {
        categoriesConfig: {
            categories: [{name: "All"}],
            defaultCategory: "All",
            enableCategorySizes: false,
        },
        indexers: [
            {name: "Configured", preselect: true},
            {name: "Not selected", preselect: false},
        ],
    },
};

describe("SearchPage", () => {
    afterEach(cleanup);

    beforeEach(() => {
        router.navigate.mockReset();
        router.search = {};
    });

    it("should update the URL and construct a numeric configured-indexer request", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(responseEnvelope), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />,
        );

        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "query"},
        });
        fireEvent.change(screen.getByLabelText("Minimum age (days)"), {
            target: {value: "2"},
        });
        fireEvent.change(screen.getByLabelText("Maximum size (MB)"), {
            target: {value: "50"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));

        await waitFor(() => expect(fetchImplementation).toHaveBeenCalledOnce());
        expect(router.navigate).toHaveBeenCalledWith({
            to: "/",
            search: {
                query: "query",
                category: "All",
                minage: "2",
                maxsize: "50",
            },
        });
        const request = JSON.parse(fetchImplementation.mock.calls[0][1].body);
        expect(request).toMatchObject({
            query: "query",
            category: "All",
            minage: 2,
            maxsize: 50,
            indexers: ["Configured"],
            loadAll: false,
        });
        expect(typeof request.searchRequestId).toBe("number");
    });

    it("should not request when no configured indexers are selected", () => {
        const fetchImplementation = vi.fn();
        render(
            <SearchPage
                bootstrap={{
                    ...bootstrap,
                    safeConfig: {...bootstrap.safeConfig, indexers: []},
                }}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />,
        );

        expect(screen.getByTestId("search-submit")).toBeDisabled();
        fireEvent.click(screen.getByTestId("search-submit"));
        expect(fetchImplementation).not.toHaveBeenCalled();
    });

    it("should preserve a requested episode in canonical navigation and disable episode grouping", async () => {
        router.search = {episode: "3"};
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    ...responseEnvelope,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Example Show S01E03 WEB",
                            indexer: "One",
                            category: "TV",
                            showtitle: "Example Show",
                            season: "1",
                            episode: "3",
                        },
                        {
                            searchResultId: "two",
                            title: "Example Show S01E03 BluRay",
                            indexer: "Two",
                            category: "TV",
                            showtitle: "Example Show",
                            season: "1",
                            episode: "3",
                        },
                    ],
                }),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));

        await waitFor(() => expect(fetchImplementation).toHaveBeenCalledOnce());
        expect(router.navigate).toHaveBeenCalledWith({
            to: "/",
            search: {category: "All", episode: "3"},
        });
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
    });

    it("should render request failures", async () => {
        const fetchImplementation = vi
            .fn()
            .mockRejectedValue(new Error("failed"));
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        expect(
            await screen.findByText("Unable to execute search."),
        ).toBeVisible();
    });

    it("should render malformed response envelopes as request failures", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        expect(
            await screen.findByText("Unable to execute search."),
        ).toBeVisible();
    });
});
