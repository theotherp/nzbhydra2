import {ThemeProvider} from "@mui/material";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {createHydraTheme} from "../../../app/theme";
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {UNCHANGED_SECRET_MARKER} from "../components";
import {settingsIndexForTab} from "../settingsSearch/settingsIndex";
import {AuthUsersSection} from "./AuthUsersSection";
import {type UserAuthConfigValues} from "./authSettings";

function user(
    overrides: Partial<UserAuthConfigValues> = {},
): UserAuthConfigValues {
    return {
        maySeeAdmin: false,
        maySeeDetailsDl: true,
        maySeeStats: true,
        password: UNCHANGED_SECRET_MARKER,
        showIndexerSelection: true,
        username: "alice",
        ...overrides,
    };
}

function configWith(
    users: UserAuthConfigValues[],
    authType = "BASIC",
): ConfigValues {
    return {auth: {authType, users}};
}

type Harness = {form: UseFormReturn<ConfigValues>};

function renderUsers(values: ConfigValues): Harness {
    const harness = {} as Harness;
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: structuredClone(values),
            shouldUnregister: false,
        });
        useEffect(() => {
            harness.form = form;
        }, [form]);
        const isDirty = form.formState.isDirty;
        return (
            <ThemeProvider theme={createHydraTheme("grey")}>
                <DialogProvider>
                    <FormProvider {...form}>
                        <ShowAdvancedContext.Provider value={true}>
                            <span data-testid="form-dirty">
                                {String(isDirty)}
                            </span>
                            <AuthUsersSection />
                        </ShowAdvancedContext.Provider>
                    </FormProvider>
                </DialogProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function usersOf(harness: Harness): UserAuthConfigValues[] {
    return (harness.form.getValues().auth as {users: UserAuthConfigValues[]})
        .users;
}

function draftInput(field: string): HTMLElement {
    return screen.getByTestId(`config-input-auth-userDraft-${field}`);
}

async function openEditor(index: number): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-user-edit-${index}`));
    await screen.findByTestId("config-user-dialog");
}

async function submitDialog(): Promise<void> {
    fireEvent.click(screen.getByTestId("config-user-dialog-submit"));
    await waitFor(() =>
        expect(screen.queryByTestId("config-user-dialog")).toBeNull(),
    );
}

async function confirmDelete(index: number): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-user-delete-${index}`));
    const confirmation = await screen.findByTestId(
        "config-user-delete-confirm",
    );
    fireEvent.click(within(confirmation).getByRole("button", {name: "Delete"}));
    await waitFor(() =>
        expect(screen.queryByTestId("config-user-delete-confirm")).toBeNull(),
    );
}

afterEach(cleanup);

describe("F-CONFIG-AUTH users table", () => {
    it("should show one row per configured user, in configuration order", () => {
        renderUsers(
            configWith([
                user({username: "alice"}),
                user({maySeeAdmin: true, username: "bob"}),
            ]),
        );

        expect(screen.getByTestId("config-user-username-0")).toHaveTextContent(
            "alice",
        );
        expect(screen.getByTestId("config-user-username-1")).toHaveTextContent(
            "bob",
        );
        expect(screen.queryByTestId("config-user-entry-2")).toBeNull();
    });

    it("should show the Authless legend for a user with no username", () => {
        renderUsers(configWith([user({username: null})]));

        expect(screen.getByTestId("config-user-username-0")).toHaveTextContent(
            "Authless",
        );
    });

    it("should show Admin alone for an admin and each granted right otherwise", () => {
        renderUsers(
            configWith([
                user({
                    maySeeAdmin: true,
                    maySeeDetailsDl: true,
                    maySeeStats: true,
                    username: "admin",
                }),
                user({
                    maySeeDetailsDl: true,
                    maySeeStats: false,
                    showIndexerSelection: false,
                    username: "limited",
                }),
            ]),
        );

        expect(screen.getByTestId("config-user-rights-0")).toHaveTextContent(
            "Admin",
        );
        expect(
            screen.getByTestId("config-user-rights-1").textContent,
        ).toContain("Details & DL");
        expect(
            screen.queryByTestId("config-user-right-1-maySeeStats"),
        ).toBeNull();
    });

    it("should say No rights for a user with nothing granted", () => {
        renderUsers(
            configWith([
                user({
                    maySeeAdmin: false,
                    maySeeDetailsDl: false,
                    maySeeStats: false,
                    showIndexerSelection: false,
                    username: "nobody",
                }),
            ]),
        );

        expect(
            screen.getByTestId("config-user-right-0-none"),
        ).toHaveTextContent("No rights");
    });

    it("should indicate the password state without ever rendering a value", () => {
        renderUsers(
            configWith([
                user({password: UNCHANGED_SECRET_MARKER, username: "stored"}),
                user({password: null, username: "none"}),
            ]),
        );

        expect(screen.getByTestId("config-user-password-0")).toHaveTextContent(
            "Set",
        );
        expect(screen.getByTestId("config-user-password-1")).toHaveTextContent(
            "Not set",
        );
        const table = screen.getByTestId("config-users-table");
        expect(table.textContent).not.toContain(UNCHANGED_SECRET_MARKER);
        expect(table.textContent).not.toContain("*");
        expect(table.querySelector("input")).toBeNull();
    });

    /**
     * The selector this section lost once already. `settingsIndex.ts` derives
     * the Users section's search anchor from its config path, and FM-105's
     * table dropped the id the repeat section had emitted, leaving FM-099's
     * settings search and FM-102's "on this page" list navigating to an id that
     * was in no DOM. Read off the index rather than typed out again, so the two
     * cannot drift apart.
     */
    it("should keep the search anchor settingsIndex.ts derives for this section", () => {
        const anchors = settingsIndexForTab("auth")
            .filter((entry) => entry.kind === "section")
            .map((entry) => entry.anchorTestId);
        expect(anchors).toEqual(["config-repeat-auth-users"]);

        renderUsers(configWith([user()]));

        for (const anchor of anchors) {
            expect(screen.getByTestId(anchor)).toBeVisible();
        }
    });

    it("should say the password is not used when auth type is OIDC", () => {
        renderUsers(
            configWith([user({password: UNCHANGED_SECRET_MARKER})], "OIDC"),
        );

        expect(screen.getByTestId("config-user-password-0")).toHaveTextContent(
            "Not used",
        );
    });

    it("should show an empty-state row rather than a bare table with no users", () => {
        renderUsers(configWith([]));

        expect(screen.getByTestId("config-users-empty")).toBeVisible();
    });
});

describe("F-CONFIG-AUTH user dialog transaction", () => {
    it("should keep the stored password masked and commit it unchanged when only the username is edited", async () => {
        const harness = renderUsers(
            configWith([user({username: "alice"}), user({username: "bob"})]),
        );

        await openEditor(0);
        // The masked-value contract: the field is empty with the unchanged
        // placeholder, never the marker text itself.
        expect(draftInput("password")).toHaveValue("");
        expect(draftInput("password")).toHaveAttribute(
            "placeholder",
            "Value unchanged",
        );
        fireEvent.change(draftInput("username"), {
            target: {value: "alice-renamed"},
        });
        await submitDialog();

        expect(usersOf(harness)[0]).toMatchObject({
            password: UNCHANGED_SECRET_MARKER,
            username: "alice-renamed",
        });
        expect(usersOf(harness)[1]).toMatchObject({
            password: UNCHANGED_SECRET_MARKER,
            username: "bob",
        });
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
    });

    it("should restore the marker when a typed password is cleared again", async () => {
        const harness = renderUsers(configWith([user()]));

        await openEditor(0);
        fireEvent.change(draftInput("password"), {target: {value: "typed"}});
        fireEvent.change(draftInput("password"), {target: {value: ""}});
        await submitDialog();

        // Clearing must not save an empty string over the stored hash.
        expect(usersOf(harness)[0].password).toBe(UNCHANGED_SECRET_MARKER);
    });

    it("should discard everything typed when the dialog is cancelled", async () => {
        const harness = renderUsers(configWith([user({username: "alice"})]));

        await openEditor(0);
        fireEvent.change(draftInput("username"), {target: {value: "gone"}});
        fireEvent.change(draftInput("password"), {target: {value: "gone-too"}});
        fireEvent.click(screen.getByTestId("config-user-dialog-cancel"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-user-dialog")).toBeNull(),
        );

        expect(usersOf(harness)[0]).toMatchObject({
            password: UNCHANGED_SECRET_MARKER,
            username: "alice",
        });
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("should require a username and a password for a new user", async () => {
        const harness = renderUsers(configWith([user()]));

        fireEvent.click(screen.getByTestId("config-users-add"));
        await screen.findByTestId("config-user-dialog");
        fireEvent.click(screen.getByTestId("config-user-dialog-submit"));

        expect(
            await screen.findByTestId("config-error-auth-userDraft-username"),
        ).toBeVisible();
        expect(
            screen.getByTestId("config-error-auth-userDraft-password"),
        ).toBeVisible();
        // Nothing was committed: an invalid new user never reaches the
        // configuration at all.
        expect(usersOf(harness)).toHaveLength(1);
        expect(screen.getByTestId("config-user-dialog")).toBeVisible();
    });

    it("should not require a password when auth type is OIDC", async () => {
        const harness = renderUsers(configWith([user()], "OIDC"));

        fireEvent.click(screen.getByTestId("config-users-add"));
        await screen.findByTestId("config-user-dialog");
        expect(
            screen.queryByTestId("config-input-auth-userDraft-password"),
        ).toBeNull();
        fireEvent.change(draftInput("username"), {
            target: {value: "oidc-user"},
        });
        await submitDialog();

        expect(usersOf(harness)).toHaveLength(2);
        expect(usersOf(harness)[1]).toMatchObject({
            password: null,
            username: "oidc-user",
        });
    });

    it("should refuse a username another user already has exactly", async () => {
        const harness = renderUsers(
            configWith([user({username: "alice"}), user({username: "bob"})]),
        );

        await openEditor(1);
        fireEvent.change(draftInput("username"), {target: {value: "alice"}});
        fireEvent.click(screen.getByTestId("config-user-dialog-submit"));

        expect(
            await screen.findByTestId("config-error-auth-userDraft-username"),
        ).toHaveTextContent('User "alice" already exists');
        expect(usersOf(harness)[1].username).toBe("bob");
    });

    it("should keep two usernames that differ only by case apart", async () => {
        // Both matchers the backend resolves a `***UNCHANGED***` marker with
        // are `String.equals`, so `Alice` and `alice` are two distinct records
        // and must stay editable as such.
        const harness = renderUsers(
            configWith([user({username: "Alice"}), user({username: "alice"})]),
        );

        await openEditor(1);
        expect(draftInput("username")).toHaveValue("alice");
        fireEvent.change(draftInput("username"), {
            target: {value: "alice-lower"},
        });
        await submitDialog();

        expect(usersOf(harness).map((entry) => entry.username)).toEqual([
            "Alice",
            "alice-lower",
        ]);
        expect(usersOf(harness)[0].password).toBe(UNCHANGED_SECRET_MARKER);
    });

    it("should hide the dependent rights switches while may-see-admin is on", async () => {
        renderUsers(configWith([user({maySeeAdmin: false})]));

        await openEditor(0);
        expect(
            screen.getByTestId("config-setting-auth-userDraft-maySeeStats"),
        ).toBeVisible();

        fireEvent.click(
            screen.getByRole("switch", {name: "May see admin area"}),
        );

        for (const field of [
            "maySeeStats",
            "maySeeDetailsDl",
            "showIndexerSelection",
        ]) {
            expect(
                screen.queryByTestId(`config-setting-auth-userDraft-${field}`),
            ).toBeNull();
        }
    });

    it("should keep a hidden right's value rather than dropping it on submit", async () => {
        const harness = renderUsers(
            configWith([user({maySeeAdmin: false, maySeeStats: true})]),
        );

        await openEditor(0);
        fireEvent.click(
            screen.getByRole("switch", {name: "May see admin area"}),
        );
        await submitDialog();

        expect(usersOf(harness)[0]).toMatchObject({
            maySeeAdmin: true,
            maySeeStats: true,
        });
    });

    it("should preserve a key the dialog has no control for", async () => {
        const harness = renderUsers(
            configWith([
                {
                    ...user(),
                    unknownFutureKey: "kept",
                } as UserAuthConfigValues,
            ]),
        );

        await openEditor(0);
        fireEvent.change(draftInput("username"), {target: {value: "renamed"}});
        await submitDialog();

        expect(usersOf(harness)[0]).toMatchObject({
            unknownFutureKey: "kept",
            username: "renamed",
        });
    });
});

describe("F-CONFIG-AUTH users add and delete", () => {
    it("should append a user composed in the dialog and move focus to the table", async () => {
        const harness = renderUsers(configWith([user({username: "alice"})]));

        fireEvent.click(screen.getByTestId("config-users-add"));
        await screen.findByTestId("config-user-dialog");
        fireEvent.change(draftInput("username"), {target: {value: "new-user"}});
        fireEvent.change(draftInput("password"), {
            target: {value: "typed-in-dialog"},
        });
        await submitDialog();

        expect(usersOf(harness)).toHaveLength(2);
        expect(usersOf(harness)[1]).toEqual({
            maySeeAdmin: true,
            maySeeDetailsDl: true,
            maySeeStats: true,
            password: "typed-in-dialog",
            showIndexerSelection: true,
            username: "new-user",
        });
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
        // The new row is honest about a password that no save has hashed yet,
        // and still shows no value.
        expect(screen.getByTestId("config-user-password-1")).toHaveTextContent(
            "Set (unsaved)",
        );
        expect(
            screen.getByTestId("config-users-table").textContent,
        ).not.toContain("typed-in-dialog");
        await waitFor(() =>
            expect(screen.getByTestId("config-users-table")).toHaveFocus(),
        );
    });

    it("should delete a user from the middle of the list after confirming, leaving the others' passwords alone", async () => {
        // FM-068's shape exactly: removing an entry shifts every following
        // index, which is what made the backend's positional marker fallback
        // dangerous. The rows that stay must keep their own marker.
        const harness = renderUsers(
            configWith([
                user({username: "first"}),
                user({username: "middle"}),
                user({username: "last"}),
            ]),
        );

        await confirmDelete(1);

        expect(usersOf(harness)).toEqual([
            user({username: "first"}),
            user({username: "last"}),
        ]);
        expect(screen.getByTestId("config-user-username-1")).toHaveTextContent(
            "last",
        );
        expect(screen.queryByTestId("config-user-entry-2")).toBeNull();
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
        await waitFor(() =>
            expect(screen.getByTestId("config-users-table")).toHaveFocus(),
        );
    });

    it("should name the user in the delete confirmation", async () => {
        renderUsers(configWith([user({username: "middle"})]));

        fireEvent.click(screen.getByTestId("config-user-delete-0"));

        expect(
            await screen.findByTestId("config-user-delete-confirm"),
        ).toHaveTextContent('Delete the user "middle"?');
    });

    it("should remove nothing when the delete confirmation is cancelled", async () => {
        const harness = renderUsers(
            configWith([user({username: "alice"}), user({username: "bob"})]),
        );

        fireEvent.click(screen.getByTestId("config-user-delete-0"));
        const confirmation = await screen.findByTestId(
            "config-user-delete-confirm",
        );
        fireEvent.click(
            within(confirmation).getByRole("button", {name: "Cancel"}),
        );
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-user-delete-confirm"),
            ).toBeNull(),
        );

        expect(usersOf(harness).map((entry) => entry.username)).toEqual([
            "alice",
            "bob",
        ]);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("should delete the last remaining user down to the empty state", async () => {
        const harness = renderUsers(configWith([user({username: "only"})]));

        await confirmDelete(0);

        expect(usersOf(harness)).toEqual([]);
        expect(screen.getByTestId("config-users-empty")).toBeVisible();
    });
});
