import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
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
import {useEffect, useMemo, useState} from "react";

import type {SearchResponse, SearchResult} from "../../../api/search";
import {
    defaultFilters,
    filterResults,
    preselectedQuickFilters,
    quickFilterKey,
    quickFiltersFromSafeConfig,
} from "./resultTable";
import type {NumericRange, ResultFilters} from "./resultTable";

const STORAGE_KEY = "hydra.search-results.table";

type StoredChoices = {sorting?: SortingState; filters?: Partial<ResultFilters>};

export function SearchResults({data}: {data: SearchResponse}) {
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

    useEffect(() => {
        getStorage()?.setItem(STORAGE_KEY, JSON.stringify({sorting, filters}));
    }, [filters, sorting]);

    const allIndexersFailed =
        data.indexerSearchMetaDatas.length > 0 &&
        data.indexerSearchMetaDatas.every((indexer) => !indexer.wasSuccessful);
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
            {data.searchResults.length > 0 && (
                <>
                    <Typography data-testid="search-results-summary">
                        Loaded {data.searchResults.length} (
                        {data.searchResults.length - filteredResults.length}{" "}
                        filtered) of {data.numberOfAvailableResults} results
                        (rejected {data.numberOfRejectedResults})
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        <TextField
                            label="Filter titles"
                            size="small"
                            slotProps={{
                                htmlInput: {
                                    "data-testid": "freetext-filter-title",
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
                        <Stack direction="row" flexWrap="wrap" gap={1}>
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
                                                [quickFilterKey(filter)]:
                                                    !current.quickFilters[
                                                        quickFilterKey(filter)
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
                    {filteredResults.length === 0 && (
                        <Typography component="h2" variant="h6">
                            All results are currently filtered
                        </Typography>
                    )}
                    <Box sx={{maxWidth: "100%", overflowX: "auto"}}>
                        <Table data-testid="search-results-table">
                            <TableHead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableCell
                                                aria-sort={
                                                    header.column.getIsSorted() ===
                                                    "asc"
                                                        ? "ascending"
                                                        : header.column.getIsSorted() ===
                                                            "desc"
                                                          ? "descending"
                                                          : "none"
                                                }
                                                key={header.id}
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <Button
                                                        data-sort-direction={
                                                            header.column.getIsSorted() ||
                                                            "none"
                                                        }
                                                        data-testid={`sort-${header.column.id}`}
                                                        onClick={header.column.getToggleSortingHandler()}
                                                    >
                                                        {flexRender(
                                                            header.column
                                                                .columnDef
                                                                .header,
                                                            header.getContext(),
                                                        )}
                                                        {header.column.getIsSorted() ===
                                                        "asc"
                                                            ? " (ascending)"
                                                            : header.column.getIsSorted() ===
                                                                "desc"
                                                              ? " (descending)"
                                                              : ""}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHead>
                            <TableBody>
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        data-result-title={row.original.title}
                                        data-testid="search-result-row"
                                        key={row.id}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                data-testid={
                                                    cell.column.id === "title"
                                                        ? "search-result-title"
                                                        : undefined
                                                }
                                                key={cell.id}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </>
            )}
        </Stack>
    );
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
            <Button data-testid={`number-filter-apply-${name}`}>Apply</Button>
            <Button
                data-testid={`number-filter-clear-${name}`}
                onClick={() => onClear(name)}
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
