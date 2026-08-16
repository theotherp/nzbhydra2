import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import type {ColumnDef, SortingState} from "@tanstack/react-table";
import {useContext, useEffect, useMemo, useState} from "react";

import type {SearchResponse, SearchResult} from "../../../api/search";
import {
    defaultFilters,
    duplicateGroupKey,
    filterResults,
    groupResults,
    preselectedQuickFilters,
    quickFilterKey,
    quickFiltersFromSafeConfig,
    selectionAfterClick,
    selectVisibleResults,
    visibleGroupedResults,
} from "./resultTable";
import type {NumericRange, ResultFilters} from "./resultTable";
import {DirectDownloadActions, DownloadActions} from "./DownloadActions";
import {DialogContext} from "../../../components/dialogs/dialogs";
import {ToastContext} from "../../../components/toasts/toasts";

const STORAGE_KEY = "hydra.search-results.table";

type StoredChoices = {sorting?: SortingState; filters?: Partial<ResultFilters>};

export function SearchResults({
    data,
    episodeRequested = false,
    onLoadMore,
    onSaveSearch,
    savingSearch = false,
    searchRequestId,
}: {
    data: SearchResponse;
    episodeRequested?: boolean;
    onLoadMore?: (loadAll: boolean) => Promise<void>;
    onSaveSearch?: () => Promise<void>;
    savingSearch?: boolean;
    searchRequestId?: number;
}) {
    const safeConfig =
        window.__NZBHYDRA_BOOTSTRAP__ && isRecord(window.__NZBHYDRA_BOOTSTRAP__)
            ? window.__NZBHYDRA_BOOTSTRAP__.safeConfig
            : undefined;
    const quickFilters = useMemo(
        () => quickFiltersFromSafeConfig(safeConfig),
        [safeConfig],
    );
    const [choices] = useState(() => loadChoices());
    const [sorting, setSorting] = useState<SortingState>(
        choices.sorting ?? [{id: "epoch", desc: true}],
    );
    const [filters, setFilters] = useState<ResultFilters>(() => ({
        ...defaultFilters(data.searchResults, quickFilters),
        ...choices.filters,
        size: choices.filters?.size ?? {min: "", max: ""},
        grabs: choices.filters?.grabs ?? {min: "", max: ""},
        age: choices.filters?.age ?? {min: "", max: ""},
        quickFilters: {
            ...preselectedQuickFilters(safeConfig, quickFilters),
            ...choices.filters?.quickFilters,
        },
    }));
    const [groupTorrentAndUsenet, setGroupTorrentAndUsenet] = useState(false);
    const [groupEpisodes, setGroupEpisodes] = useState(true);
    const [expandedTitles, setExpandedTitles] = useState<Set<string>>(
        new Set(),
    );
    const [expandedDuplicates, setExpandedDuplicates] = useState<Set<string>>(
        new Set(),
    );
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string>();
    const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
    const [pagingLoading, setPagingLoading] = useState(false);
    const [pagingError, setPagingError] = useState<string>();
    const [pagingExhausted, setPagingExhausted] = useState(false);
    const dialogs = useContext(DialogContext);
    const toasts = useContext(ToastContext);
    const filteredResults = useMemo(
        () => filterResults(data.searchResults, filters, quickFilters),
        [data.searchResults, filters, quickFilters],
    );
    const columns = useMemo<ColumnDef<SearchResult>[]>(
        () => [
            {accessorKey: "title", header: "Title"},
            {accessorKey: "indexer", header: "Indexer"},
            {accessorKey: "category", header: "Category"},
            {
                accessorKey: "size",
                header: "Size",
                cell: (context) => context.getValue<number | undefined>() ?? "",
            },
            {
                id: "grabs",
                accessorFn: (result) => result.seeders ?? result.grabs,
                header: "Details",
                cell: (context) => context.getValue<number | undefined>() ?? "",
            },
            {
                accessorKey: "epoch",
                header: "Age",
                cell: (context) => context.row.original.age ?? "",
            },
        ],
        [],
    );
    const table = useReactTable({
        columns,
        data: filteredResults,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {sorting},
    });
    const sortedResults = table.getRowModel().rows.map((row) => row.original);
    const groups = useMemo(
        () =>
            groupResults(sortedResults, {
                groupTorrentAndUsenet,
                groupEpisodes,
                episodeRequested,
            }),
        [episodeRequested, groupEpisodes, groupTorrentAndUsenet, sortedResults],
    );
    const visibleResults = useMemo(
        () => visibleGroupedResults(groups, expandedTitles, expandedDuplicates),
        [expandedDuplicates, expandedTitles, groups],
    );

    useEffect(() => {
        getStorage()?.setItem(STORAGE_KEY, JSON.stringify({sorting, filters}));
    }, [filters, sorting]);

    useEffect(() => {
        const filteredIds = new Set(
            filteredResults.map((result) => result.searchResultId),
        );
        setSelected(
            (current) =>
                new Set([...current].filter((id) => filteredIds.has(id))),
        );
    }, [filteredResults]);

    useEffect(() => {
        setPagingLoading(false);
        setPagingError(undefined);
        setPagingExhausted(false);
    }, [searchRequestId]);

    const allIndexersFailed =
        data.indexerSearchMetaDatas.length > 0 &&
        data.indexerSearchMetaDatas.every((indexer) => !indexer.wasSuccessful);
    const hasMoreResults = data.indexerSearchMetaDatas.some(
        (indexer) => indexer.hasMoreResults === true,
    );
    const hasRemainingKnownResults =
        data.numberOfProcessedResults !== undefined &&
        data.numberOfProcessedResults < data.numberOfAvailableResults;
    const hasInvalidPagingCursor =
        data.pagingState === "ready" &&
        data.offset === 0 &&
        data.limit === 0 &&
        (hasMoreResults || hasRemainingKnownResults);
    const pagingAvailable =
        onLoadMore !== undefined &&
        data.pagingState === "ready" &&
        (hasMoreResults || hasRemainingKnownResults) &&
        !hasInvalidPagingCursor &&
        !pagingExhausted;
    const requestContinuation = async (loadAll: boolean) => {
        if (!onLoadMore || pagingLoading || !pagingAvailable) {
            return;
        }
        setPagingLoading(true);
        setPagingError(undefined);
        try {
            await onLoadMore(loadAll);
            if (loadAll) {
                setPagingExhausted(true);
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to load more results.";
            setPagingError(message);
            if (message.includes("did not advance")) {
                setPagingExhausted(true);
            }
        } finally {
            setPagingLoading(false);
        }
    };
    const updateRange = (
        name: "size" | "grabs" | "age",
        bound: keyof NumericRange,
        value: string,
    ) => {
        setFilters((current) => ({
            ...current,
            [name]: {...current[name], [bound]: value},
        }));
    };
    const clearRange = (name: "size" | "grabs" | "age") => {
        setFilters((current) => ({...current, [name]: {min: "", max: ""}}));
    };
    return (
        <Stack data-testid="search-results" spacing={2} sx={{mt: 4}}>
            {data.indexerLimitWarnings.length > 0 && (
                <Alert data-testid="indexer-limit-warnings" severity="warning">
                    <strong>Indexer quota warning</strong>
                    <ul>
                        {data.indexerLimitWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </Alert>
            )}
            {data.malformedResultCount > 0 && (
                <Alert severity="warning">
                    {data.malformedResultCount} malformed result entries were
                    not displayed.
                </Alert>
            )}
            {Object.keys(data.notPickedIndexersWithReason).length > 0 &&
                data.indexerSearchMetaDatas.length === 0 && (
                    <Alert severity="info">
                        <Typography component="h2" variant="h6">
                            No indexers were picked for this search
                        </Typography>
                        <ul>
                            {Object.entries(
                                data.notPickedIndexersWithReason,
                            ).map(([indexer, reason]) => (
                                <li key={indexer}>
                                    {indexer}: {reason}
                                </li>
                            ))}
                        </ul>
                    </Alert>
                )}
            {allIndexersFailed && (
                <Alert severity="error">
                    Unable to search any indexer successfully; no results
                    available
                </Alert>
            )}
            {!allIndexersFailed &&
                data.indexerSearchMetaDatas.length > 0 &&
                data.numberOfAvailableResults === 0 && (
                    <Alert severity="info">
                        No results were found for this search
                    </Alert>
                )}
            {data.numberOfRejectedResults > 0 && (
                <Alert severity="info">
                    Rejected {data.numberOfRejectedResults} results.
                </Alert>
            )}
            {data.pagingState === "partial" && (
                <Alert role="status" severity="warning">
                    More results cannot be loaded because the server returned
                    incomplete paging information.
                </Alert>
            )}
            {hasInvalidPagingCursor && (
                <Alert role="status" severity="warning">
                    More results cannot be loaded because the server returned an
                    invalid paging cursor.
                </Alert>
            )}
            {pagingError && (
                <Alert role="alert" severity="error">
                    {pagingError}
                </Alert>
            )}
            {onLoadMore && (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Button
                        aria-busy={pagingLoading}
                        disabled={!pagingAvailable || pagingLoading}
                        onClick={() => void requestContinuation(false)}
                        size="small"
                    >
                        {pagingLoading ? "Loading more results…" : "Load more"}
                    </Button>
                    <Button
                        disabled={!pagingAvailable || pagingLoading}
                        onClick={() => void requestContinuation(true)}
                        size="small"
                    >
                        Load all results
                    </Button>
                </Stack>
            )}
            {data.searchResults.length > 0 && (
                <>
                    <Paper
                        data-testid="results-toolbar"
                        elevation={1}
                        sx={{p: {xs: 1.5, sm: 2}}}
                    >
                        <Stack spacing={1.5}>
                            <Typography
                                data-testid="search-results-summary"
                                variant="subtitle2"
                            >
                                Loaded {data.searchResults.length} (
                                {data.searchResults.length -
                                    filteredResults.length}{" "}
                                filtered) of{" "}
                                {hasMoreResults &&
                                data.indexerSearchMetaDatas.some(
                                    (indexer) =>
                                        indexer.totalResultsKnown === false,
                                )
                                    ? ">"
                                    : ""}
                                {data.numberOfAvailableResults} results
                                (rejected {data.numberOfRejectedResults})
                            </Typography>
                            <Stack
                                alignItems="center"
                                data-testid="results-selection-actions"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={groupTorrentAndUsenet}
                                            onChange={(event) =>
                                                setGroupTorrentAndUsenet(
                                                    event.target.checked,
                                                )
                                            }
                                            size="small"
                                        />
                                    }
                                    label="Group torrent and Usenet results"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={groupEpisodes}
                                            onChange={(event) =>
                                                setGroupEpisodes(
                                                    event.target.checked,
                                                )
                                            }
                                            size="small"
                                        />
                                    }
                                    label="Group TV episodes"
                                />
                                <Button
                                    onClick={() =>
                                        setSelected((current) =>
                                            selectVisibleResults(
                                                current,
                                                visibleResults,
                                                "all",
                                            ),
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault();
                                            setSelected((current) =>
                                                selectVisibleResults(
                                                    current,
                                                    visibleResults,
                                                    "all",
                                                ),
                                            );
                                        }
                                    }}
                                    size="small"
                                >
                                    Select all
                                </Button>
                                <Button
                                    onClick={() => setSelected(new Set())}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault();
                                            setSelected(new Set());
                                        }
                                    }}
                                    size="small"
                                >
                                    Deselect all
                                </Button>
                                <Button
                                    onClick={() =>
                                        setSelected((current) =>
                                            selectVisibleResults(
                                                current,
                                                visibleResults,
                                                "invert",
                                            ),
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault();
                                            setSelected((current) =>
                                                selectVisibleResults(
                                                    current,
                                                    visibleResults,
                                                    "invert",
                                                ),
                                            );
                                        }
                                    }}
                                    size="small"
                                >
                                    Invert selection
                                </Button>
                            </Stack>
                            <Stack
                                alignItems="center"
                                data-testid="results-download-actions"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                            >
                                {onSaveSearch && (
                                    <Button
                                        disabled={savingSearch}
                                        id="save-search"
                                        onClick={() => void onSaveSearch()}
                                        size="small"
                                    >
                                        {savingSearch
                                            ? "Saving search…"
                                            : "Save search"}
                                    </Button>
                                )}
                                {dialogs !== null && toasts !== null && (
                                    <DownloadActions
                                        onDownloaded={(ids) => {
                                            const affected = data.searchResults
                                                .filter((result) =>
                                                    ids.includes(
                                                        Number(
                                                            downloadIdFor(
                                                                result,
                                                            ).split(".")[0],
                                                        ),
                                                    ),
                                                )
                                                .map(
                                                    (result) =>
                                                        result.searchResultId,
                                                );
                                            setDownloadedIds(
                                                (current) =>
                                                    new Set([
                                                        ...current,
                                                        ...affected,
                                                    ]),
                                            );
                                            setSelected(
                                                (current) =>
                                                    new Set(
                                                        [...current].filter(
                                                            (id) =>
                                                                !affected.includes(
                                                                    id,
                                                                ),
                                                        ),
                                                    ),
                                            );
                                        }}
                                        results={data.searchResults.filter(
                                            (result) =>
                                                selected.has(
                                                    result.searchResultId,
                                                ),
                                        )}
                                        safeConfig={safeConfig}
                                    />
                                )}
                            </Stack>
                            <Stack
                                alignItems="flex-end"
                                data-testid="results-filters"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                            >
                                <TextField
                                    label="Filter titles"
                                    size="small"
                                    slotProps={{
                                        htmlInput: {
                                            "data-testid":
                                                "freetext-filter-title",
                                        },
                                    }}
                                    value={filters.title}
                                    onChange={(event) =>
                                        setFilters((current) => ({
                                            ...current,
                                            title: event.target.value,
                                        }))
                                    }
                                />
                                <MultiFilter
                                    label="Indexer"
                                    testId="filter-toggle-indexer"
                                    entries={data.searchResults.map(
                                        (result) => result.indexer,
                                    )}
                                    selected={filters.indexers}
                                    onChange={(indexers) =>
                                        setFilters((current) => ({
                                            ...current,
                                            indexers,
                                        }))
                                    }
                                />
                                <MultiFilter
                                    label="Category"
                                    testId="filter-toggle-category"
                                    entries={data.searchResults.map(
                                        (result) => result.category,
                                    )}
                                    selected={filters.categories}
                                    onChange={(categories) =>
                                        setFilters((current) => ({
                                            ...current,
                                            categories,
                                        }))
                                    }
                                />
                                <NumericFilter
                                    label="Size (MB)"
                                    name="size"
                                    range={filters.size}
                                    onChange={updateRange}
                                    onClear={clearRange}
                                />
                                <NumericFilter
                                    label="Grabs / seeders"
                                    name="grabs"
                                    range={filters.grabs}
                                    onChange={updateRange}
                                    onClear={clearRange}
                                />
                                <NumericFilter
                                    label="Age (days)"
                                    name="age"
                                    range={filters.age}
                                    onChange={updateRange}
                                    onClear={clearRange}
                                />
                            </Stack>
                            {quickFilters.length > 0 && (
                                <Stack
                                    data-testid="results-quick-filters"
                                    direction="row"
                                    flexWrap="wrap"
                                    gap={1}
                                >
                                    {quickFilters.map((filter) => (
                                        <Button
                                            aria-pressed={
                                                filters.quickFilters[
                                                    quickFilterKey(filter)
                                                ] ?? false
                                            }
                                            key={`${filter.group}-${filter.id}`}
                                            onClick={() =>
                                                setFilters((current) => ({
                                                    ...current,
                                                    quickFilters: {
                                                        ...current.quickFilters,
                                                        [quickFilterKey(
                                                            filter,
                                                        )]:
                                                            !current
                                                                .quickFilters[
                                                                quickFilterKey(
                                                                    filter,
                                                                )
                                                            ],
                                                    },
                                                }))
                                            }
                                            size="small"
                                            variant={
                                                filters.quickFilters[
                                                    quickFilterKey(filter)
                                                ]
                                                    ? "contained"
                                                    : "outlined"
                                            }
                                        >
                                            {filter.label}
                                        </Button>
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    </Paper>
                    {filteredResults.length === 0 && (
                        <Typography component="h2" variant="h6">
                            All results are currently filtered
                        </Typography>
                    )}
                    <Box sx={{maxWidth: "100%", overflowX: "auto"}}>
                        <Table
                            data-testid="search-results-table"
                            sx={(theme) => ({
                                tableLayout: "fixed",
                                width: "100%",
                                [theme.breakpoints.down("sm")]: {
                                    display: "block",
                                    "& thead": {display: "none"},
                                    "& tbody": {display: "block"},
                                    "& tr": {
                                        borderTop: `2px solid ${theme.palette.divider}`,
                                        display: "block",
                                        "&:first-of-type": {
                                            borderTop: "none",
                                        },
                                    },
                                    "& td": {
                                        alignItems: "center",
                                        border: "none",
                                        display: "flex",
                                        flexDirection: "row",
                                        gap: 1,
                                        justifyContent: "space-between",
                                        textAlign: "right",
                                        "&::before": {
                                            color: theme.palette.text.secondary,
                                            content: "attr(data-label)",
                                            fontSize: "0.7rem",
                                            fontWeight: 700,
                                            textAlign: "left",
                                            textTransform: "uppercase",
                                        },
                                    },
                                    '& td[data-label="Title"]': {
                                        display: "block",
                                        textAlign: "left",
                                    },
                                    '& td[data-label="Title"]::before': {
                                        content: "none",
                                    },
                                },
                            })}
                        >
                            <colgroup>
                                <col style={{width: 40}} />
                                <col style={{width: "27%"}} />
                                <col style={{width: "11%"}} />
                                <col style={{width: "13%"}} />
                                <col style={{width: "8%"}} />
                                <col style={{width: "10%"}} />
                                <col style={{width: "10%"}} />
                                <col style={{width: "16%"}} />
                            </colgroup>
                            <TableHead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        <TableCell
                                            data-label="Select"
                                            padding="checkbox"
                                        />
                                        {headerGroup.headers.map((header) => {
                                            const isTitle =
                                                header.column.id === "title";
                                            const label =
                                                typeof header.column.columnDef
                                                    .header === "string"
                                                    ? header.column.columnDef
                                                          .header
                                                    : undefined;
                                            const sortDirection =
                                                header.column.getIsSorted();
                                            return (
                                                <TableCell
                                                    align={
                                                        isTitle
                                                            ? "left"
                                                            : "right"
                                                    }
                                                    aria-sort={
                                                        sortDirection === "asc"
                                                            ? "ascending"
                                                            : sortDirection ===
                                                                "desc"
                                                              ? "descending"
                                                              : "none"
                                                    }
                                                    data-label={label}
                                                    key={header.id}
                                                    sx={{
                                                        overflow: "hidden",
                                                        px: 1,
                                                        textOverflow:
                                                            "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {header.isPlaceholder ? null : (
                                                        <Button
                                                            aria-label={`${
                                                                label ?? ""
                                                            }${
                                                                sortDirection ===
                                                                "asc"
                                                                    ? " (ascending)"
                                                                    : sortDirection ===
                                                                        "desc"
                                                                      ? " (descending)"
                                                                      : ""
                                                            }`}
                                                            data-sort-direction={
                                                                sortDirection ||
                                                                "none"
                                                            }
                                                            data-testid={`sort-${header.column.id}`}
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            size="small"
                                                            sx={{
                                                                display:
                                                                    "block",
                                                                maxWidth:
                                                                    "100%",
                                                                minWidth: 0,
                                                                overflow:
                                                                    "hidden",
                                                                px: 0.5,
                                                                textAlign:
                                                                    isTitle
                                                                        ? "left"
                                                                        : "right",
                                                                textOverflow:
                                                                    "ellipsis",
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {flexRender(
                                                                header.column
                                                                    .columnDef
                                                                    .header,
                                                                header.getContext(),
                                                            )}
                                                            {sortDirection && (
                                                                <Box
                                                                    aria-hidden="true"
                                                                    component="span"
                                                                >
                                                                    {sortDirection ===
                                                                    "asc"
                                                                        ? " ▲"
                                                                        : " ▼"}
                                                                </Box>
                                                            )}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell
                                            align="right"
                                            data-label="Actions"
                                            sx={{whiteSpace: "nowrap"}}
                                        >
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableHead>
                            <TableBody>
                                {groups.flatMap((group, groupIndex) =>
                                    group.duplicateGroups.flatMap(
                                        (duplicates, duplicateIndex) => {
                                            const first = duplicates[0];
                                            const duplicateKey =
                                                duplicateGroupKey(
                                                    group.key,
                                                    first,
                                                );
                                            const titleExpanded =
                                                expandedTitles.has(group.key);
                                            const duplicateExpanded =
                                                expandedDuplicates.has(
                                                    duplicateKey,
                                                );
                                            if (
                                                duplicateIndex > 0 &&
                                                !titleExpanded
                                            ) {
                                                return [];
                                            }
                                            return duplicates
                                                .filter(
                                                    (_, index) =>
                                                        index === 0 ||
                                                        duplicateExpanded,
                                                )
                                                .map((result, index) => {
                                                    const row = table
                                                        .getRowModel()
                                                        .rows.find(
                                                            (candidate) =>
                                                                candidate
                                                                    .original
                                                                    .searchResultId ===
                                                                result.searchResultId,
                                                        );
                                                    if (!row) {
                                                        return null;
                                                    }
                                                    const nestingLevel =
                                                        (duplicateIndex > 0
                                                            ? 1
                                                            : 0) +
                                                        (index > 0 ? 1 : 0);
                                                    const isNewGroup =
                                                        groupIndex > 0 &&
                                                        duplicateIndex === 0 &&
                                                        index === 0;
                                                    return (
                                                        <TableRow
                                                            data-result-id={
                                                                result.searchResultId
                                                            }
                                                            data-result-title={
                                                                result.title
                                                            }
                                                            data-nesting-level={
                                                                nestingLevel
                                                            }
                                                            data-testid="search-result-row"
                                                            key={
                                                                result.searchResultId
                                                            }
                                                            sx={{
                                                                bgcolor:
                                                                    nestingLevel >
                                                                    0
                                                                        ? "action.hover"
                                                                        : undefined,
                                                                borderTopColor:
                                                                    isNewGroup
                                                                        ? "divider"
                                                                        : undefined,
                                                                borderTopStyle:
                                                                    isNewGroup
                                                                        ? "solid"
                                                                        : undefined,
                                                                borderTopWidth:
                                                                    isNewGroup
                                                                        ? 2
                                                                        : undefined,
                                                            }}
                                                        >
                                                            <TableCell
                                                                data-label="Select"
                                                                padding="checkbox"
                                                            >
                                                                <Checkbox
                                                                    checked={selected.has(
                                                                        result.searchResultId,
                                                                    )}
                                                                    inputProps={{
                                                                        "aria-label": `Select ${result.title}`,
                                                                    }}
                                                                    onChange={(
                                                                        event,
                                                                    ) => {
                                                                        updateSelection(
                                                                            result.searchResultId,
                                                                            event
                                                                                .target
                                                                                .checked,
                                                                            (
                                                                                event.nativeEvent as MouseEvent
                                                                            )
                                                                                .shiftKey,
                                                                        );
                                                                    }}
                                                                    onKeyDown={(
                                                                        event,
                                                                    ) => {
                                                                        if (
                                                                            event.key ===
                                                                            " "
                                                                        ) {
                                                                            event.preventDefault();
                                                                            updateSelection(
                                                                                result.searchResultId,
                                                                                !selected.has(
                                                                                    result.searchResultId,
                                                                                ),
                                                                                event.shiftKey,
                                                                            );
                                                                        }
                                                                    }}
                                                                    size="small"
                                                                />
                                                            </TableCell>
                                                            {row
                                                                .getVisibleCells()
                                                                .map((cell) => {
                                                                    const isTitle =
                                                                        cell
                                                                            .column
                                                                            .id ===
                                                                        "title";
                                                                    const label =
                                                                        typeof cell
                                                                            .column
                                                                            .columnDef
                                                                            .header ===
                                                                        "string"
                                                                            ? cell
                                                                                  .column
                                                                                  .columnDef
                                                                                  .header
                                                                            : undefined;
                                                                    return (
                                                                        <TableCell
                                                                            align={
                                                                                isTitle
                                                                                    ? "left"
                                                                                    : "right"
                                                                            }
                                                                            data-label={
                                                                                label
                                                                            }
                                                                            data-testid={
                                                                                isTitle
                                                                                    ? "search-result-title"
                                                                                    : undefined
                                                                            }
                                                                            key={
                                                                                cell.id
                                                                            }
                                                                            sx={{
                                                                                pl: isTitle
                                                                                    ? 2 +
                                                                                      nestingLevel *
                                                                                          2
                                                                                    : undefined,
                                                                                whiteSpace:
                                                                                    isTitle
                                                                                        ? "normal"
                                                                                        : "nowrap",
                                                                            }}
                                                                        >
                                                                            {isTitle ? (
                                                                                <Stack
                                                                                    alignItems="center"
                                                                                    direction="row"
                                                                                    flexWrap="wrap"
                                                                                    gap={
                                                                                        0.5
                                                                                    }
                                                                                >
                                                                                    {index ===
                                                                                        0 &&
                                                                                        duplicateIndex ===
                                                                                            0 &&
                                                                                        group
                                                                                            .duplicateGroups
                                                                                            .length >
                                                                                            1 && (
                                                                                            <Button
                                                                                                aria-expanded={
                                                                                                    titleExpanded
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    setExpandedTitles(
                                                                                                        (
                                                                                                            current,
                                                                                                        ) =>
                                                                                                            toggleSet(
                                                                                                                current,
                                                                                                                group.key,
                                                                                                            ),
                                                                                                    )
                                                                                                }
                                                                                                onKeyDown={(
                                                                                                    event,
                                                                                                ) => {
                                                                                                    if (
                                                                                                        event.key ===
                                                                                                            "Enter" ||
                                                                                                        event.key ===
                                                                                                            " "
                                                                                                    ) {
                                                                                                        event.preventDefault();
                                                                                                        setExpandedTitles(
                                                                                                            (
                                                                                                                current,
                                                                                                            ) =>
                                                                                                                toggleSet(
                                                                                                                    current,
                                                                                                                    group.key,
                                                                                                                ),
                                                                                                        );
                                                                                                    }
                                                                                                }}
                                                                                                size="small"
                                                                                            >
                                                                                                {titleExpanded
                                                                                                    ? "Collapse group"
                                                                                                    : "Expand group"}
                                                                                            </Button>
                                                                                        )}
                                                                                    {index ===
                                                                                        0 &&
                                                                                        duplicates.length >
                                                                                            1 && (
                                                                                            <Button
                                                                                                aria-expanded={
                                                                                                    duplicateExpanded
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    setExpandedDuplicates(
                                                                                                        (
                                                                                                            current,
                                                                                                        ) =>
                                                                                                            toggleSet(
                                                                                                                current,
                                                                                                                duplicateKey,
                                                                                                            ),
                                                                                                    )
                                                                                                }
                                                                                                onKeyDown={(
                                                                                                    event,
                                                                                                ) => {
                                                                                                    if (
                                                                                                        event.key ===
                                                                                                            "Enter" ||
                                                                                                        event.key ===
                                                                                                            " "
                                                                                                    ) {
                                                                                                        event.preventDefault();
                                                                                                        setExpandedDuplicates(
                                                                                                            (
                                                                                                                current,
                                                                                                            ) =>
                                                                                                                toggleSet(
                                                                                                                    current,
                                                                                                                    duplicateKey,
                                                                                                                ),
                                                                                                        );
                                                                                                    }
                                                                                                }}
                                                                                                size="small"
                                                                                            >
                                                                                                {duplicateExpanded
                                                                                                    ? "Collapse duplicates"
                                                                                                    : "Expand duplicates"}
                                                                                            </Button>
                                                                                        )}
                                                                                    <Box>
                                                                                        {flexRender(
                                                                                            cell
                                                                                                .column
                                                                                                .columnDef
                                                                                                .cell,
                                                                                            cell.getContext(),
                                                                                        )}
                                                                                    </Box>
                                                                                </Stack>
                                                                            ) : (
                                                                                flexRender(
                                                                                    cell
                                                                                        .column
                                                                                        .columnDef
                                                                                        .cell,
                                                                                    cell.getContext(),
                                                                                )
                                                                            )}
                                                                        </TableCell>
                                                                    );
                                                                })}
                                                            <TableCell
                                                                align="right"
                                                                data-label="Actions"
                                                            >
                                                                <Stack
                                                                    alignItems={{
                                                                        xs: "center",
                                                                        sm: "flex-end",
                                                                    }}
                                                                    direction={{
                                                                        xs: "row",
                                                                        sm: "column",
                                                                    }}
                                                                    flexWrap="wrap"
                                                                    gap={0.5}
                                                                    justifyContent="flex-end"
                                                                >
                                                                    <DirectDownloadActions
                                                                        onDownloaded={() =>
                                                                            setDownloadedIds(
                                                                                (
                                                                                    current,
                                                                                ) =>
                                                                                    new Set(
                                                                                        [
                                                                                            ...current,
                                                                                            result.searchResultId,
                                                                                        ],
                                                                                    ),
                                                                            )
                                                                        }
                                                                        result={
                                                                            result
                                                                        }
                                                                    />
                                                                    {downloadedIds.has(
                                                                        result.searchResultId,
                                                                    ) && (
                                                                        <Chip
                                                                            color="success"
                                                                            label="Downloaded"
                                                                            size="small"
                                                                            variant="outlined"
                                                                        />
                                                                    )}
                                                                </Stack>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                });
                                        },
                                    ),
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </>
            )}
        </Stack>
    );

    function updateSelection(
        resultId: string,
        checked: boolean,
        shiftKey: boolean,
    ) {
        setSelected((current) =>
            selectionAfterClick(
                current,
                visibleResults,
                resultId,
                checked,
                lastSelectedId,
                shiftKey,
            ),
        );
        setLastSelectedId(resultId);
    }
}

function MultiFilter({
    label,
    testId,
    entries,
    selected,
    onChange,
}: {
    label: string;
    testId: string;
    entries: string[];
    selected: string[];
    onChange: (values: string[]) => void;
}) {
    const uniqueEntries = [...new Set(entries)].sort();
    return (
        <Box data-testid={testId}>
            <Typography variant="subtitle2">{label}</Typography>
            {uniqueEntries.map((entry) => (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selected.includes(entry)}
                            onChange={(event) =>
                                onChange(
                                    event.target.checked
                                        ? [...selected, entry]
                                        : selected.filter(
                                              (value) => value !== entry,
                                          ),
                                )
                            }
                            size="small"
                        />
                    }
                    key={entry}
                    label={entry}
                />
            ))}
        </Box>
    );
}

function NumericFilter({
    label,
    name,
    range,
    onChange,
    onClear,
}: {
    label: string;
    name: "size" | "grabs" | "age";
    range: NumericRange;
    onChange: (
        name: "size" | "grabs" | "age",
        bound: keyof NumericRange,
        value: string,
    ) => void;
    onClear: (name: "size" | "grabs" | "age") => void;
}) {
    return (
        <Stack data-testid={`filter-toggle-${name}`} direction="row" gap={1}>
            <TextField
                label={`${label} minimum`}
                onChange={(event) => onChange(name, "min", event.target.value)}
                size="small"
                slotProps={{
                    htmlInput: {"data-testid": `number-filter-min-${name}`},
                }}
                type="number"
                value={range.min}
            />
            <TextField
                label={`${label} maximum`}
                onChange={(event) => onChange(name, "max", event.target.value)}
                size="small"
                slotProps={{
                    htmlInput: {"data-testid": `number-filter-max-${name}`},
                }}
                type="number"
                value={range.max}
            />
            <Button data-testid={`number-filter-apply-${name}`} size="small">
                Apply
            </Button>
            <Button
                data-testid={`number-filter-clear-${name}`}
                onClick={() => onClear(name)}
                size="small"
            >
                Clear
            </Button>
        </Stack>
    );
}

function loadChoices(): StoredChoices {
    try {
        const value: unknown = JSON.parse(
            getStorage()?.getItem(STORAGE_KEY) ?? "null",
        );
        return isRecord(value) ? (value as StoredChoices) : {};
    } catch {
        return {};
    }
}

function getStorage(): Storage | undefined {
    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
}

function toggleSet(values: ReadonlySet<string>, value: string): Set<string> {
    const next = new Set(values);
    if (next.has(value)) {
        next.delete(value);
    } else {
        next.add(value);
    }
    return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function downloadIdFor(result: SearchResult): string {
    return result.downloadId ?? result.searchResultId;
}
