import {describe, expect, it} from "vitest";

import {UNCHANGED_SECRET_MARKER} from "../components";
import {
    defaultUser,
    userDraftFieldPath,
    userFieldPath,
    userLegend,
    userPasswordState,
    userRights,
    usersOf,
    USER_PASSWORD_STATE_LABELS,
    type UserAuthConfigValues,
} from "./authSettings";

function user(
    overrides: Partial<UserAuthConfigValues> = {},
): UserAuthConfigValues {
    return {
        maySeeAdmin: false,
        maySeeDetailsDl: false,
        maySeeStats: false,
        password: UNCHANGED_SECRET_MARKER,
        showIndexerSelection: false,
        username: "alice",
        ...overrides,
    };
}

describe("usersOf", () => {
    it("reads the users array the form holds", () => {
        const entries = [user(), user({username: "bob"})];

        expect(usersOf(entries)).toEqual(entries);
    });

    it("reads anything that is not a list of records as no users", () => {
        expect(usersOf(undefined)).toEqual([]);
        expect(usersOf(null)).toEqual([]);
        expect(usersOf("alice")).toEqual([]);
        expect(usersOf([null, "alice"])).toEqual([]);
    });
});

describe("userLegend", () => {
    it("uses the username", () => {
        expect(userLegend(user({username: "alice"}))).toBe("alice");
    });

    it("falls back to legacy's Authless legend for a blank username", () => {
        expect(userLegend(user({username: null}))).toBe("Authless");
        expect(userLegend(user({username: ""}))).toBe("Authless");
    });
});

describe("userRights", () => {
    it("shows Admin alone, mirroring the editor's implies-all hiding", () => {
        const rights = userRights(
            user({
                maySeeAdmin: true,
                maySeeDetailsDl: true,
                maySeeStats: true,
                showIndexerSelection: true,
            }),
        );

        expect(rights.map((right) => right.label)).toEqual(["Admin"]);
    });

    it("names each granted right when the user is not an admin", () => {
        const rights = userRights(
            user({maySeeDetailsDl: true, maySeeStats: true}),
        );

        expect(rights.map((right) => right.label)).toEqual([
            "Stats",
            "Details & DL",
        ]);
    });

    it("says No rights rather than returning nothing at all", () => {
        // The awkward case: a user with every switch off. An empty list here
        // would paint an empty cell, which reads as "not rendered yet" rather
        // than as the state it is.
        expect(userRights(user()).map((right) => right.label)).toEqual([
            "No rights",
        ]);
    });

    it("keeps Admin out of the individual rights even when they are all off", () => {
        expect(
            userRights(user({maySeeAdmin: true})).map((right) => right.label),
        ).toEqual(["Admin"]);
    });

    it("gives every chip a distinct key so a row can address them", () => {
        const rights = userRights(
            user({
                maySeeDetailsDl: true,
                maySeeStats: true,
                showIndexerSelection: true,
            }),
        );

        expect(rights.map((right) => right.key)).toEqual([
            "maySeeStats",
            "maySeeDetailsDl",
            "showIndexerSelection",
        ]);
    });
});

describe("userPasswordState", () => {
    it("reports a stored password for the server's marker", () => {
        expect(
            userPasswordState(
                user({password: UNCHANGED_SECRET_MARKER}),
                "BASIC",
            ),
        ).toBe("stored");
    });

    it("reports a typed password as set but not yet saved", () => {
        expect(userPasswordState(user({password: "typed"}), "BASIC")).toBe(
            "unsaved",
        );
    });

    it("reports a missing password for null and for empty", () => {
        expect(userPasswordState(user({password: null}), "BASIC")).toBe(
            "missing",
        );
        expect(userPasswordState(user({password: ""}), "BASIC")).toBe(
            "missing",
        );
    });

    it("reports OIDC as not using a password at all", () => {
        expect(
            userPasswordState(
                user({password: UNCHANGED_SECRET_MARKER}),
                "OIDC",
            ),
        ).toBe("unused");
        expect(userPasswordState(user({password: null}), "OIDC")).toBe(
            "unused",
        );
    });

    it("never labels a state with anything derived from the value", () => {
        // The property the table depends on: the four labels are fixed words,
        // so no password, hash, or marker can travel into a row through them.
        for (const label of Object.values(USER_PASSWORD_STATE_LABELS)) {
            expect(label).not.toContain(UNCHANGED_SECRET_MARKER);
            expect(label).not.toContain("*");
        }
        expect(Object.keys(USER_PASSWORD_STATE_LABELS).sort()).toEqual([
            "missing",
            "stored",
            "unsaved",
            "unused",
        ]);
    });
});

describe("user field paths", () => {
    it("addresses a row by its configuration index", () => {
        expect(userFieldPath(2, "username")).toBe("auth.users.2.username");
    });

    it("keeps the dialog's draft off the users array entirely", () => {
        // The draft must not collide with a row's own control ids, and must
        // never be a path the whole-config form would save.
        expect(userDraftFieldPath("password")).toBe("auth.userDraft.password");
        expect(userDraftFieldPath("password")).not.toContain("auth.users");
    });
});

describe("defaultUser", () => {
    it("starts a new user with legacy's default permissions and no password", () => {
        expect(defaultUser()).toEqual({
            maySeeAdmin: true,
            maySeeDetailsDl: true,
            maySeeStats: true,
            password: null,
            showIndexerSelection: true,
            username: null,
        });
    });
});
