import {z} from "zod";

import type {LiveSubscription, LiveTransport} from "./transport";

export type SearchProgress = {
    searchRequestId: number;
    searchFinished: boolean;
    indexerSelectionFinished: boolean;
    indexersSelected: number;
    indexersFinished: number;
    messages: string[];
    hasResults: boolean;
};

const searchProgressSchema = z
    .object({
        searchRequestId: z.number().int(),
        searchFinished: z.boolean(),
        indexerSelectionFinished: z.boolean(),
        indexersSelected: z.number().int().nonnegative(),
        indexersFinished: z.number().int().nonnegative(),
        messages: z
            .array(z.object({message: z.string()}))
            .default([])
            .transform((messages) => messages.map(({message}) => message)),
    })
    .transform((progress) => ({
        ...progress,
        // Match the legacy modal's positive-count marker rather than treating a
        // completed indexer as evidence that it returned a result.
        hasResults: progress.messages.some((message) =>
            /^[^0]\d+.*/.test(message),
        ),
    }));

export type SearchLiveTransport = {
    subscribeSearchState(
        searchRequestId: number,
        onProgress: (progress: SearchProgress) => void,
        onUnavailable: (error: Error) => void,
    ): Promise<LiveSubscription>;
};

export function createSearchLiveTransport(
    transport: LiveTransport,
): SearchLiveTransport {
    return {
        subscribeSearchState(searchRequestId, onProgress, onUnavailable) {
            return transport.subscribe({
                destination: "/topic/searchState",
                parse: (body) => searchProgressSchema.parse(JSON.parse(body)),
                onMessage: (progress) => {
                    if (progress.searchRequestId === searchRequestId)
                        onProgress(progress);
                },
                onUnavailable,
            });
        },
    };
}
