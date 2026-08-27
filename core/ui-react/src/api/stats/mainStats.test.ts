import {describe, expect, it, vi} from "vitest";

import {
    allFamiliesSelected,
    buildStatsRequestBody,
    defaultStatsWindow,
    getStats,
    parseStatsResponse,
    STAT_FAMILIES,
} from "./mainStats";
import {ApiTransport} from "../transport";

describe("buildStatsRequestBody", () => {
    it("sends every family boolean explicitly, plus after/before/includeDisabled", () => {
        const after = new Date("2026-01-01T00:00:00Z");
        const before = new Date("2026-02-01T00:00:00Z");
        const body = buildStatsRequestBody({
            after,
            before,
            includeDisabled: true,
            families: allFamiliesSelected(true),
        });
        expect(body.after).toBe(after.toISOString());
        expect(body.before).toBe(before.toISOString());
        expect(body.includeDisabled).toBe(true);
        for (const family of STAT_FAMILIES) {
            expect(body[family]).toBe(true);
        }
        expect(Object.keys(body)).toHaveLength(STAT_FAMILIES.length + 3);
    });

    it("sends a deselected family as an explicit false, not an omission", () => {
        const body = buildStatsRequestBody({
            after: new Date(),
            before: new Date(),
            includeDisabled: false,
            families: {
                ...allFamiliesSelected(true),
                avgResponseTimes: false,
            },
        });
        expect(body.avgResponseTimes).toBe(false);
        expect("avgResponseTimes" in body).toBe(true);
    });
});

describe("defaultStatsWindow", () => {
    it("defaults to 30 days ago through tomorrow", () => {
        const now = new Date("2026-06-15T12:00:00Z");
        const {after, before} = defaultStatsWindow(now);
        expect(after.toISOString()).toBe("2026-05-16T12:00:00.000Z");
        expect(before.toISOString()).toBe("2026-06-16T12:00:00.000Z");
    });
});

describe("parseStatsResponse", () => {
    it("parses every family and the two indexer counts", () => {
        const {result, malformedFamilies} = parseStatsResponse({
            after: "2026-01-01T00:00:00Z",
            before: "2026-02-01T00:00:00Z",
            numberOfConfiguredIndexers: 5,
            numberOfEnabledIndexers: 4,
            indexerApiAccessStats: [{indexerName: "A", percentSuccessful: 90}],
            indexerScores: [{indexerName: "A", averageUniquenessScore: 3}],
            avgResponseTimes: [{indexer: "A", avgResponseTime: 120}],
            indexerDownloadShares: [{indexerName: "A", total: 10, share: 100}],
            downloadsPerDayOfWeek: [{day: "Mon", count: 2}],
            downloadsPerHourOfDay: [{hour: 3, count: 1}],
            searchesPerDayOfWeek: [{day: "Mon", count: 5}],
            searchesPerHourOfDay: [{hour: 3, count: 4}],
            downloadsPerAgeStats: {
                averageAge: 100,
                percentOlder1000: 1,
                percentOlder2000: 0,
                percentOlder3000: 0,
                downloadsPerAge: [{age: 100, count: 1}],
            },
            successfulDownloadsPerIndexer: [
                {
                    indexerName: "A",
                    countAll: 10,
                    countSuccessful: 9,
                    countError: 1,
                    percentSuccessful: 90,
                },
            ],
            downloadSharesPerUser: [{key: "bob", count: 2, percentage: 50}],
            downloadSharesPerIp: [{key: "1.2.3.4", count: 2, percentage: 50}],
            searchSharesPerUser: [{key: "bob", count: 2, percentage: 50}],
            searchSharesPerIp: [{key: "1.2.3.4", count: 2, percentage: 50}],
            userAgentSearchShares: [
                {userAgent: "curl", count: 2, percentage: 50},
            ],
            userAgentDownloadShares: [
                {userAgent: "curl", count: 2, percentage: 50},
            ],
        });
        expect(malformedFamilies).toEqual([]);
        expect(result.numberOfConfiguredIndexers).toBe(5);
        expect(result.indexerScores?.[0]?.averageUniquenessScore).toBe(3);
        expect(result.avgResponseTimes?.[0]?.avgResponseTime).toBe(120);
        expect(result.downloadsPerAgeStats?.averageAge).toBe(100);
        expect(result.after?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });

    it("leaves a null/absent family undefined rather than an empty array", () => {
        const {result} = parseStatsResponse({avgResponseTimes: null});
        expect(result.avgResponseTimes).toBeUndefined();
        expect("indexerScores" in result).toBe(false);
    });

    it("drops individually malformed entries but keeps the rest of the array", () => {
        const {result, malformedFamilies} = parseStatsResponse({
            avgResponseTimes: [
                {indexer: "Good", avgResponseTime: 100},
                {indexer: 42, avgResponseTime: "nope"},
            ],
        });
        expect(result.avgResponseTimes).toHaveLength(1);
        expect(result.avgResponseTimes?.[0]?.indexer).toBe("Good");
        expect(malformedFamilies).toEqual([]);
    });

    it("keeps entries whose optional numbers the backend serialises as null", () => {
        // Jackson's default inclusion is ALWAYS: an indexer with no connection
        // errors in the window still gets an explicit
        // `"percentConnectionError": null` on the wire (Stats.java:396-423).
        const {result, malformedFamilies} = parseStatsResponse({
            indexerApiAccessStats: [
                {
                    indexerName: "NZBgeek",
                    percentSuccessful: 100,
                    percentConnectionError: null,
                    averageAccessesPerDay: null,
                },
            ],
            indexerScores: [
                {indexerName: "NZBgeek", averageUniquenessScore: null},
            ],
        });
        expect(result.indexerApiAccessStats).toHaveLength(1);
        expect(result.indexerApiAccessStats?.[0]).toMatchObject({
            indexerName: "NZBgeek",
            percentSuccessful: 100,
        });
        expect(result.indexerScores).toHaveLength(1);
        expect(malformedFamilies).toEqual([]);
    });

    it("reports a family whose payload is not the expected shape as malformed, without throwing", () => {
        const {result, malformedFamilies} = parseStatsResponse({
            avgResponseTimes: "not an array",
            downloadsPerAgeStats: "not an object",
        });
        expect(result.avgResponseTimes).toBeUndefined();
        expect(result.downloadsPerAgeStats).toBeUndefined();
        expect(malformedFamilies).toEqual(
            expect.arrayContaining([
                "avgResponseTimes",
                "downloadsPerAgeStats",
            ]),
        );
    });

    it("treats a non-object response as every family malformed", () => {
        const {result, malformedFamilies} = parseStatsResponse(null);
        expect(result).toEqual({});
        expect(malformedFamilies).toEqual(STAT_FAMILIES);
    });
});

describe("getStats", () => {
    it("posts the built request body and returns the parsed response", async () => {
        const requestSpy = vi.fn().mockResolvedValue({
            avgResponseTimes: [{indexer: "A", avgResponseTime: 1}],
        });
        const transport = {request: requestSpy} as unknown as ApiTransport;
        const {result} = await getStats(transport, {
            after: new Date("2026-01-01"),
            before: new Date("2026-01-31"),
            includeDisabled: false,
            families: allFamiliesSelected(false),
        });
        expect(requestSpy).toHaveBeenCalledWith(
            "internalapi/stats",
            expect.objectContaining({method: "POST"}),
        );
        expect(result.avgResponseTimes?.[0]?.indexer).toBe("A");
    });
});
