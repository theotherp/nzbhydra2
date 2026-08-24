import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
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
import {ControlsHeader, customDateInputsFor} from "./ControlsHeader";
import {
    rangeForPreset,
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

type FetchStatus = "idle" | "loading" | "error";

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
    const defaultWindow = useMemo(() => defaultStatsWindow(), []);
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

    const [stats, setStats] = useState<StatsResult>({});
    const [status, setStatus] = useState<FetchStatus>("idle");
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [malformedFamilies, setMalformedFamilies] = useState<StatFamily[]>(
        [],
    );
    const requestIdRef = useRef(0);
    const abortRef = useRef<AbortController | undefined>(undefined);

    const fetchFamilies = (
        requested: StatFamilySelection,
        activeRange: DateRange,
        activeIncludeDisabled: boolean,
    ) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const requestId = ++requestIdRef.current;
        setStatus("loading");
        getStats(
            transport,
            {
                after: activeRange.after,
                before: activeRange.before,
                includeDisabled: activeIncludeDisabled,
                families: requested,
            },
            controller.signal,
        )
            .then(({result, malformedFamilies: malformed}) => {
                if (requestIdRef.current !== requestId) return;
                setStats((current) => mergeStats(current, result));
                setMalformedFamilies(malformed);
                setStatus("idle");
                setHasLoadedOnce(true);
            })
            .catch(() => {
                // A superseded request's rejection -- including an abort
                // triggered by the next `fetchFamilies` call above -- is
                // already caught by the staleness check: `requestId` was
                // captured before that call bumped `requestIdRef.current`.
                if (requestIdRef.current !== requestId) return;
                setStatus("error");
                setHasLoadedOnce(true);
            });
    };

    // Initial load and every full-refresh trigger (range or include-disabled
    // change, explicit Refresh): requests every currently selected family.
    // `families` and `fetchFamilies` are deliberately excluded: toggling one
    // family requests only that family (below), not a full refresh, and
    // `fetchFamilies` closes over no state this effect needs to react to.
    useEffect(() => {
        fetchFamilies(families, range, includeDisabled);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range, includeDisabled]);

    const handlePresetChange = (nextPreset: DatePresetId) => {
        setPreset(nextPreset);
        setCustomError(undefined);
        if (nextPreset === "custom") {
            setCustomInputs(customDateInputsFor(range.after, range.before));
            return;
        }
        const nextRange = rangeForPreset(nextPreset);
        if (nextRange) setRange(nextRange);
    };

    const handleCustomChange = (field: "after" | "before", value: string) => {
        const next = {...customInputs, [field]: value};
        setCustomInputs(next);
        const validation = validateCustomRange(next);
        if (validation.valid) {
            setCustomError(undefined);
            setRange(validation.range);
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
            fetchFamilies(
                {...allFamiliesSelected(false), [family]: true},
                range,
                includeDisabled,
            );
        } else {
            // Deselecting skips calculation; the family's stale data is no
            // longer authoritative, so its cards/columns disappear too.
            setStats((current) => ({...current, ...clearedField(family)}));
        }
    };

    const handleRefresh = () => fetchFamilies(families, range, includeDisabled);

    if (!hasLoadedOnce && status === "loading") {
        return <Loading message="Calculating stats…" />;
    }
    if (!hasLoadedOnce && status === "error") {
        return (
            <Stack alignItems="flex-start" component="main" spacing={2}>
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
            <Stack
                alignItems="center"
                direction="row"
                justifyContent="space-between"
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
                    color="text.secondary"
                    data-testid="stats-resolved-range"
                    variant="body2"
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
            {status === "loading" && (
                <Stack direction="row" role="status" spacing={1}>
                    <CircularProgress size={20} />
                    <Typography>Calculating stats…</Typography>
                </Stack>
            )}
            {status === "error" && (
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
