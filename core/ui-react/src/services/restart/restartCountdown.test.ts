import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {
    pingRestartTarget,
    restartMessage,
    restartTarget,
    runRestartCountdown,
    RESTART_INITIAL_DELAY_MS,
    RESTART_POLL_INTERVAL_MS,
    RESTART_RELOADING_MESSAGE,
    RESTART_RELOAD_GRACE_MS,
    RESTART_SLOW_ATTEMPT,
} from "./restartCountdown";

const transport = () => new ApiTransport("/hydra/", vi.fn());

describe("restartTarget", () => {
    it("should poll and reload in place when the server names no base URL", () => {
        expect(restartTarget(transport(), null)).toEqual({
            pingUrl: "http://localhost:3000/hydra/internalapi/control/ping",
            reloadUrl: null,
        });
    });

    it("should follow the base URL the restart response reports", () => {
        expect(
            restartTarget(transport(), "http://elsewhere:5077/hydra"),
        ).toEqual({
            pingUrl: "http://elsewhere:5077/hydra/internalapi/control/ping",
            reloadUrl: "http://elsewhere:5077/hydra",
        });
    });

    it("should not double the separator of a trailing-slash base URL", () => {
        expect(restartTarget(transport(), "http://host:5076/").pingUrl).toBe(
            "http://host:5076/internalapi/control/ping",
        );
    });
});

describe("restartMessage", () => {
    it("should keep legacy's wording", () => {
        expect(restartMessage("", 0)).toBe(
            "Will reload page when NZBHydra is back.",
        );
        expect(restartMessage("Config saved.", 1)).toBe(
            "Config saved. Will reload page when NZBHydra is back.",
        );
    });

    it("should warn once the restart takes longer than expected", () => {
        expect(restartMessage("", RESTART_SLOW_ATTEMPT - 1)).toBe(
            "Will reload page when NZBHydra is back.",
        );
        expect(restartMessage("", RESTART_SLOW_ATTEMPT)).toBe(
            "Restarting takes longer than expected. You might want to check the log to see what's going on.",
        );
    });
});

describe("runRestartCountdown", () => {
    it("should wait, poll, and reload with legacy's timings", async () => {
        const sleeps: number[] = [];
        const messages: string[] = [];
        const reload = vi.fn();
        const ping = vi
            .fn()
            .mockRejectedValueOnce(new Error("down"))
            .mockRejectedValueOnce(new Error("down"))
            .mockResolvedValueOnce(undefined);

        await runRestartCountdown("Restarting.", {
            ping,
            reload,
            setMessage: (message) => messages.push(message),
            sleep: async (milliseconds) => {
                sleeps.push(milliseconds);
            },
        });

        expect(sleeps).toEqual([
            RESTART_INITIAL_DELAY_MS,
            RESTART_POLL_INTERVAL_MS,
            RESTART_POLL_INTERVAL_MS,
            RESTART_POLL_INTERVAL_MS,
            RESTART_RELOAD_GRACE_MS,
        ]);
        expect(ping).toHaveBeenCalledTimes(3);
        expect(messages.at(-1)).toBe(RESTART_RELOADING_MESSAGE);
        expect(reload).toHaveBeenCalledOnce();
    });

    it("should keep polling behind the takes-longer message", async () => {
        // Legacy stopped polling entirely at attempt 45
        // (`restart-service.js:53`), leaving a slow instance unreachable; the
        // wording is kept, the give-up is not.
        const messages: string[] = [];
        const ping = vi.fn().mockImplementation(async () => {
            if (ping.mock.calls.length <= RESTART_SLOW_ATTEMPT + 1) {
                throw new Error("down");
            }
        });

        await runRestartCountdown("", {
            ping,
            reload: vi.fn(),
            setMessage: (message) => messages.push(message),
            sleep: async () => {},
        });

        expect(ping.mock.calls.length).toBeGreaterThan(
            RESTART_SLOW_ATTEMPT + 1,
        );
        expect(messages).toContain(
            "Restarting takes longer than expected. You might want to check the log to see what's going on.",
        );
    });
});

describe("pingRestartTarget", () => {
    it("should resolve when the instance answers", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        await expect(
            pingRestartTarget("http://host/ping", fetchImplementation),
        ).resolves.toBeUndefined();
    });

    it("should reject while the instance is still down", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 503}));
        await expect(
            pingRestartTarget("http://host/ping", fetchImplementation),
        ).rejects.toThrow("Restart ping failed with status 503");
    });
});
