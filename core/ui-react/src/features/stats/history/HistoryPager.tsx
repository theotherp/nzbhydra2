import {
    MenuItem,
    Pagination,
    PaginationItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import {
    isHistoryPageSize,
    PAGE_SIZE_OPTIONS,
    type HistoryPageSize,
} from "../shared/pageSize";

/**
 * `C-HISTORY-PAGER`: the one pager the three paged history tables share.
 *
 * Each page had hand-rolled the same Previous/Next pair with a "Page N of M"
 * label between them, which is less than legacy offered: `dirPagination`'s
 * template (`core/ui-src/html/dirPagination.tpl.html`, in git history --
 * `core/ui-src` was removed by a31df3aa2) rendered direction links *and* a run
 * of numbered page links with an ellipsis for the gap, so a reader could jump.
 * This restores the jump, adds the boundary (first/last) links that template
 * gated behind an attribute legacy's history pages never set, and adds the
 * page-size choice legacy had no control for at all.
 *
 * It owns navigation only. Which page and which size are URL state
 * (`historySearchParams.ts`), so this component neither fetches nor remembers:
 * it reports a click and re-renders from what the route then says.
 *
 * Two deliberate departures from the legacy control, both visible in that
 * template:
 *
 *   - legacy hid the whole strip on a single-page result (`auto-hide` defaults
 *     to true, and the template's `ng-if="1 < pages.length || !autoHide"`);
 *     here the strip stays with its edge controls disabled, because a total
 *     that appears and disappears is a layout jump and "Page 1 of 1 - 7
 *     searches" is the answer to a question the reader still has;
 *   - legacy marked the current page with a CSS class only. The current page
 *     button carries `aria-current="page"` here, which MUI's `PaginationItem`
 *     does not set on its own.
 */
export function HistoryPager({
    entryNoun,
    onPageChange,
    onPageSizeChange,
    page,
    pageSize,
    statusTestId,
    totalElements,
}: {
    /** What one and many of this page's rows are called, for the status line. */
    entryNoun: {one: string; many: string};
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: HistoryPageSize) => void;
    page: number;
    pageSize: HistoryPageSize;
    /**
     * This route's status-line test id. Per page rather than shared because
     * `notification-history-page-status` is an existing compatibility contract
     * asserted by `notification-history.spec.ts`.
     */
    statusTestId: string;
    totalElements: number;
}) {
    const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
    return (
        <Stack
            data-testid="history-pager"
            direction="row"
            spacing={2}
            useFlexGap
            sx={{
                alignItems: "center",
                flexWrap: "wrap",
            }}
        >
            <Pagination
                count={totalPages}
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
                        // At ten-plus pages the strip renders 13 items
                        // (First, Previous, nine page/ellipsis slots, Next,
                        // Last). Each is 26px wide (`MuiPaginationItem`'s
                        // `small` `minWidth`) plus MUI's own 1px each-side
                        // margin -- 28px per item, 364px total -- which does
                        // not reliably fit a 390px viewport once the
                        // surrounding page's own padding is subtracted: the
                        // last-in-source-order "Last page" button is what
                        // wraps. `mx: 0` removes the per-item margin (each
                        // item's 26px tap target is untouched) on the 11
                        // page/first/prev/next/last items this reaches --
                        // MUI's own ellipsis item ("…") does not forward `sx`
                        // (`PaginationItem.js` renders it from a branch that
                        // never spreads the rest props), so the two ellipsis
                        // slots keep their 1px margin. 11 x 26px + 2 x 28px =
                        // 342px, recovering 22 of the 26px this strip was
                        // short by; `HistoryPager.test.tsx` pins both the
                        // zeroed and the unreachable margins.
                        sx={{mx: 0}}
                    />
                )}
                showFirstButton
                showLastButton
                /*
                 * One boundary page and two siblings each side is the same
                 * nine-slot window legacy's `dirPagination` rendered at its
                 * default `maxSize` of 9 -- `HistoryPager.test.tsx` pins the
                 * runs against that function's own output page by page.
                 *
                 * Density comes from the theme's `MuiPagination` default
                 * (`small` at every width, never a `useMediaQuery` branch).
                 */
                siblingCount={2}
            />
            <Typography data-testid={statusTestId}>
                Page {page} of {totalPages} · {totalElements}{" "}
                {totalElements === 1 ? entryNoun.one : entryNoun.many}
            </Typography>
            <TextField
                data-testid="history-page-size"
                label="Rows per page"
                onChange={(event) => {
                    const size = Number(event.target.value);
                    if (isHistoryPageSize(size)) onPageSizeChange(size);
                }}
                select
                sx={{minWidth: (theme) => theme.spacing(16)}}
                value={pageSize}
            >
                {PAGE_SIZE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                        {option}
                    </MenuItem>
                ))}
            </TextField>
        </Stack>
    );
}

/**
 * The accessible names of the strip's controls. The direction links keep the
 * names the three pages' own buttons carried before this task ("Previous
 * page"/"Next page"), so every test and habit built on them still resolves;
 * MUI's defaults would have renamed them to "Go to previous page".
 */
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
            // The two ellipsis types. `PaginationItem` renders them as plain
            // text and drops this, but the signature is total.
            return "More pages";
    }
}
