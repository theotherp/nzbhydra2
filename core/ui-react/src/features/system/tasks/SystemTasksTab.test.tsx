import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import type {BootstrapData} from "../../../bootstrap";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {
    formatServerDateTime,
    parseServerDateTime,
} from "../../../domain/date-time/dateTime";
import {formatRelativeTime} from "./relativeTime";
import {SystemTasksTab} from "./SystemTasksTab";

type Backend = {
    fetch: ReturnType<typeof vi.fn<typeof fetch>>;
    requests: string[];
};

const taskList = [
    {
        lastExecutionTime: "2026-08-21T10:00:00Z",
        name: "Backup",
        nextExecutionTime: "2026-08-22T10:00:00Z",
    },
    {
        lastExecutionTime: null,
        name: "Delete old search results",
        nextExecutionTime: "2026-08-22T11:00:00Z",
    },
];

const bootstrap = {
    baseUrl: "/hydra/",
    serverTimeZone: "UTC",
} as unknown as BootstrapData;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
        status,
    });
}

function createBackend(
    answer: (path: string, method: string) => Response | undefined = () =>
        undefined,
): Backend {
    const backend: Backend = {fetch: vi.fn<typeof fetch>(), requests: []};
    backend.fetch.mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = new URL(String(input));
            const method = init?.method ?? "GET";
            backend.requests.push(`${method} ${url.pathname}${url.search}`);
            const answered = answer(url.pathname, method);
            if (answered !== undefined) {
                return answered;
            }
            return jsonResponse(taskList);
        },
    );
    return backend;
}

function renderTasksTab(backend: Backend): ApiTransport {
    vi.stubGlobal("fetch", backend.fetch);
    const transport = new ApiTransport("/hydra/", backend.fetch);
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                <ToastProvider>
                    <SystemTasksTab
                        bootstrap={bootstrap}
                        transport={transport}
                    />
                </ToastProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return transport;
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("SystemTasksTab", () => {
    it("should list the scheduled tasks with their execution times", async () => {
        renderTasksTab(createBackend());

        expect(await screen.findByTestId("system-tasks-table")).toBeVisible();
        expect(screen.getByText("Name")).toBeVisible();
        expect(screen.getByText("Last execution")).toBeVisible();
        expect(screen.getByText("Next execution")).toBeVisible();
        expect(screen.getAllByTestId("system-task-run")).toHaveLength(2);
        expect(screen.getByRole("button", {name: /Backup/})).toBeVisible();
        expect(
            screen.getByRole("button", {name: /Delete old search results/}),
        ).toBeVisible();
    });

    it("should render a null last-execution time as an empty cell with no tooltip", async () => {
        renderTasksTab(createBackend());
        await screen.findByTestId("system-tasks-table");

        const row = screen
            .getByRole("button", {name: /Delete old search results/})
            .closest("tr");
        expect(row).not.toBeNull();
        // The row's own Next execution cell must still show relative text +
        // tooltip, otherwise this proves nothing about Last execution.
        expect(row).toHaveTextContent("Delete old search results");
        const cells = row?.querySelectorAll("td") ?? [];
        expect(cells).toHaveLength(3);
        // Last execution cell (index 1) is genuinely empty: no relative text
        // and no tooltip-wrapping element at all -- a `null` value renders
        // nothing, rather than a tooltip whose title has nothing useful in
        // it.
        expect(cells[1]?.textContent).toBe("");
        expect(cells[1]?.childElementCount).toBe(0);
        // Next execution cell (index 2) is populated and does carry the
        // hoverable element the tooltip attaches to.
        expect(cells[2]?.textContent).not.toBe("");
        expect(cells[2]?.childElementCount).toBeGreaterThan(0);
    });

    it("should render a populated execution time as relative text with the absolute server-timezone tooltip for the same instant", async () => {
        // A fixed "now" makes the relative text deterministic; it is computed
        // independently below via the same C-DATE-TIME helpers the component
        // uses, rather than hardcoded, so a swapped field or argument in
        // `ExecutionTimeCell` (relative Date into `formatServerDateTime`,
        // tooltip built from the wrong column, or the helper's arguments
        // swapped) would fail this test even though it wouldn't fail a mere
        // non-empty check.
        vi.useFakeTimers({shouldAdvanceTime: true});
        vi.setSystemTime(new Date("2026-08-22T10:00:00Z"));
        renderTasksTab(createBackend());
        await screen.findByTestId("system-tasks-table");

        const row = screen
            .getByRole("button", {name: /^Backup$/})
            .closest("tr");
        const lastExecutionCell = row?.querySelectorAll("td")[1];
        const expectedRelativeText = formatRelativeTime(
            parseServerDateTime("2026-08-21T10:00:00Z", "UTC")!,
        );
        expect(lastExecutionCell?.textContent).toBe(expectedRelativeText);

        const hoverTarget = lastExecutionCell?.firstElementChild;
        expect(hoverTarget).not.toBeNull();
        fireEvent.mouseOver(hoverTarget as Element);
        const expectedTooltipText = formatServerDateTime(
            "2026-08-21T10:00:00Z",
            "UTC",
        );
        expect(await screen.findByText(expectedTooltipText)).toBeVisible();
    });

    it("should report a task list it cannot read", async () => {
        renderTasksTab(createBackend(() => jsonResponse({}, 500)));

        expect(
            await screen.findByText("Unable to load the scheduled tasks."),
        ).toBeVisible();
        expect(screen.queryByTestId("system-tasks-table")).toBeNull();
    });

    it("should run a task and replace the whole list with the PUT response, not re-GET", async () => {
        const refreshed = [
            {
                lastExecutionTime: "2026-08-22T12:00:00Z",
                name: "Backup",
                nextExecutionTime: "2026-08-23T12:00:00Z",
            },
        ];
        const backend = createBackend((path, method) =>
            method === "PUT" && path.endsWith("/tasks/Backup")
                ? jsonResponse(refreshed)
                : undefined,
        );
        renderTasksTab(backend);
        await screen.findByTestId("system-tasks-table");
        const getCallsBefore = backend.requests.filter((request) =>
            request.startsWith("GET"),
        ).length;

        fireEvent.click(screen.getByRole("button", {name: /^Backup$/}));

        await waitFor(() =>
            expect(screen.queryAllByTestId("system-task-run")).toHaveLength(1),
        );
        expect(backend.requests).toContain(
            "PUT /hydra/internalapi/tasks/Backup",
        );
        // No second GET after the PUT: the list came from the PUT response.
        expect(
            backend.requests.filter((request) => request.startsWith("GET"))
                .length,
        ).toBe(getCallsBefore);
    });

    it("should toast an error when running a task fails and keep the existing list", async () => {
        const backend = createBackend((path, method) =>
            method === "PUT" ? jsonResponse({}, 500) : undefined,
        );
        renderTasksTab(backend);
        await screen.findByTestId("system-tasks-table");

        fireEvent.click(screen.getByRole("button", {name: /^Backup$/}));

        expect(
            await screen.findByText("Unable to run the task."),
        ).toBeVisible();
        expect(screen.getAllByTestId("system-task-run")).toHaveLength(2);
    });
});
