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
