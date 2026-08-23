import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {App} from "./App";

const bootstrap = {
    username: null,
    authType: null,
    showLogout: false,
    maySeeSearch: false,
    adminRestricted: false,
    statsRestricted: false,
    maySeeStats: false,
    searchRestricted: false,
    maySeeDetailsDl: false,
    maySeeAdmin: false,
    authConfigured: false,
    showIndexerSelection: false,
    safeConfig: {},
    baseUrl: "/hydra/",
    serverTimeZone: null,
};

describe("App", () => {
    it("should render an unknown-route notice with no way out of React", async () => {
        // FM-024 migrates `/stats/stats` (the aggregate dashboard); any other
        // `/stats/<tab>` still falls through the stats shell's own fallback
        // route to this notice, which is what this test exercises.
        window.history.pushState({}, "", "/hydra/stats/other?period=day");
        render(<App bootstrap={bootstrap} />);

        expect(
            await screen.findByRole("heading", {
                name: "Page not found",
            }),
        ).toBeInTheDocument();
        // FM-095: the legacy shell and its selector endpoints are gone, so the
        // notice must offer no escape hatch onto them -- an `/ui/legacy` link
        // here would now be a link to a 404.
        expect(screen.queryByRole("link", {name: /legacy/i})).toBeNull();
        expect(
            Array.from(document.querySelectorAll("a[href]")).map((anchor) =>
                anchor.getAttribute("href"),
            ),
        ).not.toContainEqual(expect.stringContaining("ui/legacy"));
    });

    it("should render the application loading convention", () => {
        render(<App bootstrap={bootstrap} isLoading />);

        const status = screen.getByRole("status");
        expect(status).toHaveTextContent("Loading…");
        expect(status).toContainElement(screen.getByRole("progressbar"));
        expect(screen.getByText("Loading…")).toBeVisible();
    });
});
