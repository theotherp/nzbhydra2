import {describe, expect, it} from "vitest";

import {
    stubBlockedLocalStorage,
    stubMissingLocalStorage,
    stubThrowingLocalStorageAccessor,
    stubWorkingLocalStorage,
} from "../../test/browserStubs";
import {readItem, writeItem} from "./browserStorage";

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
        stubBlockedLocalStorage();
        expect(readItem("hydra.test.key")).toBeUndefined();
        expect(() => {
            writeItem("hydra.test.key", "value");
        }).not.toThrow();
    });

    it("survives a storage-less environment", () => {
        // `vitest.setup.ts` installs a working store before every test, so the
        // absence this case is about has to be stated.
        stubMissingLocalStorage();
        expect(window.localStorage).toBeUndefined();
        expect(readItem("hydra.test.key")).toBeUndefined();
        expect(() => {
            writeItem("hydra.test.key", "value");
        }).not.toThrow();
    });
});
