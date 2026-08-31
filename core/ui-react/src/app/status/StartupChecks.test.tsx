import {ThemeProvider} from "@mui/material";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {ToastProvider} from "../../components/toasts/ToastProvider";
import {createHydraTheme} from "../theme";
import {StartupChecks} from "./StartupChecks";

vi.mock("@tanstack/react-router", () => ({
    Link: ({
        to,
        children,
        ...rest
    }: {
        children?: React.ReactNode;
        to: string;
    }) => (
        <a {...rest} href={`/hydra${to}`}>
            {children}
        </a>
    ),
}));

type Route = {body?: unknown; method: string; path: string};

let routes: Route[];
let requests: {method: string; path: string}[];
let fetchImplementation: ReturnType<typeof vi.fn<typeof fetch>>;

function route(path: string, body: unknown, method = "GET") {
    routes.push({body, method, path});
}

afterEach(cleanup);
beforeEach(() => {
    routes = [];
    requests = [];
    fetchImplementation = vi.fn<typeof fetch>((input, init) => {
        const method = init?.method ?? "GET";
        const parsed = new URL(String(input));
        const path = `${parsed.pathname.replace("/hydra/", "")}${parsed.search}`;
        requests.push({method, path});
        const match = routes.find(
            (candidate) =>
                candidate.path === path && candidate.method === method,
        );
        if (match === undefined) {
            return Promise.resolve(new Response("nope", {status: 500}));
        }
        return Promise.resolve(
            match.body === undefined
                ? new Response(null, {status: 200})
                : new Response(JSON.stringify(match.body), {
                      headers: {"Content-Type": "application/json"},
                  }),
        );
    });
});

const bootstrap: BootstrapData = {
    adminRestricted: false,
    authConfigured: false,
    authType: null,
    baseUrl: "/hydra/",
    maySeeAdmin: true,
    maySeeDetailsDl: true,
    maySeeSearch: true,
    maySeeStats: true,
    safeConfig: {showNews: true},
    searchRestricted: false,
    serverTimeZone: null,
    showIndexerSelection: true,
    showLogout: false,
    statsRestricted: false,
    username: null,
};

function renderChecks(overrides: Partial<BootstrapData> = {}) {
    return render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <ToastProvider>
                <StartupChecks
                    bootstrap={{...bootstrap, ...overrides}}
                    transport={new ApiTransport("/hydra/", fetchImplementation)}
                />
            </ToastProvider>
        </ThemeProvider>,
    );
}

function storage(key: string, body: unknown, forUser = false) {
    route(`internalapi/genericstorage/${key}?forUser=${forUser}`, body);
    route(
        `internalapi/genericstorage/${key}?forUser=${forUser}`,
        undefined,
        "PUT",
    );
}

describe("StartupChecks", () => {
    it("should show the welcome dialog with its config and help links on a first start", async () => {
        route("internalapi/welcomeshown", false);
        route("internalapi/welcomeshown", undefined, "PUT");
        route("internalapi/updates/isDisplayWrapperOutdated", false);

        renderChecks({safeConfig: {}});

        const dialog = await screen.findByTestId("welcome-dialog");
        expect(
            screen.getByRole("heading", {name: "Welcome to NZBHydra 2"}),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", {name: "configuring NZBHydra 2"}),
        ).toHaveAttribute("href", "/hydra/config/main");
        expect(screen.getByRole("link", {name: "the wiki"})).toHaveAttribute(
            "href",
            "https://github.com/theotherp/nzbhydra2/wiki",
        );
        expect(
            screen.getByRole("link", {name: "raise a GitHub issue"}),
        ).toBeInTheDocument();
        // The NZBHydra 1 migration wizard is not migrated, so its link is gone.
        expect(dialog).not.toHaveTextContent("migrate your data");

        fireEvent.click(screen.getByRole("button", {name: "Close"}));
        await waitFor(() =>
            expect(
                screen.queryByTestId("welcome-dialog"),
            ).not.toBeInTheDocument(),
        );
    });

    it("should show user news one at a time, dismissing each before the next", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", [
            {id: "7", newsAsHtml: "<p>Read me first</p>", title: "First"},
            {id: "8", newsAsHtml: "<p>Then me</p>", title: "Second"},
        ]);
        route("internalapi/usernews/7/dismiss", {}, "PUT");
        route("internalapi/usernews/8/dismiss", {}, "PUT");
        route("internalapi/news/forcurrentversion", []);
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        storage("outOfMemoryDetected", false);
        storage("showOpenToInternetWithoutAuth", false);
        storage("belowJava17", false);
        storage("FAILED_BACKUP", null);

        renderChecks();

        await screen.findByTestId("user-news-dialog");
        expect(
            screen.getByRole("heading", {name: "First"}),
        ).toBeInTheDocument();
        expect(
            requests.some((request) => request.path.includes("dismiss")),
        ).toBe(false);

        fireEvent.click(screen.getByRole("button", {name: "OK"}));

        await waitFor(() =>
            expect(
                screen.getByRole("heading", {name: "Second"}),
            ).toBeInTheDocument(),
        );
        expect(
            requests.filter((request) => request.path.includes("dismiss")),
        ).toEqual([{method: "PUT", path: "internalapi/usernews/7/dismiss"}]);

        fireEvent.click(screen.getByRole("button", {name: "OK"}));
        await waitFor(() =>
            expect(
                requests.filter((request) => request.path.includes("dismiss")),
            ).toHaveLength(2),
        );
    });

    it("should show the news dialog and acknowledge it when it is closed", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/news/forcurrentversion", [
            {
                forCurrentVersion: true,
                forNewerVersion: false,
                news: "<p>New stuff</p><script>window.hacked = true;</script>",
                version: "v7.0.0",
            },
        ]);
        route("internalapi/news/saveshown", {}, "PUT");
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        storage("outOfMemoryDetected", false);
        storage("showOpenToInternetWithoutAuth", false);
        storage("belowJava17", false);
        storage("FAILED_BACKUP", null);

        renderChecks();

        const dialog = await screen.findByTestId("news-dialog");
        expect(dialog).toHaveTextContent("New stuff");
        expect(dialog.querySelector("script")).toBeNull();
        expect(
            requests.some((request) => request.path.endsWith("news/saveshown")),
        ).toBe(false);

        fireEvent.click(screen.getByRole("button", {name: "Close"}));

        await waitFor(() =>
            expect(
                requests.some((request) =>
                    request.path.endsWith("news/saveshown"),
                ),
            ).toBe(true),
        );
    });

    it("should warn about an expiring indexer by toast", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/news/forcurrentversion", []);
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        storage("outOfMemoryDetected", false);
        storage("showOpenToInternetWithoutAuth", false);
        storage("belowJava17", false);
        storage("FAILED_BACKUP", null);

        renderChecks({
            safeConfig: {
                indexers: [{name: "Gone", vipExpirationDate: "2001-01-01"}],
                showNews: true,
            },
        });

        expect(
            await screen.findByText(
                "VIP access for indexer Gone expired on 2001-01-01",
            ),
        ).toBeInTheDocument();
    });

    it("should warn about every expiring indexer at once", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/news/forcurrentversion", []);
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        storage("outOfMemoryDetected", false);
        storage("showOpenToInternetWithoutAuth", false);
        storage("belowJava17", false);
        storage("FAILED_BACKUP", null);

        renderChecks({
            safeConfig: {
                indexers: [
                    {name: "Gone", vipExpirationDate: "2001-01-01"},
                    {name: "Going", vipExpirationDate: "2001-02-02"},
                ],
                showNews: true,
            },
        });

        // Legacy's growl stacked one warning per indexer; the shared toast
        // service does too, instead of the second replacing the first.
        expect(
            await screen.findByText(
                "VIP access for indexer Gone expired on 2001-01-01",
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "VIP access for indexer Going expired on 2001-02-02",
            ),
        ).toBeInTheDocument();
        expect(screen.getAllByTestId("toast")).toHaveLength(2);
    });

    it("should show a raised admin warning once and clear it on acknowledgement", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/news/forcurrentversion", []);
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        storage("outOfMemoryDetected", true);
        storage("showOpenToInternetWithoutAuth", false);
        storage("belowJava17", false);
        storage("FAILED_BACKUP", null);

        renderChecks();

        const dialog = await screen.findByTestId("startup-check-dialog");
        expect(dialog).toHaveTextContent("ran out of memory");
        expect(
            requests.some(
                (request) =>
                    request.method === "PUT" &&
                    request.path.includes("outOfMemoryDetected"),
            ),
        ).toBe(false);

        fireEvent.click(screen.getByRole("button", {name: "OK"}));

        await waitFor(() =>
            expect(
                requests.some(
                    (request) =>
                        request.method === "PUT" &&
                        request.path.includes("outOfMemoryDetected"),
                ),
            ).toBe(true),
        );
    });

    it("should render the failed backup record's message and time", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/news/forcurrentversion", []);
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        storage("outOfMemoryDetected", false);
        storage("showOpenToInternetWithoutAuth", false);
        storage("belowJava17", false);
        storage("FAILED_BACKUP", {
            message: "General error: database corrupt",
            shown: false,
            time: "2026-08-20T03:00:00",
        });

        renderChecks();

        const dialog = await screen.findByTestId("startup-check-dialog");
        expect(dialog).toHaveTextContent("General error: database corrupt");
        expect(dialog).toHaveTextContent("2026-08-20T03:00:00");
    });

    it("should offer the wrapper warning as a link, acknowledged on OK", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/news/forcurrentversion", []);
        route("internalapi/updates/isDisplayWrapperOutdated", true);
        route(
            "internalapi/updates/setOutdatedWrapperDetectedWarningShown",
            undefined,
            "PUT",
        );
        storage("outOfMemoryDetected", false);
        storage("showOpenToInternetWithoutAuth", false);
        storage("belowJava17", false);
        storage("FAILED_BACKUP", null);

        renderChecks();

        const dialog = await screen.findByTestId("startup-check-dialog");
        expect(dialog).toHaveTextContent("Outdated wrappers detected");
        expect(
            screen.getByRole("link", {name: "download the latest version"}),
        ).toHaveAttribute(
            "href",
            "https://github.com/theotherp/nzbhydra2/releases/latest",
        );

        fireEvent.click(screen.getByRole("button", {name: "OK"}));

        await waitFor(() =>
            expect(
                requests.some((request) =>
                    request.path.endsWith(
                        "setOutdatedWrapperDetectedWarningShown",
                    ),
                ),
            ).toBe(true),
        );
    });

    it("should send no admin-only request for a non-admin session", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);

        renderChecks({maySeeAdmin: false});

        await waitFor(() =>
            expect(
                requests.some((request) =>
                    request.path.startsWith("internalapi/usernews"),
                ),
            ).toBe(true),
        );

        expect(
            requests.filter(
                (request) =>
                    request.path.includes("genericstorage") ||
                    request.path.includes("isDisplayWrapperOutdated") ||
                    request.path.includes("news/forcurrentversion"),
            ),
        ).toEqual([]);
    });

    it("should run the sequence once, not again on a re-render", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/news/forcurrentversion", []);
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        storage("outOfMemoryDetected", false);
        storage("showOpenToInternetWithoutAuth", false);
        storage("belowJava17", false);
        storage("FAILED_BACKUP", null);

        const {rerender} = renderChecks();
        await waitFor(() =>
            expect(
                requests.some((request) =>
                    request.path.includes("FAILED_BACKUP"),
                ),
            ).toBe(true),
        );
        const requestCount = requests.length;

        rerender(
            <ThemeProvider theme={createHydraTheme("grey")}>
                <ToastProvider>
                    <StartupChecks
                        bootstrap={bootstrap}
                        transport={
                            new ApiTransport("/hydra/", fetchImplementation)
                        }
                    />
                </ToastProvider>
            </ThemeProvider>,
        );

        expect(requests).toHaveLength(requestCount);
    });
});
