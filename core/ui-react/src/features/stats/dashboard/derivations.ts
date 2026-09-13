import type {
    CountPerDayOfWeek,
    CountPerHourOfDay,
    StatsResult,
} from "../../../api/stats/mainStats";

function sum(values: (number | undefined)[]): number {
    return values.reduce((total: number, value) => total + (value ?? 0), 0);
}

/** Overview tile: total searches, summed over `searchesPerDayOfWeek`. */
export function totalSearches(stats: StatsResult): number | undefined {
    if (!stats.searchesPerDayOfWeek) return undefined;
    return sum(stats.searchesPerDayOfWeek.map((entry) => entry.count));
}

/** Overview tile: total downloads, summed over `downloadsPerDayOfWeek`. */
export function totalDownloads(stats: StatsResult): number | undefined {
    if (!stats.downloadsPerDayOfWeek) return undefined;
    return sum(stats.downloadsPerDayOfWeek.map((entry) => entry.count));
}

/**
 * Overview tile: overall download success rate, summed over
 * `successfulDownloadsPerIndexer` (successful / all across every indexer,
 * not an average of per-indexer percentages).
 */
export function overallDownloadSuccessRate(
    stats: StatsResult,
): number | undefined {
    const entries = stats.successfulDownloadsPerIndexer;
    if (!entries || entries.length === 0) return undefined;
    const all = sum(entries.map((entry) => entry.countAll));
    const successful = sum(entries.map((entry) => entry.countSuccessful));
    if (all <= 0) return undefined;
    return (successful / all) * 100;
}

/**
 * Overview tile: mean response time across indexers (an across-indexer
 * average, not weighted by request volume -- `avgResponseTimes` carries no
 * volume figure to weight by).
 */
export function averageResponseTimeAcrossIndexers(
    stats: StatsResult,
): number | undefined {
    const entries = stats.avgResponseTimes;
    if (!entries || entries.length === 0) return undefined;
    const values = entries
        .map((entry) => entry.avgResponseTime)
        .filter((value): value is number => value !== undefined);
    if (values.length === 0) return undefined;
    return sum(values) / values.length;
}

export type IndexerRow = {
    indexerName: string;
    avgResponseTime?: number;
    responseTimeDelta?: number;
    apiAccessesPerDay?: number;
    apiSuccessPercent?: number;
    apiFailurePercent?: number;
    downloadShare?: number;
    downloadShareTotal?: number;
    downloadSuccessPercent?: number;
    downloadSuccessAll?: number;
    downloadSuccessCount?: number;
    downloadErrorCount?: number;
    uniquenessScore?: number;
    coveragePercent?: number;
    uniqueDownloads?: number;
    involvedSearches?: number;
    providedDownloads?: number;
    sharedContribution?: number;
    sharedContributionPercent?: number;
    observations?: number;
};

/**
 * The Indexers section's consolidated table: every per-indexer family joined
 * on indexer name. A family missing or disabled simply contributes no
 * columns to any row (its fields stay `undefined`); an indexer name present
 * in only one family still gets its own row.
 */
export function joinIndexerRows(stats: StatsResult): IndexerRow[] {
    const rows = new Map<string, IndexerRow>();
    const rowFor = (name: string | undefined): IndexerRow | undefined => {
        if (!name) return undefined;
        let row = rows.get(name);
        if (!row) {
            row = {indexerName: name};
            rows.set(name, row);
        }
        return row;
    };

    for (const entry of stats.avgResponseTimes ?? []) {
        const row = rowFor(entry.indexer);
        if (!row) continue;
        row.avgResponseTime = entry.avgResponseTime;
        row.responseTimeDelta = entry.delta;
    }
    for (const entry of stats.indexerApiAccessStats ?? []) {
        const row = rowFor(entry.indexerName);
        if (!row) continue;
        row.apiAccessesPerDay = entry.averageAccessesPerDay;
        row.apiSuccessPercent = entry.percentSuccessful;
        row.apiFailurePercent = entry.percentConnectionError;
    }
    for (const entry of stats.indexerDownloadShares ?? []) {
        const row = rowFor(entry.indexerName);
        if (!row) continue;
        row.downloadShare = entry.share;
        row.downloadShareTotal = entry.total;
    }
    for (const entry of stats.successfulDownloadsPerIndexer ?? []) {
        const row = rowFor(entry.indexerName);
        if (!row) continue;
        row.downloadSuccessPercent = entry.percentSuccessful;
        row.downloadSuccessAll = entry.countAll;
        row.downloadSuccessCount = entry.countSuccessful;
        row.downloadErrorCount = entry.countError;
    }
    for (const entry of stats.indexerScores ?? []) {
        const row = rowFor(entry.indexerName);
        if (!row) continue;
        row.uniquenessScore = entry.averageUniquenessScore;
        row.coveragePercent = entry.coveragePercent;
        row.uniqueDownloads = entry.uniqueDownloads;
        row.involvedSearches = entry.involvedSearches;
        row.providedDownloads = entry.providedDownloads;
        row.sharedContribution = entry.sharedContribution;
        row.sharedContributionPercent = entry.sharedContributionPercent;
        row.observations = entry.correctedObservations;
    }

    return Array.from(rows.values()).sort((left, right) =>
        left.indexerName.localeCompare(right.indexerName, undefined, {
            sensitivity: "base",
        }),
    );
}

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type CategorySeries = {categories: string[]; values: number[]};

/**
 * Activity section, day-of-week charts: legacy's `DayOfWeek` short names,
 * re-ordered to calendar order (Presentation Structure item 4: "Day/hour
 * ordering is calendar/clock order, not value order") regardless of the
 * order the backend returned them in. A day absent from the response
 * (no activity that day) contributes a zero bar rather than a gap.
 */
export function dayOfWeekSeries(
    entries: CountPerDayOfWeek[] | undefined,
): CategorySeries | undefined {
    if (!entries) return undefined;
    const byDay = new Map(
        entries.map((entry) => [entry.day, entry.count ?? 0]),
    );
    return {
        categories: [...DAY_ORDER],
        values: DAY_ORDER.map((day) => byDay.get(day) ?? 0),
    };
}

/** Activity section, hour-of-day charts: clock order, 0 through 23. */
export function hourOfDaySeries(
    entries: CountPerHourOfDay[] | undefined,
): CategorySeries | undefined {
    if (!entries) return undefined;
    const byHour = new Map(
        entries.map((entry) => [entry.hour, entry.count ?? 0]),
    );
    const hours = Array.from({length: 24}, (_, hour) => hour);
    return {
        categories: hours.map((hour) => String(hour)),
        values: hours.map((hour) => byHour.get(hour) ?? 0),
    };
}

/** True when at least one of the joined table's optional columns has data. */
export function indexerColumnsEnabled(stats: StatsResult) {
    return {
        responseTime: stats.avgResponseTimes !== undefined,
        apiAccess: stats.indexerApiAccessStats !== undefined,
        downloadShare: stats.indexerDownloadShares !== undefined,
        downloadSuccess: stats.successfulDownloadsPerIndexer !== undefined,
        uniqueness: stats.indexerScores !== undefined,
    };
}
