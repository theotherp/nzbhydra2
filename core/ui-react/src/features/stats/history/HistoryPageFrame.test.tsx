import {
    Checkbox,
    FormControlLabel,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    ThemeProvider,
} from "@mui/material";
import type {UseQueryResult} from "@tanstack/react-query";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {HistoryDimension} from "../../../api/history/filters";
import type {HistoryPage} from "../../../api/history/request";
import {createHydraTheme} from "../../../app/theme";
import {HistoryPageFrame} from "./HistoryPageFrame";

type Entry = {id: number; title: string};

const dimensions: HistoryDimension[] = [
    {kind: "freetext", id: "title", column: "title", label: "Title"},
];

const messages = {
    empty: "No probe history entries match the current filters.",
    error: "Unable to load probe history.",
    loading: "Loading probe history…",
    malformed: (count: number) =>
        `${count} malformed probe history entries were not displayed.`,
    refreshing: "Refreshing probe history…",
};

const testIds = {
    pageStatus: "probe-history-page-status",
    refresh: "probe-history-refresh",
    scroller: "probe-history-scroller",
    table: "probe-history-table",
};

/**
 * Only the four fields the frame reads. A real `useQuery` result would drag a
 * client, a router and a transport into a test about markup.
 */
function queryResult(
    overrides: Partial<{
        data: HistoryPage<Entry>;
        isError: boolean;
        isFetching: boolean;
        isPending: boolean;
        refetch: () => Promise<unknown>;
    }> = {},
): UseQueryResult<HistoryPage<Entry>, Error> {
    return {
        data: {
            entries: [{id: 1, title: "A title"}],
            totalElements: 30,
            malformedCount: 0,
        },
        isError: false,
        isFetching: false,
        isPending: false,
        refetch: vi.fn(() => Promise.resolve()),
        ...overrides,
    } as unknown as UseQueryResult<HistoryPage<Entry>, Error>;
}

function renderFrame(
    overrides: Partial<Parameters<typeof HistoryPageFrame<Entry>>[0]> = {},
) {
    return render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <HistoryPageFrame<Entry>
                activeFilterCount={0}
                dimensions={dimensions}
                entryNoun={{one: "probe", many: "probes"}}
                heading="Probe history"
                messages={messages}
                minWidth={640}
                onClearFilters={vi.fn()}
                onFilterChange={vi.fn()}
                onPageChange={vi.fn()}
                onPageSizeChange={vi.fn()}
                page={1}
                pageSize={25}
                query={queryResult()}
                tableLabel="Probe history"
                testIds={testIds}
                values={{}}
                {...overrides}
            >
                {(entries) => (
                    <>
                        <TableHead>
                            <TableRow>
                                <TableCell>Title</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.map((entry) => (
                                <TableRow
                                    data-testid="probe-history-row"
                                    key={entry.id}
                                >
                                    <TableCell>{entry.title}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </>
                )}
            </HistoryPageFrame>
        </ThemeProvider>,
    );
}

describe("HistoryPageFrame", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("should show the route's own loading message before the first page arrives", async () => {
        renderFrame({query: queryResult({isPending: true, data: undefined})});
        expect(await screen.findByRole("status")).toHaveTextContent(
            "Loading probe history…",
        );
    });

    it("should show the route's own error message instead of an empty table", () => {
        renderFrame({query: queryResult({isError: true, data: undefined})});
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Unable to load probe history.",
        );
        expect(screen.queryByTestId(testIds.table)).not.toBeInTheDocument();
    });

    it("should render the route's heading, its refresh control and its rows", () => {
        renderFrame();
        expect(
            screen.getByRole("heading", {level: 1, name: "Probe history"}),
        ).toBeInTheDocument();
        const table = screen.getByTestId(testIds.table);
        expect(table).toHaveAccessibleName("Probe history");
        expect(within(table).getByText("A title")).toBeInTheDocument();
        expect(screen.getByTestId(testIds.scroller)).toBeInTheDocument();
        expect(screen.getByTestId(testIds.pageStatus)).toHaveTextContent(
            "Page 1 of 2",
        );
    });

    it("should re-read the page when the refresh control is used", () => {
        const refetch = vi.fn(() => Promise.resolve());
        renderFrame({query: queryResult({refetch})});
        screen.getByTestId(testIds.refresh).click();
        expect(refetch).toHaveBeenCalledOnce();
    });

    it("should keep the status region in the layout whether or not a read is in flight", () => {
        renderFrame();
        // Idle, the row is still there and still the same live region: it is a
        // constant-height slot, so nothing below it moves when a read starts.
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
        cleanup();
        renderFrame({query: queryResult({isFetching: true})});
        expect(screen.getByRole("status")).toHaveTextContent(
            "Refreshing probe history…",
        );
    });

    it("should report the entries the route's parser rejected", () => {
        renderFrame({
            query: queryResult({
                data: {
                    entries: [{id: 1, title: "A title"}],
                    totalElements: 30,
                    malformedCount: 2,
                },
            }),
        });
        expect(
            screen.getByText(
                "2 malformed probe history entries were not displayed.",
            ),
        ).toBeInTheDocument();
    });

    it("should offer to clear the filters that emptied the page, and only then", () => {
        const onClearFilters = vi.fn();
        const empty = queryResult({
            data: {entries: [], totalElements: 0, malformedCount: 0},
        });
        renderFrame({query: empty});
        expect(
            screen.getByText(
                "No probe history entries match the current filters.",
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", {name: "Clear filters"}),
        ).not.toBeInTheDocument();
        cleanup();
        renderFrame({activeFilterCount: 1, onClearFilters, query: empty});
        screen.getByRole("button", {name: "Clear filters"}).click();
        expect(onClearFilters).toHaveBeenCalledOnce();
    });

    it("should place a route's own header controls before the refresh control, and its footer below the pager", () => {
        renderFrame({
            footer: <div data-testid="probe-footer">Footer</div>,
            headerActions: (
                <FormControlLabel
                    control={<Checkbox />}
                    label="Show user agents"
                />
            ),
        });
        const heading = screen.getByRole("heading", {level: 1});
        const row = heading.parentElement;
        if (!row) throw new Error("The heading has no row");
        const order = Array.from(
            row.querySelectorAll("input, button[data-testid]"),
        ).map((element) => element.getAttribute("data-testid") ?? "checkbox");
        expect(order).toEqual(["checkbox", testIds.refresh]);
        const pager = screen.getByTestId("history-pager");
        const footer = screen.getByTestId("probe-footer");
        expect(
            pager.compareDocumentPosition(footer) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });
});
