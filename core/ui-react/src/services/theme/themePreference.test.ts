import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {createServerPreferences} from "../preferences/serverPreferences";
import {
    createDefaultThemePreferenceService,
    createThemePreferenceService,
    LEGACY_THEME_PREFERENCE_CACHE_KEY,
    parseThemePreference,
    readBootstrapUsername,
    readCachedThemePreference,
    THEME_PREFERENCE_CACHE_KEY_SHARED,
    THEME_PREFERENCE_CACHE_KEY_USER_PREFIX,
    THEME_PREFERENCE_KEY,
    themePreferenceCacheKey,
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

describe("themePreferenceCacheKey", () => {
    it("should give every username its own key, disjoint from the shared and legacy keys", () => {
        expect(themePreferenceCacheKey("alice")).toBe(
            `${THEME_PREFERENCE_CACHE_KEY_USER_PREFIX}alice`,
        );
        expect(themePreferenceCacheKey("bob")).toBe(
            `${THEME_PREFERENCE_CACHE_KEY_USER_PREFIX}bob`,
        );
        expect(themePreferenceCacheKey("alice")).not.toBe(
            themePreferenceCacheKey("bob"),
        );
        expect(themePreferenceCacheKey(null)).toBe(
            THEME_PREFERENCE_CACHE_KEY_SHARED,
        );
    });

    it("should never let a username collide with the shared scope, even one named exactly that", () => {
        // The shapes are disjoint by the fixed `.user.` segment, not by
        // escaping the username -- so a user literally named `shared`, or one
        // containing the delimiter, still lands under its own key.
        expect(themePreferenceCacheKey("shared")).toBe(
            `${THEME_PREFERENCE_CACHE_KEY_USER_PREFIX}shared`,
        );
        expect(themePreferenceCacheKey("shared")).not.toBe(
            THEME_PREFERENCE_CACHE_KEY_SHARED,
        );
        expect(themePreferenceCacheKey("a.user.b")).not.toBe(
            themePreferenceCacheKey("a"),
        );
    });

    it("should never produce the legacy bare key for any scope", () => {
        expect(themePreferenceCacheKey(null)).not.toBe(
            LEGACY_THEME_PREFERENCE_CACHE_KEY,
        );
        expect(themePreferenceCacheKey("alice")).not.toBe(
            LEGACY_THEME_PREFERENCE_CACHE_KEY,
        );
    });
});

describe("readBootstrapUsername", () => {
    it("should read the bootstrap's username", () => {
        vi.stubGlobal("__NZBHYDRA_BOOTSTRAP__", {username: "alice"});
        expect(readBootstrapUsername()).toBe("alice");
    });

    it("should treat a null, absent, or invalid bootstrap as anonymous", () => {
        vi.stubGlobal("__NZBHYDRA_BOOTSTRAP__", {username: null});
        expect(readBootstrapUsername()).toBeNull();

        vi.stubGlobal("__NZBHYDRA_BOOTSTRAP__", undefined);
        expect(readBootstrapUsername()).toBeNull();

        vi.stubGlobal("__NZBHYDRA_BOOTSTRAP__", "not an object");
        expect(readBootstrapUsername()).toBeNull();

        vi.stubGlobal("__NZBHYDRA_BOOTSTRAP__", {username: 42});
        expect(readBootstrapUsername()).toBeNull();
    });
});

describe("the startup seed cache", () => {
    it("should round trip an applied preference within one user's scope", () => {
        const store = new Map<string, string>();
        stubLocalStorage(store);

        writeCachedThemePreference("dark", "alice");

        expect(
            store.get(`${THEME_PREFERENCE_CACHE_KEY_USER_PREFIX}alice`),
        ).toBe("dark");
        expect(readCachedThemePreference("alice")).toBe("dark");
    });

    it("should round trip an applied preference for the shared, anonymous scope", () => {
        const store = new Map<string, string>();
        stubLocalStorage(store);

        writeCachedThemePreference("bright", null);

        expect(store.get(THEME_PREFERENCE_CACHE_KEY_SHARED)).toBe("bright");
        expect(readCachedThemePreference(null)).toBe("bright");
    });

    it("should keep two different users' seeds independent", () => {
        const store = new Map<string, string>();
        stubLocalStorage(store);

        writeCachedThemePreference("dark", "alice");
        writeCachedThemePreference("bright", "bob");

        expect(readCachedThemePreference("alice")).toBe("dark");
        expect(readCachedThemePreference("bob")).toBe("bright");
        // Proves the shared-browser bug this task closes: reading bob's scope
        // must never surface alice's cached value.
        expect(readCachedThemePreference("bob")).not.toBe("dark");
    });

    it("should never return a value cached under the legacy bare key, for any scope", () => {
        const store = new Map<string, string>();
        stubLocalStorage(store);
        store.set(LEGACY_THEME_PREFERENCE_CACHE_KEY, "dark");

        expect(readCachedThemePreference(null)).toBeUndefined();
        expect(readCachedThemePreference("alice")).toBeUndefined();
    });

    it("should read a malformed or unknown cached value as no preference, in either scope", () => {
        const store = new Map<string, string>();
        stubLocalStorage(store);

        for (const stored of ["", "light", "{}", '"light"', "[]"]) {
            store.set(`${THEME_PREFERENCE_CACHE_KEY_USER_PREFIX}alice`, stored);
            expect(readCachedThemePreference("alice"), stored).toBeUndefined();

            store.set(THEME_PREFERENCE_CACHE_KEY_SHARED, stored);
            expect(readCachedThemePreference(null), stored).toBeUndefined();
        }
    });

    it("should read nothing when there is no storage at all", () => {
        // The unstubbed environment: no `localStorage` on an opaque origin,
        // which is exactly what `C-BROWSER-STORAGE`'s guard exists for.
        expect(readCachedThemePreference("alice")).toBeUndefined();
        expect(readCachedThemePreference(null)).toBeUndefined();
        expect(() => {
            writeCachedThemePreference("dark", "alice");
        }).not.toThrow();
    });
});
