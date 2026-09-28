import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {localStorageStore} from "../../test/browserStubs";
import {
    createUserPreferenceStore,
    readPreference,
    readSection,
    setUserPreferenceStore,
    userPreferences,
    WRITE_DELAY_MS,
    writePreference,
} from "./userPreferences";

describe("createUserPreferenceStore", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should read the sections it was created with", () => {
        const store = createUserPreferenceStore(
            {config: {showAdvanced: true}},
            undefined,
        );

        expect(store.read("config")).toEqual({showAdvanced: true});
        expect(store.read("history")).toBeUndefined();
    });

    it("should apply a write at once and send only the last of a burst after the delay", () => {
        const writer = vi.fn().mockResolvedValue(undefined);
        const store = createUserPreferenceStore({}, writer);

        store.write("searchResults", {compactRows: true});
        store.write("searchResults", {compactRows: false});
        expect(store.read("searchResults")).toEqual({compactRows: false});
        expect(writer).not.toHaveBeenCalled();

        vi.advanceTimersByTime(WRITE_DELAY_MS);
        expect(writer).toHaveBeenCalledTimes(1);
        expect(writer).toHaveBeenCalledWith("searchResults", {
            compactRows: false,
        });
    });

    it("should send each section on its own and not resend an unchanged value", () => {
        const writer = vi.fn().mockResolvedValue(undefined);
        const store = createUserPreferenceStore(
            {config: {showAdvanced: true}},
            writer,
        );

        store.write("config", {showAdvanced: true});
        store.write("history", {refineCollapsed: true});
        store.write("systemLog", {tail: true});
        vi.advanceTimersByTime(WRITE_DELAY_MS);

        expect(writer.mock.calls).toEqual([
            ["history", {refineCollapsed: true}],
            ["systemLog", {tail: true}],
        ]);
    });

    it("should send pending writes at once when flushed", () => {
        const writer = vi.fn().mockResolvedValue(undefined);
        const store = createUserPreferenceStore({}, writer);

        store.write("history", {refineCollapsed: true});
        store.flush();
        expect(writer).toHaveBeenCalledWith("history", {refineCollapsed: true});

        vi.advanceTimersByTime(WRITE_DELAY_MS);
        expect(writer).toHaveBeenCalledTimes(1);
    });

    it("should keep the value when the server refuses it and send it with the next change", async () => {
        const writer = vi
            .fn()
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValue(undefined);
        const store = createUserPreferenceStore({}, writer);

        store.write("config", {showAdvanced: true});
        await vi.advanceTimersByTimeAsync(WRITE_DELAY_MS);
        expect(store.read("config")).toEqual({showAdvanced: true});

        store.write("config", {showAdvanced: false});
        await vi.advanceTimersByTimeAsync(WRITE_DELAY_MS);
        expect(writer).toHaveBeenLastCalledWith("config", {
            showAdvanced: false,
        });
    });
});

describe("userPreferences", () => {
    afterEach(() => {
        delete window.__NZBHYDRA_BOOTSTRAP__;
    });

    it("should start from the bootstrap's preferences and write them to the server", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/hydra/",
            userPreferences: {config: {showAdvanced: true}},
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        vi.stubGlobal("fetch", fetchImplementation);
        setUserPreferenceStore(undefined);

        expect(readPreference("config", "showAdvanced")).toBe(true);

        writePreference("config", "showAdvanced", false);
        window.dispatchEvent(new Event("pagehide"));
        await vi.waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(1),
        );
        const [url, init] = fetchImplementation.mock.calls[0] as [
            string,
            RequestInit,
        ];
        expect(url).toBe(
            "http://localhost:3000/hydra/internalapi/userpreferences/config",
        );
        expect(init).toMatchObject({keepalive: true, method: "PUT"});
        expect(init.body).toBe(JSON.stringify({showAdvanced: false}));
    });

    it("should start empty without a bootstrap", () => {
        setUserPreferenceStore(undefined);

        expect(userPreferences().read("config")).toBeUndefined();
    });
});

describe("readPreference", () => {
    it("should keep a section's other options when one is written", () => {
        writePreference("systemLog", "tail", true);
        writePreference("systemLog", "autoRefresh", false);

        expect(userPreferences().read("systemLog")).toEqual({
            tail: true,
            autoRefresh: false,
        });
        expect(readPreference("systemLog", "tail")).toBe(true);
    });

    it("should migrate an option only the browser has, once", () => {
        const legacy = vi.fn().mockReturnValue(true);

        expect(readPreference("config", "showAdvanced", legacy)).toBe(true);
        expect(readPreference("config", "showAdvanced", legacy)).toBe(true);

        expect(legacy).toHaveBeenCalledTimes(1);
        expect(userPreferences().read("config")).toEqual({showAdvanced: true});
    });

    it("should prefer the stored option over the browser's", () => {
        userPreferences().write("config", {showAdvanced: false});

        expect(readPreference("config", "showAdvanced", () => true)).toBe(
            false,
        );
    });

    it("should store nothing when neither has the option", () => {
        expect(
            readPreference("config", "showAdvanced", () => undefined),
        ).toBeUndefined();
        expect(userPreferences().read("config")).toBeUndefined();
    });
});

describe("readSection", () => {
    it("should migrate a section only the browser has", () => {
        localStorageStore().set("legacy", JSON.stringify({compactRows: true}));
        const legacy = () =>
            JSON.parse(
                window.localStorage.getItem("legacy") ?? "null",
            ) as unknown;

        expect(readSection("searchResults", legacy)).toEqual({
            compactRows: true,
        });
        expect(userPreferences().read("searchResults")).toEqual({
            compactRows: true,
        });
    });
});
