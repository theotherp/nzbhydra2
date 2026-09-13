import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {ToastProvider} from "../../components/toasts/ToastProvider";
import {createHydraTheme} from "../theme";
import {UpdateFooterBanners} from "./UpdateFooterBanners";

type Backend = {
    fetch: ReturnType<typeof vi.fn<typeof fetch>>;
    requests: {method: string; path: string}[];
};

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
    });
}

function createBackend(
    infos: Record<string, unknown>,
    automaticHistory: unknown[] = [],
): Backend {
    const backend: Backend = {fetch: vi.fn<typeof fetch>(), requests: []};
    backend.fetch.mockImplementation(async (input, init) => {
        const path = new URL(String(input)).pathname;
        const method = init?.method ?? "GET";
        backend.requests.push({method, path});
        if (path.endsWith("/updates/infos")) {
            return jsonResponse(infos);
        }
        if (path.endsWith("/updates/automaticUpdateVersionHistory")) {
            return jsonResponse(automaticHistory);
        }
        if (path.endsWith("/updates/ackAutomaticUpdateVersionHistory")) {
            return jsonResponse(null);
        }
        if (path.includes("/updates/ignore/")) {
            return jsonResponse(null);
        }
        if (path.includes("/updates/changesSince/")) {
            return jsonResponse([]);
        }
        return jsonResponse(null);
    });
    return backend;
}

const bootstrap: BootstrapData = {
    adminRestricted: false,
    authConfigured: false,
    authType: null,
    baseUrl: "/hydra/",
    maySeeAdmin: true,
    maySeeDetailsDl: true,
    maySeeSearch: true,
    maySeeStats: true,
    safeConfig: null,
    searchRestricted: false,
    serverTimeZone: null,
    showIndexerSelection: true,
    showLogout: false,
    statsRestricted: false,
    username: null,
};
const nonAdminBootstrap: BootstrapData = {...bootstrap, maySeeAdmin: false};

function renderBanners(
    backend: Backend,
    forBootstrap: BootstrapData = bootstrap,
) {
    vi.stubGlobal("fetch", backend.fetch);
    const onHeightChange = vi.fn();
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <UpdateFooterBanners
                        bootstrap={forBootstrap}
                        onHeightChange={onHeightChange}
                        transport={new ApiTransport("/hydra/", backend.fetch)}
                    />
                </ToastProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return {onHeightChange, queryClient};
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("UpdateFooterBanners", () => {
    it("should fetch nothing and render no banner region for a non-admin session", async () => {
        const backend = createBackend({
            currentVersion: "9.0.0",
            latestVersion: "9.1.0",
            updateAvailable: true,
        });

        renderBanners(backend, nonAdminBootstrap);
        await Promise.resolve();

        expect(backend.requests).toEqual([]);
        expect(screen.queryByTestId("update-footer")).toBeNull();
        expect(screen.queryByTestId("automatic-update-footer")).toBeNull();
    });

    it("should render the normal update banner with the exact sentence and buttons", async () => {
        renderBanners(
            createBackend({
                currentVersion: "9.0.0",
                latestVersion: "9.1.0",
                latestVersionIsBeta: true,
                updateAvailable: true,
            }),
        );

        expect(await screen.findByTestId("update-footer")).toBeVisible();
        expect(
            screen.getByText(
                "An update is available. Your version: 9.0.0. Latest version: 9.1.0 Beta.",
            ),
        ).toBeVisible();
        expect(screen.getByTestId("update-footer-changelog")).toBeVisible();
        expect(screen.getByTestId("update-footer-ignore")).toBeVisible();
        expect(screen.getByTestId("update-footer-install")).toBeVisible();
    });

    it("should render the externally-updated variant without an install button", async () => {
        renderBanners(
            createBackend({
                currentVersion: "9.0.0",
                latestVersion: "9.1.0",
                showUpdateBannerOnUpdatedExternally: true,
                updateAvailable: true,
                updatedExternally: true,
            }),
        );

        expect(await screen.findByTestId("update-footer")).toBeVisible();
        expect(
            screen.getByText(
                "An update is available. Your version: 9.0.0. Latest version: 9.1.0. Your NZBHydra instance seems to run in docker or is installed via a package manager. Please update this instance accordingly.",
            ),
        ).toBeVisible();
        expect(screen.getByTestId("update-footer-changelog")).toBeVisible();
        expect(screen.getByTestId("update-footer-ignore")).toBeVisible();
        expect(screen.queryByTestId("update-footer-install")).toBeNull();
    });

    it("should withdraw the banner entirely for an externally-updated instance whose banner setting is off", async () => {
        const backend = createBackend({
            currentVersion: "9.0.0",
            latestVersion: "9.1.0",
            showUpdateBannerOnUpdatedExternally: false,
            updateAvailable: true,
            updatedExternally: true,
        });
        const {onHeightChange, queryClient} = renderBanners(backend);

        await vi.waitFor(() =>
            expect(
                queryClient.getQueryData(["update-footer-infos"]),
            ).toBeDefined(),
        );

        expect(screen.queryByTestId("update-footer")).toBeNull();
        expect(onHeightChange).toHaveBeenCalledWith(0);
    });

    it("should ignore the update, hiding the banner for this load and PUTting the latest version", async () => {
        const backend = createBackend({
            currentVersion: "9.0.0",
            latestVersion: "9.1.0",
            updateAvailable: true,
        });
        renderBanners(backend);

        fireEvent.click(await screen.findByTestId("update-footer-ignore"));

        expect(screen.queryByTestId("update-footer")).toBeNull();
        await vi.waitFor(() =>
            expect(
                backend.requests.some(
                    (request) =>
                        request.method === "PUT" &&
                        request.path.endsWith("/updates/ignore/9.1.0"),
                ),
            ).toBe(true),
        );
    });

    it("should render the automatic-update notice and dismiss it with an acknowledgement", async () => {
        const backend = createBackend({
            automaticUpdateToNotice: "9.0.0",
            currentVersion: "9.0.0",
            latestVersion: "9.0.0",
            showWhatsNewBanner: true,
        });
        renderBanners(backend);

        const notice = await screen.findByTestId("automatic-update-footer");
        expect(notice).toBeVisible();
        expect(
            screen.getByText("An update was automatically installed."),
        ).toBeVisible();

        fireEvent.click(screen.getByRole("button", {name: "See what's new!"}));
        expect(
            await screen.findByTestId(
                "automatic-update-footer-changelog-dialog",
            ),
        ).toBeVisible();

        // The open dialog `aria-hide`s the rest of the page, so its own
        // "Great!" close has to be clicked first before the notice's own
        // dismiss button is reachable again.
        fireEvent.click(screen.getByRole("button", {name: "Great!"}));
        await vi.waitFor(() =>
            expect(
                screen.queryByTestId(
                    "automatic-update-footer-changelog-dialog",
                ),
            ).toBeNull(),
        );

        fireEvent.click(screen.getByRole("button", {name: "Close"}));

        expect(screen.queryByTestId("automatic-update-footer")).toBeNull();
        await vi.waitFor(() =>
            expect(
                backend.requests.some(
                    (request) =>
                        request.method === "GET" &&
                        request.path.endsWith(
                            "/updates/ackAutomaticUpdateVersionHistory",
                        ),
                ),
            ).toBe(true),
        );
    });

    it("should not show the automatic notice when showWhatsNewBanner is false", async () => {
        const {queryClient} = renderBanners(
            createBackend({
                automaticUpdateToNotice: "9.0.0",
                currentVersion: "9.0.0",
                latestVersion: "9.0.0",
                showWhatsNewBanner: false,
            }),
        );

        await vi.waitFor(() =>
            expect(
                queryClient.getQueryData(["update-footer-infos"]),
            ).toBeDefined(),
        );
        expect(screen.queryByTestId("automatic-update-footer")).toBeNull();
    });

    it("should stack both banners at once without either replacing the other", async () => {
        renderBanners(
            createBackend({
                automaticUpdateToNotice: "9.0.0",
                currentVersion: "9.0.0",
                latestVersion: "9.1.0",
                showWhatsNewBanner: true,
                updateAvailable: true,
            }),
        );

        expect(await screen.findByTestId("update-footer")).toBeVisible();
        expect(screen.getByTestId("automatic-update-footer")).toBeVisible();
    });
});
