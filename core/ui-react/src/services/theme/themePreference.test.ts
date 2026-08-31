import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {createServerPreferences} from "../preferences/serverPreferences";
import {
    createDefaultThemePreferenceService,
    createThemePreferenceService,
    parseThemePreference,
    readCachedThemePreference,
    THEME_PREFERENCE_CACHE_KEY,
    THEME_PREFERENCE_KEY,
    writeCachedThemePreference,
} from "./themePreference";

function jsonResponse(body: string): Response {
    return new Response(body, {
        headers: {"Content-Type": "application/json"},
    });
}

function serviceOver(fetchImplementation: typeof fetch) {
    return createThemePreferenceService(
        createServerPreferences(
            new ApiTransport("/hydra/", fetchImplementation),
        ),
    );
}

/**
 * This project's jsdom environment configures no `url`, which leaves
 * `window.localStorage` unavailable in every test (a jsdom "opaque origin"
 * limitation -- the same note stands in `stats/dashboard/persistence.test.ts`
 * and `SearchResults.test.tsx`). Installed per test and removed by
 * `vi.unstubAllGlobals()`.
 */
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

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("parseThemePreference", () => {
    it("should accept a known preference stored bare", () => {
        expect(parseThemePreference("bright")).toBe("bright");
        expect(parseThemePreference("auto")).toBe("auto");
        expect(parseThemePreference("dark-dyschromatopsia")).toBe(
            "dark-dyschromatopsia",
        );
    });

    it("should accept the JSON-string-encoded form this application's own writes read back as", () => {
        // `GenericStorageWeb.put` stores the request body as a String,
        // JSON-encoded, so the `"bright"` this client PUTs comes back out of
        // `API-PREFERENCES-GET` with its quotes still on.
        expect(parseThemePreference('"bright"')).toBe("bright");
        expect(parseThemePreference('"dark"')).toBe("dark");
    });

    it("should reject anything it does not recognise, rather than approximating it", () => {
        for (const value of [
            undefined,
            null,
            "",
            "  ",
            "BRIGHT",
            "light",
            // A legacy `main.theme`-era value with no palette in this build.
            "default",
            '"light"',
            '""',
            "{",
            "42",
            42,
            true,
            {theme: "bright"},
            ["bright"],
            // Doubly encoded: one level of unwrapping is the endpoint's
            // asymmetry, two levels is something nothing here ever wrote.
            '"\\"bright\\""',
        ]) {
            expect(parseThemePreference(value), String(value)).toBeUndefined();
        }
    });
});

describe("createThemePreferenceService", () => {
    it("should read the current user's record and normalise the stored value", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(jsonResponse('"\\"bright\\""'));

        await expect(serviceOver(fetchImplementation).read()).resolves.toBe(
            "bright",
        );
        expect(fetchImplementation).toHaveBeenCalledWith(
            `http://localhost:3000/hydra/internalapi/genericstorage/${THEME_PREFERENCE_KEY}?forUser=true`,
            expect.objectContaining({method: "GET"}),
        );
    });

    it("should read an empty record as no preference", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));

        await expect(
            serviceOver(fetchImplementation).read(),
        ).resolves.toBeUndefined();
    });

    it("should never throw a failed read at its caller", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response("nope", {status: 500}));

        await expect(
            serviceOver(fetchImplementation).read(),
        ).resolves.toBeUndefined();

        const offline = vi.fn().mockRejectedValue(new Error("offline"));
        await expect(serviceOver(offline).read()).resolves.toBeUndefined();
    });

    it("should write the preference to the per-user record", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));

        await serviceOver(fetchImplementation).write("dark");

        const [url, init] = fetchImplementation.mock.calls[0];
        expect(url).toBe(
            `http://localhost:3000/hydra/internalapi/genericstorage/${THEME_PREFERENCE_KEY}?forUser=true`,
        );
        expect(init.method).toBe("PUT");
        expect(init.body).toBe('"dark"');
    });

    it("should reject a failed write, so its caller can decide what that means", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response("nope", {status: 500}));

        await expect(
            serviceOver(fetchImplementation).write("dark"),
        ).rejects.toThrow();
    });
});

describe("createDefaultThemePreferenceService", () => {
    it("should build nothing without a bootstrap to take a base URL from", () => {
        expect(createDefaultThemePreferenceService()).toBeUndefined();
    });

    it("should address the bootstrap's base URL when there is one", async () => {
        vi.stubGlobal("__NZBHYDRA_BOOTSTRAP__", {baseUrl: "/hydra/"});
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(jsonResponse('"grey"'));
        vi.stubGlobal("fetch", fetchImplementation);

        await expect(
            createDefaultThemePreferenceService()?.read(),
        ).resolves.toBe("grey");
        expect(fetchImplementation).toHaveBeenCalledWith(
            `http://localhost:3000/hydra/internalapi/genericstorage/${THEME_PREFERENCE_KEY}?forUser=true`,
            expect.objectContaining({method: "GET"}),
        );
    });
});

describe("the startup seed cache", () => {
    it("should round trip an applied preference", () => {
        const store = new Map<string, string>();
        stubLocalStorage(store);

        writeCachedThemePreference("dark");

        expect(store.get(THEME_PREFERENCE_CACHE_KEY)).toBe("dark");
        expect(readCachedThemePreference()).toBe("dark");
    });

    it("should read a malformed or unknown cached value as no preference", () => {
        const store = new Map<string, string>();
        stubLocalStorage(store);

        for (const stored of ["", "light", "{}", '"light"', "[]"]) {
            store.set(THEME_PREFERENCE_CACHE_KEY, stored);
            expect(readCachedThemePreference(), stored).toBeUndefined();
        }
    });

    it("should read nothing when there is no storage at all", () => {
        // The unstubbed environment: no `localStorage` on an opaque origin,
        // which is exactly what `C-BROWSER-STORAGE`'s guard exists for.
        expect(readCachedThemePreference()).toBeUndefined();
        expect(() => {
            writeCachedThemePreference("dark");
        }).not.toThrow();
    });
});
