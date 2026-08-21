import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import type {BootstrapData} from "../../../bootstrap";
import {SystemLogTab} from "./SystemLogTab";

const HOSTILE_MESSAGE =
    '<script>window.hydraLogInjection = true;</script><img src=x onerror="window.hydraLogInjection = true">';

type Backend = {
    fetch: ReturnType<typeof vi.fn<typeof fetch>>;
    jsonLogRequests: number[];
    rawLogRequests: number;
};

const bootstrap = {serverTimeZone: "UTC"} as BootstrapData;

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
        status: 200,
    });
}

function textResponse(body: string): Response {
    return new Response(body, {
        headers: {"Content-Type": "text/plain"},
        status: 200,
    });
}

function logEntry(overrides: Record<string, unknown> = {}) {
    return {
        "@timestamp": 1_735_689_600,
        level: "INFO",
        logger_name: "org.nzbhydra.searching.Searcher",
        message: "Searching",
        ...overrides,
    };
}

function createBackend(rawLog = "a plain log line"): Backend {
    const backend: Backend = {
        fetch: vi.fn<typeof fetch>(),
        jsonLogRequests: [],
        rawLogRequests: 0,
    };
    backend.fetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/debuginfos/jsonlogs")) {
            const offset = Number(url.searchParams.get("offset"));
            backend.jsonLogRequests.push(offset);
            return jsonResponse({
                hasMore: offset < 1000,
                lines: [
                    logEntry({message: `Entry at offset ${offset}`}),
                    logEntry({
                        "@timestamp": "2025-01-01T12:00:00.000Z",
                        IPADDRESS: "127.0.0.1",
                        USERNAME: "someuser",
                        level: "ERROR",
                        message: HOSTILE_MESSAGE,
                        stack_trace: "java.lang.Exception: <b>boom</b>",
                    }),
                ],
            });
        }
        if (url.pathname.endsWith("/debuginfos/currentlogfile")) {
            backend.rawLogRequests += 1;
            return textResponse(rawLog);
        }
        if (url.pathname.endsWith("/debuginfos/logfilenames")) {
            return jsonResponse(["nzbhydra2.log", "nzbhydra2.log.1"]);
        }
        return jsonResponse(null);
    });
    return backend;
}

function renderLogTab(backend: Backend) {
    vi.stubGlobal("fetch", backend.fetch);
    return render(
        <ThemeProvider theme={createHydraTheme("dark")}>
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                <SystemLogTab
                    bootstrap={bootstrap}
                    transport={new ApiTransport("/hydra/", backend.fetch)}
                />
            </QueryClientProvider>
        </ThemeProvider>,
    );
}

function selectView(name: "Formatted" | "Raw" | "Files") {
    fireEvent.click(screen.getByRole("tab", {name}));
}

/**
 * This project's jsdom environment has no explicit `url` configured, which
 * leaves `window.localStorage` unavailable in every test (a jsdom "opaque
 * origin" limitation -- see the identical note in
 * `features/stats/dashboard/persistence.test.ts`). Installed fresh per test
 * and removed by `vi.unstubAllGlobals()`.
 */
function stubWorkingLocalStorage(): Map<string, string> {
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
    return store;
}

/** A browser that refuses site data: every access throws. */
function stubBlockedLocalStorage(): void {
    const blocked = () => {
        throw new Error("storage is blocked");
    };
    vi.stubGlobal("localStorage", {
        get length(): number {
            return blocked();
        },
        clear: blocked,
        getItem: blocked,
        key: blocked,
        removeItem: blocked,
        setItem: blocked,
    } satisfies Storage);
}

let storage: Map<string, string>;

beforeEach(() => {
    storage = stubWorkingLocalStorage();
    delete (window as unknown as Record<string, unknown>).hydraLogInjection;
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("SystemLogTab formatted view", () => {
    it("should show the newest page with each entry's level, time, logger, and message", async () => {
        const backend = createBackend();
        renderLogTab(backend);

        expect(await screen.findByTestId("system-log-table")).toBeVisible();
        expect(backend.jsonLogRequests).toEqual([0]);
        const rows = screen.getAllByTestId("system-log-row");
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByText("Entry at offset 0")).toBeVisible();
        expect(within(rows[0]).getByText("INFO")).toBeVisible();
        expect(within(rows[0]).getByText("Searcher")).toBeVisible();
        // 1735689600 is below legacy's threshold, so it is epoch seconds:
        // 2025-01-01T00:00:00Z, displayed in the server's zone.
        expect(within(rows[0]).getByText(/Jan 1, 2025/)).toBeVisible();
        expect(within(rows[1]).getByText("ERROR")).toBeVisible();
    });

    it("should render markup-like log content as text, never as HTML", async () => {
        const backend = createBackend();
        renderLogTab(backend);

        const rows = await screen.findAllByTestId("system-log-row");
        expect(within(rows[1]).getByText(HOSTILE_MESSAGE)).toBeVisible();
        expect(rows[1].querySelector("script")).toBeNull();
        expect(rows[1].querySelector("img")).toBeNull();

        fireEvent.click(rows[1]);
        const dialog = await screen.findByTestId("system-log-entry-dialog");
        expect(within(dialog).getByText(HOSTILE_MESSAGE)).toBeVisible();
        expect(
            within(dialog).getByText("java.lang.Exception: <b>boom</b>"),
        ).toBeVisible();
        expect(
            within(dialog).getByText("Accessing IP address: 127.0.0.1"),
        ).toBeVisible();
        expect(
            within(dialog).getByText("Accessing username: someuser"),
        ).toBeVisible();
        expect(dialog.querySelector("script")).toBeNull();
        expect(dialog.querySelector("img")).toBeNull();
        expect(dialog.querySelector("b")).toBeNull();
        expect(
            (window as unknown as Record<string, unknown>).hydraLogInjection,
        ).toBeUndefined();

        fireEvent.click(screen.getByRole("button", {name: "Close"}));
        await waitFor(() =>
            expect(screen.queryByTestId("system-log-entry-dialog")).toBeNull(),
        );
    });

    it("should keep the table's row/cell structure valid while staying keyboard-operable", async () => {
        // `role="button"` on a `<tr>` removes it from the table's row/cell
        // ARIA structure; the row must stay a plain (implicit) table row and
        // still open the dialog on Enter.
        const backend = createBackend();
        renderLogTab(backend);

        const rows = await screen.findAllByTestId("system-log-row");
        expect(rows[0]).not.toHaveAttribute("role", "button");
        expect(rows[0].tagName).toBe("TR");

        fireEvent.keyDown(rows[0], {key: "Enter"});
        expect(
            await screen.findByTestId("system-log-entry-dialog"),
        ).toBeVisible();
    });

    it("should page back and forward in 500-entry steps within the server's bounds", async () => {
        const backend = createBackend();
        renderLogTab(backend);

        await screen.findByTestId("system-log-table");
        const older = screen.getByTestId("system-log-older");
        await waitFor(() => expect(older).toBeEnabled());
        // The newest page: there is nothing newer to go to.
        expect(screen.getByTestId("system-log-newer")).toBeDisabled();

        fireEvent.click(older);
        await waitFor(() => expect(backend.jsonLogRequests).toEqual([0, 500]));
        expect(await screen.findByText("Entry at offset 500")).toBeVisible();
        expect(screen.getByTestId("system-log-newer")).toBeEnabled();

        await waitFor(() =>
            expect(screen.getByTestId("system-log-older")).toBeEnabled(),
        );
        fireEvent.click(screen.getByTestId("system-log-older"));
        await waitFor(() =>
            expect(backend.jsonLogRequests).toEqual([0, 500, 1000]),
        );
        // The server reported no more lines behind this page.
        await waitFor(() =>
            expect(screen.getByTestId("system-log-older")).toBeDisabled(),
        );

        fireEvent.click(screen.getByTestId("system-log-newer"));
        expect(await screen.findByText("Entry at offset 500")).toBeVisible();
        fireEvent.click(screen.getByTestId("system-log-newer"));
        await waitFor(() =>
            expect(screen.getByTestId("system-log-newer")).toBeDisabled(),
        );
        expect(await screen.findByText("Entry at offset 0")).toBeVisible();
    });

    it("should report a failed page instead of showing a stale one", async () => {
        const backend = createBackend();
        backend.fetch.mockImplementation(
            async () => new Response("", {status: 500}),
        );
        renderLogTab(backend);

        expect(
            await screen.findByText("Unable to load the log file."),
        ).toBeVisible();
        expect(screen.queryByTestId("system-log-table")).toBeNull();
    });
});

describe("SystemLogTab raw view", () => {
    it("should show the raw file as text and never as HTML", async () => {
        const backend = createBackend(`plain line\n${HOSTILE_MESSAGE}`);
        renderLogTab(backend);
        selectView("Raw");

        const view = await screen.findByTestId("system-log-view-raw");
        await waitFor(() =>
            expect(view.textContent).toContain(HOSTILE_MESSAGE),
        );
        expect(view.querySelector("script")).toBeNull();
        expect(view.querySelector("img")).toBeNull();
        expect(
            (window as unknown as Record<string, unknown>).hydraLogInjection,
        ).toBeUndefined();
    });

    it("should let the scrollable log panel be reached and scrolled by keyboard alone", async () => {
        const backend = createBackend("some log content");
        renderLogTab(backend);
        selectView("Raw");

        const view = await screen.findByTestId("system-log-view-raw");
        await waitFor(() =>
            expect(view.textContent).toContain("some log content"),
        );
        const panel = view.querySelector("pre");
        expect(panel).toHaveAttribute("tabIndex", "0");
    });

    it("should refresh every five seconds only while the raw view is shown, and stop on unmount", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        const backend = createBackend();
        const view = renderLogTab(backend);
        selectView("Raw");
        await screen.findByTestId("system-log-refresh-toggle");
        await waitFor(() => expect(backend.rawLogRequests).toBe(1));

        // Off by default (legacy's `doUpdateLog` default): no ticking.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(15_000);
        });
        expect(backend.rawLogRequests).toBe(1);

        fireEvent.click(screen.getByTestId("system-log-refresh-toggle"));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000);
        });
        expect(backend.rawLogRequests).toBeGreaterThan(1);

        // Leaving the view takes the timer with it.
        selectView("Files");
        await screen.findByTestId("system-log-view-files");
        const afterLeaving = backend.rawLogRequests;
        await act(async () => {
            await vi.advanceTimersByTimeAsync(20_000);
        });
        expect(backend.rawLogRequests).toBe(afterLeaving);

        // Coming back resumes it, and unmounting ends it.
        selectView("Raw");
        await screen.findByTestId("system-log-refresh-toggle");
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        expect(backend.rawLogRequests).toBeGreaterThan(afterLeaving);
        const afterReturn = backend.rawLogRequests;
        view.unmount();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(20_000);
        });
        expect(backend.rawLogRequests).toBe(afterReturn);
    });

    it("should couple the tail toggle to the refresh toggle and persist both", async () => {
        const backend = createBackend();
        renderLogTab(backend);
        selectView("Raw");

        const refresh = await screen.findByTestId("system-log-refresh-toggle");
        const tail = screen.getByTestId("system-log-tail-toggle");
        expect(refresh).not.toBeChecked();
        expect(tail).not.toBeChecked();

        // Tailing implies refreshing.
        fireEvent.click(tail);
        await waitFor(() => expect(refresh).toBeChecked());
        expect(tail).toBeChecked();
        expect(storage.get("hydra.system-log.auto-refresh")).toBe("true");
        expect(storage.get("hydra.system-log.tail")).toBe("true");

        // Legacy's `toggleUpdate`: cancelling the refresh clears the tail.
        fireEvent.click(refresh);
        await waitFor(() => expect(tail).not.toBeChecked());
        expect(refresh).not.toBeChecked();
        expect(storage.get("hydra.system-log.auto-refresh")).toBe("false");
        expect(storage.get("hydra.system-log.tail")).toBe("false");
    });

    it("should restore the persisted toggles, and survive unusable storage", async () => {
        storage.set("hydra.system-log.auto-refresh", "true");
        storage.set("hydra.system-log.tail", "true");
        renderLogTab(createBackend());
        selectView("Raw");

        expect(
            await screen.findByTestId("system-log-refresh-toggle"),
        ).toBeChecked();
        expect(screen.getByTestId("system-log-tail-toggle")).toBeChecked();

        cleanup();
        stubBlockedLocalStorage();
        renderLogTab(createBackend());
        selectView("Raw");
        const refresh = await screen.findByTestId("system-log-refresh-toggle");
        expect(refresh).not.toBeChecked();
        fireEvent.click(refresh);
        await waitFor(() => expect(refresh).toBeChecked());
    });
});

describe("SystemLogTab files view", () => {
    it("should link every log file to its download", async () => {
        renderLogTab(createBackend());
        selectView("Files");

        const first = await screen.findByTestId("system-log-file-0");
        expect(first).toHaveTextContent("nzbhydra2.log");
        expect(first.getAttribute("href")).toContain(
            "/hydra/internalapi/debuginfos/downloadlog?logfilename=nzbhydra2.log",
        );
        expect(screen.getByTestId("system-log-file-1")).toHaveTextContent(
            "nzbhydra2.log.1",
        );
    });
});
