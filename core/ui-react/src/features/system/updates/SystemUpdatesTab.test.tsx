import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {SystemUpdatesTab} from "./SystemUpdatesTab";

type Backend = {
    fetch: ReturnType<typeof vi.fn<typeof fetch>>;
    requests: string[];
};

const versionHistory = [
    {
        changes: [
            {
                text: 'Fixed it. See <a href="https://example.test/1">#1</a><script>alert(1)</script>',
                type: "fix",
            },
            {text: "Added a thing", type: "feature"},
            {text: "Read this", type: "note"},
        ],
        date: "2026-07-09",
        final: false,
        version: "9.1.0",
    },
];

const changesSince = [
    {
        changes: [{text: "<b>Important</b> change", type: "feature"}],
        date: "2026-07-09",
        final: true,
        version: "9.0.1",
    },
];

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
        status,
    });
}

function createBackend(
    infos: Record<string, unknown>,
    answer: (path: string) => Response | undefined = () => undefined,
): Backend {
    const backend: Backend = {fetch: vi.fn<typeof fetch>(), requests: []};
    backend.fetch.mockImplementation(async (input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname;
        backend.requests.push(path);
        const answered = answer(path);
        if (answered !== undefined) {
            return answered;
        }
        if (path.endsWith("/updates/infos")) {
            return jsonResponse(infos);
        }
        if (path.endsWith("/updates/versionHistory")) {
            return jsonResponse(versionHistory);
        }
        if (path.includes("/updates/changesSince/")) {
            return jsonResponse(changesSince);
        }
        if (path.endsWith("/updates/messages")) {
            return jsonResponse(["Downloading update"]);
        }
        return jsonResponse(null);
    });
    return backend;
}

function renderUpdatesTab(backend: Backend) {
    vi.stubGlobal("fetch", backend.fetch);
    render(
        <ThemeProvider theme={createHydraTheme("dark")}>
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                <ToastProvider>
                    <SystemUpdatesTab
                        transport={new ApiTransport("/hydra/", backend.fetch)}
                    />
                </ToastProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("SystemUpdatesTab", () => {
    it("should offer the release and beta installs with their versions", async () => {
        renderUpdatesTab(
            createBackend({
                betaUpdateAvailable: true,
                betaVersion: "9.2.0",
                currentVersion: "9.0.0",
                latestVersion: "9.1.0",
                updateAvailable: true,
            }),
        );

        expect(
            await screen.findByTestId("system-updates-install"),
        ).toBeVisible();
        expect(screen.getByTestId("system-updates-install-beta")).toBeVisible();
        expect(
            screen.getByText("A new release (9.1.0) is available."),
        ).toBeVisible();
        expect(
            screen.getByText("A new beta release (9.2.0) is available."),
        ).toBeVisible();
        expect(screen.getByText("Current version: 9.0.0")).toBeVisible();
        expect(screen.getByText("Latest beta version: 9.2.0")).toBeVisible();
        expect(screen.queryByTestId("system-updates-force")).toBeNull();
        expect(screen.queryByText("You're up to date!")).toBeNull();
    });

    it("should offer only a force update when the instance is up to date", async () => {
        renderUpdatesTab(
            createBackend({currentVersion: "9.0.0", latestVersion: "9.0.0"}),
        );

        expect(await screen.findByText("You're up to date!")).toBeVisible();
        expect(screen.getByTestId("system-updates-force")).toBeVisible();
        expect(screen.queryByTestId("system-updates-install")).toBeNull();
    });

    it("should withdraw the install offer for an externally updated instance", async () => {
        renderUpdatesTab(
            createBackend({
                currentVersion: "9.0.0",
                latestVersion: "9.1.0",
                updateAvailable: true,
                updatedExternally: true,
            }),
        );

        expect(
            await screen.findByTestId("system-updates-external-warning"),
        ).toBeVisible();
        expect(screen.queryByTestId("system-updates-install")).toBeNull();
        expect(screen.getByTestId("system-updates-force")).toBeVisible();
    });

    it("should keep the install offer when the banner setting asks for it", async () => {
        renderUpdatesTab(
            createBackend({
                currentVersion: "9.0.0",
                latestVersion: "9.1.0",
                showUpdateBannerOnUpdatedExternally: true,
                updateAvailable: true,
                updatedExternally: true,
            }),
        );

        expect(
            await screen.findByTestId("system-updates-external-warning"),
        ).toBeVisible();
        expect(screen.getByTestId("system-updates-install")).toBeVisible();
    });

    it("should warn about an outdated wrapper with both platforms' file lists", async () => {
        renderUpdatesTab(
            createBackend({currentVersion: "9.0.0", wrapperOutdated: true}),
        );

        const warning = await screen.findByTestId(
            "system-updates-wrapper-warning",
        );
        expect(warning).toHaveTextContent("NZBHydra2 Console.exe");
        expect(warning).toHaveTextContent("nzbhydra2wrapperPy3.py");
    });

    it("should render the version history with type badges and sanitized change HTML", async () => {
        renderUpdatesTab(createBackend({currentVersion: "9.0.0"}));

        const history = await screen.findByTestId("system-version-history");
        expect(
            await screen.findByRole("heading", {
                name: "9.1.0 Beta (2026-07-09)",
            }),
        ).toBeVisible();
        for (const badge of ["Fix", "Feature", "Note"]) {
            expect(screen.getByText(badge)).toBeVisible();
        }
        expect(screen.getByRole("link", {name: "#1"})).toHaveAttribute(
            "href",
            "https://example.test/1",
        );
        expect(history.querySelector("script")).not.toBeInTheDocument();
    });

    it("should show the changelog for the offered version through the sanitizing boundary", async () => {
        const backend = createBackend({
            currentVersion: "9.0.0",
            latestVersion: "9.0.1",
            updateAvailable: true,
        });
        renderUpdatesTab(backend);

        fireEvent.click(await screen.findByTestId("system-updates-changelog"));

        expect(
            await screen.findByRole("heading", {name: "Change log"}),
        ).toBeVisible();
        const dialog = await screen.findByTestId(
            "system-updates-changelog-dialog",
        );
        await waitFor(() =>
            expect(dialog.querySelector("b")).toBeInTheDocument(),
        );
        expect(dialog).toHaveTextContent("Important change");
        expect(backend.requests).toContain(
            "/hydra/internalapi/updates/changesSince/9.0.1",
        );
    });

    it("should show the progress dialog and hand off to the restart countdown", async () => {
        // Fake timers stop the handoff at the countdown's first, 3s-late ping,
        // which is `C-RESTART-COORDINATOR`'s own tested behavior.
        const backend = createBackend({
            currentVersion: "9.0.0",
            latestVersion: "9.0.1",
            updateAvailable: true,
        });
        renderUpdatesTab(backend);
        const install = await screen.findByTestId("system-updates-install");

        vi.useFakeTimers();
        fireEvent.click(install);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        expect(
            screen.getByTestId("system-update-progress-dialog"),
        ).toBeVisible();
        expect(screen.getByText("Downloading update")).toBeVisible();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2500);
        });
        // The progress dialog's own exit transition, after which it unmounts.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(500);
        });

        expect(
            screen.queryByTestId("system-update-progress-dialog"),
        ).toBeNull();
        expect(
            screen.getByTestId("restart-progress-message"),
        ).toHaveTextContent("Will reload page when NZBHydra is back.");
        expect(backend.requests).toContain(
            "/hydra/internalapi/updates/installUpdate/9.0.1",
        );
        // The poll stopped with the dialog it fed.
        const polledBefore = backend.requests.filter((path) =>
            path.endsWith("/updates/messages"),
        ).length;
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(
            backend.requests.filter((path) =>
                path.endsWith("/updates/messages"),
            ).length,
        ).toBe(polledBefore);
    });

    it("should report a failed install and never start the countdown", async () => {
        const backend = createBackend(
            {
                currentVersion: "9.0.0",
                latestVersion: "9.0.1",
                updateAvailable: true,
            },
            (path) =>
                path.includes("/updates/installUpdate/")
                    ? jsonResponse({error: "nope"}, 500)
                    : undefined,
        );
        renderUpdatesTab(backend);

        fireEvent.click(await screen.findByTestId("system-updates-install"));

        expect(
            await screen.findByText(
                "An error occurred while updating. Please check the logs.",
            ),
        ).toBeVisible();
        await waitFor(() =>
            expect(
                screen.queryByTestId("system-update-progress-dialog"),
            ).toBeNull(),
        );
        expect(screen.queryByTestId("restart-progress-dialog")).toBeNull();
    });
});
