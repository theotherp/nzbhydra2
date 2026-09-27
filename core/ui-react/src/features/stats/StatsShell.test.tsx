import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {StatsShell} from "./StatsShell";

const location = vi.hoisted(() => ({pathname: "/stats/indexers"}));

vi.mock("@tanstack/react-router", () => ({
    Link: ({
        to,
        children,
        ...rest
    }: {
        to: string;
        children?: React.ReactNode;
    }) => (
        <a href={to} {...rest}>
            {children}
        </a>
    ),
    Outlet: () => <div>Tab body</div>,
    useLocation: ({
        select,
    }: {
        select: (location: {pathname: string}) => string;
    }) => select({pathname: location.pathname}),
}));

function bootstrap(safeConfig: {keepHistory: boolean}) {
    return {
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
        safeConfig,
        serverTimeZone: "UTC",
    };
}

// This suite does not run with vitest globals, so RTL's automatic cleanup is
// not registered and each render would otherwise stack in the same document.
afterEach(() => {
    cleanup();
    location.pathname = "/stats/indexers";
});

describe("StatsShell", () => {
    it("should hide keep-history tabs when history is disabled", () => {
        render(<StatsShell bootstrap={bootstrap({keepHistory: false})} />);

        expect(
            screen.getByRole("tab", {name: "Indexer statuses"}),
        ).toBeVisible();
        expect(
            screen.getByRole("tab", {name: "Notification history"}),
        ).toBeVisible();

        // Real, non-tautological evidence that each tab renders through
        // the router's `Link` with a router-relative `to`, not an absolute
        // href derived from `bootstrap.baseUrl` (which is the non-root
        // "/hydra/" above): the mock `Link` renders `href={to}` verbatim,
        // so an href still prefixed with "/hydra" here would mean the
        // component built its own absolute URL instead of delegating base
        // path resolution to the router.
        expect(
            screen.getByRole("tab", {name: "Indexer statuses"}),
        ).toHaveAttribute("href", "/stats/indexers");
        expect(
            screen.getByRole("tab", {name: "Notification history"}),
        ).toHaveAttribute("href", "/stats/notifications");

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

    it("should name the open tab in the page title", () => {
        const {rerender} = render(
            <StatsShell bootstrap={bootstrap({keepHistory: true})} />,
        );
        expect(document.title).toBe("NZBHydra 2 - Indexer statuses");

        for (const [path, title] of [
            ["searches", "NZBHydra 2 - History - Searches"],
            ["saved-searches", "NZBHydra 2 - History - Saved searches"],
            ["downloads", "NZBHydra 2 - History - Downloads"],
            ["notifications", "NZBHydra 2 - History - Notifications"],
            ["stats", "NZBHydra 2 - Stats"],
        ]) {
            location.pathname = `/stats/${path}`;
            rerender(<StatsShell bootstrap={bootstrap({keepHistory: true})} />);
            expect(document.title).toBe(title);
        }
    });

    it("should render the matched tab through the router outlet", () => {
        // FM-121: the shell is a layout-route component. It renders whichever
        // child route the router matched, rather than a body handed to it as
        // `children` by seven sibling routes -- which is what let those seven
        // routes remount it on every tab switch.
        render(<StatsShell bootstrap={bootstrap({keepHistory: true})} />);

        expect(screen.getByText("Tab body")).toBeVisible();
    });
});
