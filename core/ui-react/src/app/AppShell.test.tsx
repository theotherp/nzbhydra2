import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {AppShell} from "./AppShell";

const bootstrap = {
    username: null,
    authType: null,
    showLogout: false,
    maySeeSearch: false,
    adminRestricted: true,
    statsRestricted: true,
    maySeeStats: false,
    searchRestricted: false,
    maySeeDetailsDl: false,
    maySeeAdmin: false,
    authConfigured: true,
    showIndexerSelection: false,
    safeConfig: {keepHistory: true},
    baseUrl: "/hydra/",
    serverTimeZone: null,
};

describe("AppShell", () => {
    it("should render only routes permitted to an anonymous user", () => {
        render(
            <AppShell bootstrap={bootstrap}>
                <p>Page content</p>
            </AppShell>,
        );

        expect(screen.getByRole("link", {name: "Search"})).toHaveAttribute(
            "href",
            "/hydra/",
        );
        expect(
            screen.queryByRole("link", {name: "History & Stats"}),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("link", {name: "Config"}),
        ).not.toBeInTheDocument();
        expect(screen.getByText("Page content")).toBeInTheDocument();
    });
});
