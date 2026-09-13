import {describe, expect, it} from "vitest";

import type {StatsResult} from "../../../api/stats/mainStats";
import {
    averageResponseTimeAcrossIndexers,
    dayOfWeekSeries,
    hourOfDaySeries,
    indexerColumnsEnabled,
    joinIndexerRows,
    overallDownloadSuccessRate,
    totalDownloads,
    totalSearches,
} from "./derivations";

describe("overview tile derivations", () => {
    it("sums searches over searchesPerDayOfWeek", () => {
        const stats: StatsResult = {
            searchesPerDayOfWeek: [
                {day: "Mon", count: 3},
                {day: "Tue", count: 5},
            ],
        };
        expect(totalSearches(stats)).toBe(8);
    });

    it("returns undefined when the source family is absent", () => {
        expect(totalSearches({})).toBeUndefined();
        expect(totalDownloads({})).toBeUndefined();
        expect(overallDownloadSuccessRate({})).toBeUndefined();
        expect(averageResponseTimeAcrossIndexers({})).toBeUndefined();
    });

    it("sums downloads over downloadsPerDayOfWeek", () => {
        expect(
            totalDownloads({
                downloadsPerDayOfWeek: [
                    {day: "Mon", count: 1},
                    {day: "Tue", count: 2},
                ],
            }),
        ).toBe(3);
    });

    it("computes overall download success rate as successful/all across indexers", () => {
        const stats: StatsResult = {
            successfulDownloadsPerIndexer: [
                {
                    indexerName: "A",
                    countAll: 10,
                    countSuccessful: 8,
                    countError: 2,
                },
                {
                    indexerName: "B",
                    countAll: 10,
                    countSuccessful: 2,
                    countError: 8,
                },
            ],
        };
        expect(overallDownloadSuccessRate(stats)).toBe(50);
    });

    it("guards against a zero denominator", () => {
        expect(
            overallDownloadSuccessRate({
                successfulDownloadsPerIndexer: [
                    {indexerName: "A", countAll: 0, countSuccessful: 0},
                ],
            }),
        ).toBeUndefined();
    });

    it("averages response time across indexers, unweighted", () => {
        const stats: StatsResult = {
            avgResponseTimes: [
                {indexer: "A", avgResponseTime: 100},
                {indexer: "B", avgResponseTime: 300},
            ],
        };
        expect(averageResponseTimeAcrossIndexers(stats)).toBe(200);
    });
});

describe("joinIndexerRows", () => {
    it("joins every per-indexer family on indexer name", () => {
        const stats: StatsResult = {
            avgResponseTimes: [
                {indexer: "Alpha", avgResponseTime: 100, delta: 5},
            ],
            indexerApiAccessStats: [
                {
                    indexerName: "Alpha",
                    averageAccessesPerDay: 10,
                    percentSuccessful: 90,
                    percentConnectionError: 10,
                },
            ],
            indexerDownloadShares: [
                {indexerName: "Alpha", total: 20, share: 50},
            ],
            successfulDownloadsPerIndexer: [
                {
                    indexerName: "Alpha",
                    countAll: 20,
                    countSuccessful: 18,
                    countError: 2,
                    percentSuccessful: 90,
                },
            ],
            indexerScores: [
                {
                    indexerName: "Alpha",
                    averageUniquenessScore: 4,
                    coveragePercent: 80,
                    uniqueDownloads: 3,
                    involvedSearches: 100,
                    providedDownloads: 80,
                    sharedContribution: 1.5,
                    sharedContributionPercent: 20,
                    correctedObservations: 42,
                },
            ],
        };
        const rows = joinIndexerRows(stats);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            indexerName: "Alpha",
            avgResponseTime: 100,
            responseTimeDelta: 5,
            apiAccessesPerDay: 10,
            downloadShare: 50,
            downloadSuccessPercent: 90,
            uniquenessScore: 4,
            observations: 42,
        });
    });

    it("gives an indexer present in only one family its own row with the rest undefined", () => {
        const rows = joinIndexerRows({
            avgResponseTimes: [{indexer: "OnlyHere", avgResponseTime: 42}],
        });
        expect(rows).toEqual([
            expect.objectContaining({
                indexerName: "OnlyHere",
                avgResponseTime: 42,
            }),
        ]);
        expect(rows[0]?.downloadShare).toBeUndefined();
    });

    it("sorts rows case-insensitively by indexer name", () => {
        const rows = joinIndexerRows({
            avgResponseTimes: [{indexer: "banana"}, {indexer: "Apple"}],
        });
        expect(rows.map((row) => row.indexerName)).toEqual(["Apple", "banana"]);
    });

    it("reports which columns a family missing or disabled leaves absent", () => {
        expect(indexerColumnsEnabled({})).toEqual({
            responseTime: false,
            apiAccess: false,
            downloadShare: false,
            downloadSuccess: false,
            uniqueness: false,
        });
        expect(indexerColumnsEnabled({avgResponseTimes: []}).responseTime).toBe(
            true,
        );
    });
});

describe("dayOfWeekSeries", () => {
    it("orders by calendar order regardless of response order, zero-filling absent days", () => {
        const series = dayOfWeekSeries([
            {day: "Wed", count: 3},
            {day: "Mon", count: 1},
        ]);
        expect(series?.categories).toEqual([
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
        ]);
        expect(series?.values).toEqual([1, 0, 3, 0, 0, 0, 0]);
    });

    it("returns undefined when the family is absent", () => {
        expect(dayOfWeekSeries(undefined)).toBeUndefined();
    });
});

describe("hourOfDaySeries", () => {
    it("orders 0 through 23 in clock order, zero-filling absent hours", () => {
        const series = hourOfDaySeries([{hour: 5, count: 2}]);
        expect(series?.categories[0]).toBe("0");
        expect(series?.categories[23]).toBe("23");
        expect(series?.values[5]).toBe(2);
        expect(series?.values[0]).toBe(0);
    });
});
