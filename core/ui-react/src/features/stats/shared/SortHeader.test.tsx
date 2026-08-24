import {Table, TableHead, TableRow} from "@mui/material";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {SortHeader, type SortState} from "./SortHeader";

afterEach(cleanup);

function renderHeader(sort: SortState<"time" | "name">) {
    const onSort = vi.fn();
    render(
        <Table>
            <TableHead>
                <TableRow>
                    <SortHeader
                        column="time"
                        label="Time"
                        onSort={onSort}
                        sort={sort}
                    />
                </TableRow>
            </TableHead>
        </Table>,
    );
    return onSort;
}

describe("SortHeader", () => {
    it("renders inactive for a column that isn't sorted", () => {
        renderHeader({column: "name", sortMode: 1});
        const cell = screen.getByRole("columnheader");
        expect(cell).not.toHaveAttribute("aria-sort");
        expect(screen.getByText("Time")).toBeInTheDocument();
    });

    it("marks ascending for sortMode 1 on the active column", () => {
        renderHeader({column: "time", sortMode: 1});
        expect(screen.getByRole("columnheader")).toHaveAttribute(
            "aria-sort",
            "ascending",
        );
    });

    it("marks descending for sortMode 2 on the active column", () => {
        renderHeader({column: "time", sortMode: 2});
        expect(screen.getByRole("columnheader")).toHaveAttribute(
            "aria-sort",
            "descending",
        );
    });

    it("calls onSort with its column when clicked", () => {
        const onSort = renderHeader({column: "name", sortMode: 1});
        screen.getByText("Time").click();
        expect(onSort).toHaveBeenCalledWith("time");
    });
});
