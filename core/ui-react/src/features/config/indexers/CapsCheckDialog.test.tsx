import {ThemeProvider} from "@mui/material";
import {cleanup, render, screen, within} from "@testing-library/react";
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

const BULK_CHECK: CapsCheckRequest = {
    checkType: "INCOMPLETE",
    indexerConfig: null,
};

/** What `API-CONFIG-INDEXER-CAPS-MESSAGES` answers, one entry per poll. */
type MessageRound = Record<string, string[]>;

function setup(
    rounds: MessageRound[],
    {
        indexerCount,
        leavable = false,
        request = SINGLE_CHECK,
    }: {
        indexerCount?: number;
        leavable?: boolean;
        request?: CapsCheckRequest;
    } = {},
) {
    const check = deferred();
    let polls = 0;
    const fetchMock = vi.fn<typeof fetch>((input) => {
        const url = String(input);
        if (url.includes("checkCapsMessages")) {
            const round = rounds[Math.min(polls, rounds.length - 1)] ?? {};
            polls += 1;
            return Promise.resolve(jsonResponse(round));
        }
        if (url.includes("checkCaps")) {
            return check.promise;
        }
        throw new Error(`unexpected request to ${url}`);
    });
    const onFailed = vi.fn();
    const onLeave = vi.fn();
    const onResolved = vi.fn<(results: IndexerCapsCheckResult[]) => void>();
    const view = render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <CapsCheckDialog
                indexerCount={indexerCount}
                onFailed={onFailed}
                onLeave={leavable ? onLeave : undefined}
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
        onLeave,
        onResolved,
        pollCount: () => polls,
        view,
    };
}

async function tick(times = 1): Promise<void> {
    await vi.advanceTimersByTimeAsync(CAPS_MESSAGE_POLL_INTERVAL_MS * times);
}

/** The visible list, which is deliberately *not* the live region. */
function messageList(): HTMLElement {
    return screen.getByTestId("config-indexer-caps-messages");
}

function announcement(): string {
    return screen.getByTestId("config-indexer-caps-announcement").textContent;
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
            {Mock: ["Checking caps of Mock"]},
            {Mock: ["Checking caps of Mock", "Indexer supports IMDB"]},
        ]);

        expect(screen.getByTestId("config-indexer-caps-dialog")).toBeVisible();
        expect(screen.queryByTestId("config-indexer-caps-messages")).toBeNull();

        await tick();
        expect(
            within(messageList()).getByText("Checking caps of Mock"),
        ).toBeVisible();

        await tick();
        expect(
            within(messageList()).getByText("Indexer supports IMDB"),
        ).toBeVisible();
        // A SINGLE check shows the message unprefixed, even though the server
        // keys it by indexer name.
        expect(within(messageList()).queryByText(/^Mock: /)).toBeNull();

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
        const {fetchMock} = setup([{Mock: ["Checking caps of Mock"]}], {
            request: BULK_CHECK,
        });

        await tick();
        expect(
            within(messageList()).getByText("Mock: Checking caps of Mock"),
        ).toBeVisible();

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
        const {check, pollCount} = setup([{Mock: ["one"]}]);

        await tick(2);
        const before = pollCount();
        expect(before).toBeGreaterThan(0);

        check.resolve(jsonResponse([CAPS_RESULT]));
        await vi.advanceTimersByTimeAsync(0);
        await tick(4);

        expect(pollCount()).toBe(before);
    });

    it("stops polling when the dialog is unmounted", async () => {
        const {pollCount, view} = setup([{Mock: ["one"]}]);

        await tick(2);
        const before = pollCount();

        view.unmount();
        await tick(4);

        expect(pollCount()).toBe(before);
    });

    it("reports a failed check and stops polling", async () => {
        const {check, onFailed, onResolved, pollCount} = setup([
            {Mock: ["one"]},
        ]);

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

    // ---- FM-167: leaving, progress, and the live region --------------------

    describe("leaving a running check", () => {
        it("says the check keeps running and offers the button and Escape", async () => {
            const {onLeave} = setup([{Mock: ["one"]}], {leavable: true});

            const leave = screen.getByTestId("config-indexer-caps-leave");
            expect(leave).toHaveTextContent("Stop waiting");
            expect(
                screen.getByText(/keeps running on the server/),
            ).toBeVisible();

            leave.click();
            expect(onLeave).toHaveBeenCalledTimes(1);

            cleanup();
            const escaped = setup([{Mock: ["one"]}], {leavable: true});
            await vi.advanceTimersByTimeAsync(0);
            screen.getByTestId("config-indexer-caps-dialog").dispatchEvent(
                new KeyboardEvent("keydown", {
                    bubbles: true,
                    key: "Escape",
                }),
            );
            expect(escaped.onLeave).toHaveBeenCalledTimes(1);
        });

        it("keeps a stray backdrop click from throwing the wait away", async () => {
            const {onLeave} = setup([{Mock: ["one"]}], {leavable: true});
            await vi.advanceTimersByTimeAsync(0);

            const backdrop = document.querySelector(".MuiBackdrop-root");
            expect(backdrop).not.toBeNull();
            backdrop?.dispatchEvent(new MouseEvent("click", {bubbles: true}));

            expect(onLeave).not.toHaveBeenCalled();
            expect(
                screen.getByTestId("config-indexer-caps-dialog"),
            ).toBeVisible();
        });

        it("writes nothing when the abandoned check resolves afterwards", async () => {
            const {check, onFailed, onLeave, onResolved, pollCount} = setup(
                [{Mock: ["one"]}],
                {leavable: true},
            );

            await tick(2);
            const before = pollCount();
            expect(before).toBeGreaterThan(0);
            screen.getByTestId("config-indexer-caps-leave").click();
            expect(onLeave).toHaveBeenCalledTimes(1);

            // The server finishes the check it was never told to stop.
            check.resolve(jsonResponse([CAPS_RESULT]));
            await tick(4);

            expect(onResolved).not.toHaveBeenCalled();
            expect(onFailed).not.toHaveBeenCalled();
            expect(pollCount()).toBe(before);
        });

        it("writes nothing when the abandoned check fails afterwards", async () => {
            const {check, onFailed, onResolved} = setup([{Mock: ["one"]}], {
                leavable: true,
            });

            await tick();
            screen.getByTestId("config-indexer-caps-leave").click();
            check.reject(new Error("network"));
            await tick(4);

            expect(onFailed).not.toHaveBeenCalled();
            expect(onResolved).not.toHaveBeenCalled();
        });

        it("has no exit at all where the caller cannot survive one", async () => {
            setup([{Mock: ["one"]}]);
            await vi.advanceTimersByTimeAsync(0);

            expect(
                screen.queryByTestId("config-indexer-caps-leave"),
            ).toBeNull();
            expect(screen.getByText(/will close automatically/)).toBeVisible();
        });
    });

    describe("progress", () => {
        it("reports how many of the checked indexers have reported", async () => {
            setup(
                [
                    {First: ["Checking caps"]},
                    {First: ["Checking caps"], Second: ["Checking caps"]},
                ],
                {indexerCount: 3, leavable: true, request: BULK_CHECK},
            );

            await tick();
            const progress = screen.getByTestId("config-indexer-caps-progress");
            expect(progress).toHaveTextContent("1 of 3 indexers have reported");
            expect(screen.getByRole("progressbar")).toHaveAttribute(
                "aria-valuenow",
                "33",
            );
            // The number is about reporting, not about finishing, and says so.
            expect(screen.getByText(/sent its first message/)).toBeVisible();

            await tick();
            expect(progress).toHaveTextContent("2 of 3 indexers have reported");
            expect(screen.getByRole("progressbar")).toHaveAttribute(
                "aria-valuenow",
                "67",
            );
        });

        it("never claims fewer indexers than have already reported", async () => {
            // The caller counts the *form's* entries while the server checks
            // the saved ones, so the estimate can be too low.
            setup([{First: ["a"], Second: ["b"]}], {
                indexerCount: 1,
                request: BULK_CHECK,
            });

            await tick();
            expect(
                screen.getByTestId("config-indexer-caps-progress"),
            ).toHaveTextContent("2 of 2 indexers have reported");
        });

        it("adds no counter for a single indexer", async () => {
            setup([{Mock: ["Checking caps"]}], {indexerCount: 1});

            await tick();
            expect(
                screen.getByTestId("config-indexer-caps-progress"),
            ).toHaveTextContent("Checking capabilities");
            expect(screen.queryByText(/indexers have reported/)).toBeNull();
            expect(screen.getByRole("progressbar")).not.toHaveAttribute(
                "aria-valuenow",
            );
        });
    });

    describe("announcements", () => {
        it("announces only what the last tick added", async () => {
            setup([
                {Mock: ["first line"]},
                {Mock: ["first line", "second line"]},
            ]);

            await tick();
            expect(announcement()).toBe("first line");

            await tick();
            // The visible list still holds both, and only the new line is
            // announced -- an `aria-live` list would re-read the whole thing.
            expect(
                screen.getByTestId("config-indexer-caps-messages"),
            ).toHaveTextContent("first line");
            expect(
                screen.getByTestId("config-indexer-caps-messages"),
            ).toHaveTextContent("second line");
            expect(announcement()).toBe("second line");

            // A tick that adds nothing announces nothing new either.
            await tick();
            expect(announcement()).toBe("second line");
        });

        it("announces a progress change alongside the new lines", async () => {
            setup([{First: ["a"]}, {First: ["a"], Second: ["b"]}], {
                indexerCount: 2,
                request: BULK_CHECK,
            });

            await tick(2);
            expect(announcement()).toBe(
                "Second: b. 2 of 2 indexers have reported",
            );
        });

        it("keeps the rendered lines mounted across polls", async () => {
            setup([
                {Second: ["stable line"]},
                // A new indexer can reorder the multimap's keys, which is what
                // a positional key could not survive.
                {First: ["new line"], Second: ["stable line"]},
            ]);

            await tick();
            const first = within(messageList()).getByText("stable line");

            await tick();
            expect(within(messageList()).getByText("stable line")).toBe(first);
        });
    });
});
