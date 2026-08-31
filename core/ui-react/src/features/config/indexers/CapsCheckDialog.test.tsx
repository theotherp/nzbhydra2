import {ThemeProvider} from "@mui/material";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import type {IndexerCapsCheckResult} from "../../../api/config/indexers";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {
    CAPS_MESSAGE_POLL_INTERVAL_MS,
    CapsCheckDialog,
    type CapsCheckRequest,
} from "./CapsCheckDialog";

type Deferred = {
    promise: Promise<Response>;
    reject: (error: Error) => void;
    resolve: (value: Response) => void;
};

function deferred(): Deferred {
    let resolve!: (value: Response) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<Response>((resolveIt, rejectIt) => {
        resolve = resolveIt;
        reject = rejectIt;
    });
    return {promise, reject, resolve};
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        headers: {"content-type": "application/json"},
        status,
    });
}

const CAPS_RESULT = {
    allCapsChecked: true,
    configComplete: true,
    indexerConfig: {name: "Mock", supportedSearchIds: ["IMDB"]},
};

const SINGLE_CHECK: CapsCheckRequest = {
    checkType: "SINGLE",
    indexerConfig: {name: "Mock"},
};

function setup(messages: string[][], request: CapsCheckRequest = SINGLE_CHECK) {
    const check = deferred();
    let polls = 0;
    const fetchMock = vi.fn<typeof fetch>((input) => {
        const url = String(input);
        if (url.includes("checkCapsMessages")) {
            const round = messages[Math.min(polls, messages.length - 1)] ?? [];
            polls += 1;
            return Promise.resolve(jsonResponse({Mock: round}));
        }
        if (url.includes("checkCaps")) {
            return check.promise;
        }
        throw new Error(`unexpected request to ${url}`);
    });
    const onFailed = vi.fn();
    const onResolved = vi.fn<(results: IndexerCapsCheckResult[]) => void>();
    const view = render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <CapsCheckDialog
                onFailed={onFailed}
                onResolved={onResolved}
                request={request}
                transport={
                    new ApiTransport("/", fetchMock as unknown as typeof fetch)
                }
            />
        </ThemeProvider>,
    );
    return {
        check,
        fetchMock,
        onFailed,
        onResolved,
        pollCount: () => polls,
        view,
    };
}

async function tick(times = 1): Promise<void> {
    await vi.advanceTimersByTimeAsync(CAPS_MESSAGE_POLL_INTERVAL_MS * times);
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("CapsCheckDialog", () => {
    it("posts the check once and lists the messages the poll returns", async () => {
        const {check, fetchMock, onResolved} = setup([
            ["Checking caps of Mock"],
            ["Checking caps of Mock", "Indexer supports IMDB"],
        ]);

        expect(screen.getByTestId("config-indexer-caps-dialog")).toBeVisible();
        expect(screen.queryByTestId("config-indexer-caps-messages")).toBeNull();

        await tick();
        expect(screen.getByText("Checking caps of Mock")).toBeVisible();

        await tick();
        expect(screen.getByText("Indexer supports IMDB")).toBeVisible();
        // A SINGLE check shows the message unprefixed, even though the server
        // keys it by indexer name.
        expect(screen.queryByText(/^Mock: /)).toBeNull();

        expect(onResolved).not.toHaveBeenCalled();
        check.resolve(jsonResponse([CAPS_RESULT]));
        await vi.advanceTimersByTimeAsync(0);

        expect(onResolved).toHaveBeenCalledWith([
            {
                allCapsChecked: true,
                configComplete: true,
                indexerConfig: CAPS_RESULT.indexerConfig,
            },
        ]);
        expect(
            fetchMock.mock.calls.filter(
                ([input]) =>
                    String(input).includes("checkCaps") &&
                    !String(input).includes("checkCapsMessages"),
            ),
        ).toHaveLength(1);
    });

    it("prefixes each message with the indexer's name for a bulk check", async () => {
        const {fetchMock} = setup([["Checking caps of Mock"]], {
            checkType: "INCOMPLETE",
            indexerConfig: null,
        });

        await tick();
        expect(screen.getByText("Mock: Checking caps of Mock")).toBeVisible();

        // A bulk check carries no entry at all: the backend checks what it has
        // stored (`CapsCheckRequestFactory.build(undefined, checkType)`).
        const posted = fetchMock.mock.calls.find(
            ([input]) =>
                String(input).includes("checkCaps") &&
                !String(input).includes("checkCapsMessages"),
        );
        expect(JSON.parse(String(posted?.[1]?.body))).toEqual({
            checkType: "INCOMPLETE",
            indexerConfig: null,
        });
    });

    it("stops polling once the check resolves", async () => {
        const {check, pollCount} = setup([["one"]]);

        await tick(2);
        const before = pollCount();
        expect(before).toBeGreaterThan(0);

        check.resolve(jsonResponse([CAPS_RESULT]));
        await vi.advanceTimersByTimeAsync(0);
        await tick(4);

        expect(pollCount()).toBe(before);
    });

    it("stops polling when the dialog is unmounted", async () => {
        const {pollCount, view} = setup([["one"]]);

        await tick(2);
        const before = pollCount();

        view.unmount();
        await tick(4);

        expect(pollCount()).toBe(before);
    });

    it("reports a failed check and stops polling", async () => {
        const {check, onFailed, onResolved, pollCount} = setup([["one"]]);

        await tick(1);
        const before = pollCount();

        check.resolve(jsonResponse({error: "boom"}, 500));
        await vi.advanceTimersByTimeAsync(0);

        expect(onFailed).toHaveBeenCalledTimes(1);
        expect(onResolved).not.toHaveBeenCalled();
        await tick(4);
        expect(pollCount()).toBe(before);
    });

    it("survives a poll that fails without ending the check", async () => {
        const check = deferred();
        const fetchMock = vi.fn<typeof fetch>((input) => {
            const url = String(input);
            if (url.includes("checkCapsMessages")) {
                return Promise.reject(new Error("network"));
            }
            if (url.includes("checkCaps")) {
                return check.promise;
            }
            throw new Error(`unexpected request to ${url}`);
        });
        const onFailed = vi.fn();
        const onResolved = vi.fn();
        render(
            <ThemeProvider theme={createHydraTheme("grey")}>
                <CapsCheckDialog
                    onFailed={onFailed}
                    onResolved={onResolved}
                    request={{
                        checkType: "SINGLE",
                        indexerConfig: {name: "Mock"},
                    }}
                    transport={
                        new ApiTransport(
                            "/",
                            fetchMock as unknown as typeof fetch,
                        )
                    }
                />
            </ThemeProvider>,
        );

        await tick(2);
        expect(onFailed).not.toHaveBeenCalled();

        check.resolve(jsonResponse([CAPS_RESULT]));
        await vi.advanceTimersByTimeAsync(0);
        expect(onResolved).toHaveBeenCalledTimes(1);
    });
});
