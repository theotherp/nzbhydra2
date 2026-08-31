import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {App} from "./App";

const bootstrap = {
    username: null,
    authType: null,
    showLogout: false,
    maySeeSearch: false,
    adminRestricted: false,
    statsRestricted: false,
    maySeeStats: false,
    searchRestricted: false,
    maySeeDetailsDl: false,
    maySeeAdmin: false,
    authConfigured: false,
    showIndexerSelection: false,
    safeConfig: {},
    baseUrl: "/hydra/",
    serverTimeZone: null,
};

/** A session that may read the history and statistics area, history on. */
const statsBootstrap = {
    ...bootstrap,
    username: "stats",
    maySeeStats: true,
    maySeeSearch: true,
    safeConfig: {keepHistory: true},
    serverTimeZone: "UTC",
};

/**
 * An ambient `fetch` for the stats area that answers every request with a
 * well-formed empty payload and counts the indexer-statuses reads, which is
 * what the cache-default test measures. Payloads have to parse: a rejected
 * query would be retried by react-query and inflate the count for a reason
 * that has nothing to do with `staleTime`.
 */
function statsBackend() {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : String(input);
        calls.push(url);
        // `true` for `welcomeshown` and empty news lists keep the shell's
        // startup sequence from opening a modal, which would put the whole
        // application behind `aria-hidden` and make every role below
        // unreachable.
        const body = url.includes("internalapi/welcomeshown")
            ? "true"
            : url.includes("internalapi/indexerstatuses") ||
                url.includes("internalapi/news") ||
                url.includes("internalapi/usernews")
              ? "[]"
              : url.includes("internalapi/history/notifications")
                ? JSON.stringify({
                      content: [],
                      totalPages: 0,
                      totalElements: 0,
                  })
                : "{}";
        return new Response(body, {
            status: 200,
            headers: {"Content-Type": "application/json"},
        });
    });
    return {
        fetch: fetchMock as unknown as typeof fetch,
        indexerStatusCalls: () =>
            calls.filter((url) => url.includes("internalapi/indexerstatuses"))
                .length,
    };
}

/** See `StatsDashboardPage.test.tsx`: this jsdom has no `window.localStorage`. */
function stubWorkingLocalStorage(): void {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) =>
            store.has(key) ? (store.get(key) as string) : null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    } satisfies Storage);
}

const STATS_TABLIST = {name: "History and statistics"};

async function switchTab(name: string) {
    fireEvent.click(screen.getByRole("tab", {name}));
    await waitFor(() =>
        expect(screen.getByRole("tab", {name})).toHaveAttribute(
            "aria-selected",
            "true",
        ),
    );
}

/** Lets any refetch a navigation may have queued actually be issued. */
async function settle() {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
    });
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("App", () => {
    it("should render an unknown-route notice with no way out of React", async () => {
        // FM-024 migrates `/stats/stats` (the aggregate dashboard); any other
        // `/stats/<tab>` still falls through the stats shell's own fallback
        // route to this notice, which is what this test exercises.
        window.history.pushState({}, "", "/hydra/stats/other?period=day");
        render(<App bootstrap={bootstrap} />);

        expect(
            await screen.findByRole("heading", {
                name: "Page not found",
            }),
        ).toBeInTheDocument();
        // FM-095: the legacy shell and its selector endpoints are gone, so the
        // notice must offer no escape hatch onto them -- an `/ui/legacy` link
        // here would now be a link to a 404.
        expect(screen.queryByRole("link", {name: /legacy/i})).toBeNull();
        expect(
            Array.from(document.querySelectorAll("a[href]")).map((anchor) =>
                anchor.getAttribute("href"),
            ),
        ).not.toContainEqual(expect.stringContaining("ui/legacy"));
    });

    // FM-121. Both tests below fail against the pre-FM-121 tree, and are
    // written so that they can: an assertion that *a* stats shell is on screen
    // after a tab switch passes either way, because the seven sibling routes
    // each rendered their own. What separates the two topologies is whether it
    // is the *same* shell -- so this compares the tablist node's identity, and
    // the next test counts the requests the remount used to throw away.
    it("should keep one stats shell mounted across a tab switch", async () => {
        stubWorkingLocalStorage();
        vi.stubGlobal("fetch", statsBackend().fetch);
        window.history.pushState({}, "", "/hydra/stats/indexers");
        render(<App bootstrap={statsBootstrap} />);

        const tablist = await screen.findByRole("tablist", STATS_TABLIST);
        await switchTab("Notification history");

        expect(screen.getByRole("tablist", STATS_TABLIST)).toBe(tablist);
    });

    it("should serve a stats tab revisited within staleTime from the cache", async () => {
        stubWorkingLocalStorage();
        const backend = statsBackend();
        vi.stubGlobal("fetch", backend.fetch);
        window.history.pushState({}, "", "/hydra/stats/indexers");
        render(<App bootstrap={statsBootstrap} />);

        await screen.findByRole("heading", {name: "Indexer statuses"});
        expect(backend.indexerStatusCalls()).toBe(1);

        await switchTab("Notification history");
        await switchTab("Indexer statuses");
        await screen.findByRole("heading", {name: "Indexer statuses"});
        await settle();

        // The second visit rendered from the cache: no second request, and so
        // no first-load spinner between the click and the content.
        expect(backend.indexerStatusCalls()).toBe(1);
    });

    /*
     * react-query's own `refetchOnWindowFocus` default is `true`, so every
     * query that does not pin the option refetched the moment the tab was
     * focused again with its data stale -- alt-tabbing back to a history page
     * re-issued the page read and its COUNT and jumped the layout for an
     * action the reader never took. Legacy never did this. Asserted from the
     * application rather than from the client object because what matters is
     * the default the mounted client actually carries.
     */
    it("should not refetch a stale query when the window regains focus", async () => {
        stubWorkingLocalStorage();
        const backend = statsBackend();
        vi.stubGlobal("fetch", backend.fetch);
        window.history.pushState({}, "", "/hydra/stats/indexers");
        render(<App bootstrap={statsBootstrap} />);

        await screen.findByRole("heading", {name: "Indexer statuses"});
        expect(backend.indexerStatusCalls()).toBe(1);

        // Well past `DEFAULT_QUERY_STALE_TIME_MS`, so the entry is stale and
        // a focus refetch is the only thing that could issue a second read.
        const frozen = Date.now() + 5 * 60_000;
        vi.spyOn(Date, "now").mockReturnValue(frozen);
        // `focusManager` subscribes to `visibilitychange` on `window`, and
        // jsdom reports `visibilityState: "visible"`, so this is exactly the
        // event a tab regaining focus delivers.
        await act(async () => {
            window.dispatchEvent(new Event("visibilitychange"));
        });
        await settle();

        expect(backend.indexerStatusCalls()).toBe(1);
    });

    it("should render the application loading convention", () => {
        render(<App bootstrap={bootstrap} isLoading />);

        const status = screen.getByRole("status");
        expect(status).toHaveTextContent("Loading…");
        expect(status).toContainElement(screen.getByRole("progressbar"));
        expect(screen.getByText("Loading…")).toBeVisible();
    });

    /*
     * FM-154 (ADR-0049): `App` no longer builds the theme itself; it renders
     * `ThemePreferenceProvider`, which owns the preference and provides the
     * theme built from it.
     *
     * Both halves are asserted from the *application*, not from the provider in
     * isolation, because the failure this guards against is a wiring one: a
     * provider mounted below the shell (so the selector cannot reach it), or
     * mounted but not supplying the theme (so `CssBaseline` and every component
     * fall back to MUI's stock light default). The loading branch is included
     * for the same reason -- it renders outside `QueryClientProvider` and would
     * be the easy one to leave outside the theme too.
     */
    it("should provide the default theme and the selector that changes it", async () => {
        stubWorkingLocalStorage();
        vi.stubGlobal("fetch", statsBackend().fetch);
        window.history.pushState({}, "", "/hydra/stats/indexers");
        render(<App bootstrap={statsBootstrap} />);

        const selector = await screen.findByTestId("app-shell-theme-selector");
        expect(selector).toHaveTextContent("Theme: Grey");
        // The grey theme's page ground, applied by `CssBaseline` under the
        // provider's theme -- evidence that the theme is genuinely in force and
        // not merely constructed.
        expect(window.getComputedStyle(document.body).backgroundColor).toBe(
            "rgb(31, 36, 38)",
        );

        fireEvent.click(selector);
        fireEvent.click(screen.getByTestId("app-shell-theme-option-bright"));

        expect(selector).toHaveTextContent("Theme: Bright");
        expect(window.getComputedStyle(document.body).backgroundColor).toBe(
            "rgb(242, 244, 243)",
        );
    });

    /*
     * ADR-0049's `auto` has to follow the operating system *while the page is
     * open*, which is the one behaviour in `ThemePreferenceProvider` that no
     * amount of clicking the selector exercises: it lives in the media query's
     * `change` event, not in the preference state.
     *
     * jsdom implements neither `matchMedia` nor `MediaQueryList`, so the stub
     * below is the only way to reach it. It is a real (if minimal) store --
     * `matches` is mutable and the captured listener is the provider's own --
     * so flipping it and firing the event is exactly what the browser does.
     * The assertion stays the one the cases above use, the rendered page
     * ground, so a provider that re-subscribed but never re-created the theme
     * would still fail here.
     */
    it("should follow the system scheme while Auto is selected", async () => {
        stubWorkingLocalStorage();
        vi.stubGlobal("fetch", statsBackend().fetch);
        const listeners: (() => void)[] = [];
        const darkScheme = {
            matches: false,
            media: "(prefers-color-scheme: dark)",
            addEventListener: (_event: string, listener: () => void) => {
                listeners.push(listener);
            },
            removeEventListener: (_event: string, listener: () => void) => {
                listeners.splice(listeners.indexOf(listener), 1);
            },
        };
        vi.stubGlobal(
            "matchMedia",
            vi.fn((query: string) =>
                query === darkScheme.media
                    ? darkScheme
                    : {
                          matches: false,
                          media: query,
                          addEventListener: () => undefined,
                          removeEventListener: () => undefined,
                      },
            ),
        );
        window.history.pushState({}, "", "/hydra/stats/indexers");
        render(<App bootstrap={statsBootstrap} />);

        const selector = await screen.findByTestId("app-shell-theme-selector");
        fireEvent.click(selector);
        fireEvent.click(screen.getByTestId("app-shell-theme-option-auto"));

        // A system in light mode resolves `auto` to bright.
        expect(selector).toHaveTextContent("Theme: Auto");
        expect(listeners).toHaveLength(1);
        expect(window.getComputedStyle(document.body).backgroundColor).toBe(
            "rgb(242, 244, 243)",
        );

        // The system switches to dark with the page open: no reselection, no
        // reload, and the resolved theme moves to grey.
        act(() => {
            darkScheme.matches = true;
            for (const listener of listeners) {
                listener();
            }
        });

        expect(selector).toHaveTextContent("Theme: Auto");
        expect(window.getComputedStyle(document.body).backgroundColor).toBe(
            "rgb(31, 36, 38)",
        );

        // ...and back, so the case cannot pass on a one-way latch.
        act(() => {
            darkScheme.matches = false;
            for (const listener of listeners) {
                listener();
            }
        });

        expect(window.getComputedStyle(document.body).backgroundColor).toBe(
            "rgb(242, 244, 243)",
        );
    });

    it("should render the loading branch under the theme as well", () => {
        render(<App bootstrap={bootstrap} isLoading />);

        expect(window.getComputedStyle(document.body).backgroundColor).toBe(
            "rgb(31, 36, 38)",
        );
    });
});
