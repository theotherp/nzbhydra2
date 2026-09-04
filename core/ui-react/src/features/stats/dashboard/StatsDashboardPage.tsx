import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {useEffect, useMemo, useRef, useState} from "react";

import {
    allFamiliesSelected,
    defaultStatsWindow,
    getStats,
    STAT_FAMILIES,
    type StatFamily,
    type StatFamilySelection,
    type StatsResult,
} from "../../../api/stats/mainStats";
import {ApiTransport} from "../../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {historyUserInfoType} from "../shared/historyUserInfoType";
import {Loading} from "../shared/Loading";
import {ControlsHeader} from "./ControlsHeader";
import {
    customDateInputsFor,
    rangeForPreset,
    toDateInputValue,
    validateCustomRange,
    type DatePresetId,
    type DateRange,
} from "./dateRange";
import {
    defaultFamilySelection,
    loadFamilySelection,
    loadIncludeDisabled,
    saveFamilySelection,
    saveIncludeDisabled,
} from "./persistence";
import {ActivitySection} from "./sections/ActivitySection";
import {DownloadAgeSection} from "./sections/DownloadAgeSection";
import {IndexersSection} from "./sections/IndexersSection";
import {OverviewTiles} from "./sections/OverviewTiles";
import {SourcesSection} from "./sections/SourcesSection";

// ADR-0051: permanently visible so every user is guaranteed to see it -- no
// dismiss/acknowledge mechanism, and it must render in every one of the
// dashboard's loading/error/loaded returns below, independently of the stats
// query. Previously the info-icon `Popover` in `ControlsHeader`; this is now
// the constant's owner file.
const DISCLAIMER =
    "Don't read too much into these stats. Which indexer is picked for a download depends on its score and some " +
    "more or less random values like posting time of the NZB. They are also heavily influenced by individual " +
    "settings, including indexer priority, search order, free vs. paid accounts, and the type of content being " +
    "searched for.";

function StatsDisclaimer() {
    return (
        <Alert data-testid="stats-disclaimer" severity="info">
            {DISCLAIMER}
        </Alert>
    );
}

/**
 * The dashboard's held state, exactly what `API-STATS-QUERY` describes: one
 * `StatsResult` merged field-by-field from every response so far (never
 * replaced wholesale), plus the families the last response could not be parsed
 * for.
 */
type DashboardData = {
    stats: StatsResult;
    malformedFamilies: StatFamily[];
};

/**
 * The cache identity of a dashboard reading (FM-121).
 *
 * The window is keyed at *day* granularity on purpose. Every preset's range is
 * derived from `new Date()` (`rangeForPreset`, `defaultStatsWindow`), so two
 * mounts a second apart produce ranges that differ by milliseconds; keying on
 * the instants would give every remount a fresh cache entry and the full-page
 * "Calculating stats…" would be back. A day is also the granularity of the
 * Custom range's two `<input type="date">` values.
 *
 * That only holds because `range` itself is truncated to day boundaries
 * before it ever reaches this key or a request (see `truncateToDayBoundary`
 * below): a preset and a Custom range that land on the same two days are, by
 * construction, the same instants -- midnight to midnight -- so sharing one
 * cache entry is correct, not a collision. Without that truncation, a
 * preset's `after`/`before` would carry the mount's time-of-day while
 * Custom's are always midnight (`dateRange.ts`'s `parseDateInput`), so a
 * Custom range prefilled from a preset's own days (`handlePresetChange`'s
 * default entry into Custom) would hash to the same key while actually
 * asking for more hours than the preset's cached reading covered, and would
 * silently be served the narrower data instead of a refetch.
 *
 * `includeDisabled` changes what the backend counts, so it is part of the
 * identity too.
 *
 * `families` is deliberately *not* part of it: toggling one family on requests
 * only that family and merges the response into this same held state, which is
 * legacy's `onStatsSwitchToggle` behavior and would be impossible if the
 * selection identified the entry.
 *
 * One consequence worth being explicit about: re-clicking the already-active
 * preset does not refetch (same days in, same key out, and react-query serves
 * the cached entry within `staleTime`). That is intended, and the escape
 * hatch for a reader who wants a forced re-read is the Refresh control, which
 * calls `query.refetch()` and ignores `staleTime` entirely (see
 * `app/queryDefaults.ts`'s `DEFAULT_QUERY_STALE_TIME_MS` docblock for the
 * staleTime side of that).
 */
function statsQueryKey(range: DateRange, includeDisabled: boolean) {
    return [
        "stats-dashboard",
        toDateInputValue(range.after),
        toDateInputValue(range.before),
        includeDisabled,
    ] as const;
}

/**
 * Floors a date to local midnight. Applied to every preset-derived range
 * before it becomes `range` state, so the key's day granularity and the
 * actual request always agree -- see `statsQueryKey`'s docblock. Custom
 * ranges need no such step: `dateRange.ts`'s `parseDateInput` already parses
 * `<input type="date">` values at midnight.
 */
/**
 * How long the custom date fields wait after the last edit before the range
 * they describe becomes a request. Longer than the history pages' filter
 * debounce because what it defers is a full stats recalculation, and because
 * the value being typed is a date rather than a search term.
 */
const CUSTOM_RANGE_COMMIT_DELAY_MS = 400;

function truncateToDayBoundary(date: Date): Date {
    const truncated = new Date(date);
    truncated.setHours(0, 0, 0, 0);
    return truncated;
}

function truncateRangeToDayBoundary(range: DateRange): DateRange {
    return {
        after: truncateToDayBoundary(range.after),
        before: truncateToDayBoundary(range.before),
    };
}

export function StatsDashboardPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const safeConfig = useSafeConfig(bootstrap);
    const userInfoType = historyUserInfoType(safeConfig);
    const showsUsername =
        userInfoType === "USERNAME" || userInfoType === "BOTH";
    const showsIp = userInfoType === "IP" || userInfoType === "BOTH";

    const [preset, setPreset] = useState<DatePresetId>("last30");
    const defaultWindow = useMemo(
        () => truncateRangeToDayBoundary(defaultStatsWindow()),
        [],
    );
    const [customInputs, setCustomInputs] = useState(() =>
        customDateInputsFor(defaultWindow.after, defaultWindow.before),
    );
    const [customError, setCustomError] = useState<string | undefined>(
        undefined,
    );
    const [range, setRange] = useState<DateRange>(defaultWindow);

    const [includeDisabled, setIncludeDisabled] = useState(
        () => loadIncludeDisabled() ?? false,
    );
    const [families, setFamilies] = useState<StatFamilySelection>(
        () =>
            loadFamilySelection() ??
            defaultFamilySelection(showsUsername, showsIp),
    );

    const queryClient = useQueryClient();
    /**
     * The family selection the *next* fetch must request, when it is not the
     * current selection. Only the single-family toggle sets it, and the fetch
     * that reads it consumes it, so a range change or an explicit Refresh that
     * happens to supersede that fetch goes back to requesting everything
     * selected.
     */
    const nextRequestRef = useRef<StatFamilySelection | undefined>(undefined);
    const customRangeCommit = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );
    useEffect(() => () => clearTimeout(customRangeCommit.current), []);

    const query = useQuery<DashboardData>({
        queryKey: statsQueryKey(range, includeDisabled),
        queryFn: async ({queryKey, signal}) => {
            const requested = nextRequestRef.current ?? families;
            nextRequestRef.current = undefined;
            const {result, malformedFamilies} = await getStats(
                transport,
                {
                    after: range.after,
                    before: range.before,
                    includeDisabled,
                    families: requested,
                },
                signal,
            );
            // `API-STATS-QUERY`: merge field-by-field into whatever is already
            // held for this window, never replace it. A family the backend
            // skipped (its boolean sent `false`) comes back null/absent and
            // must leave the previously held value alone -- that is what makes
            // a single-family request a partial update rather than a reset of
            // every other family to "no data".
            const held = queryClient.getQueryData<DashboardData>(queryKey);
            return {
                stats: mergeStats(held?.stats ?? {}, result),
                malformedFamilies,
            };
        },
        // A window change is a new cache entry; without this the dashboard
        // would fall back to its full-page first-load spinner on every date
        // preset click instead of leaving the previous reading on screen
        // under the inline "Calculating stats…" row.
        placeholderData: keepPreviousData,
        // Legacy surfaces a failed calculation immediately, and the existing
        // Retry affordance is the retry. react-query's default of three silent
        // retries would delay the error banner by seconds instead.
        retry: false,
    });

    const held = query.data;
    // Deselected families are not authoritative, so they never display --
    // independently of whether their stale values are still in the cache
    // entry, which now outlives this component.
    const stats = useMemo(
        () => visibleStats(held?.stats ?? {}, families),
        [held, families],
    );
    const malformedFamilies = held?.malformedFamilies ?? [];
    const isFetching = query.isFetching;
    const hasLoadedOnce = held !== undefined;

    /**
     * Every full-refresh trigger -- the explicit Refresh control and the Retry
     * affordances: requests every currently selected family for the current
     * window. A range or include-disabled change does not come through here;
     * it changes the cache key, and react-query issues the request itself.
     */
    const handleRefresh = () => {
        nextRequestRef.current = undefined;
        void query.refetch();
    };

    const handlePresetChange = (nextPreset: DatePresetId) => {
        clearTimeout(customRangeCommit.current);
        setPreset(nextPreset);
        setCustomError(undefined);
        if (nextPreset === "custom") {
            setCustomInputs(customDateInputsFor(range.after, range.before));
            return;
        }
        const nextRange = rangeForPreset(nextPreset);
        if (nextRange) setRange(truncateRangeToDayBoundary(nextRange));
    };

    /**
     * A custom range is adopted `CUSTOM_RANGE_COMMIT_DELAY_MS` after the last
     * edit, not on the edit itself. A `<input type="date">` reports every
     * intermediate value the reader types, and most of them parse: typing the
     * year of "2024-01-01" walks through 0002, 0020 and 0202, each a valid
     * range, each a new query key, each a full multi-second stats
     * recalculation on the server. The validation message stays immediate --
     * it costs nothing and it is what tells the reader the range is not
     * finished. Presets are unaffected: they set the range directly, and
     * switching to one cancels a pending adoption.
     */
    const handleCustomChange = (field: "after" | "before", value: string) => {
        const next = {...customInputs, [field]: value};
        setCustomInputs(next);
        const validation = validateCustomRange(next);
        clearTimeout(customRangeCommit.current);
        if (validation.valid) {
            setCustomError(undefined);
            const adopted = validation.range;
            customRangeCommit.current = setTimeout(
                () => setRange(adopted),
                CUSTOM_RANGE_COMMIT_DELAY_MS,
            );
        } else {
            setCustomError(validation.error);
        }
    };

    const handleIncludeDisabledChange = (value: boolean) => {
        setIncludeDisabled(value);
        saveIncludeDisabled(value);
    };

    const handleFamilyToggle = (family: StatFamily) => {
        const enabling = !families[family];
        const nextFamilies = {...families, [family]: enabling};
        setFamilies(nextFamilies);
        saveFamilySelection(nextFamilies);
        if (enabling) {
            // Legacy's `onStatsSwitchToggle`: re-enabling requests only the
            // newly enabled family and merges it into held state.
            nextRequestRef.current = {
                ...allFamiliesSelected(false),
                [family]: true,
            };
            void query.refetch();
        } else {
            // Deselecting skips calculation; the family's stale data is no
            // longer authoritative, so it is dropped from held state too.
            queryClient.setQueryData<DashboardData>(
                statsQueryKey(range, includeDisabled),
                (current) =>
                    current === undefined
                        ? current
                        : {
                              ...current,
                              stats: {
                                  ...current.stats,
                                  ...clearedField(family),
                              },
                          },
            );
        }
    };

    if (!hasLoadedOnce && isFetching) {
        return (
            <>
                <StatsDisclaimer />
                <Loading message="Calculating stats…" />
            </>
        );
    }
    if (!hasLoadedOnce && query.isError) {
        return (
            <Stack
                component="main"
                spacing={2}
                sx={{
                    alignItems: "flex-start",
                }}
            >
                <StatsDisclaimer />
                <Typography component="h1" variant="h4">
                    Statistics
                </Typography>
                <Alert severity="error">Unable to load statistics.</Alert>
                <Button onClick={handleRefresh} variant="outlined">
                    Retry
                </Button>
            </Stack>
        );
    }

    return (
        <Stack component="main" data-testid="stats-dashboard" spacing={3}>
            <StatsDisclaimer />
            <Stack
                direction="row"
                sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Typography component="h1" variant="h4">
                    Statistics
                </Typography>
            </Stack>
            <ControlsHeader
                customAfter={customInputs.after}
                customBefore={customInputs.before}
                customError={customError}
                families={families}
                includeDisabled={includeDisabled}
                onCustomChange={handleCustomChange}
                onFamilyToggle={handleFamilyToggle}
                onIncludeDisabledChange={handleIncludeDisabledChange}
                onPresetChange={handlePresetChange}
                onRefresh={handleRefresh}
                preset={preset}
            />
            {stats.after && stats.before && (
                <Typography
                    data-testid="stats-resolved-range"
                    variant="body2"
                    sx={{
                        color: "text.secondary",
                    }}
                >
                    Showing data from{" "}
                    {formatServerDateTime(
                        stats.after.toISOString(),
                        bootstrap.serverTimeZone,
                    )}{" "}
                    to{" "}
                    {formatServerDateTime(
                        stats.before.toISOString(),
                        bootstrap.serverTimeZone,
                    )}
                    .
                </Typography>
            )}
            {/*
             * A constant-height slot, not a conditional row: this indicator
             * used to be inserted above the table when a fetch started and
             * removed when it ended, moving everything below it by its own
             * height twice per refresh -- under the reader's pointer, and for
             * every filter commit. The row is always in the layout (and is
             * always the same live region); only its contents come and go.
             */}
            <Stack
                direction="row"
                role="status"
                spacing={1}
                sx={{minHeight: (theme) => theme.spacing(3)}}
            >
                {isFetching && (
                    <>
                        <CircularProgress size={20} />
                        <Typography>Calculating stats…</Typography>
                    </>
                )}
            </Stack>
            {query.isError && (
                <Alert
                    action={
                        <Button
                            color="inherit"
                            onClick={handleRefresh}
                            size="small"
                        >
                            Retry
                        </Button>
                    }
                    severity="error"
                >
                    The last refresh failed; showing previously loaded
                    statistics.
                </Alert>
            )}
            {malformedFamilies.length > 0 && (
                <Alert severity="warning">
                    Some statistics could not be displayed:{" "}
                    {malformedFamilies.join(", ")}.
                </Alert>
            )}
            {STAT_FAMILIES.every((family) => !families[family]) ? (
                <Alert severity="info">
                    No statistics are selected. Choose at least one under
                    "Statistics" to see results.
                </Alert>
            ) : isEmpty(stats, families) ? (
                <Alert severity="info">
                    No statistics are available for the selected range.
                </Alert>
            ) : (
                <>
                    <OverviewTiles stats={stats} />
                    <IndexersSection stats={stats} />
                    <ActivitySection stats={stats} />
                    <SourcesSection
                        showsIp={showsIp}
                        showsUsername={showsUsername}
                        stats={stats}
                    />
                    <DownloadAgeSection stats={stats} />
                </>
            )}
        </Stack>
    );
}

function mergeStats(current: StatsResult, incoming: StatsResult): StatsResult {
    const merged: StatsResult = {...current};
    for (const key of Object.keys(incoming) as (keyof StatsResult)[]) {
        const value = incoming[key];
        if (value !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic merge over a heterogeneous field map.
            (merged as any)[key] = value;
        }
    }
    return merged;
}

/**
 * The held reading as this render may show it: a family the user has
 * deselected contributes nothing, whatever the cache still holds for it. The
 * cache entry outlives the component now, so it can be re-read on a later
 * visit carrying a family that was deselected in the meantime (the selection
 * lives in `localStorage`, not in the cache key).
 */
function visibleStats(
    stats: StatsResult,
    families: StatFamilySelection,
): StatsResult {
    const visible: StatsResult = {...stats};
    for (const family of STAT_FAMILIES) {
        if (!families[family]) {
            visible[FAMILY_TO_RESULT_FIELD[family]] = undefined;
        }
    }
    return visible;
}

function clearedField(family: StatFamily): Partial<StatsResult> {
    const field = FAMILY_TO_RESULT_FIELD[family];
    return {[field]: undefined};
}

const FAMILY_TO_RESULT_FIELD: Record<StatFamily, keyof StatsResult> = {
    indexerApiAccessStats: "indexerApiAccessStats",
    avgIndexerUniquenessScore: "indexerScores",
    avgResponseTimes: "avgResponseTimes",
    indexerDownloadShares: "indexerDownloadShares",
    downloadsPerDayOfWeek: "downloadsPerDayOfWeek",
    downloadsPerHourOfDay: "downloadsPerHourOfDay",
    searchesPerDayOfWeek: "searchesPerDayOfWeek",
    searchesPerHourOfDay: "searchesPerHourOfDay",
    downloadsPerAgeStats: "downloadsPerAgeStats",
    successfulDownloadsPerIndexer: "successfulDownloadsPerIndexer",
    downloadSharesPerUser: "downloadSharesPerUser",
    downloadSharesPerIp: "downloadSharesPerIp",
    searchSharesPerUser: "searchSharesPerUser",
    searchSharesPerIp: "searchSharesPerIp",
    userAgentSearchShares: "userAgentSearchShares",
    userAgentDownloadShares: "userAgentDownloadShares",
};

// `stats` always carries `after`/`before` once a request has resolved, so
// counting keys can never detect "no data" -- instead, every currently
// selected family's own field must be absent or an empty array.
function isEmpty(stats: StatsResult, families: StatFamilySelection): boolean {
    return STAT_FAMILIES.filter((family) => families[family]).every(
        (family) => {
            const value = stats[FAMILY_TO_RESULT_FIELD[family]];
            return (
                value === undefined ||
                (Array.isArray(value) && value.length === 0)
            );
        },
    );
}
