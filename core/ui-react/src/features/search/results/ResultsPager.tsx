import {Pagination, PaginationItem} from "@mui/material";

/**
 * The results table's page navigation, rendered only while
 * `main.resultsPageSize` is set and the filtered results span more than one
 * page. A page is a number of result *groups*, not rows (see
 * `pageOfGroups`), so a group is never split across two pages.
 *
 * Two placements share it: `compact` sits in the sticky toolbar's first row on
 * wide viewports, so the page can be changed without scrolling back down;
 * the full strip sits under the last row, where a reader arrives after
 * finishing a page. The phone gets the full strip only -- its sticky bar is
 * paid for in rows of results it hides (FM-181).
 *
 * The item markup follows `HistoryPager`'s: `aria-current` on the current
 * page, which MUI does not set, and `mx: 0` on each item so the strip fits a
 * 390px viewport (see the measurements there).
 */
export function ResultsPager({
    compact = false,
    label,
    onPageChange,
    page,
    pageCount,
}: {
    compact?: boolean;
    /** The navigation's accessible name; unique among the rendered pagers. */
    label: string;
    onPageChange: (page: number) => void;
    page: number;
    pageCount: number;
}) {
    return (
        <Pagination
            aria-label={label}
            boundaryCount={1}
            count={pageCount}
            data-testid={compact ? "results-pager-top" : "results-pager-bottom"}
            getItemAriaLabel={pagerItemLabel}
            onChange={(_event, value) => onPageChange(value)}
            page={page}
            renderItem={(item) => (
                <PaginationItem
                    {...item}
                    aria-current={
                        item.type === "page" && item.selected
                            ? "page"
                            : undefined
                    }
                    sx={{mx: 0}}
                />
            )}
            showFirstButton={!compact}
            showLastButton={!compact}
            siblingCount={compact ? 0 : 1}
        />
    );
}

function pagerItemLabel(
    type: string,
    page: number | null,
    selected: boolean,
): string {
    switch (type) {
        case "first":
            return "First page";
        case "previous":
            return "Previous page";
        case "next":
            return "Next page";
        case "last":
            return "Last page";
        case "page":
            return selected ? `Page ${page}` : `Go to page ${page}`;
        default:
            return "More pages";
    }
}
