import {ThemeProvider} from "@mui/material";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import type {BootstrapData} from "../../../bootstrap";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {CPU_CHART_HELP} from "./CpuUsageCard";
import {
    SENSITIVE_DISABLED_INFO,
    SENSITIVE_ENABLED_WARNING,
    SystemBugreportTab,
    UPLOAD_RESULT_PREFIX,
} from "./SystemBugreportTab";
import {CPU_POLL_INTERVAL_MS} from "./useThreadCpuUsage";

type Backend = {
    fetch: ReturnType<typeof vi.fn<typeof fetch>>;
    requests: {body: string | null; method: string; url: string}[];
};

const bootstrap = {
    baseUrl: "/hydra/",
    serverTimeZone: "UTC",
} as unknown as BootstrapData;

const cpuSeries = [
    {
        key: "HTTP thread #1",
        values: [
            {time: 1755600000, value: 12.5},
            {time: 1755600005, value: 30},
        ],
    },
    {key: "main", values: [{time: 1755600005, value: 4}]},
];

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
        status,
    });
}

function textResponse(body: string, status = 200): Response {
    return new Response(body, {
        headers: {"Content-Type": "text/plain"},
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
            backend.requests.push({
                body: typeof init?.body === "string" ? init.body : null,
                method,
                url: `${url.pathname}${url.search}`,
            });
            const answered = answer(url.pathname, method);
            if (answered !== undefined) {
                return answered;
            }
            if (url.pathname.endsWith("/threadCpuUsage")) {
                return jsonResponse(cpuSeries);
            }
            if (url.pathname.endsWith("/sensitiveDataLogging")) {
                return jsonResponse(method === "PUT");
            }
            return jsonResponse({message: "", successful: true});
        },
    );
    return backend;
}

function renderTab(backend: Backend) {
    vi.stubGlobal("fetch", backend.fetch);
    const transport = new ApiTransport("/hydra/", backend.fetch);
    render(
        <ThemeProvider theme={createHydraTheme("dark")}>
            <ToastProvider>
                <SystemBugreportTab
                    bootstrap={bootstrap}
                    transport={transport}
                />
            </ToastProvider>
        </ThemeProvider>,
    );
    return transport;
}

/** The first CPU poll and the sensitive-state read both resolve on mount. */
async function settle() {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

/** Runs the fake clock forward and lets the poll's promises settle with it. */
async function advance(milliseconds: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(milliseconds);
    });
}

function requestPaths(backend: Backend): string[] {
    return backend.requests.map((request) => request.url);
}

describe("SystemBugreportTab", () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("should reproduce legacy's bug-reporting prose and its two direct links", async () => {
        const backend = createBackend();
        renderTab(backend);
        await settle();

        expect(screen.getByTestId("system-bugreport")).toBeInTheDocument();
        expect(
            screen.getByRole("link", {name: "raise an issue on github"}),
        ).toHaveAttribute(
            "href",
            "https://github.com/theotherp/nzbhydra2/issues/new",
        );
        expect(
            screen.getByRole("link", {name: "send me a mail"}),
        ).toHaveAttribute("href", "mailto:theotherp@posteo.net");
    });

    it("should download the debug archive under legacy's name", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/createAndProvideZipAsBytes")
                ? new Response(new Blob(["zip"]), {
                      headers: {"Content-Type": "application/zip"},
                  })
                : undefined,
        );
        const createObjectURL = vi.fn().mockReturnValue("blob:debug");
        const revokeObjectURL = vi.fn();
        vi.stubGlobal(
            "URL",
            Object.assign(URL, {createObjectURL, revokeObjectURL}),
        );
        const downloaded: string[] = [];
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, "click")
            .mockImplementation(function (this: HTMLAnchorElement) {
                downloaded.push(this.download);
            });
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-debug-download"));
        await waitFor(() => expect(click).toHaveBeenCalled());
        expect(downloaded).toEqual([
            expect.stringMatching(
                /^nzbhydra-debuginfos-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/,
            ),
        ]);
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:debug");
        expect(
            requestPaths(backend).some((path) =>
                path.includes(
                    "internalapi/debuginfos/createAndProvideZipAsBytes",
                ),
            ),
        ).toBe(true);
    });

    it("should report a failed download instead of saving anything", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/createAndProvideZipAsBytes")
                ? jsonResponse({}, 500)
                : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-debug-download"));

        expect(
            await screen.findByText("Unable to create the debug infos."),
        ).toBeInTheDocument();
    });

    it("should render the uploaded archive's URL as an anchor, never as injected markup", async () => {
        // A response that would become markup if it were injected rather than
        // rendered as data.
        const hostile = 'https://file.io/x"><img src=x onerror="alert(1)">';
        const backend = createBackend((path) =>
            path.endsWith("/createAndUploadDebugInfos")
                ? textResponse(hostile)
                : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-debug-upload"));

        const result = await screen.findByTestId("system-debug-upload-result");
        expect(result).toHaveTextContent(UPLOAD_RESULT_PREFIX);
        const link = screen.getByRole("link", {name: hostile});
        expect(link).toHaveAttribute("href", hostile);
        expect(link).toHaveAttribute("target", "_blank");
        // Nothing from the response became an element.
        expect(result.querySelectorAll("img, script")).toHaveLength(0);
    });

    it("should show a failed upload's response body as text", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/createAndUploadDebugInfos")
                ? textResponse("<b>File share refused the archive</b>", 500)
                : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-debug-upload"));

        const result = await screen.findByTestId("system-debug-upload-result");
        expect(result).toHaveTextContent(
            "<b>File share refused the archive</b>",
        );
        expect(result.querySelectorAll("b")).toHaveLength(0);
    });

    it("should log a thread dump and report both outcomes", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/logThreadDump")
                ? textResponse("dump written")
                : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-thread-dump"));

        expect(
            await screen.findByText("Thread dump written to the log file."),
        ).toBeInTheDocument();
        expect(
            requestPaths(backend).some((path) =>
                path.includes("internalapi/debuginfos/logThreadDump"),
            ),
        ).toBe(true);
    });

    it("should report a refused thread dump", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/logThreadDump") ? jsonResponse({}, 403) : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-thread-dump"));

        expect(
            await screen.findByText("Unable to log a thread dump."),
        ).toBeInTheDocument();
    });

    it("should show the sensitive-logging state the server loaded", async () => {
        const backend = createBackend((path, method) =>
            path.endsWith("/sensitiveDataLogging") && method === "GET"
                ? jsonResponse(true)
                : undefined,
        );
        renderTab(backend);

        expect(
            await screen.findByRole("button", {
                name: /Disable sensitive data in logs/,
            }),
        ).toBeInTheDocument();
    });

    it("should reflect the state the server returned from the PUT, not the requested flip", async () => {
        // The button asks to enable; the server reports it stayed off. An
        // optimistic flip would show "Disable ... (currently enabled!)".
        const backend = createBackend((path, method) =>
            path.endsWith("/sensitiveDataLogging")
                ? jsonResponse(false)
                : method === "PUT"
                  ? undefined
                  : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-sensitive-toggle"));

        expect(
            await screen.findByText(SENSITIVE_DISABLED_INFO),
        ).toBeInTheDocument();
        expect(screen.getByTestId("system-sensitive-toggle")).toHaveTextContent(
            "Enable sensitive data in logs",
        );
        const put = backend.requests.find(
            (request) => request.method === "PUT",
        );
        expect(put?.url).toContain(
            "/internalapi/debuginfos/sensitiveDataLogging?enabled=true",
        );
    });

    it("should warn with legacy's wording when the server reports logging enabled", async () => {
        const backend = createBackend();
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-sensitive-toggle"));

        expect(
            await screen.findByText(SENSITIVE_ENABLED_WARNING),
        ).toBeInTheDocument();
        expect(screen.getByTestId("system-sensitive-toggle")).toHaveTextContent(
            "Disable sensitive data in logs (currently enabled!)",
        );
    });

    it("should report a refused sensitive-logging change", async () => {
        const backend = createBackend((path, method) =>
            path.endsWith("/sensitiveDataLogging") && method === "PUT"
                ? jsonResponse({}, 500)
                : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.click(screen.getByTestId("system-sensitive-toggle"));

        expect(
            await screen.findByText(
                "Unable to change the sensitive data logging setting.",
            ),
        ).toBeInTheDocument();
    });

    it("should link the heap dump and the endpoint listing base-URL-aware in a new tab", async () => {
        const backend = createBackend();
        renderTab(backend);
        await settle();

        const heapDump = screen.getByTestId("system-heap-dump");
        expect(heapDump).toHaveAttribute(
            "href",
            expect.stringContaining("/hydra/actuator/heapdump"),
        );
        expect(heapDump).toHaveAttribute("target", "_blank");
        const endpoints = screen.getByTestId("system-endpoints");
        expect(endpoints).toHaveAttribute(
            "href",
            expect.stringContaining("/hydra/internalapi/debuginfos/endpoints"),
        );
        expect(endpoints).toHaveAttribute("target", "_blank");
    });

    it("should post the typed SQL and fill the read-only output", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/executesqlquery")
                ? jsonResponse({message: "ID,TITLE\n1,foo", successful: true})
                : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.change(screen.getByTestId("system-sql-input"), {
            target: {value: "SELECT * FROM INDEXER"},
        });
        fireEvent.click(screen.getByTestId("system-sql-query"));

        const output = await screen.findByTestId("system-sql-output");
        await waitFor(() => expect(output).toHaveValue("ID,TITLE\n1,foo"));
        expect(output).toHaveAttribute("readonly");
        const posted = backend.requests.find(
            (request) => request.method === "POST",
        );
        expect(posted?.url).toContain(
            "/internalapi/debuginfos/executesqlquery",
        );
        expect(posted?.body).toBe("SELECT * FROM INDEXER");
    });

    it("should append legacy's row-count wording for an executed statement", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/executesqlupdate")
                ? jsonResponse({message: "7", successful: true})
                : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.change(screen.getByTestId("system-sql-input"), {
            target: {value: "UPDATE INDEXER SET ENABLED=TRUE"},
        });
        fireEvent.click(screen.getByTestId("system-sql-execute"));

        await waitFor(() =>
            expect(screen.getByTestId("system-sql-output")).toHaveValue(
                "7 rows affected",
            ),
        );
    });

    it("should toast an unsuccessful SQL response and leave the output alone", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/executesqlquery")
                ? jsonResponse({
                      message: "Error while executing SQL Syntax error",
                      successful: false,
                  })
                : undefined,
        );
        renderTab(backend);
        await settle();

        fireEvent.change(screen.getByTestId("system-sql-input"), {
            target: {value: "SELEC 1"},
        });
        fireEvent.click(screen.getByTestId("system-sql-query"));

        expect(
            await screen.findByText("Error while executing SQL Syntax error"),
        ).toBeInTheDocument();
        expect(screen.getByTestId("system-sql-output")).toHaveValue("");
    });

    it("should show the polled CPU values as an accessible table in the server's zone", async () => {
        const backend = createBackend();
        renderTab(backend);
        await settle();

        expect(screen.getByTestId("system-cpu-chart")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "View data"}));

        const table = screen.getByTestId("system-cpu-chart-table");
        expect(table).toHaveTextContent("HTTP thread #1");
        expect(table).toHaveTextContent("30.0");
        expect(table).toHaveTextContent("main");
        expect(table).toHaveTextContent("4.0");
        // Epoch second 1755600005 in UTC, the configured server zone.
        expect(table).toHaveTextContent("10:40:05");
    });

    it("should show legacy's Performance marker hint while there is no data", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/threadCpuUsage") ? jsonResponse([]) : undefined,
        );
        renderTab(backend);
        await settle();

        expect(screen.getAllByText(CPU_CHART_HELP).length).toBeGreaterThan(0);
        expect(screen.getByRole("button", {name: "View data"})).toBeDisabled();
    });

    it("should poll the CPU usage every five seconds and stop after a failed poll", async () => {
        let failNext = false;
        const backend = createBackend((path) =>
            path.endsWith("/threadCpuUsage") && failNext
                ? jsonResponse({}, 500)
                : undefined,
        );
        vi.useFakeTimers();
        renderTab(backend);
        const cpuCalls = () =>
            requestPaths(backend).filter((path) =>
                path.includes("threadCpuUsage"),
            ).length;
        await advance(0);
        expect(cpuCalls()).toBe(1);

        await advance(CPU_POLL_INTERVAL_MS);
        expect(cpuCalls()).toBe(2);

        failNext = true;
        await advance(CPU_POLL_INTERVAL_MS);
        expect(cpuCalls()).toBe(3);

        // The failed poll ended the polling: nothing more is requested.
        await advance(4 * CPU_POLL_INTERVAL_MS);
        expect(cpuCalls()).toBe(3);
        expect(
            screen.getByText(
                "Unable to read the CPU usage; the chart stopped updating.",
            ),
        ).toBeInTheDocument();
    });

    it("should clear the poll interval on unmount", async () => {
        const backend = createBackend();
        vi.useFakeTimers();
        renderTab(backend);
        const cpuCalls = () =>
            requestPaths(backend).filter((path) =>
                path.includes("threadCpuUsage"),
            ).length;
        await advance(0);
        expect(cpuCalls()).toBe(1);

        cleanup();
        await advance(10 * CPU_POLL_INTERVAL_MS);

        expect(cpuCalls()).toBe(1);
    });
});
