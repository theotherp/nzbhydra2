import {describe, expect, it, vi} from "vitest";

import {runUpdateInstall, UPDATE_RESTART_GRACE_MS} from "./updateInstall";

type Harness = ReturnType<typeof createHarness>;

function createHarness(overrides: {install?: () => Promise<void>} = {}) {
    const stopPolling = vi.fn();
    const messages: (string[] | null)[] = [];
    const slept: number[] = [];
    const startCountdown = vi.fn(async () => {});
    const showFailure = vi.fn();
    let onMessages: ((messages: string[]) => void) | undefined;
    return {
        dependencies: {
            install: overrides.install ?? (async () => {}),
            pollMessages: (handler: (messages: string[]) => void) => {
                onMessages = handler;
                return stopPolling;
            },
            setMessages: (value: string[] | null) => messages.push(value),
            showFailure,
            sleep: async (milliseconds: number) => {
                slept.push(milliseconds);
            },
            startCountdown,
        },
        emitMessages: (lines: string[]) => onMessages?.(lines),
        messages,
        showFailure,
        slept,
        startCountdown,
        stopPolling,
    };
}

async function run(harness: Harness): Promise<void> {
    await runUpdateInstall(harness.dependencies);
}

describe("runUpdateInstall", () => {
    it("should show the polled lines and hand off to the restart countdown", async () => {
        const harness = createHarness({
            install: async () => {
                harness.emitMessages(["Downloading update"]);
            },
        });

        await run(harness);

        expect(harness.messages).toEqual([[], ["Downloading update"], null]);
        expect(harness.slept).toEqual([UPDATE_RESTART_GRACE_MS]);
        expect(harness.stopPolling).toHaveBeenCalledTimes(1);
        expect(harness.startCountdown).toHaveBeenCalledTimes(1);
    });

    it("should close the dialog, report the failure, and never start the countdown", async () => {
        const harness = createHarness({
            install: () => Promise.reject(new Error("install failed")),
        });

        await run(harness);

        expect(harness.messages).toEqual([[], null]);
        expect(harness.stopPolling).toHaveBeenCalledTimes(1);
        expect(harness.showFailure).toHaveBeenCalledTimes(1);
        expect(harness.startCountdown).not.toHaveBeenCalled();
        expect(harness.slept).toEqual([]);
    });

    it("should stop the poll even when the grace period rejects", async () => {
        const harness = createHarness();
        harness.dependencies.sleep = () =>
            Promise.reject(new Error("torn down"));

        await expect(run(harness)).rejects.toThrow("torn down");

        expect(harness.stopPolling).toHaveBeenCalledTimes(1);
        expect(harness.messages).toEqual([[], null]);
        expect(harness.startCountdown).not.toHaveBeenCalled();
    });
});
