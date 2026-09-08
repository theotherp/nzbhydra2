import {vi} from "vitest";

/*
 * Shared browser-global stubs for the vitest/jsdom suite.
 *
 * This project's jsdom environment has no explicit `url` configured, so its
 * opaque origin exposes no `window.localStorage` at all (`typeof
 * window.localStorage === "undefined"` -- a jsdom limitation, not a polyfill
 * this project ships). Ten test files each carried their own copy of the same
 * Map-backed `Storage` stub and their own teardown; a copy that forgot the
 * teardown leaked a global into the next file's tests. `vitest.setup.ts` now
 * installs the working store before every test and tears every stub in this
 * module down after it, so a test file only states the *deviations* it needs:
 * a blocked store, a throwing accessor, no store at all, or a narrow viewport.
 *
 * jsdom likewise implements no `matchMedia`, and its absence is not neutral:
 * MUI's `useMediaQuery` then reports `false` for every query, which is the
 * desktop branch. A test that wants the compact branch has to say so.
 */

/**
 * The store behind the currently installed working `localStorage` stub, so a
 * test that installs one from `vitest.setup.ts` (rather than by calling
 * `stubWorkingLocalStorage()` itself) can still read what the component wrote.
 */
let currentStore: Map<string, string> | undefined;

/** Set when a test replaced the `window.localStorage` *property* itself. */
let localStoragePropertyDefined = false;

/**
 * A real, working `Storage` for the duration of one test. Returns the backing
 * map so a test can seed it or assert on it directly.
 */
export function stubWorkingLocalStorage(): Map<string, string> {
    const store = new Map<string, string>();
    currentStore = store;
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
    return store;
}

/** The backing map of the working `localStorage` stub installed for this test. */
export function localStorageStore(): Map<string, string> {
    if (currentStore === undefined) {
        throw new Error("no working localStorage stub is installed");
    }
    return currentStore;
}

/**
 * A store that constructs fine but throws from every operation, as a browser
 * that refuses site data presents it.
 */
export function stubBlockedLocalStorage(): void {
    const blocked = (): never => {
        throw new DOMException("denied", "SecurityError");
    };
    currentStore = undefined;
    vi.stubGlobal("localStorage", {
        get length(): number {
            return blocked();
        },
        clear: blocked,
        getItem: blocked,
        key: blocked,
        removeItem: blocked,
        setItem: blocked,
    } satisfies Storage);
}

/**
 * A `window.localStorage` whose *accessor* throws -- the failure mode a
 * `try`/`catch` around only the `getItem` call would not survive.
 */
export function stubThrowingLocalStorageAccessor(): void {
    currentStore = undefined;
    localStoragePropertyDefined = true;
    Object.defineProperty(window, "localStorage", {
        configurable: true,
        get(): Storage {
            throw new DOMException("denied", "SecurityError");
        },
    });
}

/**
 * No `localStorage` at all -- this jsdom's own default, which stands in for a
 * genuinely unavailable `Storage`. Needed explicitly because `vitest.setup.ts`
 * installs a working one before every test.
 */
export function stubMissingLocalStorage(): void {
    currentStore = undefined;
    // Removes the stub `vitest.setup.ts` installed without disturbing any
    // other global this test stubbed; `vi.unstubAllGlobals()` in the global
    // teardown restores the (absent) original either way.
    Reflect.deleteProperty(window, "localStorage");
}

/**
 * A `matchMedia` that matches every `max-width` query, i.e. a narrow viewport.
 * MUI decides several layouts (`Drawer` versus docked column, folded table
 * columns) with `useMediaQuery` rather than with CSS `display`, and jsdom's
 * missing `matchMedia` always resolves those to the wide branch.
 */
export function stubNarrowViewport(): void {
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }));
}

/** Teardown for every stub above; called from the global `afterEach`. */
export function resetBrowserStubs(): void {
    currentStore = undefined;
    if (localStoragePropertyDefined) {
        localStoragePropertyDefined = false;
        Reflect.deleteProperty(window, "localStorage");
    }
}
