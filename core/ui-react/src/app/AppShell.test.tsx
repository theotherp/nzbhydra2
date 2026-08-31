import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../api/transport";
import {ToastProvider} from "../components/toasts/ToastProvider";
import {AppShell} from "./AppShell";
import {ThemePreferenceProvider} from "./ThemePreferenceProvider";

let mockPathname = "/hydra/";
const mockRouterNavigate = vi.fn();

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
    useNavigate: () => mockRouterNavigate,
}));

/**
 * The shell mounts `F-PLATFORM-LIVE-STATUS`' startup sequence, which talks to
 * the backend on mount; it is covered by its own tests, so the shell's own
 * cases stand in for it with a marker.
 */
vi.mock("./status/StartupChecks", () => ({
    StartupChecks: () => <div data-testid="startup-checks" />,
}));

/**
 * The shell mounts `UpdateFooterBanners`, which talks to the backend (a
 * TanStack Query) on mount and needs a `QueryClientProvider` this test file
 * does not otherwise set up; its own banner content, withdrawal rule, and
 * actions are covered by `UpdateFooterBanners.test.tsx`. The mock reports
 * `mockFooterBannerHeight` through the real `onHeightChange` wiring so the
 * shell's own padding-compensation contract can still be asserted here.
 */
let mockFooterBannerHeight = 0;
vi.mock("./status/UpdateFooterBanners", () => ({
    UpdateFooterBanners: ({
        bottomOffset,
        onHeightChange,
    }: {
        bottomOffset?: number;
        onHeightChange: (height: number) => void;
    }) => {
        onHeightChange(mockFooterBannerHeight);
        mockUpdateBannerBottomOffset = bottomOffset;
        return <div data-testid="update-footer-banners" />;
    },
}));

/**
 * FM-081's two permanent live subscribers open a SockJS/STOMP connection on
 * mount, which jsdom cannot serve; their own subscription lifecycle, gating,
 * and rendering are covered by `DownloaderStatusFooter.test.tsx` and
 * `NotificationToasts.test.tsx`. The downloader footer's mock reports
 * `mockDownloaderFooterHeight` through the real `onHeightChange` wiring so the
 * shell's own stacking contract can still be asserted here.
 */
let mockDownloaderFooterHeight = 0;
let mockUpdateBannerBottomOffset: number | undefined;
vi.mock("./status/DownloaderStatusFooter", () => ({
    DownloaderStatusFooter: ({
        onHeightChange,
    }: {
        onHeightChange: (height: number) => void;
    }) => {
        onHeightChange(mockDownloaderFooterHeight);
        return <div data-testid="downloader-status-footer" />;
    },
}));
vi.mock("./status/NotificationToasts", () => ({
    NotificationToasts: () => <div data-testid="notification-toasts" />,
}));

afterEach(cleanup);
beforeEach(() => {
    mockPathname = "/hydra/";
    mockRouterNavigate.mockReset();
    fetchImplementation.mockReset();
    mockFooterBannerHeight = 0;
    mockDownloaderFooterHeight = 0;
    mockUpdateBannerBottomOffset = undefined;
});

const fetchImplementation = vi.fn();
const transport = new ApiTransport("/hydra/", fetchImplementation);

/**
 * The shell renders the login/logout affordance, which reports failures
 * through `C-TOAST-SERVICE`; every shell render therefore needs the provider.
 *
 * FM-154: it also renders the theme selector, which reads and writes the
 * preference `ThemePreferenceProvider` owns -- and that provider is what
 * supplies the MUI theme, so the two arrive together exactly as they do in
 * `App.tsx`. Its default preference is `grey`, the application's default theme.
 */
function renderShell(ui: React.ReactElement) {
    return render(
        <ThemePreferenceProvider>
            <ToastProvider>{ui}</ToastProvider>
        </ThemePreferenceProvider>,
    );
}

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
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
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

    it("should mount the startup checks, which run once per application load", () => {
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        expect(screen.getByTestId("startup-checks")).toBeInTheDocument();
    });

    it("should mount the update footer banners", () => {
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        expect(screen.getByTestId("update-footer-banners")).toBeInTheDocument();
    });

    it("should leave the main content area's bottom padding unset with no footer banner showing", () => {
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        expect(
            window.getComputedStyle(screen.getByRole("main")).paddingBottom,
        ).toBe("");
    });

    it("should pad the main content area by the footer banners' own reported height", () => {
        mockFooterBannerHeight = 88;
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        expect(
            window.getComputedStyle(screen.getByRole("main")).paddingBottom,
        ).toBe("88px");
    });

    it("should mount both permanent live-status subscribers", () => {
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        expect(
            screen.getByTestId("downloader-status-footer"),
        ).toBeInTheDocument();
        expect(screen.getByTestId("notification-toasts")).toBeInTheDocument();
    });

    it("should stack the update banners above the downloader footer and pad the main area by both", () => {
        mockFooterBannerHeight = 40;
        mockDownloaderFooterHeight = 30;
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        expect(
            window.getComputedStyle(screen.getByRole("main")).paddingBottom,
        ).toBe("70px");
        expect(mockUpdateBannerBottomOffset).toBe(30);
    });

    it("should render the desktop navigation items in a horizontal row", () => {
        renderShell(
            <AppShell
                bootstrap={{...bootstrap, adminRestricted: false}}
                transport={transport}
            >
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
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        const logo = screen.getByRole("img", {name: "NZBHydra2"});
        expect(logo).toBeInTheDocument();
        expect(logo.getAttribute("alt")).toBe("NZBHydra2");
    });

    it("should mark the current route's nav item with the branded primary active indicator", () => {
        mockPathname = "/hydra/stats/indexers";
        renderShell(
            <AppShell
                bootstrap={{
                    ...bootstrap,
                    adminRestricted: false,
                    statsRestricted: false,
                }}
                transport={transport}
            >
                <p>Page content</p>
            </AppShell>,
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
        renderShell(
            <AppShell
                bootstrap={{
                    ...bootstrap,
                    adminRestricted: false,
                    statsRestricted: false,
                }}
                transport={transport}
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

    it("should render the login affordance in the header bar for a restricted anonymous session", () => {
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        const banner = screen.getByRole("banner");
        expect(
            within(banner).getByRole("button", {name: "Login"}),
        ).toHaveAttribute("data-testid", "shell-loginout");
    });

    it("should render the logout affordance for a logged-in session that may log out", () => {
        renderShell(
            <AppShell
                bootstrap={{
                    ...bootstrap,
                    showLogout: true,
                    username: "hydra",
                }}
                transport={transport}
            >
                <p>Page content</p>
            </AppShell>,
        );

        expect(
            screen.getByRole("button", {name: "Logout hydra"}),
        ).toBeInTheDocument();
    });

    it("should render no login affordance when authentication is not configured", () => {
        renderShell(
            <AppShell
                bootstrap={{
                    ...bootstrap,
                    adminRestricted: false,
                    authConfigured: false,
                    statsRestricted: false,
                }}
                transport={transport}
            >
                <p>Page content</p>
            </AppShell>,
        );

        expect(screen.queryByTestId("shell-loginout")).not.toBeInTheDocument();
    });
});

/*
 * FM-154 (ADR-0049): the nav-bar theme selector.
 *
 * These cases are about the affordance, not about the palettes -- `theme.ts`'s
 * own tests measure those. What matters here is that the control names itself,
 * shows the choice in force, sits where the ADR puts it, and that choosing an
 * option actually repaints the application rather than only updating a label.
 */
describe("AppShell theme selector", () => {
    function openSelector() {
        fireEvent.click(screen.getByTestId("app-shell-theme-selector"));
        return screen.getByRole("menu");
    }

    it("should show the theme in force and offer every theme ADR-0049 names", () => {
        renderShell(
            <AppShell bootstrap={bootstrap} transport={transport}>
                <p>Page content</p>
            </AppShell>,
        );

        const trigger = screen.getByTestId("app-shell-theme-selector");
        expect(trigger).toHaveTextContent("Theme: Grey");
        expect(trigger).toHaveAttribute("aria-haspopup", "menu");
        expect(trigger).toHaveAttribute("aria-expanded", "false");

        const menu = openSelector();
        expect(
            within(menu)
                .getAllByRole("menuitemradio")
                .map((option) => option.textContent),
        ).toEqual(["Auto", "Grey", "Bright", "Dark", "Dark (Dyschromatopsia)"]);
        // The current choice is announced, not only painted: `selected` on a
        // `MenuItem` sets no ARIA state of its own.
        expect(
            within(menu).getByTestId("app-shell-theme-option-grey"),
        ).toHaveAttribute("aria-checked", "true");
        expect(
            within(menu).getByTestId("app-shell-theme-option-bright"),
        ).toHaveAttribute("aria-checked", "false");
        expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("should sit beside the login/logout control, where ADR-0049 puts it", () => {
        renderShell(
            <AppShell
                bootstrap={{...bootstrap, username: "u", showLogout: true}}
                transport={transport}
            >
                <p>Page content</p>
            </AppShell>,
        );

        const selector = screen.getByTestId("app-shell-theme-selector");
        const loginout = screen.getByTestId("shell-loginout");
        expect(
            selector.compareDocumentPosition(loginout) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(screen.getByTestId("app-shell-nav")).toBeInTheDocument();
    });

    it("should repaint the application when a theme is chosen, with no reload", () => {
        mockPathname = "/hydra/stats/indexers";
        renderShell(
            <AppShell
                bootstrap={{
                    ...bootstrap,
                    adminRestricted: false,
                    statsRestricted: false,
                }}
                transport={transport}
            >
                <p>Page content</p>
            </AppShell>,
        );

        // The active nav item's rail renders `surfaces.barAccent`, which is a
        // different value in every theme -- so it is real, rendered evidence
        // that the theme changed, not just that a label did.
        const active = () =>
            screen.getByRole("link", {name: "History & Stats"});
        expect(window.getComputedStyle(active()).borderBottomColor).toBe(
            "oklch(0.75 0.1 190)",
        );

        openSelector();
        fireEvent.click(screen.getByTestId("app-shell-theme-option-dark"));

        expect(
            screen.getByTestId("app-shell-theme-selector"),
        ).toHaveTextContent("Theme: Dark");
        expect(window.getComputedStyle(active()).borderBottomColor).toBe(
            "rgb(154, 166, 172)",
        );

        openSelector();
        fireEvent.click(screen.getByTestId("app-shell-theme-option-bright"));

        expect(window.getComputedStyle(active()).borderBottomColor).toBe(
            "rgb(255, 255, 255)",
        );
    });
});
