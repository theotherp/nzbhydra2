import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import type {BootstrapData, SafeConfig} from "../../../bootstrap";
import {SystemAboutTab} from "./SystemAboutTab";

function bootstrapWith(safeConfig: SafeConfig): BootstrapData {
    return {
        adminRestricted: false,
        authConfigured: false,
        authType: null,
        baseUrl: "/hydra/",
        maySeeAdmin: true,
        maySeeDetailsDl: true,
        maySeeSearch: true,
        maySeeStats: true,
        safeConfig,
        searchRestricted: false,
        serverTimeZone: null,
        showIndexerSelection: false,
        showLogout: false,
        statsRestricted: false,
        username: null,
    };
}

function renderAboutTab(infos: unknown, safeConfig: SafeConfig = {}) {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(infos), {
            headers: {"Content-Type": "application/json"},
        }),
    );
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                <SystemAboutTab
                    bootstrap={bootstrapWith(safeConfig)}
                    transport={new ApiTransport("/hydra/", fetchImplementation)}
                />
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return fetchImplementation;
}

afterEach(() => cleanup());

describe("SystemAboutTab", () => {
    it("should show the version without a package block for a plain installation", async () => {
        const fetchImplementation = renderAboutTab({currentVersion: "9.0.0"});

        const about = await screen.findByTestId("system-about");
        await waitFor(() =>
            expect(about).toHaveTextContent(/Version:\s*9\.0\.0/),
        );
        expect(about).not.toHaveTextContent("Container version:");
        expect(about).not.toHaveTextContent("Container author:");
        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/updates/simpleInfos",
            expect.objectContaining({method: "GET"}),
        );
    });

    it("should show the package block for a packaged installation", async () => {
        renderAboutTab({
            currentVersion: "9.0.0",
            packageInfo: {
                author: "hotio",
                releaseType: "docker",
                version: "9.0.0-1",
            },
        });

        const about = await screen.findByTestId("system-about");
        await waitFor(() =>
            expect(about).toHaveTextContent(/Container version:\s*9\.0\.0-1/),
        );
        expect(about).toHaveTextContent(/Container release type:\s*docker/);
        expect(about).toHaveTextContent(/Container author:\s*hotio/);
    });

    it("should route external links through the configured dereferer", async () => {
        renderAboutTab(
            {currentVersion: "9.0.0"},
            {dereferer: "https://dereferer.test/?$s"},
        );

        expect(
            await screen.findByRole("link", {name: "join the Discord channel"}),
        ).toHaveAttribute(
            "href",
            `https://dereferer.test/?${encodeURIComponent("https://discord.gg/uh9W3rd")}`,
        );
        expect(
            screen.getByRole("link", {name: "GitHub sponsors"}),
        ).toHaveAttribute(
            "href",
            `https://dereferer.test/?${encodeURIComponent("https://github.com/sponsors/theotherp")}`,
        );
        // A mail link is not an external http(s) target and stays untouched.
        expect(screen.getByRole("link", {name: "mail"})).toHaveAttribute(
            "href",
            "mailto:theotherp@posteo.net",
        );
    });

    it("should serve the sponsor image from the React bundle", async () => {
        renderAboutTab({currentVersion: "9.0.0"});

        const image = await screen.findByRole("img", {name: "Newsgroup Ninja"});
        expect(image.getAttribute("src")).toContain("newsgroup-ninja.png");
        expect(image.getAttribute("src")).not.toContain("static/img");
    });

    it("should report a failed program-info request without losing the page", async () => {
        const fetchImplementation = vi
            .fn<typeof fetch>()
            .mockRejectedValue(new Error("network down"));
        render(
            <ThemeProvider theme={createHydraTheme("grey")}>
                <QueryClientProvider
                    client={
                        new QueryClient({
                            defaultOptions: {queries: {retry: false}},
                        })
                    }
                >
                    <SystemAboutTab
                        bootstrap={bootstrapWith({})}
                        transport={
                            new ApiTransport("/hydra/", fetchImplementation)
                        }
                    />
                </QueryClientProvider>
            </ThemeProvider>,
        );

        expect(
            await screen.findByText("Unable to load the program information."),
        ).toBeVisible();
        expect(screen.getByText("License")).toBeVisible();
    });
});
