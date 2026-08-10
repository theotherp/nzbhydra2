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
    it("should render the migration scaffold", async () => {
        window.history.pushState({}, "", "/hydra/stats/stats?period=day");
        render(<App bootstrap={bootstrap} />);

        expect(
            await screen.findByRole("heading", {
                name: "React migration placeholder",
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", {name: "Switch to legacy UI"}),
        ).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/ui/legacy?redirect=%2Fstats%2Fstats%3Fperiod%3Dday",
        );
    });

    it("should render the application loading convention", () => {
        render(<App bootstrap={bootstrap} isLoading />);

        const status = screen.getByRole("status");
        expect(status).toHaveTextContent("Loading…");
        expect(status).toContainElement(screen.getByRole("progressbar"));
        expect(screen.getByText("Loading…")).toBeVisible();
    });
});
