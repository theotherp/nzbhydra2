import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import type {RecentSearch} from "../../../api/recentSearches";
import {createHydraTheme} from "../../../app/theme";
import {RecentSearches} from "./RecentSearches";

afterEach(cleanup);

function renderRecentSearches({
    onRefill = vi.fn<(search: RecentSearch) => void>(),
    onRepeat = vi.fn<(search: RecentSearch) => void>(),
    onDragStart = vi.fn<(search: RecentSearch) => void>(),
}: {
    onRefill?: ReturnType<typeof vi.fn<(search: RecentSearch) => void>>;
    onRepeat?: ReturnType<typeof vi.fn<(search: RecentSearch) => void>>;
    onDragStart?: ReturnType<typeof vi.fn<(search: RecentSearch) => void>>;
} = {}) {
    const fetchImplementation = vi.fn(() =>
        Promise.resolve(
            new Response(
                JSON.stringify([
                    {
                        categoryName: "All",
                        source: "INTERNAL",
                        query: "recent query",
                        identifiers: [],
                    },
                ]),
                {headers: {"Content-Type": "application/json"}},
            ),
        ),
    );
    render(
        <ThemeProvider theme={createHydraTheme("grey", false)}>
            <QueryClientProvider client={new QueryClient()}>
                <RecentSearches
                    enabled
                    onDragStart={onDragStart}
                    onRefill={onRefill}
                    onRepeat={onRepeat}
                    refreshKey={0}
                    transport={new ApiTransport("/hydra/", fetchImplementation)}
                />
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return {onRefill, onRepeat, onDragStart};
}

describe("RecentSearches", () => {
    it("shows a single entry per search, with the refill button executing refill and the row executing repeat", async () => {
        const {onRefill, onRepeat} = renderRecentSearches();

        fireEvent.click(screen.getByTestId("recent-searches-trigger"));
        const entries = await screen.findAllByTestId("recent-search-entry");
        expect(entries).toHaveLength(1);

        fireEvent.click(screen.getByRole("button", {name: /^Refill:/}));
        expect(onRefill).toHaveBeenCalledOnce();
        expect(onRepeat).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId("recent-searches-trigger"));
        fireEvent.click(
            await screen.findByRole("menuitem", {name: /^Repeat:/}),
        );
        expect(onRepeat).toHaveBeenCalledOnce();
    });

    it("provides a tooltip on the refill button", async () => {
        renderRecentSearches();

        fireEvent.click(screen.getByTestId("recent-searches-trigger"));
        const refillButton = await screen.findByRole("button", {
            name: /^Refill:/,
        });
        fireEvent.mouseOver(refillButton);
        expect(
            await screen.findByText("Refill the search form without searching"),
        ).toBeVisible();
    });

    it("renders field labels in italic, muted text distinct from the values", async () => {
        renderRecentSearches();

        fireEvent.click(screen.getByTestId("recent-searches-trigger"));
        const label = await screen.findByText("Category:");
        const value = screen.getByText("All");

        expect(window.getComputedStyle(label).fontStyle).toBe("italic");
        expect(window.getComputedStyle(label).color).toMatch(
            /rgb\(\s*154,\s*162,\s*161\s*\)/,
        );
        expect(window.getComputedStyle(value).fontStyle).not.toBe("italic");
    });

    it("does not constrain the menu to a fixed width", async () => {
        renderRecentSearches();

        fireEvent.click(screen.getByTestId("recent-searches-trigger"));
        await screen.findByRole("menuitem", {name: /^Repeat:/});
        const paper = screen.getByRole("menu").closest(".MuiPaper-root");
        expect(paper).not.toBeNull();
        expect(window.getComputedStyle(paper as Element).width).not.toBe(
            "420px",
        );
    });

    // ADR-0012's static contract only: `aria-keyshortcuts`, both accessible
    // names, and the hint node's presence/absence. jsdom has no roving
    // focus, no focus ring, and no accessibility tree, so this file cannot
    // and does not assert reachability, focus behavior, or roving-focus
    // navigation -- that proof is exclusively the real-browser keyboard
    // spec in `tests/system/tests/search.spec.ts` (ADR-0012, FM-050).
    describe("keyboard reachability (static contract only, not reachability proof)", () => {
        it("announces the ArrowRight shortcut on the row without changing either accessible name", async () => {
            renderRecentSearches();

            fireEvent.click(screen.getByTestId("recent-searches-trigger"));
            const row = await screen.findByRole("menuitem", {
                name: /^Repeat:/,
            });
            expect(row).toHaveAttribute("aria-keyshortcuts", "ArrowRight");
            expect(row).toHaveAccessibleName(
                "Repeat: Category: All, Source: Internal, Query: recent query",
            );
            expect(
                screen.getByRole("button", {name: /^Refill:/}),
            ).toHaveAccessibleName(
                "Refill: Category: All, Source: Internal, Query: recent query",
            );
        });

        it("shows exactly one shared hint node when entries render", async () => {
            renderRecentSearches();

            fireEvent.click(screen.getByTestId("recent-searches-trigger"));
            await screen.findByRole("menuitem", {name: /^Repeat:/});
            expect(
                screen.getAllByText(
                    "Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.",
                ),
            ).toHaveLength(1);
        });

        it("shows no hint node while recent searches are loading", async () => {
            const fetchImplementation = vi.fn(
                () => new Promise<Response>(() => {}),
            );
            render(
                <ThemeProvider theme={createHydraTheme("grey", false)}>
                    <QueryClientProvider client={new QueryClient()}>
                        <RecentSearches
                            enabled
                            onDragStart={vi.fn()}
                            onRefill={vi.fn()}
                            onRepeat={vi.fn()}
                            refreshKey={0}
                            transport={
                                new ApiTransport("/hydra/", fetchImplementation)
                            }
                        />
                    </QueryClientProvider>
                </ThemeProvider>,
            );

            fireEvent.click(screen.getByTestId("recent-searches-trigger"));
            await screen.findByRole("status");
            expect(
                screen.queryByText(
                    "Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.",
                ),
            ).not.toBeInTheDocument();
        });

        it("shows no hint node when there are no recent searches", async () => {
            const fetchImplementation = vi.fn(() =>
                Promise.resolve(
                    new Response(JSON.stringify([]), {
                        headers: {"Content-Type": "application/json"},
                    }),
                ),
            );
            render(
                <ThemeProvider theme={createHydraTheme("grey", false)}>
                    <QueryClientProvider client={new QueryClient()}>
                        <RecentSearches
                            enabled
                            onDragStart={vi.fn()}
                            onRefill={vi.fn()}
                            onRepeat={vi.fn()}
                            refreshKey={0}
                            transport={
                                new ApiTransport("/hydra/", fetchImplementation)
                            }
                        />
                    </QueryClientProvider>
                </ThemeProvider>,
            );

            fireEvent.click(screen.getByTestId("recent-searches-trigger"));
            await screen.findByText("No recent searches.");
            expect(
                screen.queryByText(
                    "Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.",
                ),
            ).not.toBeInTheDocument();
        });

        it("shows no hint node when loading recent searches errors", async () => {
            const fetchImplementation = vi.fn(() =>
                Promise.resolve(new Response(null, {status: 500})),
            );
            render(
                <ThemeProvider theme={createHydraTheme("grey", false)}>
                    <QueryClientProvider client={new QueryClient()}>
                        <RecentSearches
                            enabled
                            onDragStart={vi.fn()}
                            onRefill={vi.fn()}
                            onRepeat={vi.fn()}
                            refreshKey={0}
                            transport={
                                new ApiTransport("/hydra/", fetchImplementation)
                            }
                        />
                    </QueryClientProvider>
                </ThemeProvider>,
            );

            fireEvent.click(screen.getByTestId("recent-searches-trigger"));
            await screen.findByText("Unable to load recent searches.");
            expect(
                screen.queryByText(
                    "Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.",
                ),
            ).not.toBeInTheDocument();
        });
    });
});
