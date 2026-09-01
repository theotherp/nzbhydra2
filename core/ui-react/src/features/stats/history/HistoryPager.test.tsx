import {ThemeProvider} from "@mui/material";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createHydraTheme} from "../../../app/theme";
import {PAGE_SIZE_OPTIONS, type HistoryPageSize} from "../shared/pageSize";
import {HistoryPager} from "./HistoryPager";

afterEach(cleanup);

function renderPager(props: Partial<Parameters<typeof HistoryPager>[0]> = {}): {
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: HistoryPageSize) => void;
} {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <HistoryPager
                entryNoun={{one: "search", many: "searches"}}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                page={1}
                pageSize={25}
                statusTestId="search-history-page-status"
                totalElements={0}
                {...props}
            />
        </ThemeProvider>,
    );
    return {onPageChange, onPageSizeChange};
}

/**
 * The strip's numbered run, in order, with the ellipsis rendered as the
 * character MUI's `PaginationItem` puts in its place. The direction and
 * boundary controls are icon-only, so they contribute nothing here and the
 * sequence is exactly what the reader reads.
 */
function numberedRun(): string[] {
    return Array.from(screen.getByRole("navigation").querySelectorAll("li"))
        .map((item) => (item.textContent ?? "").trim())
        .filter((text) => text !== "");
}

describe("HistoryPager numbering", () => {
    /**
     * The boundaries the ellipsis appears and disappears at. One run at every
     * viewport: the strip does not switch layouts on width, it is sized to fit
     * the narrowest one.
     *
     * Every row below is also what legacy rendered. `dirPagination`'s
     * `generatePagesArray` (in git history: the bundled library in
     * `core/src/main/resources/static/js/alllibs.js`, driven by the template
     * `core/ui-src/html/dirPagination.tpl.html`) ran at its default `maxSize`
     * of 9, and one boundary page plus two siblings each side is the same nine
     * slots with the same windowing -- checked case by case against that
     * function, including the two pages where a gap opens (6) and closes (16).
     */
    const cases: {name: string; page: number; pages: number; run: string[]}[] =
        [
            {
                name: "a single page is its own number",
                page: 1,
                pages: 1,
                run: ["1"],
            },
            {
                name: "every page is listed while they all fit",
                page: 4,
                pages: 7,
                run: ["1", "2", "3", "4", "5", "6", "7"],
            },
            {
                name: "the last page that still fits without a gap",
                page: 5,
                pages: 9,
                run: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
            },
            {
                name: "page 1 of many gaps only before the last page",
                page: 1,
                pages: 20,
                run: ["1", "2", "3", "4", "5", "6", "7", "…", "20"],
            },
            {
                name: "page 5 is the last one the run still starts at 1 for",
                page: 5,
                pages: 20,
                run: ["1", "2", "3", "4", "5", "6", "7", "…", "20"],
            },
            {
                name: "page 6 is where the leading gap opens",
                page: 6,
                pages: 20,
                run: ["1", "…", "4", "5", "6", "7", "8", "…", "20"],
            },
            {
                name: "a middle page gaps on both sides",
                page: 10,
                pages: 20,
                run: ["1", "…", "8", "9", "10", "11", "12", "…", "20"],
            },
            {
                name: "page 15 still gaps on both sides",
                page: 15,
                pages: 20,
                run: ["1", "…", "13", "14", "15", "16", "17", "…", "20"],
            },
            {
                name: "page 16 is where the trailing gap closes",
                page: 16,
                pages: 20,
                run: ["1", "…", "14", "15", "16", "17", "18", "19", "20"],
            },
            {
                name: "the last page gaps only before it",
                page: 20,
                pages: 20,
                run: ["1", "…", "14", "15", "16", "17", "18", "19", "20"],
            },
        ];

    for (const {name, page, pages, run} of cases) {
        it(name, () => {
            renderPager({page, pageSize: 25, totalElements: pages * 25});
            expect(numberedRun()).toEqual(run);
        });
    }

    it("marks the current page with aria-current and no other button", () => {
        renderPager({page: 3, pageSize: 25, totalElements: 500});
        expect(screen.getByRole("button", {name: "Page 3"})).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(
            screen
                .getByRole("navigation")
                .querySelectorAll('[aria-current="page"]'),
        ).toHaveLength(1);
    });

    it("navigates to the page a numbered button names", () => {
        const {onPageChange} = renderPager({
            page: 1,
            pageSize: 25,
            totalElements: 500,
        });
        fireEvent.click(screen.getByRole("button", {name: "Go to page 3"}));
        expect(onPageChange).toHaveBeenCalledWith(3);
    });
});

describe("HistoryPager edges", () => {
    it("disables first and previous on the first page", () => {
        renderPager({page: 1, pageSize: 25, totalElements: 500});
        expect(screen.getByRole("button", {name: "First page"})).toBeDisabled();
        expect(
            screen.getByRole("button", {name: "Previous page"}),
        ).toBeDisabled();
        expect(screen.getByRole("button", {name: "Next page"})).toBeEnabled();
        expect(screen.getByRole("button", {name: "Last page"})).toBeEnabled();
    });

    it("disables next and last on the last page", () => {
        renderPager({page: 20, pageSize: 25, totalElements: 500});
        expect(screen.getByRole("button", {name: "First page"})).toBeEnabled();
        expect(
            screen.getByRole("button", {name: "Previous page"}),
        ).toBeEnabled();
        expect(screen.getByRole("button", {name: "Next page"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Last page"})).toBeDisabled();
    });

    it("jumps to the last page", () => {
        const {onPageChange} = renderPager({
            page: 1,
            pageSize: 25,
            totalElements: 500,
        });
        fireEvent.click(screen.getByRole("button", {name: "Last page"}));
        expect(onPageChange).toHaveBeenCalledWith(20);
    });

    it("keeps the status text on a single-page result, with every edge control disabled", () => {
        renderPager({page: 1, pageSize: 25, totalElements: 7});
        expect(
            screen.getByTestId("search-history-page-status"),
        ).toHaveTextContent("Page 1 of 1 · 7 searches");
        for (const name of [
            "First page",
            "Previous page",
            "Next page",
            "Last page",
        ]) {
            expect(screen.getByRole("button", {name})).toBeDisabled();
        }
    });

    it("counts one entry with the singular noun", () => {
        renderPager({page: 1, pageSize: 25, totalElements: 1});
        expect(
            screen.getByTestId("search-history-page-status"),
        ).toHaveTextContent("Page 1 of 1 · 1 search");
    });

    it("reports an empty history as one page of nothing", () => {
        renderPager({page: 1, pageSize: 25, totalElements: 0});
        expect(
            screen.getByTestId("search-history-page-status"),
        ).toHaveTextContent("Page 1 of 1 · 0 searches");
    });
});

describe("HistoryPager page size", () => {
    it("offers every configured size behind a visible label", async () => {
        renderPager({page: 1, pageSize: 25, totalElements: 500});
        const control = screen.getByRole("combobox", {name: "Rows per page"});
        expect(control).toHaveTextContent("25");
        fireEvent.mouseDown(control);
        const options = within(await screen.findByRole("listbox")).getAllByRole(
            "option",
        );
        expect(options.map((option) => option.textContent)).toEqual(
            PAGE_SIZE_OPTIONS.map(String),
        );
    });

    it("reports the chosen size, which the caller turns into page 1", async () => {
        const {onPageChange, onPageSizeChange} = renderPager({
            page: 7,
            pageSize: 25,
            totalElements: 500,
        });
        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Rows per page"}),
        );
        fireEvent.click(
            within(await screen.findByRole("listbox")).getByRole("option", {
                name: "100",
            }),
        );
        expect(onPageSizeChange).toHaveBeenCalledWith(100);
        // The pager reports the size only; it never also asks for a page, so
        // the reset cannot become a second navigation.
        expect(onPageChange).not.toHaveBeenCalled();
    });

    it("counts pages against the chosen size", () => {
        renderPager({page: 1, pageSize: 100, totalElements: 500});
        expect(
            screen.getByTestId("search-history-page-status"),
        ).toHaveTextContent("Page 1 of 5 · 500 searches");
    });
});
