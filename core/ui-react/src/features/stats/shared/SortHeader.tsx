import {TableCell, TableSortLabel} from "@mui/material";

/**
 * The sort state every history page's `useState` carries: `History.java`'s
 * own `1` ascending / `2` descending encoding, generic over the page's own
 * sort-column union.
 */
export type SortState<Column extends string> = {
    column: Column;
    sortMode: 1 | 2;
};

/**
 * The `TableSortLabel`-based history table header cell, shared by
 * `DownloadHistoryPage` and `NotificationHistoryPage` (byte-identical modulo
 * prop order and the sort-column type parameter). `SearchHistoryPage` renders
 * a different, `Button`-based header and is intentionally not a consumer --
 * folding it in would change its DOM.
 */
export function SortHeader<Column extends string>({
    label,
    column,
    sort,
    onSort,
}: {
    label: string;
    column: Column;
    sort: SortState<Column>;
    onSort(column: Column): void;
}) {
    const active = sort.column === column;
    const direction = active ? (sort.sortMode === 1 ? "asc" : "desc") : "asc";
    return (
        <TableCell sortDirection={active ? direction : false}>
            <TableSortLabel
                active={active}
                direction={direction}
                onClick={() => onSort(column)}
            >
                {label}
            </TableSortLabel>
        </TableCell>
    );
}
