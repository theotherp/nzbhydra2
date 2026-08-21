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
            createSystemRoute(rootRoute, transport, () => (
                <p>React migration placeholder</p>
            )),
        ]),
    });
    render(
        <ThemeProvider theme={createHydraTheme("dark")}>
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
        expect(screen.getByTestId("system-control")).toBeVisible();
    });

    it("should land bare /system on the Control tab", async () => {
        const {router} = renderSystemArea("/hydra/system");
        await screen.findByTestId("system-control");

        expect(router.state.location.pathname).toBe("/system/control");
    });

    it("should render an unmigrated tab inside the shell", async () => {
        renderSystemArea();
        await screen.findByTestId("system-shell");

        fireEvent.click(screen.getByTestId("system-tab-backup"));

        expect(
            await screen.findByText("React migration placeholder"),
        ).toBeVisible();
        expect(screen.getByTestId("system-shell")).toBeVisible();
        expect(screen.queryByTestId("system-control")).toBeNull();
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
