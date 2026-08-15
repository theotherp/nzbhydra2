import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {StatsShell} from "./StatsShell";

vi.mock("@tanstack/react-router", () => ({
    useLocation: ({
        select,
    }: {
        select: (location: {pathname: string}) => string;
    }) => select({pathname: "/stats/indexers"}),
}));

describe("StatsShell", () => {
    it("should hide keep-history tabs when history is disabled", () => {
        render(
            <StatsShell
                bootstrap={{
                    baseUrl: "/hydra/",
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
                    safeConfig: {keepHistory: false},
                    serverTimeZone: "UTC",
                }}
            >
                <div>Indexer content</div>
            </StatsShell>,
        );

        expect(
            screen.getByRole("tab", {name: "Indexer statuses"}),
        ).toBeVisible();
        expect(
            screen.getByRole("tab", {name: "Notification history"}),
        ).toBeVisible();
        expect(
            screen.queryByRole("tab", {name: "Search history"}),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("tab", {name: "Saved searches"}),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("tab", {name: "Download history"}),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("tab", {name: "Stats"}),
        ).not.toBeInTheDocument();
    });
});
