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
    it("should render the migration scaffold", () => {
        window.history.pushState({}, "", "/hydra/stats/stats?period=day");
        render(<App bootstrap={bootstrap} />);

        expect(
            screen.getByRole("heading", {name: "NZBHydra2"}),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", {name: "Switch to legacy UI"}),
        ).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/ui/legacy?redirect=%2Fstats%2Fstats%3Fperiod%3Dday",
        );
    });
});
