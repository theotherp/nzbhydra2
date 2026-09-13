import {describe, expect, it, vi} from "vitest";

import {createSearchLiveTransport} from "./searchState";
import type {LiveTransport} from "./transport";

describe("search live transport", () => {
    it("should isolate progress messages by request ID", async () => {
        let receive: (body: string) => void = () => undefined;
        const transport: LiveTransport = {
            subscribe: vi.fn(async ({onMessage, parse}) => {
                receive = (body) => onMessage(parse(body));
                return {close: vi.fn()};
            }),
        };
        const onProgress = vi.fn();
        await createSearchLiveTransport(transport).subscribeSearchState(
            7,
            onProgress,
            vi.fn(),
        );
        receive(
            JSON.stringify({
                searchRequestId: 8,
                searchFinished: false,
                indexerSelectionFinished: true,
                indexersSelected: 2,
                indexersFinished: 1,
                messages: [],
            }),
        );
        receive(
            JSON.stringify({
                searchRequestId: 7,
                searchFinished: false,
                indexerSelectionFinished: true,
                indexersSelected: 2,
                indexersFinished: 1,
                messages: [{message: "Indexer returned results"}],
            }),
        );
        expect(onProgress).toHaveBeenCalledOnce();
        expect(onProgress).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: ["Indexer returned results"],
                hasResults: false,
            }),
        );
    });

    it("should derive result-bearing progress from legacy positive-count messages", async () => {
        let receive: (body: string) => void = () => undefined;
        const transport: LiveTransport = {
            subscribe: vi.fn(async ({onMessage, parse}) => {
                receive = (body) => onMessage(parse(body));
                return {close: vi.fn()};
            }),
        };
        const onProgress = vi.fn();
        await createSearchLiveTransport(transport).subscribeSearchState(
            7,
            onProgress,
            vi.fn(),
        );

        receive(
            JSON.stringify({
                searchRequestId: 7,
                searchFinished: false,
                indexerSelectionFinished: true,
                indexersSelected: 2,
                indexersFinished: 1,
                messages: [{message: "0 results via search"}],
            }),
        );
        expect(onProgress).toHaveBeenLastCalledWith(
            expect.objectContaining({hasResults: false}),
        );
        receive(
            JSON.stringify({
                searchRequestId: 7,
                searchFinished: false,
                indexerSelectionFinished: true,
                indexersSelected: 2,
                indexersFinished: 2,
                messages: [{message: "12 results via search"}],
            }),
        );
        expect(onProgress).toHaveBeenLastCalledWith(
            expect.objectContaining({hasResults: true}),
        );
    });
});
