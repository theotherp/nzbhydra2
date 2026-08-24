import {afterEach, describe, expect, it, vi} from "vitest";

import {readItem, writeItem} from "./browserStorage";

/**
 * This project's jsdom environment has no explicit `url` configured, which
 * leaves `window.localStorage` unavailable in every test (a jsdom "opaque
 * origin" limitation). That absence is itself one of the cases this module
 * guards, so the working store is installed only where a test needs one.
 */
function stubWorkingLocalStorage(): Map<string, string> {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) =>
            store.has(key) ? (store.get(key) as string) : null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => store.set(key, value),
    } satisfies Storage);
    return store;
}

/**
 * A `window.localStorage` whose *accessor* throws, as a browser with site data
 * blocked presents it -- the failure mode a `try`/`catch` around only the
 * `getItem` call would not survive.
 */
function stubThrowingLocalStorageAccessor(): void {
    Object.defineProperty(window, "localStorage", {
        configurable: true,
        get(): Storage {
            throw new DOMException("denied", "SecurityError");
        },
    });
}

/** A store that constructs fine but throws from every operation. */
function stubThrowingOperations(): void {
    const blocked = (): never => {
        throw new DOMException("denied", "SecurityError");
    };
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

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "localStorage");
});

describe("readItem/writeItem", () => {
    it("round-trips a stored string", () => {
        stubWorkingLocalStorage();
        expect(readItem("hydra.test.key")).toBeUndefined();
        writeItem("hydra.test.key", "stored");
        expect(readItem("hydra.test.key")).toBe("stored");
    });

    it("writes the value verbatim under the key it is given", () => {
        const store = stubWorkingLocalStorage();
        writeItem("hydra.test.key", '{"a":1}');
        expect(store.get("hydra.test.key")).toBe('{"a":1}');
    });

    it("reads a missing key as undefined rather than null", () => {
        stubWorkingLocalStorage();
        expect(readItem("hydra.test.absent")).toBeUndefined();
    });

    it("survives a throwing window.localStorage accessor", () => {
        stubThrowingLocalStorageAccessor();
        expect(readItem("hydra.test.key")).toBeUndefined();
        expect(() => {
            writeItem("hydra.test.key", "value");
        }).not.toThrow();
    });

    it("survives a throwing getItem and setItem", () => {
        stubThrowingOperations();
        expect(readItem("hydra.test.key")).toBeUndefined();
        expect(() => {
            writeItem("hydra.test.key", "value");
        }).not.toThrow();
    });

    it("survives a storage-less environment", () => {
        expect(window.localStorage).toBeUndefined();
        expect(readItem("hydra.test.key")).toBeUndefined();
        expect(() => {
            writeItem("hydra.test.key", "value");
        }).not.toThrow();
    });
});
