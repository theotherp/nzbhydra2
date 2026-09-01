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
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {useFormContext} from "react-hook-form";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    onTestFinished,
    vi,
} from "vitest";

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

/**
 * FM-100: a read-only window on the form state the review panel must not
 * disturb. Serialized whole rather than asserted field by field, so a change
 * anywhere in the dirty, touched or error trees fails the comparison; `ref`
 * holds the DOM node an error was raised on and is dropped because it cannot
 * be serialized, not because it is uninteresting.
 */
function FormStateProbe() {
    const {formState} = useFormContext();
    return (
        <span data-testid="form-state-probe">
            {JSON.stringify(
                {
                    dirtyFields: formState.dirtyFields,
                    errors: formState.errors,
                    isDirty: formState.isDirty,
                    isSubmitted: formState.isSubmitted,
                    submitCount: formState.submitCount,
                    touchedFields: formState.touchedFields,
                },
                (key, value: unknown) => (key === "ref" ? undefined : value),
            )}
        </span>
    );
}

function renderConfigArea({
    backend,
    realTabBodies = false,
    withFormStateProbe = false,
    withStatsShell = false,
}: {
    backend: Backend;
    /**
     * FM-099: render the actual tab components instead of `HostFieldTab`. The
     * settings-search tests need the real rows, since what they prove is that
     * a hit reaches a row that a `ConfigFieldset` was hiding — a stub body has
     * no advanced gate to open.
     */
    realTabBodies?: boolean;
    /** FM-100: render `FormStateProbe` alongside the stub tab body. */
    withFormStateProbe?: boolean;
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
                <Link data-testid="leave-config" to="/elsewhere">
                    Leave config
                </Link>
                {/* FM-121 turned `StatsShell` into a layout-route component
                    that renders the matched tab through its own `<Outlet/>`,
                    so it stands in for this root's outlet rather than sitting
                    beside it -- two outlets in one match context would render
                    the config area twice. The shell is still the same mounted
                    safe-config consumer this suite is about. */}
                {withStatsShell ? (
                    <StatsShell bootstrap={bootstrap} />
                ) : (
                    <Outlet />
                )}
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
            realTabBodies
                ? createConfigRoute(rootRoute, transport)
                : createConfigRoute(rootRoute, transport, (tab) => (
                      <>
                          <HostFieldTab tab={tab} />
                          {withFormStateProbe ? <FormStateProbe /> : null}
                      </>
                  )),
        ]),
    });
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
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

/**
 * React sets this on `globalThis` itself (untyped -- there is no public
 * `@types/react` declaration for it) to decide whether `act()` does its
 * extra, test-only synchronous flushing. FM-120's timing proof turns it off
 * around one navigation to observe the same scheduling gap a real, unwrapped
 * browser session has, so the flush that hides the bug in every other test
 * here does not also hide it in this one.
 */
function getActEnvironment(): boolean | undefined {
    return (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean})
        .IS_REACT_ACT_ENVIRONMENT;
}

function setActEnvironment(value: boolean | undefined): void {
    (
        globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}
    ).IS_REACT_ACT_ENVIRONMENT = value;
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
    // ADR-0036 as amended on 2026-08-30: the tab body carries no ground of its
    // own, so the fields render on whatever the page renders on. Asserted
    // structurally -- it is not a `Paper` and it still holds the fields --
    // because jsdom computes no colour for a themed class and would let a
    // colour assertion here pass whatever the theme said. That it is not a
    // `Paper` is the whole of what can be checked from here: `MuiPaper` is the
    // only thing that was painting a background, a radius and a shadow onto
    // this box, and `theme.test.ts` pins what that class does. The ground the
    // fields actually end up on is measured in
    // `config-control-treatment.spec.ts` and shown in the screenshot strip.
    it("should render the tab body with no ground of its own", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        const body = screen.getByTestId("config-tab-body");

        expect(body).not.toHaveClass("MuiPaper-root");
        // The sidebar is deliberately *not* inside it: it holds no fields, and
        // ADR-0036 is about the ground a field sits on.
        expect(body).not.toContainElement(screen.getByTestId("config-nav"));
        expect(body).toContainElement(screen.getByLabelText("Host"));
    });

    it("should offer a retry when the configuration cannot be loaded", async () => {
        const backend = createBackend();
        const answer = backend.fetch.getMockImplementation();
        if (answer === undefined) {
            throw new Error("the backend has no implementation");
        }
        let failNext = true;
        backend.fetch.mockImplementation(async (input, init) => {
            const url = String(input);
            if (url.endsWith("/internalapi/config") && failNext) {
                failNext = false;
                throw new Error("the backend is not up yet");
            }
            return answer(input, init);
        });
        renderConfigArea({backend});

        // Until now the only way out of this was a browser reload.
        fireEvent.click(await screen.findByTestId("config-load-retry"));

        expect(await screen.findByTestId("config-shell")).toBeVisible();
        expect(screen.getByLabelText("Host")).toHaveValue("0.0.0.0");
    });

    it("should return to the top of the page when another tab is opened", async () => {
        const scrollTo = vi.fn();
        vi.stubGlobal("scrollTo", scrollTo);
        // jsdom never scrolls, so the position an admin left the previous tab
        // at has to be stated.
        vi.stubGlobal("scrollY", 1800);
        renderConfigArea({backend: createBackend()});
        await waitForShell();
        scrollTo.mockClear();

        fireEvent.click(screen.getByTestId("config-tab-auth"));

        expect(await screen.findByText("Authorization body")).toBeVisible();
        expect(scrollTo).toHaveBeenCalledWith({top: 0});
    });

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

    it("should report validation errors in a banner that outlives a tab switch, and keep the form dirty", async () => {
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

        const banner = await screen.findByTestId("config-validation-errors");
        expect(banner).toHaveTextContent("Config validation failed");
        expect(banner).toHaveTextContent("Port must be a number");
        expect(banner).toHaveTextContent(
            "Warning (may be ignored): Consider setting a password",
        );
        // FM-101's whole point: a report, not a question. Nothing modal is on
        // screen, so the settings it names can be edited while it is read.
        expect(screen.queryByRole("dialog")).toBeNull();
        // It sits above the tab body and below the sticky bar.
        const shell = screen.getByTestId("config-shell");
        expect(
            within(shell)
                .getByTestId("config-save-bar")
                .compareDocumentPosition(banner) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();

        // The rejection is about the whole config, so it is not a property of
        // the tab that happened to be open when it arrived.
        fireEvent.click(screen.getByTestId("config-tab-auth"));
        expect(await screen.findByText("Authorization body")).toBeVisible();
        expect(
            screen.getByTestId("config-validation-errors"),
        ).toHaveTextContent("Port must be a number");

        // Nothing was persisted, so the form must still be dirty: leaving now
        // has to raise the unsaved-changes guard.
        fireEvent.click(screen.getByTestId("leave-config"));
        expect(
            await screen.findByTestId("config-unsaved-changes"),
        ).toBeVisible();
    });

    it("should bring a rejection report on screen and put the reading position on it", async () => {
        // jsdom implements no layout, so `scrollIntoView` does not exist on
        // its elements at all; the shell guards on that, and the spy is what
        // stands in for the browser half of the behaviour.
        const scrollIntoView = vi.fn();
        const proto = Element.prototype as {scrollIntoView?: unknown};
        proto.scrollIntoView = scrollIntoView;
        onTestFinished(() => {
            delete proto.scrollIntoView;
        });
        const backend = createBackend({
            saveResults: [
                {ok: false, errorMessages: ["Port must be a number"]},
            ],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("0.0.0.0x");
        fireEvent.click(screen.getByTestId("config-save"));

        const banner = await screen.findByTestId("config-validation-errors");
        // Save is reachable from the bottom of a long tab; the report is not,
        // so it comes to the admin rather than waiting to be scrolled back to.
        await waitFor(() => expect(banner).toHaveFocus());
        expect(scrollIntoView).toHaveBeenCalled();
        expect(scrollIntoView.mock.instances).toContain(banner);
    });

    it("should let a rejection be dismissed and still report the next one", async () => {
        const backend = createBackend({
            saveResults: [
                {ok: false, errorMessages: ["Port must be a number"]},
                {ok: false, errorMessages: ["The API key must not be empty"]},
            ],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("0.0.0.0x");
        fireEvent.click(screen.getByTestId("config-save"));
        const banner = await screen.findByTestId("config-validation-errors");
        fireEvent.click(within(banner).getByRole("button", {name: "Close"}));
        await waitFor(() =>
            expect(screen.queryByTestId("config-validation-errors")).toBeNull(),
        );

        // Dismissal is not a promise never to speak again, and the second
        // report is the second server's, not a repeat of the first.
        fireEvent.click(screen.getByTestId("config-save"));
        const second = await screen.findByTestId("config-validation-errors");
        expect(second).toHaveTextContent("The API key must not be empty");
        expect(second).not.toHaveTextContent("Port must be a number");
    });

    it("should clear a rejection's banner once a later save succeeds", async () => {
        const backend = createBackend({
            saveResults: [
                {ok: false, errorMessages: ["Port must be a number"]},
                {ok: true, restartNeeded: false, newConfig: serverConfig},
            ],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("0.0.0.0x");
        fireEvent.click(screen.getByTestId("config-save"));
        expect(
            await screen.findByTestId("config-validation-errors"),
        ).toBeVisible();

        fireEvent.click(screen.getByTestId("config-save"));

        expect(await screen.findByText("Configuration saved.")).toBeVisible();
        await waitFor(() =>
            expect(screen.queryByTestId("config-validation-errors")).toBeNull(),
        );
    });

    it("should keep an edit typed while the save was in flight", async () => {
        const normalized = {
            ...serverConfig,
            main: {...serverConfig.main, host: "normalized-by-server"},
        };
        const backend = createBackend({
            saveResults: [
                {ok: true, restartNeeded: false, newConfig: normalized},
            ],
        });
        // The form stays editable while the PUT is in flight -- only Save goes
        // disabled -- so the request has to be held open to reproduce what an
        // admin on a slow connection does by simply carrying on typing.
        const answer = backend.fetch.getMockImplementation();
        if (answer === undefined) {
            throw new Error("the backend has no implementation");
        }
        let release = () => {};
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        backend.fetch.mockImplementation(async (input, init) => {
            const response = await answer(input, init);
            if ((init?.method ?? "GET") === "PUT") {
                await held;
            }
            return response;
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("submitted-value");
        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() => expect(backend.puts).toHaveLength(1));

        setHost("typed-during-the-save");
        await act(async () => {
            release();
            await held;
        });

        // The server's answer is about `submitted-value`, not about this, so
        // re-baselining on it must not swallow it.
        await waitFor(() =>
            expect(screen.getByLabelText("Host")).toHaveValue(
                "typed-during-the-save",
            ),
        );
        expect(await screen.findByTestId("config-dirty-summary")).toBeVisible();
        // And the baseline underneath it is still the server's copy: discarding
        // now goes back to that, not to what was submitted.
        fireEvent.click(screen.getByTestId("config-discard"));
        fireEvent.click(
            within(
                await screen.findByTestId("config-discard-changes"),
            ).getByRole("button", {name: "Discard"}),
        );
        await waitFor(() =>
            expect(screen.getByLabelText("Host")).toHaveValue(
                "normalized-by-server",
            ),
        );
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

        const banner = await screen.findByTestId("config-validation-warnings");
        expect(banner).toHaveTextContent("The config was already saved");
        expect(banner).toHaveTextContent("No indexer configured");
        // A warning is a report about a config that *is* saved, so it never
        // needed an answer either.
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(screen.queryByTestId("config-validation-errors")).toBeNull();
        fireEvent.click(within(banner).getByRole("button", {name: "Close"}));
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-validation-warnings"),
            ).toBeNull(),
        );

        // The form holds the server's own copy, not what was submitted.
        await waitFor(() =>
            expect(screen.getByLabelText("Host")).toHaveValue(
                "normalized-by-server",
            ),
        );
        fireEvent.click(screen.getByTestId("leave-config"));
        expect(await screen.findByText("Somewhere else")).toBeVisible();
    });

    it("should still ask about a restart after a warned-about save, with the warning on screen", async () => {
        const normalized = {
            ...serverConfig,
            main: {...serverConfig.main, host: "normalized-by-server"},
        };
        const backend = createBackend({
            saveResults: [
                {
                    ok: true,
                    restartNeeded: true,
                    warningMessages: ["No indexer configured"],
                    newConfig: normalized,
                },
            ],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("submitted-value");
        fireEvent.click(screen.getByTestId("config-save"));

        // The warning used to be an acknowledge dialog the restart prompt
        // queued behind. It no longer blocks, so the question still arrives —
        // and the reset it follows has already happened, rather than racing it.
        const restartDialog = await screen.findByTestId(
            "config-restart-required",
        );
        expect(
            screen.getByTestId("config-validation-warnings"),
        ).toHaveTextContent("No indexer configured");
        expect(screen.getByLabelText("Host")).toHaveValue(
            "normalized-by-server",
        );

        fireEvent.click(
            within(restartDialog).getByRole("button", {name: "No"}),
        );
        await waitFor(() =>
            expect(screen.queryByTestId("config-restart-required")).toBeNull(),
        );
        expect(backend.restarts).toBe(0);
        // Declining the restart says nothing about the warning, which is still
        // the last thing the server said about this config.
        expect(
            screen.getByTestId("config-validation-warnings"),
        ).toHaveTextContent("No indexer configured");
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
        // A blip in the transport is not something the config was told about,
        // so it stays a toast and never becomes a validation report.
        expect(screen.queryByTestId("config-validation-errors")).toBeNull();
        expect(screen.queryByTestId("config-validation-warnings")).toBeNull();
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

// The Main tab's fieldsets whose whole `ConfigFieldset` is advanced -- Proxy,
// Logging, Backup, History, Database -- collapse to just their expander when
// the global toggle is off, so they have no `<fieldset>` on the page and no
// anchor. `mainSettings.ts`/`MainConfigTab.tsx` are read-only context here,
// not files this task edits.
const MAIN_ALWAYS_VISIBLE_FIELDSETS = [
    "Hosting",
    "UI",
    "Security",
    "Updates",
    "Other",
];
const MAIN_WHOLE_ADVANCED_FIELDSETS = [
    "Proxy",
    "Logging",
    "Backup",
    "History",
    "Database",
];

describe("ConfigShell fieldset anchor navigation (FM-102)", () => {
    it("should show no anchor list for a tab body that mounts no ConfigFieldset", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        expect(screen.queryByTestId(/^config-nav-anchor-/)).toBeNull();
        expect(
            screen.queryByTestId("config-nav-anchor-list-heading"),
        ).toBeNull();
    });

    it("should never commit a frame where the anchor list or its heading is absent, or shows the outgoing tab's entries under the incoming tab's name, while switching between two tabs that both mount fieldsets (FM-120)", async () => {
        renderConfigArea({backend: createValidBackend(), realTabBodies: true});
        await waitForShell();
        expect(
            await screen.findByTestId("config-nav-anchor-list-heading"),
        ).toHaveTextContent("Main");

        const nav = screen.getByTestId("config-nav");

        // FM-163 put every config tab body behind `React.lazy`, so the *first*
        // render of one resolves through a module load and React's scheduler --
        // macrotask work the microtask drain below deliberately does not cross.
        // This visit to Auth and back resolves both `lazy` payloads; React
        // caches a resolved payload on the shared `lazy` object, so the
        // measured click further down renders Auth synchronously again and the
        // frame it inspects is the very commit FM-120 pinned. Nothing about
        // what is asserted changes: the scaffolding is restored to the timing
        // it was written against, rather than the assertion being relaxed to
        // the new one.
        fireEvent.click(screen.getByTestId("config-tab-auth"));
        await screen.findByTestId("config-auth");
        fireEvent.click(screen.getByTestId("config-tab-main"));
        await screen.findByTestId("config-main");
        expect(
            await screen.findByTestId("config-nav-anchor-list-heading"),
        ).toHaveTextContent("Main");

        // RTL's `fireEvent` wraps every dispatch in `act()`, which -- by
        // design -- flushes pending passive effects synchronously so a test
        // never has to think about scheduling. That is exactly the gap this
        // bug lives in: real React commits the route swap (the new pathname,
        // the new tab body's DOM) synchronously, but defers each
        // `ConfigFieldset`'s registering *effect* to a passive-effects
        // macrotask the browser gets a chance to paint before running --
        // while the outgoing fieldsets' *unregistering* effect cleanup runs
        // in that very same deferred macrotask. `act()` folds that macrotask
        // back into the same synchronous flush and hides the very frame
        // under test; disabling the act environment around the click
        // restores real scheduling so the commit can be inspected before the
        // passive flush has had a chance to run.
        const priorActEnvironment = getActEnvironment();
        setActEnvironment(false);
        try {
            fireEvent.click(screen.getByTestId("config-tab-auth"));
            // The router resolves the navigation through its own promise
            // chain even for an eager, loader-less route, which a real
            // browser drains as microtasks within the very same task -- no
            // paint can land in the middle of that. Only *after* the route
            // body has actually swapped does the interesting boundary start:
            // the deferred passive-effects flush is a real macrotask a
            // browser does get to paint before. Draining microtasks (and
            // nothing more) here reaches the commit that boundary sits after,
            // without also crossing it.
            for (
                let drained = 0;
                drained < 20 &&
                document.querySelector('[data-testid="config-auth"]') === null;
                drained += 1
            ) {
                await Promise.resolve();
            }
        } finally {
            setActEnvironment(priorActEnvironment);
        }

        // The route body has swapped (the new tab is mounted and selected),
        // but nothing passive has run yet. This is the exact frame a real
        // browser could paint.
        expect(
            document.querySelector('[data-testid="config-auth"]'),
        ).not.toBeNull();
        expect(screen.getByTestId("config-tab-auth")).toHaveAttribute(
            "aria-selected",
            "true",
        );
        const heading = nav.querySelector(
            '[data-testid="config-nav-anchor-list-heading"]',
        );
        const entryLabels = [
            ...nav.querySelectorAll<HTMLElement>(
                '[data-testid^="config-nav-anchor-"]',
            ),
        ]
            .filter(
                (el) => el.dataset.testid !== "config-nav-anchor-list-heading",
            )
            .map((el) => el.textContent);
        // Never absent (ConfigNav.tsx:160-162's `fieldsets.length === 0`
        // null-render firing for a tab that plainly mounts fieldsets), and
        // never the outgoing tab's entries sitting under the incoming tab's
        // own heading.
        expect(heading).not.toBeNull();
        expect(heading).toHaveTextContent("Authorization");
        expect(entryLabels).not.toEqual(
            expect.arrayContaining(["Hosting", "UI", "Updates"]),
        );

        // Let the deferred passive effects run and the app settle, inside
        // `act()` so cleanup and later assertions are on solid ground.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(
            screen.getByTestId("config-nav-anchor-list-heading"),
        ).toHaveTextContent("Authorization");
        for (const label of ["Hosting", "UI", "Updates"]) {
            expect(screen.queryByText(label)).toBeNull();
        }
    });

    it("should head the list with the active tab's name and list only the mounted fieldsets, growing as advanced is turned on", async () => {
        renderConfigArea({backend: createValidBackend(), realTabBodies: true});
        await waitForShell();

        expect(
            screen.getByTestId("config-nav-anchor-list-heading"),
        ).toHaveTextContent("Main");
        for (const label of MAIN_ALWAYS_VISIBLE_FIELDSETS) {
            expect(
                screen.getByTestId(`config-nav-anchor-${label.toLowerCase()}`),
            ).toBeVisible();
        }
        for (const label of MAIN_WHOLE_ADVANCED_FIELDSETS) {
            expect(
                screen.queryByTestId(
                    `config-nav-anchor-${label.toLowerCase()}`,
                ),
            ).toBeNull();
        }

        fireEvent.click(screen.getByTestId("config-advanced-toggle"));

        for (const label of [
            ...MAIN_ALWAYS_VISIBLE_FIELDSETS,
            ...MAIN_WHOLE_ADVANCED_FIELDSETS,
        ]) {
            expect(
                await screen.findByTestId(
                    `config-nav-anchor-${label.toLowerCase()}`,
                ),
            ).toBeVisible();
        }
    });

    it("should scroll a fieldset into view without navigating when its anchor is clicked", async () => {
        const {router} = renderConfigArea({
            backend: createValidBackend(),
            realTabBodies: true,
        });
        await waitForShell();
        const scrollTo = vi.fn();
        vi.stubGlobal("scrollTo", scrollTo);

        fireEvent.click(screen.getByTestId("config-nav-anchor-security"));

        expect(scrollTo).toHaveBeenCalled();
        expect(router.state.location.pathname).toBe("/config/main");
    });

    it("should close the mobile drawer when an anchor inside it is clicked", async () => {
        stubMobileViewport();
        renderConfigArea({backend: createValidBackend(), realTabBodies: true});
        await waitForShell();
        vi.stubGlobal("scrollTo", vi.fn());

        fireEvent.click(screen.getByTestId("config-nav-open"));
        const anchor = await screen.findByTestId("config-nav-anchor-security");

        fireEvent.click(anchor);

        await waitFor(() =>
            expect(screen.queryByTestId("config-nav")).toBeNull(),
        );
        expect(screen.getByTestId("config-nav-open")).toBeVisible();
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

    it("should keep every edit when a Discard is called off", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        setHost("keep-me");
        fireEvent.click(await screen.findByTestId("config-discard"));

        // Discard sits beside Save with nothing between them and throws away
        // every edit on every tab, so it asks first — the same loss the
        // unsaved-changes guard asks about.
        const dialog = await screen.findByTestId("config-discard-changes");
        expect(dialog).toHaveTextContent("1 unsaved setting");
        fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));

        await waitFor(() =>
            expect(screen.queryByTestId("config-discard-changes")).toBeNull(),
        );
        expect(screen.getByLabelText("Host")).toHaveValue("keep-me");
        expect(screen.getByTestId("config-dirty-summary")).toBeVisible();
    });

    it("should restore the loaded config and clear the summary when Discard is confirmed", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        setHost("discard-me");
        expect(await screen.findByTestId("config-dirty-summary")).toBeVisible();

        fireEvent.click(screen.getByTestId("config-discard"));
        fireEvent.click(
            within(
                await screen.findByTestId("config-discard-changes"),
            ).getByRole("button", {name: "Discard"}),
        );

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
        fireEvent.click(
            within(
                await screen.findByTestId("config-discard-changes"),
            ).getByRole("button", {name: "Discard"}),
        );

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

/**
 * The real Main tab, over a config whose API key passes its own validator: the
 * shared fixture's `***UNCHANGED***` marker does not, so every invalid-field
 * list below would otherwise carry an entry nobody asked for. What is invalid
 * in these cases is exactly what each one breaks.
 */
function createValidBackend() {
    return createBackend({
        config: {
            ...serverConfig,
            main: {...serverConfig.main, apiKey: "apikey123"},
        },
    });
}

describe("ConfigShell invalid-field banner (FM-101)", () => {
    function invalidEntry(path: string) {
        return screen.getByTestId(`config-invalid-field-${path}`);
    }

    it("should name each invalid setting instead of only growling, and send nothing", async () => {
        const backend = createValidBackend();
        renderConfigArea({backend, realTabBodies: true});
        await waitForShell();

        fireEvent.change(screen.getByTestId("config-input-main-host"), {
            target: {value: "not-an-ip"},
        });
        fireEvent.change(screen.getByTestId("config-input-main-port"), {
            target: {value: ""},
        });
        fireEvent.click(screen.getByTestId("config-save"));

        const banner = await screen.findByTestId("config-validation-errors");
        expect(banner).toHaveTextContent("Config invalid");
        // Named by the settings index, tab included, because the offending
        // control is often not the one on screen.
        expect(invalidEntry("main-host")).toHaveTextContent(
            "Main › Host: not-an-ip is not a valid IP Address",
        );
        expect(invalidEntry("main-port")).toHaveTextContent(
            "Main › Port: This field is required",
        );
        // Nothing else: the list is the form's error tree, not a fixed sermon.
        expect(
            within(banner).getAllByTestId(/^config-invalid-field-/),
        ).toHaveLength(2);
        // The growl this replaces is gone, and so is the whole request.
        expect(
            screen.queryByText("Config invalid. Please check your settings."),
        ).toBeNull();
        expect(backend.puts).toHaveLength(0);

        // Dismissible like any other report.
        fireEvent.click(within(banner).getByRole("button", {name: "Close"}));
        await waitFor(() =>
            expect(screen.queryByTestId("config-validation-errors")).toBeNull(),
        );
    });

    it("should re-derive the list on each attempt and submit once none are left", async () => {
        const backend = createValidBackend();
        renderConfigArea({backend, realTabBodies: true});
        await waitForShell();

        const host = screen.getByTestId("config-input-main-host");
        const port = screen.getByTestId("config-input-main-port");
        fireEvent.change(host, {target: {value: "not-an-ip"}});
        fireEvent.change(port, {target: {value: ""}});
        fireEvent.click(screen.getByTestId("config-save"));
        await screen.findByTestId("config-invalid-field-main-host");

        // One fixed, one still wrong: the report is re-derived from the form's
        // own error tree on the next attempt, never replayed from the last one.
        fireEvent.change(host, {target: {value: "127.0.0.1"}});
        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-invalid-field-main-host"),
            ).toBeNull(),
        );
        expect(invalidEntry("main-port")).toBeVisible();
        expect(backend.puts).toHaveLength(0);

        fireEvent.change(port, {target: {value: "5077"}});
        fireEvent.click(screen.getByTestId("config-save"));

        await waitFor(() => expect(backend.puts).toHaveLength(1));
        expect(backend.puts[0]).toMatchObject({
            main: {host: "127.0.0.1", port: 5077},
        });
        await waitFor(() =>
            expect(screen.queryByTestId("config-validation-errors")).toBeNull(),
        );
    });

    it("should navigate to an invalid setting the advanced toggle is hiding", async () => {
        renderConfigArea({backend: createValidBackend(), realTabBodies: true});
        await waitForShell();

        // Make an advanced row invalid, then let it go back into hiding: this
        // is the case the old growl could not answer at all, because the
        // control it was complaining about was not on the page.
        fireEvent.click(screen.getByTestId("config-advanced-toggle"));
        fireEvent.change(
            await screen.findByTestId("config-input-main-urlBase"),
            {target: {value: "nope"}},
        );
        fireEvent.click(screen.getByTestId("config-advanced-toggle"));
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-setting-main-urlBase"),
            ).toBeNull(),
        );

        fireEvent.click(screen.getByTestId("config-save"));
        const entry = await screen.findByTestId(
            "config-invalid-field-main-urlBase",
        );
        expect(entry).toHaveTextContent(
            "Main › URL base: URL base has to start and may not end with /",
        );

        fireEvent.click(entry);

        // FM-099's helper does the work: reveal the row behind its gate,
        // scroll to it, and mark it — without touching the stored preference.
        expect(
            await screen.findByTestId("config-setting-main-urlBase"),
        ).toBeVisible();
        expect(screen.getByTestId("config-advanced-toggle")).not.toBeChecked();
        expect(localStorage.getItem(SHOW_ADVANCED_STORAGE_KEY)).toBe("false");
        await waitFor(() =>
            expect(
                [...document.querySelectorAll("style")].some((style) =>
                    (style.textContent ?? "").includes(
                        '[data-testid="config-setting-main-urlBase"]',
                    ),
                ),
                "the setting the entry points at should be marked",
            ).toBe(true),
        );
    });
});

describe("settings search (FM-099)", () => {
    async function openSearchResults(query: string) {
        const field = await screen.findByTestId("config-search");
        fireEvent.change(field, {target: {value: query}});
        return field;
    }

    it("should mount the search field inside the sticky save bar", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        const bar = screen.getByTestId("config-save-bar");
        const field = within(bar).getByTestId("config-search");

        expect(field).toBeVisible();
        // Ahead of the bar's own controls, which is where the slot is.
        expect(
            field.compareDocumentPosition(
                within(bar).getByTestId("config-save"),
            ) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        // The bar keeps everything FM-097 put in it.
        expect(within(bar).getByTestId("config-save")).toBeVisible();
    });

    it("should carry a visible label and be reachable by Tab", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        // A real, associated, visible label (ADR-0014) -- not an aria-label.
        expect(screen.getByLabelText("Search settings")).toBe(
            screen.getByTestId("config-search"),
        );
        expect(screen.getByTestId("config-search")).not.toHaveAttribute(
            "tabindex",
            "-1",
        );
    });

    it("should suppress implicit form submission on Enter in the search field", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        const field = screen.getByTestId("config-search");
        // The bar really is inside the form, and Save really is its submit
        // button -- the two facts that make implicit submission possible.
        expect(field.closest("form")).toBe(screen.getByTestId("config-shell"));
        expect(screen.getByTestId("config-save")).toHaveAttribute(
            "type",
            "submit",
        );

        // A real Enter keydown, dispatched on the real field inside that form
        // and observed on the way out. jsdom implements no implicit form
        // submission at all, so asserting "no PUT happened" here would pass
        // whether or not the guard exists; what actually suppresses the
        // browser's submission is the default being prevented, so that is what
        // is asserted. `config.spec.ts` proves the consequence in a real
        // browser, where implicit submission does exist.
        const pressEnter = (element: Element) => {
            const event = new KeyboardEvent("keydown", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
            });
            element.dispatchEvent(event);
            return event.defaultPrevented;
        };

        expect(
            pressEnter(field),
            "Enter in the settings search must not reach the form as a submit",
        ).toBe(true);

        // The control that keeps the assertion above honest: an ordinary field
        // in the same form does not prevent it, so `true` above is this
        // component's doing and not something every element reports.
        expect(pressEnter(screen.getByLabelText("Host"))).toBe(false);

        expect(backend.puts).toEqual([]);
        // The guard is specific to this field: Save itself still submits.
        fireEvent.click(screen.getByTestId("config-save"));
        await waitFor(() => expect(backend.puts).toHaveLength(1));
    });

    it("should navigate to the tab of the setting picked from the results", async () => {
        const {router} = renderConfigArea({
            backend: createBackend(),
            realTabBodies: true,
        });
        await waitForShell();
        expect(router.state.location.pathname).toBe("/config/main");

        await openSearchResults("cover width");
        fireEvent.click(
            await screen.findByTestId(
                "config-search-option-searching-coverSize",
            ),
        );

        await waitFor(() =>
            expect(router.state.location.pathname).toBe("/config/searching"),
        );
        expect(
            await screen.findByTestId("config-setting-searching-coverSize"),
        ).toBeVisible();
    });

    it("should group the results by tab and mark the advanced ones", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        await openSearchResults("restart");
        const listbox = await screen.findByRole("listbox");

        // Group headers are the tabs' display names, in tab order.
        const groups = [
            ...listbox.querySelectorAll(".MuiAutocomplete-groupLabel"),
        ].map((header) => header.textContent ?? "");
        // One header per tab, no tab repeated, and in the nav's own order --
        // which is what breaks if the index ever stops being tab-contiguous.
        expect(groups).toContain("Main");
        expect(groups).toContain("Authorization");
        expect(new Set(groups).size).toBe(groups.length);
        expect(groups).toEqual(
            CONFIG_TABS.map((tab) => tab.label).filter((label) =>
                groups.includes(label),
            ),
        );
        // An advanced hit says so; a plain one does not.
        expect(
            within(
                screen.getByTestId("config-search-option-main-urlBase"),
            ).getByText("Advanced"),
        ).toBeVisible();
        expect(
            within(
                screen.getByTestId("config-search-option-main-port"),
            ).queryByText("Advanced"),
        ).toBeNull();
    });

    it("should reveal a setting the advanced toggle is hiding, and highlight it", async () => {
        renderConfigArea({backend: createBackend(), realTabBodies: true});
        await waitForShell();

        // The global toggle is off, so FM-098 offers the row behind an
        // expander instead of rendering it.
        expect(screen.getByTestId("config-advanced-toggle")).not.toBeChecked();
        expect(screen.queryByTestId("config-setting-main-urlBase")).toBeNull();
        expect(
            screen.getByTestId("config-advanced-expander-hosting"),
        ).toBeVisible();

        await openSearchResults("URL base");
        fireEvent.click(
            await screen.findByTestId("config-search-option-main-urlBase"),
        );

        // Revealed in place, without the stored preference being changed.
        expect(
            await screen.findByTestId("config-setting-main-urlBase"),
        ).toBeVisible();
        expect(screen.getByTestId("config-advanced-toggle")).not.toBeChecked();
        expect(localStorage.getItem(SHOW_ADVANCED_STORAGE_KEY)).toBeNull();

        // …and marked, by a rule scoped to that row's own test id.
        await waitFor(() =>
            expect(
                [...document.querySelectorAll("style")].some((style) =>
                    (style.textContent ?? "").includes(
                        '[data-testid="config-setting-main-urlBase"]',
                    ),
                ),
                "the landed-on row should carry a temporary highlight",
            ).toBe(true),
        );
    });

    // The two cases above both pick a Main setting while already on Main, so
    // the target fieldset is mounted before the reveal request exists. The
    // interesting half is the other one: on a cross-tab hit the router mounts
    // the target tab's fieldsets *after* the request was made, so each of them
    // sees an outstanding request on its very first render and has to act on
    // it rather than assume it has already been honoured. Most advanced rows
    // are on some other tab than the one being searched from, so this is the
    // ordinary case, not an edge one — and it is covered here for both shapes
    // FM-098 gives a gate.
    it("should reveal an advanced setting on another tab, inside a wholly advanced fieldset", async () => {
        const {router} = renderConfigArea({
            backend: createBackend(),
            realTabBodies: true,
        });
        await waitForShell();
        expect(router.state.location.pathname).toBe("/config/main");
        expect(screen.getByTestId("config-advanced-toggle")).not.toBeChecked();

        await openSearchResults("timeout when accessing");
        fireEvent.click(
            await screen.findByTestId("config-search-option-searching-timeout"),
        );

        await waitFor(() =>
            expect(router.state.location.pathname).toBe("/config/searching"),
        );
        // "Indexer access" is advanced as a whole, so FM-098 replaces it with
        // its own expander; the request has to open that.
        await waitFor(() =>
            expect(
                screen.getByTestId("config-advanced-expander-indexer access"),
            ).toHaveAttribute("aria-expanded", "true"),
        );
        expect(
            await screen.findByTestId("config-setting-searching-timeout"),
        ).toBeVisible();
        // Still only this fieldset, and still not the stored preference.
        expect(
            screen.getByTestId("config-advanced-expander-category handling"),
        ).toHaveAttribute("aria-expanded", "false");
        expect(screen.getByTestId("config-advanced-toggle")).not.toBeChecked();
        expect(localStorage.getItem(SHOW_ADVANCED_STORAGE_KEY)).toBeNull();

        await waitFor(() =>
            expect(
                [...document.querySelectorAll("style")].some((style) =>
                    (style.textContent ?? "").includes(
                        '[data-testid="config-setting-searching-timeout"]',
                    ),
                ),
                "the landed-on row should carry a temporary highlight",
            ).toBe(true),
        );
    });

    it("should reveal an advanced setting on another tab behind its fieldset's own expander", async () => {
        const {router} = renderConfigArea({
            backend: createBackend(),
            realTabBodies: true,
        });
        await waitForShell();
        expect(router.state.location.pathname).toBe("/config/main");

        await openSearchResults("Convert media IDs");
        fireEvent.click(
            await screen.findByTestId(
                "config-search-option-searching-alwaysConvertIds",
            ),
        );

        await waitFor(() =>
            expect(router.state.location.pathname).toBe("/config/searching"),
        );
        // The other gate shape: an ordinary fieldset offering the advanced
        // rows the global toggle hides from it.
        await waitFor(() =>
            expect(
                screen.getByTestId(
                    "config-advanced-expander-media ids / query generation / query processing",
                ),
            ).toHaveAttribute("aria-expanded", "true"),
        );
        expect(
            await screen.findByTestId(
                "config-setting-searching-alwaysConvertIds",
            ),
        ).toBeVisible();
        expect(screen.getByTestId("config-advanced-toggle")).not.toBeChecked();
        expect(localStorage.getItem(SHOW_ADVANCED_STORAGE_KEY)).toBeNull();
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

describe("ConfigShell review changes (FM-100)", () => {
    async function openReviewPanel() {
        fireEvent.click(await screen.findByTestId("config-dirty-summary"));
        return screen.findByTestId("config-review-changes");
    }

    it("should open the panel from the dirty summary and list the changed setting", async () => {
        renderConfigArea({backend: createBackend()});
        await waitForShell();

        setHost("192.168.0.5");
        const summary = await screen.findByTestId("config-dirty-summary");
        // The summary is still the same words the bar has always shown; it is
        // only now the way into the panel.
        expect(summary).toHaveTextContent("1 setting changed");
        expect(summary.tagName).toBe("BUTTON");
        expect(screen.queryByTestId("config-review-changes")).toBeNull();

        const panel = await openReviewPanel();
        const row = within(panel).getByTestId("config-review-entry-main-host");
        expect(row).toHaveTextContent("Host");
        expect(row).toHaveTextContent("0.0.0.0");
        expect(row).toHaveTextContent("192.168.0.5");

        fireEvent.click(within(panel).getByTestId("config-review-close"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-review-changes")).toBeNull(),
        );
    });

    it("should list a change made on a tab that is no longer on screen", async () => {
        renderConfigArea({backend: createBackend(), realTabBodies: true});
        await waitForShell();

        fireEvent.change(screen.getByTestId("config-input-main-port"), {
            target: {value: "5081"},
        });
        fireEvent.click(screen.getByTestId("config-tab-downloading"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-input-main-port")).toBeNull(),
        );

        const panel = await openReviewPanel();
        const row = within(panel).getByTestId("config-review-entry-main-port");
        expect(row).toHaveTextContent("Port");
        expect(row).toHaveTextContent("Main › Hosting");
        expect(row).toHaveTextContent("5076");
        expect(row).toHaveTextContent("5081");
    });

    it("should render neither side of a secret and never leak its value", async () => {
        renderConfigArea({backend: createBackend(), realTabBodies: true});
        await waitForShell();

        fireEvent.click(
            screen.getByTestId("config-apikey-generate-main-apiKey"),
        );
        const generated = (
            screen.getByTestId("config-input-main-apiKey") as HTMLInputElement
        ).value;
        expect(generated).not.toBe("");

        const panel = await openReviewPanel();
        const row = within(panel).getByTestId(
            "config-review-entry-main-apiKey",
        );
        expect(row).toHaveTextContent("API key");
        expect(row).toHaveTextContent("(hidden)");
        expect(row).toHaveTextContent("changed");
        // Neither the generated key nor the marker the server sent for the
        // stored one reaches the screen.
        expect(panel.textContent ?? "").not.toContain(generated);
        expect(panel.textContent ?? "").not.toContain("***UNCHANGED***");
    });

    it("should summarize an added list entry instead of its fields", async () => {
        renderConfigArea({backend: createBackend(), realTabBodies: true});
        await waitForShell();

        fireEvent.click(screen.getByTestId("config-advanced-toggle"));
        fireEvent.click(screen.getByTestId("config-tab-categories"));
        fireEvent.click(
            await screen.findByRole("button", {name: "Add new category"}),
        );

        const panel = await openReviewPanel();
        const rows = within(panel).getAllByTestId(/^config-review-entry-/);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toHaveTextContent("Categories:");
        expect(rows[0]).toHaveTextContent("added");
    });

    it("should not list a setting that was changed and then changed back", async () => {
        renderConfigArea({backend: createBackend(), realTabBodies: true});
        await waitForShell();

        fireEvent.change(screen.getByTestId("config-input-main-port"), {
            target: {value: "5081"},
        });
        fireEvent.change(screen.getByTestId("config-input-main-host"), {
            target: {value: "10.0.0.1"},
        });
        fireEvent.change(screen.getByTestId("config-input-main-host"), {
            target: {value: "0.0.0.0"},
        });

        const panel = await openReviewPanel();
        expect(
            within(panel).getByTestId("config-review-entry-main-port"),
        ).toBeVisible();
        expect(
            within(panel).queryByTestId("config-review-entry-main-host"),
        ).toBeNull();
    });

    it("should change nothing about the form when it is opened and closed", async () => {
        const backend = createBackend();
        renderConfigArea({backend, withFormStateProbe: true});
        await waitForShell();

        setHost("192.168.0.5");
        await screen.findByTestId("config-dirty-summary");
        const before = screen.getByTestId("form-state-probe").textContent;

        const panel = await openReviewPanel();
        fireEvent.click(within(panel).getByTestId("config-review-close"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-review-changes")).toBeNull(),
        );

        expect(screen.getByTestId("form-state-probe").textContent).toBe(before);
        expect(screen.getByLabelText("Host")).toHaveValue("192.168.0.5");
        expect(backend.puts).toHaveLength(0);
    });

    it("should save through the shell's own submit and close on success", async () => {
        const backend = createBackend();
        renderConfigArea({backend});
        await waitForShell();

        setHost("192.168.0.5");
        const panel = await openReviewPanel();
        fireEvent.click(within(panel).getByTestId("config-review-save"));

        await waitFor(() => expect(backend.puts).toHaveLength(1));
        expect(backend.puts[0]).toMatchObject({
            main: {host: "192.168.0.5"},
        });
        await waitFor(() =>
            expect(screen.queryByTestId("config-review-changes")).toBeNull(),
        );
    });

    it("should stay open when the server rejects the configuration", async () => {
        const backend = createBackend({
            saveResults: [{ok: false, errorMessages: ["Nope"]}],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("192.168.0.5");
        const panel = await openReviewPanel();
        fireEvent.click(within(panel).getByTestId("config-review-save"));

        const errors = await screen.findByTestId("config-validation-errors");
        expect(errors).toHaveTextContent("Nope");

        // A closed MUI `Dialog` stays mounted for the length of its exit
        // transition, so merely finding `config-review-changes` after the
        // rejection proves nothing -- it is there either way. Two things make
        // this assertion discriminate. FM-101 removed the acknowledge dialog
        // whose removal used to be the clock here, so the wait is now on the
        // panel's own Save coming back out of its `saving` state, plus one
        // more turn of the loop: `saveFromReview` decides whether to close in
        // the continuation *after* `submit()` resolves, which is a microtask
        // later than the flag that re-enables the button. And the row is what
        // a *still open* panel has: the shell computes its rows only while
        // `reviewOpen`, so a panel the shell closed empties in the same
        // commit, husk or not.
        await waitFor(() =>
            expect(
                within(panel).getByTestId("config-review-save"),
            ).toBeEnabled(),
        );
        await act(async () => {
            await Promise.resolve();
        });
        const stillOpen = screen.getByTestId("config-review-changes");
        expect(
            within(stillOpen).getByTestId("config-review-entry-main-host"),
        ).toBeVisible();
        expect(
            within(stillOpen).queryByTestId("config-review-empty"),
        ).toBeNull();
    });
});

describe("ConfigShell save report over the review panel (FM-101)", () => {
    /**
     * A report has to be *reachable*, which is not the same as present. MUI's
     * `ModalManager` marks every sibling of an open `Modal` `aria-hidden`, so
     * an element `getByTestId` happily returns can be wholly absent from the
     * accessibility tree — and, behind the backdrop, unclickable with it. That
     * is precisely the state the first version of this feature shipped in, and
     * a test that only found the element in the DOM passed straight through
     * it. Every case here walks the ancestor chain instead of trusting the
     * query.
     */
    function ariaHiddenAncestor(element: Element): Element | null {
        for (
            let node: Element | null = element;
            node !== null;
            node = node.parentElement
        ) {
            if (node.getAttribute("aria-hidden") === "true") {
                return node;
            }
        }
        return null;
    }

    async function openReviewPanel() {
        fireEvent.click(await screen.findByTestId("config-dirty-summary"));
        return screen.findByTestId("config-review-changes");
    }

    it("should raise a server rejection out of the shell's hidden subtree", async () => {
        const backend = createBackend({
            saveResults: [{ok: false, errorMessages: ["Nope"]}],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("192.168.0.5");
        const panel = await openReviewPanel();
        fireEvent.click(within(panel).getByTestId("config-review-save"));

        const report = await screen.findByTestId("config-validation-errors");
        expect(report).toHaveTextContent("Nope");
        // The control that gives the next assertion its meaning: the config
        // area really is hidden from assistive technology while the panel is
        // open, which is exactly where this report used to render.
        expect(
            ariaHiddenAncestor(screen.getByTestId("config-shell")),
            "the panel should be hiding the shell -- otherwise this case proves nothing",
        ).not.toBeNull();
        expect(ariaHiddenAncestor(report)).toBeNull();
        // It moved; it was not duplicated. Two reports would mean two sets of
        // entries carrying one set of testids.
        expect(screen.getAllByTestId("config-validation-errors")).toHaveLength(
            1,
        );
        // FM-100's own contract is untouched: the panel is still open, with
        // its rows, over a config the server refused.
        expect(
            within(panel).getByTestId("config-review-entry-main-host"),
        ).toBeVisible();

        // Still a report and not a question: the panel underneath stays
        // usable, so the admin can attempt the save again without first
        // acknowledging anything. This is what the acknowledge dialog FM-101
        // removed would not allow, and what a second modal here would undo.
        fireEvent.click(within(panel).getByTestId("config-review-save"));
        await waitFor(() => expect(backend.puts).toHaveLength(2));
        expect(
            ariaHiddenAncestor(screen.getByTestId("config-validation-errors")),
        ).toBeNull();

        // Closing the review hands the report back to the banner rather than
        // withdrawing it: the config is still rejected.
        fireEvent.click(within(panel).getByTestId("config-review-close"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-review-changes")).toBeNull(),
        );
        const banner = screen.getByTestId("config-validation-errors");
        expect(banner).toHaveTextContent("Nope");
        expect(ariaHiddenAncestor(banner)).toBeNull();
    });

    it("should let an invalid-setting entry be acted on from over the panel", async () => {
        const backend = createValidBackend();
        renderConfigArea({backend, realTabBodies: true});
        await waitForShell();

        fireEvent.change(screen.getByTestId("config-input-main-host"), {
            target: {value: "not-an-ip"},
        });
        const panel = await openReviewPanel();
        fireEvent.click(within(panel).getByTestId("config-review-save"));

        const entry = await screen.findByTestId(
            "config-invalid-field-main-host",
        );
        expect(entry).toHaveTextContent(
            "Main › Host: not-an-ip is not a valid IP Address",
        );
        // Announcing the failure is not the point; acting on it is. The entry
        // is the only route FM-101 offers to the offending control, so it has
        // to be in the accessibility tree and in front of the backdrop.
        expect(ariaHiddenAncestor(entry)).toBeNull();
        expect(
            ariaHiddenAncestor(screen.getByTestId("config-shell")),
        ).not.toBeNull();
        expect(backend.puts).toHaveLength(0);

        fireEvent.click(entry);

        // Going to a setting means leaving the review that was covering it,
        // and FM-099's helper marks the control on arrival.
        await waitFor(() =>
            expect(screen.queryByTestId("config-review-changes")).toBeNull(),
        );
        expect(screen.getByTestId("config-setting-main-host")).toBeVisible();
        await waitFor(() =>
            expect(
                [...document.querySelectorAll("style")].some((style) =>
                    (style.textContent ?? "").includes(
                        '[data-testid="config-setting-main-host"]',
                    ),
                ),
                "the setting the entry points at should be marked",
            ).toBe(true),
        );
        // The report is still standing, now in place, still naming the field.
        expect(
            screen.getByTestId("config-invalid-field-main-host"),
        ).toBeVisible();
    });

    it("should raise a report that predates the panel, not leave it hidden underneath", async () => {
        // The ordering case, because it is the one that could go wrong
        // silently: here the report is already on screen as a banner and the
        // panel opens *over* it, so the raised layer and the modal arrive in
        // the same commit. `ModalManager` hides whatever is already a sibling
        // when it runs, so this asserts the layer really is outside what it
        // hid, whichever of the two mounted first.
        const backend = createBackend({
            saveResults: [{ok: false, errorMessages: ["Nope"]}],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("192.168.0.5");
        fireEvent.click(screen.getByTestId("config-save"));
        const banner = await screen.findByTestId("config-validation-errors");
        expect(ariaHiddenAncestor(banner)).toBeNull();

        const panel = await openReviewPanel();

        const raised = screen.getByTestId("config-validation-errors");
        expect(raised).toHaveTextContent("Nope");
        expect(
            ariaHiddenAncestor(screen.getByTestId("config-shell")),
        ).not.toBeNull();
        expect(ariaHiddenAncestor(raised)).toBeNull();
        expect(
            within(panel).getByTestId("config-review-entry-main-host"),
        ).toBeVisible();
    });

    it("should keep the report dismissed when the admin dismisses it over the panel", async () => {
        const backend = createBackend({
            saveResults: [{ok: false, errorMessages: ["Nope"]}],
        });
        renderConfigArea({backend});
        await waitForShell();

        setHost("192.168.0.5");
        const panel = await openReviewPanel();
        fireEvent.click(within(panel).getByTestId("config-review-save"));

        const report = await screen.findByTestId("config-validation-errors");
        fireEvent.click(within(report).getByRole("button", {name: "Close"}));
        await waitFor(() =>
            expect(screen.queryByTestId("config-validation-errors")).toBeNull(),
        );

        // A dismissal by the admin is a dismissal, not a relocation: closing
        // the panel afterwards must not bring the report back.
        fireEvent.click(within(panel).getByTestId("config-review-close"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-review-changes")).toBeNull(),
        );
        expect(screen.queryByTestId("config-validation-errors")).toBeNull();
    });
});
