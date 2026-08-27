import {describe, expect, it, vi} from "vitest";

import {getIndexerStatuses, parseIndexerStatuses} from "./indexerStatuses";
import {ApiTransport} from "../transport";

describe("indexer statuses API", () => {
    it("should validate entries, retain partial data, and sort state then name", () => {
        expect(
            parseIndexerStatuses([
                {indexer: "Zulu", state: "DISABLED_USER"},
                {indexer: "alpha", state: "ENABLED", apiHits: 1},
                {state: "ENABLED"},
            ]),
        ).toEqual({
            statuses: [
                {indexer: "alpha", state: "ENABLED", apiHits: 1},
                {indexer: "Zulu", state: "DISABLED_USER"},
            ],
            malformedCount: 1,
        });
    });

    it("should accept the explicit nulls the backend actually serialises", () => {
        // Jackson's default inclusion is ALWAYS, so every unset field of
        // IndexerStatusesAndLimits.IndexerStatus arrives as an explicit null.
        expect(
            parseIndexerStatuses([
                {
                    indexer: "NZBgeek",
                    state: "ENABLED",
                    level: 0,
                    disabledUntil: null,
                    lastError: null,
                    apiResetTime: null,
                    downloadResetTime: null,
                    apiHits: 3,
                    apiHitLimit: null,
                    downloadHits: 1,
                    downloadHitLimit: null,
                    vipExpirationDate: null,
                },
            ]),
        ).toEqual({
            statuses: [
                {
                    indexer: "NZBgeek",
                    state: "ENABLED",
                    disabledUntil: null,
                    lastError: null,
                    apiResetTime: null,
                    downloadResetTime: null,
                    apiHits: 3,
                    apiHitLimit: null,
                    downloadHits: 1,
                    downloadHitLimit: null,
                    vipExpirationDate: null,
                },
            ],
            malformedCount: 0,
        });
    });

    it("should accept a configured zero limit and an empty last error", () => {
        expect(
            parseIndexerStatuses([
                {
                    indexer: "alpha",
                    state: "DISABLED_SYSTEM",
                    lastError: "",
                    apiHits: 0,
                    apiHitLimit: 0,
                    downloadHits: 0,
                    downloadHitLimit: 0,
                },
            ]).malformedCount,
        ).toBe(0);
    });

    it("should use the shared base-aware transport", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([]), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        await expect(
            getIndexerStatuses(new ApiTransport("/hydra", fetchImplementation)),
        ).resolves.toEqual({statuses: [], malformedCount: 0});
        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/indexerstatuses",
            expect.objectContaining({method: "GET"}),
        );
    });
});
