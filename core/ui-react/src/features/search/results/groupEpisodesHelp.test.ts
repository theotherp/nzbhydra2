import {describe, expect, it, vi} from "vitest";

import type {ServerPreferences} from "../../../services/preferences/serverPreferences";
import {
    GROUP_EPISODES_HELP_KEY,
    isGroupEpisodesHelpEligible,
    showGroupEpisodesHelpIfNeeded,
} from "./groupEpisodesHelp";

function preferencesDouble(stored: Record<string, unknown> = {}): {
    preferences: ServerPreferences;
    writes: {forUser: boolean; key: string; value: unknown}[];
} {
    const writes: {forUser: boolean; key: string; value: unknown}[] = [];
    const preferences: ServerPreferences = {
        clear: vi.fn(async () => undefined),
        read: vi.fn(async (key: string) => stored[key]),
        readFlag: vi.fn(async (key: string) => stored[key] === true),
        write: vi.fn(async (key, value, forUser = false) => {
            writes.push({forUser, key, value});
        }),
    };
    return {preferences, writes};
}

describe("isGroupEpisodesHelpEligible", () => {
    it("is eligible for a TV category with grouping on and no episode requested", () => {
        expect(
            isGroupEpisodesHelpEligible({
                categories: ["Movies", "TV SD"],
                episodeRequested: false,
                groupEpisodes: true,
            }),
        ).toBe(true);
    });

    it("matches the category case-insensitively", () => {
        expect(
            isGroupEpisodesHelpEligible({
                categories: ["tv hd"],
                episodeRequested: false,
                groupEpisodes: true,
            }),
        ).toBe(true);
    });

    it("is not eligible when grouping is off", () => {
        expect(
            isGroupEpisodesHelpEligible({
                categories: ["TV SD"],
                episodeRequested: false,
                groupEpisodes: false,
            }),
        ).toBe(false);
    });

    it("is not eligible when an episode was explicitly requested", () => {
        expect(
            isGroupEpisodesHelpEligible({
                categories: ["TV SD"],
                episodeRequested: true,
                groupEpisodes: true,
            }),
        ).toBe(false);
    });

    it("is not eligible for a non-TV category", () => {
        expect(
            isGroupEpisodesHelpEligible({
                categories: ["Movies"],
                episodeRequested: false,
                groupEpisodes: true,
            }),
        ).toBe(false);
    });
});

describe("showGroupEpisodesHelpIfNeeded", () => {
    it("shows the dialog then writes the flag only after it closes", async () => {
        const {preferences, writes} = preferencesDouble({
            [GROUP_EPISODES_HELP_KEY]: false,
        });
        const order: string[] = [];
        const show = vi.fn(async () => {
            order.push("show");
        });
        await showGroupEpisodesHelpIfNeeded({preferences, show});

        expect(preferences.readFlag).toHaveBeenCalledWith(
            GROUP_EPISODES_HELP_KEY,
            true,
        );
        expect(show).toHaveBeenCalledTimes(1);
        expect(writes).toEqual([
            {forUser: true, key: GROUP_EPISODES_HELP_KEY, value: true},
        ]);
        order.push("write recorded");
        expect(order).toEqual(["show", "write recorded"]);
    });

    it("shows nothing and writes nothing for a raised flag", async () => {
        const {preferences, writes} = preferencesDouble({
            [GROUP_EPISODES_HELP_KEY]: true,
        });
        const show = vi.fn(async () => undefined);
        await showGroupEpisodesHelpIfNeeded({preferences, show});

        expect(show).not.toHaveBeenCalled();
        expect(writes).toEqual([]);
    });

    it("shows nothing and writes nothing when the read fails", async () => {
        const preferences: ServerPreferences = {
            clear: vi.fn(async () => undefined),
            read: vi.fn(async () => undefined),
            readFlag: vi.fn(async () => {
                throw new Error("network error");
            }),
            write: vi.fn(async () => undefined),
        };
        const show = vi.fn(async () => undefined);
        await showGroupEpisodesHelpIfNeeded({preferences, show});

        expect(show).not.toHaveBeenCalled();
        expect(preferences.write).not.toHaveBeenCalled();
    });

    it("does not throw when the write fails after the dialog closes", async () => {
        const preferences: ServerPreferences = {
            clear: vi.fn(async () => undefined),
            read: vi.fn(async () => undefined),
            readFlag: vi.fn(async () => false),
            write: vi.fn(async () => {
                throw new Error("network error");
            }),
        };
        const show = vi.fn(async () => undefined);

        await expect(
            showGroupEpisodesHelpIfNeeded({preferences, show}),
        ).resolves.toBeUndefined();
        expect(show).toHaveBeenCalledTimes(1);
    });
});
