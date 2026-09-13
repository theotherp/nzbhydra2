import {z} from "zod";

import type {paths} from "../generated/openapi";
import {ApiTransport} from "../transport";

/**
 * F-STATS-MAIN / API-STATS-QUERY: the sixteen legacy switches, in the same
 * order the legacy `stats-controller.js` `statsSwichState` object declared
 * them. Every family boolean is sent explicitly on every request (binding
 * data/request parity, FM-024 packet).
 */
export const STAT_FAMILIES = [
    "indexerApiAccessStats",
    "avgIndexerUniquenessScore",
    "avgResponseTimes",
    "indexerDownloadShares",
    "downloadsPerDayOfWeek",
    "downloadsPerHourOfDay",
    "searchesPerDayOfWeek",
    "searchesPerHourOfDay",
    "downloadsPerAgeStats",
    "successfulDownloadsPerIndexer",
    "downloadSharesPerUser",
    "downloadSharesPerIp",
    "searchSharesPerUser",
    "searchSharesPerIp",
    "userAgentSearchShares",
    "userAgentDownloadShares",
] as const;

export type StatFamily = (typeof STAT_FAMILIES)[number];

export type StatFamilySelection = Record<StatFamily, boolean>;

export function allFamiliesSelected(value: boolean): StatFamilySelection {
    return Object.fromEntries(
        STAT_FAMILIES.map((family) => [family, value]),
    ) as StatFamilySelection;
}

export type StatsQuery = {
    after: Date;
    before: Date;
    includeDisabled: boolean;
    families: StatFamilySelection;
};

type StatsRequestBody =
    paths["/internalapi/stats"]["post"]["requestBody"]["content"]["application/json"];

/**
 * The literal request body legacy's `stats-request-service.js` builds:
 * `after`/`before` as ISO instants, `includeDisabled`, and all sixteen family
 * booleans -- always every key, never a partial object, so a
 * deselected family is an explicit `false` the backend uses to skip its
 * calculation (not an omission).
 */
export function buildStatsRequestBody(query: StatsQuery): StatsRequestBody {
    return {
        after: query.after.toISOString(),
        before: query.before.toISOString(),
        includeDisabled: query.includeDisabled,
        ...query.families,
    };
}

const number_ = z.number().finite();
// Jackson serialises with its default ALWAYS inclusion, so a statistic the
// backend could not compute (`Stats.java` leaves the boxed value null — e.g.
// `percentConnectionError` for any indexer that had no connection error)
// arrives as an explicit null, not as an absent key. In zod 4 `.optional()`
// rejects null, and `parseStatsResponse` drops rejected entries silently, so
// both helpers accept null and normalise it to undefined for consumers.
// The trailing `.optional()` is what keeps the *key* optional in the inferred
// type: a bare transform erases that flag and would force every fixture and
// call site to spell out each field.
const nullToUndefined = <T extends z.ZodType>(inner: T) =>
    inner
        .nullish()
        .transform((value) => value ?? undefined)
        .optional();
const optionalNumber = nullToUndefined(number_);
const optionalString = nullToUndefined(z.string());

const indexerApiAccessStatsSchema = z.object({
    indexerName: optionalString,
    percentSuccessful: optionalNumber,
    percentConnectionError: optionalNumber,
    averageAccessesPerDay: optionalNumber,
});
type IndexerApiAccessStatsEntry = z.infer<typeof indexerApiAccessStatsSchema>;

const indexerScoreSchema = z.object({
    indexerName: optionalString,
    averageUniquenessScore: optionalNumber,
    involvedSearches: optionalNumber,
    uniqueDownloads: optionalNumber,
    providedDownloads: optionalNumber,
    coveragePercent: optionalNumber,
    exclusivePercent: optionalNumber,
    sharedContribution: optionalNumber,
    sharedContributionPercent: optionalNumber,
    legacyObservations: optionalNumber,
    correctedObservations: optionalNumber,
});
type IndexerScore = z.infer<typeof indexerScoreSchema>;

const averageResponseTimeSchema = z.object({
    indexer: optionalString,
    avgResponseTime: optionalNumber,
    delta: optionalNumber,
});
type AverageResponseTime = z.infer<typeof averageResponseTimeSchema>;

const indexerDownloadShareSchema = z.object({
    indexerName: optionalString,
    total: optionalNumber,
    share: optionalNumber,
});
type IndexerDownloadShare = z.infer<typeof indexerDownloadShareSchema>;

const countPerDayOfWeekSchema = z.object({
    day: optionalString,
    count: optionalNumber,
});
export type CountPerDayOfWeek = z.infer<typeof countPerDayOfWeekSchema>;

const countPerHourOfDaySchema = z.object({
    hour: optionalNumber,
    count: optionalNumber,
});
export type CountPerHourOfDay = z.infer<typeof countPerHourOfDaySchema>;

const successfulDownloadsPerIndexerSchema = z.object({
    indexerName: optionalString,
    countAll: optionalNumber,
    countSuccessful: optionalNumber,
    countError: optionalNumber,
    percentSuccessful: optionalNumber,
});
type SuccessfulDownloadsPerIndexer = z.infer<
    typeof successfulDownloadsPerIndexerSchema
>;

const shareEntrySchema = z.object({
    key: optionalString,
    count: optionalNumber,
    percentage: optionalNumber,
});
export type ShareEntry = z.infer<typeof shareEntrySchema>;

const userAgentShareSchema = z.object({
    userAgent: optionalString,
    count: optionalNumber,
    percentage: optionalNumber,
});
export type UserAgentShare = z.infer<typeof userAgentShareSchema>;

const downloadPerAgeSchema = z.object({
    age: optionalNumber,
    count: optionalNumber,
});

const downloadPerAgeStatsSchema = z.object({
    percentOlder1000: optionalNumber,
    percentOlder2000: optionalNumber,
    percentOlder3000: optionalNumber,
    averageAge: optionalNumber,
    downloadsPerAge: z.array(downloadPerAgeSchema).optional(),
});
type DownloadPerAgeStats = z.infer<typeof downloadPerAgeStatsSchema>;

/**
 * The dashboard's held state: every family the response can carry, each
 * `undefined` until its family has been requested and returned at least
 * once. Maps 1:1 to `StatsResponse` fields, except `avgIndexerUniquenessScore`
 * (the request switch) which reads back as `indexerScores`.
 */
export type StatsResult = {
    after?: Date;
    before?: Date;
    numberOfConfiguredIndexers?: number;
    numberOfEnabledIndexers?: number;
    indexerApiAccessStats?: IndexerApiAccessStatsEntry[];
    indexerScores?: IndexerScore[];
    avgResponseTimes?: AverageResponseTime[];
    indexerDownloadShares?: IndexerDownloadShare[];
    downloadsPerDayOfWeek?: CountPerDayOfWeek[];
    downloadsPerHourOfDay?: CountPerHourOfDay[];
    searchesPerDayOfWeek?: CountPerDayOfWeek[];
    searchesPerHourOfDay?: CountPerHourOfDay[];
    downloadsPerAgeStats?: DownloadPerAgeStats;
    successfulDownloadsPerIndexer?: SuccessfulDownloadsPerIndexer[];
    downloadSharesPerUser?: ShareEntry[];
    downloadSharesPerIp?: ShareEntry[];
    searchSharesPerUser?: ShareEntry[];
    searchSharesPerIp?: ShareEntry[];
    userAgentSearchShares?: UserAgentShare[];
    userAgentDownloadShares?: UserAgentShare[];
};

/** The response field each family switch reads back from. */
const RESPONSE_FIELD: Record<StatFamily, keyof StatsResult> = {
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

const ARRAY_SCHEMAS: Partial<
    Record<StatFamily, z.ZodType<{indexerName?: string}> | z.ZodTypeAny>
> = {
    indexerApiAccessStats: indexerApiAccessStatsSchema,
    avgIndexerUniquenessScore: indexerScoreSchema,
    avgResponseTimes: averageResponseTimeSchema,
    indexerDownloadShares: indexerDownloadShareSchema,
    downloadsPerDayOfWeek: countPerDayOfWeekSchema,
    downloadsPerHourOfDay: countPerHourOfDaySchema,
    searchesPerDayOfWeek: countPerDayOfWeekSchema,
    searchesPerHourOfDay: countPerHourOfDaySchema,
    successfulDownloadsPerIndexer: successfulDownloadsPerIndexerSchema,
    downloadSharesPerUser: shareEntrySchema,
    downloadSharesPerIp: shareEntrySchema,
    searchSharesPerUser: shareEntrySchema,
    searchSharesPerIp: shareEntrySchema,
    userAgentSearchShares: userAgentShareSchema,
    userAgentDownloadShares: userAgentShareSchema,
};

export type StatsParseResult = {
    result: StatsResult;
    /** Families whose response payload could not be parsed at all. */
    malformedFamilies: StatFamily[];
};

/**
 * Parses one `POST /internalapi/stats` response into the dashboard's typed,
 * held-state shape. A family the backend skipped (boolean `false` sent) comes
 * back `null`/absent and is left `undefined` here -- callers merge this
 * result into previously held state rather than replacing it, exactly as
 * legacy's `setStats` only overwrote keys whose value was not `null`. A
 * family whose payload does not parse is dropped and reported in
 * `malformedFamilies` rather than throwing, so one bad family cannot fail the
 * whole dashboard; individual malformed entries inside an otherwise valid
 * array are silently skipped.
 */
export function parseStatsResponse(raw: unknown): StatsParseResult {
    if (!raw || typeof raw !== "object") {
        return {
            result: {},
            malformedFamilies: [...STAT_FAMILIES],
        };
    }
    const body = raw as Record<string, unknown>;
    const result: StatsResult = {};
    const after = parseDate(body.after);
    if (after) result.after = after;
    const before = parseDate(body.before);
    if (before) result.before = before;
    if (typeof body.numberOfConfiguredIndexers === "number") {
        result.numberOfConfiguredIndexers = body.numberOfConfiguredIndexers;
    }
    if (typeof body.numberOfEnabledIndexers === "number") {
        result.numberOfEnabledIndexers = body.numberOfEnabledIndexers;
    }

    const malformedFamilies: StatFamily[] = [];
    for (const family of STAT_FAMILIES) {
        const field = RESPONSE_FIELD[family];
        const value = body[field];
        if (value === null || value === undefined) continue;
        if (field === "downloadsPerAgeStats") {
            const parsed = downloadPerAgeStatsSchema.safeParse(value);
            if (parsed.success) {
                result.downloadsPerAgeStats = parsed.data;
            } else {
                malformedFamilies.push(family);
            }
            continue;
        }
        const schema = ARRAY_SCHEMAS[family];
        if (!schema || !Array.isArray(value)) {
            malformedFamilies.push(family);
            continue;
        }
        const entries = [];
        for (const entry of value) {
            const parsed = schema.safeParse(entry);
            if (parsed.success) entries.push(parsed.data);
        }
        // Keyed by a union of the fifteen array field names above; `unknown`
        // (not `any`) keeps this the one deliberately loose assignment.
        (result as unknown as Record<string, unknown[]>)[field] = entries;
    }
    return {result, malformedFamilies};
}

function parseDate(value: unknown): Date | undefined {
    if (typeof value !== "string") return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function getStats(
    transport: ApiTransport,
    query: StatsQuery,
    signal?: AbortSignal,
): Promise<StatsParseResult> {
    const raw = await transport.request<unknown>("internalapi/stats", {
        method: "POST",
        json: buildStatsRequestBody(query),
        signal,
    });
    return parseStatsResponse(raw);
}

/** Legacy's default window: 30 days ago through tomorrow, client-clock. */
export function defaultStatsWindow(now: Date = new Date()): {
    after: Date;
    before: Date;
} {
    const after = new Date(now);
    after.setDate(after.getDate() - 30);
    const before = new Date(now);
    before.setDate(before.getDate() + 1);
    return {after, before};
}
