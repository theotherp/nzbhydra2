import {ThemeProvider} from "@mui/material/styles";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import {createHydraTheme} from "../../../app/theme";
import {IndexerStatusesPage} from "./IndexerStatusesPage";
import {vipWarning} from "./vipWarning";

const bootstrap = {
    baseUrl: "/",
    username: "stats",
    authType: null,
    showLogout: true,
    maySeeSearch: true,
    adminRestricted: true,
    statsRestricted: true,
    maySeeStats: true,
    searchRestricted: true,
    maySeeDetailsDl: false,
    maySeeAdmin: false,
    authConfigured: true,
    showIndexerSelection: false,
    safeConfig: {keepHistory: true},
    serverTimeZone: "UTC",
};

// Slower than Loading's 300ms delay so the placeholder tests below can
// observe it before the query settles (FM-144).
function delayed<T>(value: T, ms = 350): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(value), ms);
    });
}

function renderPage(
    loadStatuses: Parameters<typeof IndexerStatusesPage>[0]["loadStatuses"],
) {
    return render(
        <ThemeProvider theme={createHydraTheme()}>
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                <IndexerStatusesPage
                    bootstrap={bootstrap}
                    loadStatuses={loadStatuses}
                />
            </QueryClientProvider>
        </ThemeProvider>,
    );
}

function statusRow(table: HTMLElement, indexer: string): HTMLElement {
    return within(table).getByRole("row", {name: new RegExp(indexer)});
}

describe("IndexerStatusesPage", () => {
    afterEach(cleanup);
    it("should render loading, partial data, status semantics, limits, resets, and VIP warnings", async () => {
        renderPage(() =>
            delayed({
                malformedCount: 1,
                statuses: [
                    {
                        indexer: "Alpha",
                        state: "ENABLED",
                        apiHits: 3,
                        downloadHits: 0,
                    },
                    {
                        indexer: "Bravo",
                        state: "DISABLED_SYSTEM_TEMPORARY",
                        disabledUntil: "2025-01-02T00:00:00Z",
                        lastError: "Quota",
                        apiHits: 4,
                        apiHitLimit: 5,
                        downloadHits: 1,
                        downloadHitLimit: 2,
                        apiResetTime: "2025-01-03T00:00:00Z",
                        downloadResetTime: "2025-01-04T00:00:00Z",
                        vipExpirationDate: "2025-01-01",
                    },
                    {
                        indexer: "Charlie",
                        state: "DISABLED_SYSTEM",
                        apiHits: 0,
                        apiHitLimit: 3,
                        downloadHits: 2,
                        downloadHitLimit: 4,
                        downloadResetTime: "2025-01-05T00:00:00Z",
                    },
                    {indexer: "Delta", state: "DISABLED_USER"},
                ],
            }),
        );
        expect(await screen.findByRole("status")).toHaveTextContent(
            "Loading indexer statuses…",
        );
        const table = await screen.findByRole("table", {
            name: "Indexer statuses",
        });
        expect(table).toHaveTextContent("Enabled");
        expect(table).toHaveTextContent("Temporarily disabled by system");
        expect(table).toHaveTextContent("Disabled by system");
        expect(table).toHaveTextContent("Disabled by user");
        expect(table.getElementsByTagName("tr")[2]).toHaveTextContent("4/5");
        expect(table.getElementsByTagName("tr")[2]).toHaveTextContent("1/2");
        expect(table.getElementsByTagName("tr")[3]).toHaveTextContent("0/3");
        expect(table.getElementsByTagName("tr")[3]).toHaveTextContent("2/4");
        expect(table.getElementsByTagName("tr")[2]).toHaveTextContent(
            "Jan 3, 2025",
        );
        expect(table.getElementsByTagName("tr")[3]).toHaveTextContent(
            "Jan 5, 2025",
        );
        expect(
            within(statusRow(table, "Bravo")).getAllByRole("cell")[2],
        ).toHaveTextContent(/^Jan 2, 2025, 12:00 AM$/);
        expect(
            within(statusRow(table, "Charlie")).getAllByRole("cell")[2],
        ).toBeEmptyDOMElement();
        expect(
            within(statusRow(table, "Delta")).getAllByRole("cell")[2],
        ).toBeEmptyDOMElement();
        expect(screen.getByRole("alert")).toHaveTextContent("malformed");
        expect(screen.getByLabelText("VIP access expired")).toBeVisible();
    });

    it("should render raw and absent hit counts and API/download reset combinations", async () => {
        renderPage(async () => ({
            malformedCount: 0,
            statuses: [
                {
                    indexer: "Raw counts",
                    state: "ENABLED",
                    apiHits: 3,
                    downloadHits: 0,
                },
                {indexer: "Absent counts", state: "ENABLED"},
                {
                    indexer: "Both resets",
                    state: "ENABLED",
                    apiResetTime: "2025-01-03T00:00:00Z",
                    downloadResetTime: "2025-01-04T00:00:00Z",
                },
                {
                    indexer: "API reset only",
                    state: "ENABLED",
                    apiResetTime: "2025-01-05T00:00:00Z",
                },
                {
                    indexer: "Download reset only",
                    state: "ENABLED",
                    downloadResetTime: "2025-01-06T00:00:00Z",
                },
            ],
        }));

        const table = await screen.findByRole("table", {
            name: "Indexer statuses",
        });
        const rawCounts = within(statusRow(table, "Raw counts")).getAllByRole(
            "cell",
        );
        expect(rawCounts[4]).toHaveTextContent(/^3$/);
        expect(rawCounts[5]).toHaveTextContent(/^0$/);

        const absentCounts = within(
            statusRow(table, "Absent counts"),
        ).getAllByRole("cell");
        expect(absentCounts[4]).toBeEmptyDOMElement();
        expect(absentCounts[5]).toBeEmptyDOMElement();

        expect(
            within(statusRow(table, "Both resets")).getAllByRole("cell")[6],
        ).toHaveTextContent(/^Jan 3, 2025, 12:00 AM\/Jan 4, 2025, 12:00 AM$/);
        expect(
            within(statusRow(table, "API reset only")).getAllByRole("cell")[6],
        ).toHaveTextContent(/^Jan 5, 2025, 12:00 AM$/);
        expect(
            within(statusRow(table, "Download reset only")).getAllByRole(
                "cell",
            )[6],
        ).toHaveTextContent(/^Jan 6, 2025, 12:00 AM$/);
    });

    it("should render the backend's explicit nulls as empty cells", async () => {
        // Jackson emits every unset field as null, so the page must never show
        // "null" or "Invalid Date" for one.
        renderPage(async () => ({
            malformedCount: 0,
            statuses: [
                {
                    indexer: "Nulled",
                    state: "ENABLED" as const,
                    disabledUntil: null,
                    lastError: null,
                    apiResetTime: null,
                    downloadResetTime: null,
                    apiHits: 3,
                    apiHitLimit: null,
                    downloadHits: null,
                    downloadHitLimit: null,
                    vipExpirationDate: null,
                },
            ],
        }));
        const table = await screen.findByRole("table", {
            name: "Indexer statuses",
        });
        expect(table).not.toHaveTextContent("null");
        expect(table).not.toHaveTextContent("Invalid Date");
        const cells = within(statusRow(table, "Nulled")).getAllByRole("cell");
        expect(cells[2]).toBeEmptyDOMElement();
        expect(cells[3]).toBeEmptyDOMElement();
        expect(cells[4]).toHaveTextContent(/^3$/);
        expect(cells[5]).toBeEmptyDOMElement();
        expect(cells[6]).toBeEmptyDOMElement();
        expect(cells[7]).toBeEmptyDOMElement();
    });

    it("should render a configured zero limit rather than dropping it", async () => {
        renderPage(async () => ({
            malformedCount: 0,
            statuses: [
                {
                    indexer: "Zeroed",
                    state: "ENABLED" as const,
                    apiHits: 0,
                    apiHitLimit: 0,
                    downloadHits: 2,
                    downloadHitLimit: 0,
                },
            ],
        }));
        const table = await screen.findByRole("table", {
            name: "Indexer statuses",
        });
        const cells = within(statusRow(table, "Zeroed")).getAllByRole("cell");
        expect(cells[4]).toHaveTextContent(/^0\/0$/);
        expect(cells[5]).toHaveTextContent(/^2\/0$/);
    });

    it("should render intentional empty and request failure states", async () => {
        renderPage(async () => ({
            statuses: [],
            malformedCount: 0,
        }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "No indexer statuses",
        );
        cleanup();
        renderPage(async () => {
            throw new Error("offline");
        });
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Unable to load indexer statuses.",
        );
    });

    it("never shows the placeholder when the query resolves faster than its delay (FM-144)", async () => {
        renderPage(async () => ({statuses: [], malformedCount: 0}));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "No indexer statuses",
        );
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        // Even once Loading's own delay would otherwise have elapsed, nothing
        // status-shaped ever mounted -- the fast query already replaced it.
        await new Promise((resolve) => setTimeout(resolve, 350));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("should calculate expiry warnings and ignore lifetime values", () => {
        const now = new Date("2025-01-01T12:00:00Z");
        expect(vipWarning("2024-12-31", "UTC", now)).toBe("VIP access expired");
        expect(vipWarning("2025-01-05", "UTC", now)).toBe(
            "VIP access will expire in the next 7 days",
        );
        expect(vipWarning("2025-01-09", "UTC", now)).toBeUndefined();
        expect(vipWarning("Lifetime", "UTC", now)).toBeUndefined();
        expect(vipWarning("not-a-date", "UTC", now)).toBeUndefined();
    });
});
