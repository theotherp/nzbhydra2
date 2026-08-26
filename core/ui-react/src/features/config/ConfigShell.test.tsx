import {TextField, ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Link,
    Outlet,
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
import {useFormContext} from "react-hook-form";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {SafeConfigProvider} from "../../app/SafeConfigProvider";
import {createHydraTheme} from "../../app/theme";
import type {BootstrapData} from "../../bootstrap";
import {DialogProvider} from "../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../components/toasts/ToastProvider";
import {StatsShell} from "../stats/StatsShell";
import {SHOW_ADVANCED_STORAGE_KEY} from "./advancedFields";
import type {ConfigTab} from "./configTabs";
import {CONFIG_TABS, configTabTestId} from "./configTabs";
import {createConfigRoute} from "./routes";

const serverConfig = {
    main: {host: "0.0.0.0", port: 5076, apiKey: "***UNCHANGED***"},
    auth: {authType: "NONE"},
    emby: {host: "http://emby"},
    genericStorage: {someKey: "someValue"},
    indexers: [{name: "Mock", unmodeled: true}],
};

type SaveResult = {
    ok: boolean;
    restartNeeded?: boolean;
    errorMessages?: string[];
    warningMessages?: string[];
    newConfig?: unknown;
};

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

type Backend = {
    fetch: FetchMock;
    puts: Record<string, unknown>[];
    restarts: number;
};

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
    });
}

function createBackend({
    config = serverConfig,
    safeConfig = {keepHistory: false} as Record<string, unknown>,
    saveResults = [
        {ok: true, restartNeeded: false, newConfig: serverConfig},
    ] as SaveResult[],
    apiHelp = {
        newznabApi: "http://host/",
        torznabApi: "http://host/torznab",
        apiKey: "the-api-key",
    },
}: {
    config?: unknown;
    safeConfig?: Record<string, unknown>;
    saveResults?: SaveResult[];
    apiHelp?: unknown;
} = {}): Backend {
    const backend: Backend = {
        fetch: vi.fn<typeof fetch>(),
        puts: [],
        restarts: 0,
    };
    let save = 0;
    backend.fetch.mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";
            if (url.endsWith("/internalapi/config") && method === "GET") {
                return jsonResponse(config);
            }
            if (url.endsWith("/internalapi/config") && method === "PUT") {
                backend.puts.push(
                    JSON.parse(String(init?.body)) as Record<string, unknown>,
                );
                const result =
                    saveResults[Math.min(save++, saveResults.length - 1)];
                return jsonResponse({
                    errorMessages: [],
                    warningMessages: [],
                    restartNeeded: false,
                    ...result,
                });
            }
            if (url.endsWith("/internalapi/config/safe")) {
                return jsonResponse(safeConfig);
            }
            if (url.endsWith("/internalapi/config/apiHelp")) {
                return jsonResponse(apiHelp);
            }
            if (url.endsWith("/internalapi/control/restart")) {
                backend.restarts += 1;
                return jsonResponse({successful: true, message: null});
            }
            if (url.endsWith("/internalapi/control/ping")) {
                return jsonResponse({successful: true});
            }
            throw new Error(`Unexpected request: ${method} ${url}`);
        },
    );
    return backend;
}

const bootstrap: BootstrapData = {
    username: "admin",
    authType: null,
    showLogout: true,
    maySeeSearch: true,
    adminRestricted: true,
    statsRestricted: false,
    maySeeStats: true,
    searchRestricted: false,
    maySeeDetailsDl: true,
    maySeeAdmin: true,
    authConfigured: true,
    showIndexerSelection: false,
    safeConfig: {keepHistory: false},
    baseUrl: "/hydra/",
    serverTimeZone: "UTC",
};

/** A tab body of the shape FM-059 onwards will ship: bound to the shell's form. */
function HostFieldTab({tab}: {tab: ConfigTab}) {
    const {register} = useFormContext();
    const field = register("main.host", {
        // FM-097: one real React Hook Form validation error the shell can
        // derive an invalid badge from. Only the invalid-badge test uses this
        // sentinel; every other test's host value passes it.
        validate: (value) => value !== "invalid-host" || "Not a host",
    });
    return (
        <div>
            <p>{`${tab.label} body`}</p>
            <TextField
                inputRef={field.ref}
                label="Host"
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
            />
        </div>
    );
}

function renderConfigArea({
    backend,
    withStatsShell = false,
}: {
    backend: Backend;
    withStatsShell?: boolean;
}) {
    // `SafeConfigProvider` builds its own transport from the bootstrap base
    // URL, exactly as it does inside `App`, so the backend has to be the
    // ambient `fetch` and not just the instance handed to the routes.
    vi.stubGlobal("fetch", backend.fetch);
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    const transport = new ApiTransport("/hydra/", backend.fetch);
    const rootRoute = createRootRoute({
        component: () => (
            <>
                {withStatsShell ? (
                    <StatsShell bootstrap={bootstrap}>
                        <span />
                    </StatsShell>
                ) : null}
                <Link data-testid="leave-config" to="/elsewhere">
                    Leave config
                </Link>
                <Outlet />
            </>
        ),
    });
    const elsewhereRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "elsewhere",
        component: () => <p>Somewhere else</p>,
    });
    const router = createRouter({
        basepath: "/hydra",
        history: createMemoryHistory({initialEntries: ["/hydra/config/main"]}),
        routeTree: rootRoute.addChildren([
            elsewhereRoute,
            createConfigRoute(rootRoute, transport, (tab) => (
                <HostFieldTab tab={tab} />
            )),
        ]),
    });
    render(
        <ThemeProvider theme={createHydraTheme("dark")}>
            <QueryClientProvider client={queryClient}>
                <SafeConfigProvider bootstrap={bootstrap}>
                    <DialogProvider>
                        <ToastProvider>
                            <RouterProvider router={router} />
                        </ToastProvider>
                    </DialogProvider>
                </SafeConfigProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return {router};
}

async function waitForShell() {
    return screen.findByTestId("config-shell");
}

function setHost(value: string) {
    fireEvent.change(screen.getByLabelText("Host"), {target: {value}});
}

// jsdom in this project has no working `localStorage` (see
// SearchResults.test.tsx); the advanced-fields preference needs a real one.
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

// Below `md` the settings nav renders inside a MUI `Drawer` instead of the
// docked column, decided by `useMediaQuery` rather than by CSS `display`.
// jsdom's own `matchMedia` never matches anything, so a mobile viewport has to
// be stated explicitly; `vi.unstubAllGlobals()` in `afterEach` removes it.
function stubMobileViewport(): void {
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }));
}

beforeEach(() => {
    stubWorkingLocalStorage();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("ConfigShell", () => {
    it("should offer every canonical tab", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        for (const [testId, label] of [
            ["config-tab-main", "Main"],
            ["config-tab-auth", "Authorization"],
            ["config-tab-searching", "Searching"],
            ["config-tab-categories", "Categories"],
            ["config-tab-downloading", "Downloading"],
            ["config-tab-externalTools", "External Tools"],
            ["config-tab-indexers", "Indexers"],
            ["config-tab-notifications", "Notifications"],
        ]) {
            const tab = screen.getByTestId(testId);
            expect(tab).toHaveTextContent(label);
            expect(tab).toHaveAttribute(
                "href",
                `/hydra/config/${testId.replace("config-tab-", "")}`,
            );
        }
    });

    it("should keep an edit made on one tab when another tab is opened and send it", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        setHost("192.168.0.5");
        fireEvent.click(screen.getByTestId("config-tab-auth"));
        expect(await screen.findByText("Authorization body")).toBeVisible();

        fireEvent.click(screen.getByTestId("config-tab-main"));
        expect(await screen.findByText("Main body")).toBeVisible();
        expect(screen.getByLabelText("Host")).toHaveValue("192.168.0.5");

        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() => expect(backend.puts).toHaveLength(1));
        expect(backend.puts[0]).toEqual({
            ...serverConfig,
            main: {...serverConfig.main, host: "192.168.0.5"},
        });
    });

    it("should send back every section it never modeled", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() => expect(backend.puts).toHaveLength(1));
        expect(backend.puts[0]).toEqual(serverConfig);
    });

    it("should block on validation errors and keep the form dirty", async () => {
        const backend = createBackend({
            saveResults: [
                {
                    ok: false,
                    errorMessages: ["Port must be a number"],
                    warningMessages: ["Consider setting a password"],
                },
            ],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("0.0.0.0x");
        fireEvent.click(screen.getByTestId("config-save"));

        const dialog = await screen.findByTestId("config-validation-errors");
        expect(dialog).toHaveTextContent("Config validation failed");
        expect(dialog).toHaveTextContent("Port must be a number");
        expect(dialog).toHaveTextContent(
            "Warning (may be ignored): Consider setting a password",
        );
        fireEvent.click(within(dialog).getByRole("button", {name: "OK"}));

        // Nothing was persisted, so the form must still be dirty: leaving now
        // has to raise the unsaved-changes guard.
        fireEvent.click(screen.getByTestId("leave-config"));
        expect(
            await screen.findByTestId("config-unsaved-changes"),
        ).toBeVisible();
    });

    it("should state that a warned-about config was already saved and reset from the server copy", async () => {
        const normalized = {
            ...serverConfig,
            main: {...serverConfig.main, host: "normalized-by-server"},
        };
        const backend = createBackend({
            saveResults: [
                {
                    ok: true,
                    warningMessages: ["No indexer configured"],
                    newConfig: normalized,
                },
            ],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("submitted-value");
        fireEvent.click(screen.getByTestId("config-save"));

        const dialog = await screen.findByTestId("config-validation-warnings");
        expect(dialog).toHaveTextContent("The config was already saved");
        expect(dialog).toHaveTextContent("No indexer configured");
        fireEvent.click(within(dialog).getByRole("button", {name: "OK"}));

        // The form holds the server's own copy, not what was submitted.
        await waitFor(() =>
            expect(screen.getByLabelText("Host")).toHaveValue(
                "normalized-by-server",
            ),
        );
        fireEvent.click(screen.getByTestId("leave-config"));
        expect(await screen.findByText("Somewhere else")).toBeVisible();
    });

    it("should surface a transport failure instead of reporting success", async () => {
        const backend = createBackend();
        backend.fetch.mockImplementation(
            async (input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input);
                if (
                    url.endsWith("/internalapi/config") &&
                    (init?.method ?? "GET") === "GET"
                ) {
                    return jsonResponse(serverConfig);
                }
                if (url.endsWith("/internalapi/config/safe")) {
                    return jsonResponse({keepHistory: false});
                }
                return new Response("Backend exploded", {status: 500});
            },
        );
        renderConfigArea({backend});
        await waitForShell();

        fireEvent.click(screen.getByTestId("config-save"));

        expect(
            await screen.findByText(/Unable to save the configuration/),
        ).toBeVisible();
        expect(screen.queryByText("Configuration saved.")).toBeNull();
    });

    it("should offer a restart when the server asks for one", async () => {
        const backend = createBackend({
            saveResults: [
                {ok: true, restartNeeded: true, newConfig: serverConfig},
            ],
        });
        renderConfigArea({backend});
        await waitForShell();

        fireEvent.click(screen.getByTestId("config-save"));
        const dialog = await screen.findByTestId("config-restart-required");
        expect(dialog).toHaveTextContent("Restart required");
        fireEvent.click(within(dialog).getByRole("button", {name: "Yes"}));

        await waitFor(() => expect(backend.restarts).toBe(1));
        expect(
            await screen.findByTestId("restart-progress-dialog"),
        ).toBeVisible();
        expect(
            screen.getByTestId("restart-progress-message"),
        ).toHaveTextContent("Will reload page when NZBHydra is back.");
    });

    it("should keep the advanced toggle out of the form and out of the config", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        fireEvent.click(
            screen.getByRole("switch", {name: "Advanced settings"}),
        );
        expect(window.localStorage.getItem(SHOW_ADVANCED_STORAGE_KEY)).toBe(
            "true",
        );

        // Toggling it must not dirty the form: leaving does not prompt.
        fireEvent.click(screen.getByTestId("leave-config"));
        expect(await screen.findByText("Somewhere else")).toBeVisible();
        expect(screen.queryByTestId("config-unsaved-changes")).toBeNull();

        expect(backend.puts).toHaveLength(0);
    });

    it("should never send a showAdvanced key", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        fireEvent.click(
            screen.getByRole("switch", {name: "Advanced settings"}),
        );
        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() => expect(backend.puts).toHaveLength(1));
        expect(JSON.stringify(backend.puts[0])).not.toContain("showAdvanced");
    });

    it("should show the API endpoints and decline while unsaved changes exist", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        setHost("0.0.0.09");
        fireEvent.click(screen.getByTestId("config-api-help"));
        expect(await screen.findByText("Please save first")).toBeVisible();
        expect(screen.queryByTestId("config-api-help-dialog")).toBeNull();

        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() => expect(backend.puts).toHaveLength(1));
        fireEvent.click(screen.getByTestId("config-api-help"));

        const dialog = await screen.findByTestId("config-api-help-dialog");
        expect(dialog).toHaveTextContent("Newznab API endpoint: http://host/");
        expect(dialog).toHaveTextContent(
            "Torznab API endpoint: http://host/torznab",
        );
        expect(dialog).toHaveTextContent("API key: the-api-key");
    });
});

describe("ConfigShell settings navigation", () => {
    it("should hold every tab plus the advanced toggle and API button in one nav", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        const nav = screen.getByTestId("config-nav");
        for (const tab of CONFIG_TABS) {
            expect(within(nav).getByTestId(configTabTestId(tab))).toBeVisible();
        }
        expect(within(nav).getByTestId("config-advanced-toggle")).toBeVisible();
        expect(within(nav).getByTestId("config-api-help")).toBeVisible();
        // The nav is the docked desktop column here, so its drawer opener is
        // not rendered at all (jsdom resolves the `md` media query to false).
        expect(screen.queryByTestId("config-nav-open")).toBeNull();
    });

    it("should collapse into a drawer below the md breakpoint", async () => {
        stubMobileViewport();
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        // Closed: exactly one copy of every control exists, so the nav and its
        // entries are not in the DOM at all until the drawer is opened.
        expect(screen.getByTestId("config-nav-open")).toBeVisible();
        expect(screen.queryByTestId("config-nav")).toBeNull();
        expect(screen.queryByTestId("config-tab-main")).toBeNull();
        expect(screen.queryByTestId("config-advanced-toggle")).toBeNull();

        fireEvent.click(screen.getByTestId("config-nav-open"));

        const nav = await screen.findByTestId("config-nav");
        for (const tab of CONFIG_TABS) {
            expect(within(nav).getByTestId(configTabTestId(tab))).toBeVisible();
        }
        expect(within(nav).getByTestId("config-advanced-toggle")).toBeVisible();
        expect(within(nav).getByTestId("config-api-help")).toBeVisible();

        // Choosing a section navigates and closes the overlay it was chosen in.
        fireEvent.click(within(nav).getByTestId("config-tab-searching"));
        expect(await screen.findByText("Searching body")).toBeVisible();
        await waitFor(() =>
            expect(screen.queryByTestId("config-tab-searching")).toBeNull(),
        );
    });

    it("should mark the active entry as the selected tab", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        expect(screen.getByTestId("config-tab-main")).toHaveAttribute(
            "aria-selected",
            "true",
        );

        fireEvent.click(screen.getByTestId("config-tab-downloading"));
        expect(await screen.findByText("Downloading body")).toBeVisible();
        expect(screen.getByTestId("config-tab-downloading")).toHaveAttribute(
            "aria-selected",
            "true",
        );
        expect(screen.getByTestId("config-tab-main")).toHaveAttribute(
            "aria-selected",
            "false",
        );
    });

    it("should badge only the section that was edited, naming the state in words", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        expect(screen.queryByTestId("config-nav-dirty-main")).toBeNull();

        setHost("192.168.0.5");

        const dot = await screen.findByTestId("config-nav-dirty-main");
        // Colour is never the sole carrier of the badge's meaning.
        expect(dot).toHaveAttribute("aria-label", "Main has unsaved changes");
        for (const tab of CONFIG_TABS.filter(
            (entry) => entry.path !== "main",
        )) {
            expect(
                screen.queryByTestId(`config-nav-dirty-${tab.path}`),
            ).toBeNull();
        }
        expect(screen.queryByTestId("config-nav-invalid-main")).toBeNull();
    });

    it("should badge a section whose fields failed validation", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        setHost("invalid-host");
        fireEvent.click(screen.getByTestId("config-save"));

        const dot = await screen.findByTestId("config-nav-invalid-main");
        expect(dot).toHaveAttribute("aria-label", "Main has invalid settings");
        for (const tab of CONFIG_TABS.filter(
            (entry) => entry.path !== "main",
        )) {
            expect(
                screen.queryByTestId(`config-nav-invalid-${tab.path}`),
            ).toBeNull();
        }
    });
});

describe("ConfigShell sticky save bar", () => {
    it("should offer Save alone while the form is pristine", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        expect(screen.getByTestId("config-save")).toBeVisible();
        expect(screen.queryByTestId("config-dirty-summary")).toBeNull();
        expect(screen.queryByTestId("config-discard")).toBeNull();
    });

    it("should summarize how many settings changed once the form is dirty", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        setHost("192.168.0.5");

        expect(
            await screen.findByTestId("config-dirty-summary"),
        ).toHaveTextContent("1 setting changed");
        expect(screen.getByTestId("config-discard")).toBeVisible();
    });

    it("should restore the loaded config and clear the summary when Discard is used", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        setHost("discard-me");
        expect(await screen.findByTestId("config-dirty-summary")).toBeVisible();

        fireEvent.click(screen.getByTestId("config-discard"));

        await waitFor(() =>
            expect(screen.getByLabelText("Host")).toHaveValue("0.0.0.0"),
        );
        expect(screen.queryByTestId("config-dirty-summary")).toBeNull();
        expect(screen.queryByTestId("config-discard")).toBeNull();
        expect(screen.queryByTestId("config-nav-dirty-main")).toBeNull();
        expect(backend.puts).toHaveLength(0);

        // Nothing is unsaved any more, so leaving must not raise the guard.
        fireEvent.click(screen.getByTestId("leave-config"));
        expect(await screen.findByText("Somewhere else")).toBeVisible();
        expect(screen.queryByTestId("config-unsaved-changes")).toBeNull();
    });

    it("should discard from the server's own copy after a save, not the initially loaded one", async () => {
        const normalized = {
            ...serverConfig,
            main: {...serverConfig.main, host: "normalized-by-server"},
        };
        const backend = createBackend({
            saveResults: [
                {ok: true, restartNeeded: false, newConfig: normalized},
            ],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("submitted-value");
        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() =>
            expect(screen.getByLabelText("Host")).toHaveValue(
                "normalized-by-server",
            ),
        );

        setHost("edited-again");
        fireEvent.click(await screen.findByTestId("config-discard"));

        await waitFor(() =>
            expect(screen.getByLabelText("Host")).toHaveValue(
                "normalized-by-server",
            ),
        );
    });
});

describe("ConfigShell unsaved-changes guard", () => {
    it("should stay on the page when the admin cancels", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        setHost("0.0.0.09");
        fireEvent.click(screen.getByTestId("leave-config"));
        const dialog = await screen.findByTestId("config-unsaved-changes");
        fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));

        expect(await screen.findByTestId("config-shell")).toBeVisible();
        expect(screen.queryByText("Somewhere else")).toBeNull();
    });

    it("should save and leave when the admin chooses Save", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        setHost("10.0.0.1");
        fireEvent.click(screen.getByTestId("leave-config"));
        const dialog = await screen.findByTestId("config-unsaved-changes");
        fireEvent.click(within(dialog).getByRole("button", {name: "Save"}));

        expect(await screen.findByText("Somewhere else")).toBeVisible();
        expect(backend.puts).toHaveLength(1);
        expect(backend.puts[0].main).toEqual({
            ...serverConfig.main,
            host: "10.0.0.1",
        });
    });

    it("should restore the last server config when the admin discards", async () => {
        const backend = createBackend();
        const {router} = renderConfigArea({backend});
        await waitForShell();

        setHost("discard-me");
        fireEvent.click(screen.getByTestId("leave-config"));
        const dialog = await screen.findByTestId("config-unsaved-changes");
        fireEvent.click(within(dialog).getByRole("button", {name: "Discard"}));

        expect(await screen.findByText("Somewhere else")).toBeVisible();
        expect(backend.puts).toHaveLength(0);

        await router.navigate({to: "/config/main"});
        await waitForShell();
        await waitFor(() =>
            expect(screen.getByLabelText("Host")).toHaveValue("0.0.0.0"),
        );
    });

    it("should not prompt while moving between config tabs", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        setHost("0.0.0.09");
        fireEvent.click(screen.getByTestId("config-tab-downloading"));

        expect(await screen.findByText("Downloading body")).toBeVisible();
        expect(screen.queryByTestId("config-unsaved-changes")).toBeNull();
    });
});

describe("post-save safe-config refresh (ADR-0017)", () => {
    it("should update the stats tabs of an already-mounted consumer with no navigation", async () => {
        const backend = createBackend({
            safeConfig: {keepHistory: true},
            saveResults: [
                {ok: true, restartNeeded: false, newConfig: serverConfig},
            ],
        });
        renderConfigArea({backend, withStatsShell: true});
        await waitForShell();

        // Seeded from the bootstrap value: history is off.
        expect(screen.queryByRole("tab", {name: "Search history"})).toBeNull();

        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() => expect(backend.puts).toHaveLength(1));

        // The same mounted StatsShell now reads the refreshed safe config.
        expect(
            await screen.findByRole("tab", {name: "Search history"}),
        ).toBeVisible();
        expect(
            screen.getByRole("tab", {name: "Download history"}),
        ).toBeVisible();
    });
});
