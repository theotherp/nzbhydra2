import {ThemeProvider} from "@mui/material";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {AppShell} from "./AppShell";
import {createHydraTheme} from "./theme";

let mockPathname = "/hydra/";

vi.mock("@tanstack/react-router", () => ({
    useLocation: ({
        select,
    }: {
        select: (location: {pathname: string}) => string;
    }) => select({pathname: mockPathname}),
}));

afterEach(cleanup);
beforeEach(() => {
    mockPathname = "/hydra/";
});

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

    it("should render the desktop navigation items in a horizontal row", () => {
        render(
            <AppShell bootstrap={{...bootstrap, adminRestricted: false}}>
                <p>Page content</p>
            </AppShell>,
        );

        const navigationList = screen.getByRole("list", {
            name: "Main navigation",
        });
        const computedStyle = window.getComputedStyle(navigationList);
        expect(computedStyle.display).toBe("flex");
        expect(computedStyle.flexDirection).toBe("row");

        const items = within(navigationList).getAllByRole("link");
        expect(items.length).toBeGreaterThan(1);
        for (const item of items) {
            expect(window.getComputedStyle(item).width).not.toBe("100%");
        }
    });

    it("should render the NZBHydra logo with a non-empty accessible name", () => {
        render(
            <AppShell bootstrap={bootstrap}>
                <p>Page content</p>
            </AppShell>,
        );

        const logo = screen.getByRole("img", {name: "NZBHydra2"});
        expect(logo).toBeInTheDocument();
        expect(logo.getAttribute("alt")).toBe("NZBHydra2");
    });

    it("should mark the current route's nav item with the branded primary-green active indicator", () => {
        mockPathname = "/hydra/stats/indexers";
        render(
            <ThemeProvider theme={createHydraTheme("dark", false)}>
                <AppShell
                    bootstrap={{
                        ...bootstrap,
                        adminRestricted: false,
                        statsRestricted: false,
                    }}
                >
                    <p>Page content</p>
                </AppShell>
            </ThemeProvider>,
        );

        // Real, non-vacuous evidence that the theme's `primary.main`
        // (#0fab4b) is genuinely rendered as an interactive affordance, not
        // just declared in theme.ts: the active item's own computed border
        // color resolves to the theme's actual green, and the inactive item
        // does not get it.
        const activeLink = screen.getByRole("link", {name: "History & Stats"});
        expect(activeLink).toHaveAttribute("aria-current", "page");
        expect(window.getComputedStyle(activeLink).borderBottomColor).toMatch(
            /rgb\(\s*15,\s*171,\s*75\s*\)/,
        );

        const inactiveLink = screen.getByRole("link", {name: "Search"});
        expect(inactiveLink).not.toHaveAttribute("aria-current");
        expect(
            window.getComputedStyle(inactiveLink).borderBottomColor,
        ).not.toMatch(/rgb\(\s*15,\s*171,\s*75\s*\)/);
    });
});
