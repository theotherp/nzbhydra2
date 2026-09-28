import {describe, expect, it} from "vitest";

import {userPreferences} from "../../../services/preferences/userPreferences";
import {localStorageStore} from "../../../test/browserStubs";
import {loadChoices, saveChoices, STORAGE_KEY} from "./storedChoices";

describe("loadChoices", () => {
    it("should read the choices saved in the user's preferences", () => {
        saveChoices({compactRows: true, sorting: [{id: "size", desc: true}]});

        expect(loadChoices()).toEqual({
            compactRows: true,
            sorting: [{id: "size", desc: true}],
        });
        expect(userPreferences().read("searchResults")).toEqual({
            compactRows: true,
            sorting: [{id: "size", desc: true}],
        });
    });

    it("should migrate the payload this browser stored", () => {
        localStorageStore().set(
            STORAGE_KEY,
            JSON.stringify({showCovers: true, filters: {title: "x"}}),
        );

        expect(loadChoices()).toEqual({showCovers: true});
        expect(userPreferences().read("searchResults")).toEqual({
            showCovers: true,
            filters: {title: "x"},
        });
    });

    it("should prefer the user's preferences over this browser's payload", () => {
        localStorageStore().set(
            STORAGE_KEY,
            JSON.stringify({showCovers: true}),
        );
        saveChoices({showCovers: false});

        expect(loadChoices()).toEqual({showCovers: false});
    });

    it("should drop values of the wrong type", () => {
        userPreferences().write("searchResults", {
            compactRows: "yes",
            hideDownloaded: true,
            sorting: [{id: "size"}],
        });

        expect(loadChoices()).toEqual({hideDownloaded: true});
    });

    it("should start from nothing for an unreadable payload", () => {
        localStorageStore().set(STORAGE_KEY, "{not json");

        expect(loadChoices()).toEqual({});
        expect(userPreferences().read("searchResults")).toBeUndefined();
    });
});
