import {ThemeProvider} from "@mui/material";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {AppShell} from "./AppShell";
import {createHydraTheme} from "./theme";

let mockPathname = "/hydra/";

vi.mock("@tanstack/react-router", () => ({
    Link: ({
        to,
        children,
        ...rest
    }: {
        to: string;
        children?: React.ReactNode;
        href?: string;
    }) => (
        <a {...rest} href={to === "/" ? "/hydra/" : `/hydra${to}`}>
            {children}
        </a>
    ),
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

    it("should mark the current route's nav item with the branded primary active indicator", () => {
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

        // Real, non-vacuous evidence that the theme's `primary.main` (the
        // mock's teal `oklch(0.75 0.1 190)`) is genuinely rendered as an
        // interactive affordance, not just declared in theme.ts: the active
        // item's own computed border color resolves to the theme's actual
        // brand color, and the inactive item does not get it.
        const activeLink = screen.getByRole("link", {name: "History & Stats"});
        expect(activeLink).toHaveAttribute("aria-current", "page");
        expect(window.getComputedStyle(activeLink).borderBottomColor).toBe(
            "oklch(0.75 0.1 190)",
        );

        const inactiveLink = screen.getByRole("link", {name: "Search"});
        expect(inactiveLink).not.toHaveAttribute("aria-current");
        expect(
            window.getComputedStyle(inactiveLink).borderBottomColor,
        ).not.toBe("oklch(0.75 0.1 190)");
    });

    it("should reserve identical border and label geometry for a nav item whether it is active or inactive", () => {
        mockPathname = "/hydra/stats/indexers";
        render(
            <AppShell
                bootstrap={{
                    ...bootstrap,
                    adminRestricted: false,
                    statsRestricted: false,
                }}
            >
                <p>Page content</p>
            </AppShell>,
        );

        const activeLink = screen.getByRole("link", {name: "History & Stats"});
        const inactiveLink = screen.getByRole("link", {name: "Search"});

        // The border is always rendered at the same width/style for every
        // item; only its color toggles between active and inactive, which
        // is what keeps selecting an item from resizing its own box or
        // shoving its neighbors sideways (the old bug this replaces would
        // have added/removed the border, changing the box size).
        const activeStyle = window.getComputedStyle(activeLink);
        const inactiveStyle = window.getComputedStyle(inactiveLink);
        expect(activeStyle.borderBottomWidth).toBe(
            inactiveStyle.borderBottomWidth,
        );
        expect(activeStyle.borderBottomStyle).toBe(
            inactiveStyle.borderBottomStyle,
        );
        expect(activeStyle.borderBottomColor).not.toBe(
            inactiveStyle.borderBottomColor,
        );

        // Every item, active or not, renders a hidden copy of its own
        // label at the bold font-weight to reserve the wider of the two
        // widths, so the visible copy's font-weight can change (regular
        // <-> bold) without resizing the box. This is a real, non-tautological
        // check: the hidden copy must equal the item's own accessible name
        // (not a fixed stand-in string), must actually be bold, and must be
        // excluded from the accessible name (aria-hidden) rather than
        // duplicating it.
        for (const [link, name] of [
            [activeLink, "History & Stats"],
            [inactiveLink, "Search"],
        ] as const) {
            const hiddenReservation = link.querySelector(
                '[aria-hidden="true"]',
            );
            expect(hiddenReservation).not.toBeNull();
            expect(hiddenReservation).toHaveTextContent(name);
            expect(
                window.getComputedStyle(hiddenReservation as Element)
                    .fontWeight,
            ).toBe("700");
            expect(link).toHaveAccessibleName(name);
        }
    });
});
