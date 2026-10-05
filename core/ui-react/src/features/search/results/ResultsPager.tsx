import {
    MenuItem,
    Pagination,
    PaginationItem,
    Stack,
    TextField,
} from "@mui/material";

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
 * #1110: the full strip also offers a "Jump to page" select once the number
 * run has an ellipsis, so a far page is one pick away instead of a walk
 * through the neighbours. On a `wide` viewport the run itself shows two
 * boundary pages and two siblings each side; the phone keeps one of each,
 * which is what fits 390px (see below).
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
    wide = false,
}: {
    compact?: boolean;
    /** The navigation's accessible name; unique among the rendered pagers. */
    label: string;
    onPageChange: (page: number) => void;
    page: number;
    pageCount: number;
    /** Whether the full strip has a desktop's width to spend on page links. */
    wide?: boolean;
}) {
    const boundaryCount = !compact && wide ? 2 : 1;
    const siblingCount = compact ? 0 : wide ? 2 : 1;
    const pagination = (
        <Pagination
            aria-label={label}
            boundaryCount={boundaryCount}
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
            siblingCount={siblingCount}
        />
    );
    // MUI lists every page, without an ellipsis, up to this many.
    const allPagesShown = 2 * boundaryCount + 2 * siblingCount + 3;
    if (compact || pageCount <= allPagesShown) {
        return pagination;
    }
    return (
        <Stack
            direction="row"
            spacing={2}
            useFlexGap
            sx={{
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "center",
            }}
        >
            {pagination}
            <TextField
                data-testid="results-page-select"
                label="Jump to page"
                onChange={(event) => onPageChange(Number(event.target.value))}
                select
                sx={{minWidth: (theme) => theme.spacing(16)}}
                value={page}
            >
                {Array.from({length: pageCount}, (_, index) => (
                    <MenuItem key={index + 1} value={index + 1}>
                        {index + 1}
                    </MenuItem>
                ))}
            </TextField>
        </Stack>
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
