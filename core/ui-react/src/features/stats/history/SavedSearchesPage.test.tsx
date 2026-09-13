import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    fireEvent,
    cleanup,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({useNavigate: () => navigate}));

import {ApiTransport} from "../../../api/transport";
import {SavedSearchesPage} from "./SavedSearchesPage";

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
    serverTimeZone: null,
    safeConfig: {
        categoriesConfig: {
            categories: [{name: "All"}],
            defaultCategory: "All",
            enableCategorySizes: false,
        },
        indexers: [],
    },
};

// Slower than Loading's 300ms delay so the placeholder assertion below can
// observe it before the query settles (FM-144).
function delayed(response: Response, ms = 350): Promise<Response> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(response), ms);
    });
}

function renderPage(fetchImplementation: typeof fetch) {
    return render(
        <QueryClientProvider
            client={
                new QueryClient({defaultOptions: {queries: {retry: false}}})
            }
        >
            <SavedSearchesPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />
        </QueryClientProvider>,
    );
}

describe("SavedSearchesPage", () => {
    afterEach(() => cleanup());

    it("should preserve server indices when deleting after a malformed entry", async () => {
        const fetchImplementation = vi
            .fn()
            .mockImplementationOnce(() =>
                delayed(
                    new Response(
                        JSON.stringify([
                            {categoryName: 3},
                            {categoryName: "All", query: "retained"},
                            {categoryName: "All", query: "deleted"},
                        ]),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                ),
            )
            .mockResolvedValueOnce(new Response(null, {status: 204}))
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify([{categoryName: "All", query: "retained"}]),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        renderPage(fetchImplementation);
        expect(await screen.findByRole("status")).toHaveTextContent(
            "Loading saved searches",
        );
        expect(
            await screen.findByText(
                "1 malformed saved search entries were not displayed.",
            ),
        ).toBeVisible();
        fireEvent.click(
            within(screen.getByRole("row", {name: /retained/})).getByRole(
                "button",
                {name: "Search"},
            ),
        );
        expect(navigate).toHaveBeenCalledWith({
            to: "/",
            search: {category: "All", query: "retained"},
        });
        fireEvent.click(
            within(screen.getByRole("row", {name: /deleted/})).getByRole(
                "button",
                {name: "Delete"},
            ),
        );
        fireEvent.click(
            within(screen.getByRole("dialog")).getByRole("button", {
                name: "Delete",
            }),
        );
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenNthCalledWith(
                2,
                "http://localhost:3000/hydra/internalapi/savedsearches/2",
                expect.objectContaining({method: "DELETE"}),
            ),
        );
        expect(await screen.findByText("retained")).toBeVisible();
        expect(screen.queryByText("deleted")).not.toBeInTheDocument();
    });

    it("should render a request failure", async () => {
        renderPage(
            vi.fn().mockResolvedValue(new Response("failed", {status: 500})),
        );
        expect(
            await screen.findByText("Unable to load saved searches."),
        ).toBeVisible();
    });

    it("should retain a row and allow retry after deletion fails", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify([{categoryName: "All", query: "retry"}]),
                    {headers: {"Content-Type": "application/json"}},
                ),
            )
            .mockResolvedValueOnce(new Response("failed", {status: 500}))
            .mockResolvedValueOnce(new Response(null, {status: 204}))
            .mockResolvedValueOnce(
                new Response(JSON.stringify([]), {
                    headers: {"Content-Type": "application/json"},
                }),
            );
        renderPage(fetchImplementation);

        fireEvent.click(await screen.findByRole("button", {name: "Delete"}));
        const dialog = screen.getByRole("dialog");
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(2),
        );
        expect(
            await within(dialog).findByText("Unable to delete saved search."),
        ).toBeVisible();
        expect(screen.getByText("retry")).toBeVisible();

        fireEvent.click(within(dialog).getByRole("button", {name: "Delete"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(4),
        );
        expect(await screen.findByText(/You can save searches/)).toBeVisible();
    });
});
