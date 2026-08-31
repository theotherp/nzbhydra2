import {useTheme} from "@mui/material/styles";
import {act, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {
    THEME_PREFERENCE_CACHE_KEY,
    type ThemePreferenceService,
} from "../services/theme/themePreference";
import {
    ThemePreferenceProvider,
    useThemePreference,
} from "./ThemePreferenceProvider";
import type {ThemePreference} from "./theme";

/**
 * FM-155: the startup and write paths of `C-THEME-PREFERENCE`'s one consumer.
 *
 * The applied theme is read as `palette.background.default`, which differs in
 * every one of ADR-0049's palettes, rather than as the preference string --
 * that a *theme* is applied is the claim, and the preference is only how it is
 * asked for.
 */
const GROUNDS: Record<string, string> = {
    grey: "#1f2426",
    bright: "#f2f4f3",
    dark: "#000000",
};

function Probe() {
    const {preference, setPreference} = useThemePreference();
    const theme = useTheme();
    return (
        <>
            <output data-testid="preference">{preference}</output>
            <output data-testid="ground">
                {theme.palette.background.default}
            </output>
            <button
                onClick={() => {
                    setPreference("dark");
                }}
                type="button"
            >
                Choose dark
            </button>
        </>
    );
}

/** See `themePreference.test.ts`: jsdom's opaque origin has no storage. */
function stubLocalStorage(store = new Map<string, string>()): void {
    vi.stubGlobal("localStorage", {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) =>
            store.has(key) ? (store.get(key) as string) : null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    } satisfies Storage);
}

function deferredService(): {
    resolve: (preference: ThemePreference | undefined) => void;
    service: ThemePreferenceService;
    writes: ThemePreference[];
} {
    const writes: ThemePreference[] = [];
    let resolve: (preference: ThemePreference | undefined) => void = () =>
        undefined;
    const read = new Promise<ThemePreference | undefined>((resolveRead) => {
        resolve = resolveRead;
    });
    return {
        resolve,
        service: {
            read: () => read,
            write: async (preference) => {
                writes.push(preference);
            },
        },
        writes,
    };
}

function ground(): string {
    return screen.getByTestId("ground").textContent ?? "";
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("ThemePreferenceProvider", () => {
    it("should render the default theme with nothing stored anywhere", async () => {
        const {resolve, service} = deferredService();
        render(
            <ThemePreferenceProvider service={service}>
                <Probe />
            </ThemePreferenceProvider>,
        );

        expect(ground()).toBe(GROUNDS.grey);
        await act(async () => {
            resolve(undefined);
        });
        expect(ground()).toBe(GROUNDS.grey);
        expect(screen.getByTestId("preference")).toHaveTextContent("grey");
    });

    it("should seed the first render from the local cache, before the server answers", async () => {
        stubLocalStorage(new Map([[THEME_PREFERENCE_CACHE_KEY, "bright"]]));
        const {resolve, service} = deferredService();

        render(
            <ThemePreferenceProvider service={service}>
                <Probe />
            </ThemePreferenceProvider>,
        );

        // The assertion that the flash is actually minimized: the very first
        // rendered theme is the cached one, with the server read still in
        // flight.
        expect(ground()).toBe(GROUNDS.bright);
        await act(async () => {
            resolve(undefined);
        });
        expect(ground()).toBe(GROUNDS.bright);
    });

    it("should ignore a malformed cached value rather than failing to render", () => {
        stubLocalStorage(
            new Map([[THEME_PREFERENCE_CACHE_KEY, '{"theme":"bright"}']]),
        );
        const {service} = deferredService();

        render(
            <ThemePreferenceProvider service={service}>
                <Probe />
            </ThemePreferenceProvider>,
        );

        expect(ground()).toBe(GROUNDS.grey);
    });

    it("should let the stored server preference win over the cached seed", async () => {
        const store = new Map([[THEME_PREFERENCE_CACHE_KEY, "bright"]]);
        stubLocalStorage(store);
        const {resolve, service} = deferredService();

        render(
            <ThemePreferenceProvider service={service}>
                <Probe />
            </ThemePreferenceProvider>,
        );
        await act(async () => {
            resolve("dark");
        });

        expect(ground()).toBe(GROUNDS.dark);
        // And the cache follows it, so the next load seeds from the right
        // value on this browser too.
        expect(store.get(THEME_PREFERENCE_CACHE_KEY)).toBe("dark");
    });

    it("should keep a choice made while the startup read is still in flight", async () => {
        stubLocalStorage();
        const {resolve, service, writes} = deferredService();

        render(
            <ThemePreferenceProvider service={service}>
                <Probe />
            </ThemePreferenceProvider>,
        );
        screen.getByRole("button", {name: "Choose dark"}).click();
        await waitFor(() => {
            expect(ground()).toBe(GROUNDS.dark);
        });

        await act(async () => {
            resolve("bright");
        });

        expect(ground()).toBe(GROUNDS.dark);
        expect(writes).toEqual(["dark"]);
    });

    it("should apply, cache and persist a chosen theme", async () => {
        const store = new Map<string, string>();
        stubLocalStorage(store);
        const {resolve, service, writes} = deferredService();

        render(
            <ThemePreferenceProvider service={service}>
                <Probe />
            </ThemePreferenceProvider>,
        );
        await act(async () => {
            resolve(undefined);
        });
        screen.getByRole("button", {name: "Choose dark"}).click();

        await waitFor(() => {
            expect(ground()).toBe(GROUNDS.dark);
        });
        expect(store.get(THEME_PREFERENCE_CACHE_KEY)).toBe("dark");
        expect(writes).toEqual(["dark"]);
    });

    it("should keep the applied theme when the write fails", async () => {
        stubLocalStorage();
        const service: ThemePreferenceService = {
            read: () => Promise.resolve(undefined),
            write: () => Promise.reject(new Error("500")),
        };

        render(
            <ThemePreferenceProvider service={service}>
                <Probe />
            </ThemePreferenceProvider>,
        );
        screen.getByRole("button", {name: "Choose dark"}).click();

        await waitFor(() => {
            expect(ground()).toBe(GROUNDS.dark);
        });
        // The rejection is swallowed rather than left unhandled: an unhandled
        // rejection here would fail the surrounding test run, which is exactly
        // the crash a user would otherwise be one failed request away from.
        await act(async () => {
            await Promise.resolve();
        });
        expect(ground()).toBe(GROUNDS.dark);
    });

    it("should mount without a service in a document that carries no bootstrap", () => {
        render(
            <ThemePreferenceProvider>
                <Probe />
            </ThemePreferenceProvider>,
        );

        expect(ground()).toBe(GROUNDS.grey);
    });
});
