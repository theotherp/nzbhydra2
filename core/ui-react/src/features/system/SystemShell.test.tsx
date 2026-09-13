import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from "@tanstack/react-router";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {createHydraTheme} from "../../app/theme";
import type {BootstrapData} from "../../bootstrap";
import {DialogProvider} from "../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../components/toasts/ToastProvider";
import {createSystemRoute} from "./routes";

const newsPayload = [
    {
        forCurrentVersion: true,
        forNewerVersion: false,
        news: "<p>News body</p>",
        version: "2.0.0",
    },
];

const bootstrap: BootstrapData = {
    adminRestricted: false,
    authConfigured: false,
    authType: null,
    baseUrl: "/hydra/",
    maySeeAdmin: true,
    maySeeDetailsDl: true,
    maySeeSearch: true,
    maySeeStats: true,
    safeConfig: {},
    searchRestricted: false,
    serverTimeZone: null,
    showIndexerSelection: false,
    showLogout: false,
    statsRestricted: false,
    username: null,
};

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
    });
}

function renderSystemArea(initialPath = "/hydra/system/control") {
    const fetchMock = vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/internalapi/news")) {
            return jsonResponse(newsPayload);
        }
        if (url.endsWith("/internalapi/updates/simpleInfos")) {
            return jsonResponse({currentVersion: "9.9.9"});
        }
        if (url.endsWith("/internalapi/updates/infos")) {
            return jsonResponse({currentVersion: "9.9.9"});
        }
        if (url.endsWith("/internalapi/updates/versionHistory")) {
            return jsonResponse([]);
        }
        if (url.endsWith("/internalapi/backup/list")) {
            return jsonResponse([
                {
                    creationDate: "2026-08-20T08:30:00Z",
                    filename: "nzbhydra-backup.zip",
                },
            ]);
        }
        if (url.endsWith("/internalapi/tasks")) {
            return jsonResponse([
                {
                    lastExecutionTime: "2026-08-21T10:00:00Z",
                    name: "Backup",
                    nextExecutionTime: "2026-08-22T10:00:00Z",
                },
            ]);
        }
        throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    const transport = new ApiTransport("/hydra/", fetchMock);
    const rootRoute = createRootRoute({component: () => <Outlet />});
    const router = createRouter({
        basepath: "/hydra",
        history: createMemoryHistory({initialEntries: [initialPath]}),
        routeTree: rootRoute.addChildren([
            createSystemRoute(rootRoute, transport, bootstrap, () => (
                <p>React migration placeholder</p>
            )),
        ]),
    });
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <QueryClientProvider client={queryClient}>
                <DialogProvider>
                    <ToastProvider>
                        <RouterProvider router={router} />
                    </ToastProvider>
                </DialogProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return {router};
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("SystemShell", () => {
    it("should offer legacy's eight tabs in order", async () => {
        renderSystemArea();
        await screen.findByTestId("system-shell");

        for (const [testId, label] of [
            ["system-tab-control", "Control"],
            ["system-tab-updates", "Updates"],
            ["system-tab-log", "Log"],
            ["system-tab-tasks", "Tasks"],
            ["system-tab-backup", "Backup"],
            ["system-tab-bugreport", "Bugreport / Debug"],
            ["system-tab-news", "News"],
            ["system-tab-about", "About"],
        ]) {
            const tab = screen.getByTestId(testId);
            expect(tab).toHaveTextContent(label);
            expect(tab).toHaveAttribute(
                "href",
                `/hydra/system/${testId.replace("system-tab-", "")}`,
            );
        }
        // The Control tab body is a lazy route: awaited, not read once (a
        // 2-in-5 flake in the FM-184 review).
        expect(await screen.findByTestId("system-control")).toBeVisible();
    });

    it("should land bare /system on the Control tab", async () => {
        const {router} = renderSystemArea("/hydra/system");
        await screen.findByTestId("system-control");

        expect(router.state.location.pathname).toBe("/system/control");
    });

    it("should switch tabs inside the shell without leaving it", async () => {
        renderSystemArea();
        await screen.findByTestId("system-shell");

        // `tasks` was the last unmigrated tab, used here for this assertion
        // until FM-077 migrated it; every tab now has a React body.
        fireEvent.click(screen.getByTestId("system-tab-tasks"));

        expect(await screen.findByTestId("system-tasks")).toBeVisible();
        expect(screen.getByTestId("system-shell")).toBeVisible();
        expect(screen.queryByTestId("system-control")).toBeNull();
    });

    it("should render the updates tab inside the shell", async () => {
        renderSystemArea("/hydra/system/updates");
        await screen.findByTestId("system-shell");

        expect(await screen.findByTestId("system-updates")).toBeVisible();
        expect(screen.getByTestId("system-version-history")).toBeVisible();
    });

    it("should render the about tab inside the shell", async () => {
        renderSystemArea("/hydra/system/about");
        await screen.findByTestId("system-shell");

        expect(await screen.findByTestId("system-about")).toBeVisible();
        expect(
            screen.getByRole("heading", {name: "Program info"}),
        ).toBeVisible();
    });

    it("should render the backup tab inside the shell", async () => {
        renderSystemArea("/hydra/system/backup");
        await screen.findByTestId("system-shell");

        expect(await screen.findByTestId("system-backup")).toBeVisible();
        expect(await screen.findByTestId("system-backup-table")).toBeVisible();
    });

    it("should render the tasks tab inside the shell", async () => {
        renderSystemArea("/hydra/system/tasks");
        await screen.findByTestId("system-shell");

        expect(await screen.findByTestId("system-tasks")).toBeVisible();
        expect(await screen.findByTestId("system-tasks-table")).toBeVisible();
        expect(screen.getByRole("button", {name: /Backup/})).toBeVisible();
    });

    it("should render the news page inside the shell", async () => {
        renderSystemArea("/hydra/system/news");
        await screen.findByTestId("system-shell");

        expect(
            await screen.findByRole("heading", {name: /2\.0\.0/}),
        ).toBeVisible();
        expect(screen.getByText("News body")).toBeVisible();
        expect(screen.getByTestId("system-tab-news")).toBeVisible();
    });
});
