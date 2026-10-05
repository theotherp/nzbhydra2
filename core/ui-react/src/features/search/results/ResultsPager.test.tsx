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
import {ResultsPager} from "./ResultsPager";

afterEach(cleanup);

function renderPager(
    props: Partial<Parameters<typeof ResultsPager>[0]> = {},
): (page: number) => void {
    const onPageChange = vi.fn();
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <ResultsPager
                label="Result pages"
                onPageChange={onPageChange}
                page={1}
                pageCount={22}
                {...props}
            />
        </ThemeProvider>,
    );
    return onPageChange;
}

function pageLinks(): string[] {
    return within(screen.getByTestId("results-pager-bottom"))
        .getAllByRole("button", {name: /page \d+$/i})
        .map((button) => button.textContent ?? "");
}

describe("ResultsPager (#1110)", () => {
    it("should show one boundary page and one sibling each side on a narrow viewport", () => {
        renderPager({page: 10});
        expect(pageLinks()).toEqual(["1", "9", "10", "11", "22"]);
    });

    it("should show two boundary pages and two siblings each side on a wide viewport", () => {
        renderPager({page: 10, wide: true});
        expect(pageLinks()).toEqual([
            "1",
            "2",
            "8",
            "9",
            "10",
            "11",
            "12",
            "21",
            "22",
        ]);
    });

    it("should jump to a page picked from the select", async () => {
        const onPageChange = renderPager({page: 3});
        const select = screen.getByRole("combobox", {name: "Jump to page"});
        expect(select).toHaveTextContent("3");
        fireEvent.mouseDown(select);
        const listbox = await screen.findByRole("listbox");
        expect(within(listbox).getAllByRole("option")).toHaveLength(22);
        fireEvent.click(within(listbox).getByRole("option", {name: "17"}));
        expect(onPageChange).toHaveBeenCalledWith(17);
    });

    it("should offer the select only once the page run has an ellipsis", () => {
        // One boundary page and one sibling each side list up to seven pages.
        renderPager({pageCount: 7});
        expect(screen.queryByRole("combobox")).toBeNull();
        cleanup();
        renderPager({pageCount: 8});
        expect(
            screen.getByRole("combobox", {name: "Jump to page"}),
        ).toBeVisible();
        cleanup();
        // Two of each list up to eleven.
        renderPager({pageCount: 11, wide: true});
        expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("should never put the select in the toolbar's compact pager", () => {
        renderPager({compact: true, wide: true});
        expect(screen.getByTestId("results-pager-top")).toBeVisible();
        expect(screen.queryByRole("combobox")).toBeNull();
    });
});
