import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from "@tanstack/react-router";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {
    createHistorySearchSchema,
    NOTIFICATION_HISTORY_SORT_COLUMNS,
} from "./historySearchParams";
import {NotificationHistoryPage} from "./NotificationHistoryPage";

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
    safeConfig: {keepHistory: true} as Record<string, unknown> | null,
};

/**
 * FM-165: the page reads its page, sort and filters out of the route's search
 * parameters, so every case mounts it behind a real router at a real URL --
 * which is also what lets a round trip be proven by reading the location back.
 * `/` stands in for anywhere else in the application, which the Back case
 * leaves through.
 */
function renderRouted(component: () => ReactNode, search?: string) {
    const rootRoute = createRootRoute();
    const elsewhereRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        component: () => <div data-testid="elsewhere">Elsewhere</div>,
    });
    const pageRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/stats/notifications",
        validateSearch: createHistorySearchSchema(
            NOTIFICATION_HISTORY_SORT_COLUMNS,
        ),
        component,
    });
    const router = createRouter({
        basepath: "/hydra",
        history: createMemoryHistory({
            initialEntries: [`/hydra/stats/notifications${search ?? ""}`],
        }),
        routeTree: rootRoute.addChildren([elsewhereRoute, pageRoute]),
    });
    const result = render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                {/*
                 * FM-170: `CopyValueButton` calls `useToasts` unconditionally
                 * (before deciding whether it renders anything), so the page
                 * under test needs a real provider -- same as the production
                 * tree, which mounts one once for the whole app in
                 * `App.tsx`.
                 */}
                <ToastProvider>
                    <RouterProvider router={router} />
                </ToastProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return {...result, router};
}

function renderPage(
    fetchImplementation: typeof fetch,
    safeConfig: Record<string, unknown> | null = bootstrap.safeConfig,
    search?: string,
) {
    return renderRouted(
        () => (
            <NotificationHistoryPage
                bootstrap={{...bootstrap, safeConfig}}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />
        ),
        search,
    );
}

function entry(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        time: "2024-01-01T00:00:00Z",
        notificationEventType: "INDEXER_DISABLED",
        messageType: "WARNING",
        title: "Indexer disabled",
        body: "NZBHydra: Indexer Mock1 was disabled.",
        urls: "json://localhost",
        displayed: false,
        ...overrides,
    };
}

function respondWith(body: unknown, requests: RequestInit[] = []) {
    return vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        if (init) requests.push(init);
        return Promise.resolve(
            new Response(JSON.stringify(body), {
                headers: {"Content-Type": "application/json"},
            }),
        );
    });
}

describe("NotificationHistoryPage", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("should render an accessible loading state before the first page arrives", async () => {
        renderPage(vi.fn(() => new Promise<Response>(() => {})));
        expect(await screen.findByRole("status")).toHaveTextContent(
            "Loading notification history…",
        );
    });

    it("should report a failed request instead of an empty table", async () => {
        renderPage(
            vi.fn(() => Promise.resolve(new Response("boom", {status: 500}))),
        );
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Unable to load notification history.",
        );
    });

    it("should report a response that is not a paged envelope as a failure", async () => {
        renderPage(respondWith({notifications: []}));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Unable to load notification history.",
        );
    });

    it("should render the partial page and count the entries it rejected", async () => {
        renderPage(
            respondWith({
                content: [
                    entry(),
                    entry({id: 2, notificationEventType: "SOMETHING_NEW"}),
                ],
                totalElements: 2,
            }),
        );
        await screen.findByTestId("notification-history-row");
        expect(screen.getAllByTestId("notification-history-row")).toHaveLength(
            1,
        );
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "1 malformed notification history entries were not displayed.",
        );
    });

    it("should report the empty result of the current filters", async () => {
        renderPage(respondWith({content: [], totalElements: 0}));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "No notification history entries match the current filters.",
        );
        expect(
            screen.queryByTestId("notification-history-table"),
        ).not.toBeInTheDocument();
        expect(
            screen.getByTestId("notification-history-page-status"),
        ).toHaveTextContent("Page 1 of 1 · 0 notifications");
    });

    it("should render the humanized event label, the server time, and the total", async () => {
        renderPage(respondWith({content: [entry()], totalElements: 30}));
        const row = await screen.findByTestId("notification-history-row");
        expect(
            within(row).getByTestId("notification-history-type"),
        ).toHaveTextContent("Indexer disabled");
        expect(within(row).getAllByRole("cell")[0]).toHaveTextContent(
            "Jan 1, 2024",
        );
        expect(
            screen.getByTestId("notification-history-page-status"),
        ).toHaveTextContent("Page 1 of 2 · 30 notifications");
    });

    it("should render title and body line breaks as text, never as markup", async () => {
        const {container} = renderPage(
            respondWith({
                content: [
                    entry({
                        title: '<b>Title</b> <script>alert("t")</script>',
                        body: 'First line\nSecond <img src=x onerror="alert(1)"> line\nThird line',
                    }),
                ],
                totalElements: 1,
            }),
        );
        const row = await screen.findByTestId("notification-history-row");
        const body = within(row).getByTestId("notification-history-body");
        // Legacy replaces only the *first* "\n" with a `<br>` and hands the
        // rest to `ng-bind-html`; here every line is its own block of text.
        expect(
            [...body.querySelectorAll(":scope > div")].map(
                (line) => line.textContent,
            ),
        ).toEqual([
            "First line",
            'Second <img src=x onerror="alert(1)"> line',
            "Third line",
        ]);
        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("script")).toBeNull();
        expect(
            within(row).getByTestId("notification-history-title"),
        ).toHaveTextContent('<b>Title</b> <script>alert("t")</script>');
        expect(container.querySelector("b")).toBeNull();
    });

    it("should link only safe URLs and leave executable schemes inert", async () => {
        const {container} = renderPage(
            respondWith({
                content: [
                    entry({
                        body: "Open https://example.com/details or javascript:alert(1) or data:text/html,x",
                        urls: "json://localhost,https://hooks.example/notify",
                    }),
                ],
                totalElements: 1,
            }),
            {keepHistory: true, dereferer: null},
        );
        const row = await screen.findByTestId("notification-history-row");
        const links = within(row).getAllByRole("link");
        expect(links.map((link) => link.getAttribute("href"))).toEqual([
            "https://example.com/details",
            "https://hooks.example/notify",
        ]);
        for (const link of links) {
            expect(link).toHaveAttribute("target", "_blank");
            expect(link).toHaveAttribute(
                "rel",
                expect.stringContaining("noreferrer"),
            );
        }
        expect(
            [...container.querySelectorAll("a")].some((link) =>
                /^\s*(javascript|data|vbscript):/i.test(
                    link.getAttribute("href") ?? "",
                ),
            ),
        ).toBe(false);
        expect(
            within(row).getByTestId("notification-history-body"),
        ).toHaveTextContent("javascript:alert(1)");
        expect(
            within(row).getByTestId("notification-history-urls"),
        ).toHaveTextContent("json://localhost");
    });

    it("should copy title, body, and URLs verbatim, not the rendered/link-trimmed text SafeText shows", async () => {
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        // The trailing period is sentence punctuation, not part of the URL --
        // `linkedTextSegments` trims it off the link it renders, so the link
        // text on screen is "http://example.com/path" without it. Copying
        // must still hand back the whole raw sentence, period included.
        const body =
            "Check http://example.com/path. for details.\nSecond line.";
        renderPage(
            respondWith({
                content: [entry({body})],
                totalElements: 1,
            }),
        );
        const row = await screen.findByTestId("notification-history-row");
        fireEvent.click(
            within(row).getByRole("button", {name: "Copy notification title"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenCalledWith(
                "Indexer disabled",
            ),
        );
        fireEvent.click(
            within(row).getByRole("button", {name: "Copy notification body"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenLastCalledWith(body),
        );
        fireEvent.click(
            within(row).getByRole("button", {name: "Copy notification URLs"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenLastCalledWith(
                "json://localhost",
            ),
        );
        expect(
            await screen.findByText("Copied notification URLs to clipboard."),
        ).toBeVisible();
    });

    it("should send linked URLs through the configured dereferer", async () => {
        renderPage(
            respondWith({
                content: [entry({body: "Open https://example.com/details"})],
                totalElements: 1,
            }),
            {keepHistory: true, dereferer: "https://dereferer.example/?url=$s"},
        );
        const row = await screen.findByTestId("notification-history-row");
        expect(within(row).getByRole("link")).toHaveAttribute(
            "href",
            "https://dereferer.example/?url=https%3A%2F%2Fexample.com%2Fdetails",
        );
    });

    it("should refine, sort, page, and refresh through the shared surfaces", async () => {
        const requests: RequestInit[] = [];
        const fetchImplementation = respondWith(
            {content: [entry()], totalElements: 60},
            requests,
        );
        const lastBody = () => JSON.parse(requests.at(-1)?.body as string);
        renderPage(fetchImplementation);
        await screen.findByTestId("notification-history-row");

        // The refine surface is the route's only filter surface; the table header
        // sorts and nothing more.
        expect(screen.getAllByTestId("history-refine-bar")).toHaveLength(1);
        const table = screen.getByTestId("notification-history-table");
        expect(within(table).queryAllByRole("textbox")).toHaveLength(0);
        expect(within(table).queryAllByRole("combobox")).toHaveLength(0);
        expect(within(table).queryAllByRole("checkbox")).toHaveLength(0);
        expect(lastBody()).toMatchObject({
            page: 1,
            limit: 25,
            filterModel: {},
            sortModel: {column: "time", sortMode: 2},
        });

        // ADR-0016: nothing is preselected, there is no invert control, and
        // the unfiltered request carries no event-type entry at all.
        const options = screen.getAllByTestId(
            "history-refine-event-type-option",
        );
        expect(options).toHaveLength(8);
        expect(
            options.every(
                (option) => option.getAttribute("aria-pressed") === "false",
            ),
        ).toBe(true);
        expect(screen.queryByRole("button", {name: /invert/i})).toBeNull();

        // ADR-0050: the event-type dimension is a collapsible multi-select
        // that starts collapsed, so its rows stay mounted but hidden from the
        // accessibility tree until the caption is pressed -- which is why the
        // `data-testid` queries above resolve and this role query would not.
        fireEvent.click(screen.getByTestId("history-refine-event-type-toggle"));
        fireEvent.click(screen.getByRole("button", {name: "Indexer disabled"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(2),
        );
        expect(lastBody()).toMatchObject({
            page: 1,
            filterModel: {
                NOTIFICATION_EVENT_TYPE: {
                    filterType: "checkboxes",
                    filterValue: ["INDEXER_DISABLED"],
                },
            },
        });

        fireEvent.change(screen.getByLabelText("After"), {
            target: {value: "2024-01-01T00:00"},
        });
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
        );
        expect(lastBody().filterModel.time.filterType).toBe("time");
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "2 active filters",
        );

        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(4),
        );
        expect(lastBody()).toMatchObject({page: 2});

        // Sorting uses the enum column legacy sorts on and returns to page 1.
        fireEvent.click(screen.getByRole("button", {name: "Type"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(5),
        );
        expect(lastBody()).toMatchObject({
            page: 1,
            sortModel: {column: "NOTIFICATION_EVENT_TYPE", sortMode: 1},
        });
        fireEvent.click(screen.getByRole("button", {name: "Type"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(6),
        );
        expect(lastBody()).toMatchObject({
            sortModel: {column: "NOTIFICATION_EVENT_TYPE", sortMode: 2},
        });

        // Clear all empties every dimension and returns to page 1.
        fireEvent.click(screen.getByTestId("history-refine-clear-all"));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(7),
        );
        expect(lastBody()).toMatchObject({page: 1, filterModel: {}});

        fireEvent.click(screen.getByTestId("notification-history-refresh"));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(8),
        );
    });

    it("should carry the filter, the sort, and the page in the URL and restore them on a fresh mount", async () => {
        const requests: RequestInit[] = [];
        const {router} = renderPage(
            respondWith({content: [entry()], totalElements: 60}, requests),
        );
        await screen.findByTestId("notification-history-row");
        fireEvent.click(screen.getByTestId("history-refine-event-type-toggle"));
        fireEvent.click(screen.getByRole("button", {name: "Indexer disabled"}));
        fireEvent.click(screen.getByRole("button", {name: "Type"}));
        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() =>
            expect(
                screen.getByTestId("notification-history-page-status"),
            ).toHaveTextContent("Page 2 of 3"),
        );
        const url = router.history.location.href;
        const filtered = url.slice(url.indexOf("?"));
        const before = JSON.parse(requests.at(-1)?.body as string);
        expect(before).toMatchObject({
            page: 2,
            sortModel: {column: "NOTIFICATION_EVENT_TYPE", sortMode: 1},
            filterModel: {
                NOTIFICATION_EVENT_TYPE: {
                    filterType: "checkboxes",
                    filterValue: ["INDEXER_DISABLED"],
                },
            },
        });

        // The link on its own is the whole view: a fresh mount at that URL
        // reads the same page, with the same request behind it.
        cleanup();
        const reloaded: RequestInit[] = [];
        renderPage(
            respondWith({content: [entry()], totalElements: 60}, reloaded),
            bootstrap.safeConfig,
            filtered,
        );
        await screen.findByTestId("notification-history-row");
        expect(JSON.parse(reloaded[0]?.body as string)).toEqual(before);
        expect(
            screen.getByTestId("notification-history-page-status"),
        ).toHaveTextContent("Page 2 of 3");
        fireEvent.click(screen.getByTestId("history-refine-event-type-toggle"));
        expect(
            screen.getByRole("button", {name: "Indexer disabled"}),
        ).toHaveAttribute("aria-pressed", "true");
    });
});
