import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitForElementToBeRemoved,
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
import {AuthConfigTab} from "./AuthConfigTab";

/** A config in which every one of legacy's `hideExpression`s is satisfied. */
const fullyVisibleConfig: ConfigValues = {
    auth: {
        allowApiStats: true,
        authHeader: "X-Remote-User",
        authHeaderIpRanges: ["127.0.0.1"],
        authType: "BASIC",
        oidcAuthorizationUri: null,
        oidcClientId: null,
        oidcClientSecret: null,
        oidcIssuerUri: null,
        oidcJwkSetUri: null,
        oidcRedirectUri: "{baseUrl}/login/oauth2/code/{registrationId}",
        oidcScopes: ["openid", "profile", "email"],
        oidcTokenUri: null,
        oidcUserInfoUri: null,
        oidcUsernameClaim: "preferred_username",
        rememberMeValidityDays: 14,
        rememberUsers: true,
        restrictAdmin: true,
        restrictDetailsDl: true,
        restrictIndexerSelection: true,
        restrictSearch: true,
        restrictStats: true,
        users: [
            {
                maySeeAdmin: false,
                maySeeDetailsDl: true,
                maySeeStats: true,
                password: UNCHANGED_SECRET_MARKER,
                showIndexerSelection: true,
                username: "alice",
            },
        ],
    },
};

type Harness = {form: UseFormReturn<ConfigValues>};

function renderAuth({
    showAdvanced = true,
    values = fullyVisibleConfig,
}: {showAdvanced?: boolean; values?: ConfigValues} = {}): Harness {
    const harness = {} as Harness;
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: structuredClone(values),
            shouldUnregister: false,
        });
        useEffect(() => {
            harness.form = form;
        }, [form]);
        return (
            <ThemeProvider theme={createHydraTheme("dark")}>
                <QueryClientProvider client={queryClient}>
                    {/* The Users table's Delete asks the shared confirm dialog. */}
                    <DialogProvider>
                        <FormProvider {...form}>
                            <ShowAdvancedContext.Provider value={showAdvanced}>
                                <AuthConfigTab />
                            </ShowAdvancedContext.Provider>
                        </FormProvider>
                    </DialogProvider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function authValues(harness: Harness): Record<string, unknown> {
    return harness.form.getValues().auth as Record<string, unknown>;
}

afterEach(cleanup);

describe("F-CONFIG-AUTH field inventory", () => {
    it("should render the Main, Restrictions, and Users fieldsets for a non-OIDC auth type", () => {
        renderAuth();

        expect(
            screen
                .getAllByTestId(/^config-fieldset-(?!tooltip)/)
                .map((element) =>
                    (element.getAttribute("data-testid") ?? "").replace(
                        "config-fieldset-",
                        "",
                    ),
                ),
        ).toEqual(["main", "restrictions", "users"]);
    });
});

describe("F-CONFIG-AUTH conditional fields", () => {
    it("should hide the header fields and restrictions/users for auth type None, keeping their values", () => {
        const harness = renderAuth();

        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Auth type"}));
        fireEvent.click(screen.getByRole("option", {name: "None"}));

        for (const testId of [
            "config-setting-auth-authHeader",
            "config-setting-auth-authHeaderIpRanges",
            "config-setting-auth-rememberUsers",
            "config-setting-auth-rememberMeValidityDays",
            "config-fieldset-restrictions",
            "config-fieldset-users",
        ]) {
            expect(screen.queryByTestId(testId)).toBeNull();
        }
        expect(authValues(harness)).toMatchObject({
            authHeader: "X-Remote-User",
            authHeaderIpRanges: ["127.0.0.1"],
            authType: "NONE",
            rememberMeValidityDays: 14,
            rememberUsers: true,
            restrictAdmin: true,
        });
        expect(
            (authValues(harness).users as Record<string, unknown>[])[0],
        ).toMatchObject({password: UNCHANGED_SECRET_MARKER, username: "alice"});
    });

    it("should hide the header fields for auth type OIDC but still show restrictions and users", () => {
        const harness = renderAuth();

        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Auth type"}));
        fireEvent.click(screen.getByRole("option", {name: "OpenID Connect"}));

        expect(
            screen.queryByTestId("config-setting-auth-authHeader"),
        ).toBeNull();
        expect(
            screen.queryByTestId("config-setting-auth-rememberUsers"),
        ).toBeNull();
        expect(
            screen.getByTestId("config-fieldset-restrictions"),
        ).toBeVisible();
        expect(screen.getByTestId("config-fieldset-users")).toBeVisible();
        expect(authValues(harness)).toMatchObject({authType: "OIDC"});
    });

    it("should hide the secure IP ranges field while the auth header is empty", () => {
        const harness = renderAuth();
        expect(
            screen.getByTestId("config-setting-auth-authHeaderIpRanges"),
        ).toBeVisible();

        fireEvent.change(screen.getByTestId("config-input-auth-authHeader"), {
            target: {value: ""},
        });

        expect(
            screen.queryByTestId("config-setting-auth-authHeaderIpRanges"),
        ).toBeNull();
        expect(authValues(harness)).toMatchObject({
            authHeaderIpRanges: ["127.0.0.1"],
        });
    });

    it("should show the OpenID Connect fieldset only for auth type OIDC", () => {
        renderAuth();
        expect(
            screen.queryByTestId("config-fieldset-openid connect"),
        ).toBeNull();

        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Auth type"}));
        fireEvent.click(screen.getByRole("option", {name: "OpenID Connect"}));

        expect(
            screen.getByTestId("config-fieldset-openid connect"),
        ).toBeVisible();
    });

    it("should hide the explicit OIDC endpoint fields once an issuer URI is set", () => {
        const oidcValues: ConfigValues = {
            auth: {...fullyVisibleConfig.auth, authType: "OIDC"},
        };
        const harness = renderAuth({values: oidcValues});

        for (const testId of [
            "config-setting-auth-oidcAuthorizationUri",
            "config-setting-auth-oidcTokenUri",
            "config-setting-auth-oidcUserInfoUri",
            "config-setting-auth-oidcJwkSetUri",
        ]) {
            expect(screen.getByTestId(testId)).toBeVisible();
        }

        fireEvent.change(
            screen.getByTestId("config-input-auth-oidcIssuerUri"),
            {
                target: {value: "https://idp.example.com"},
            },
        );

        for (const testId of [
            "config-setting-auth-oidcAuthorizationUri",
            "config-setting-auth-oidcTokenUri",
            "config-setting-auth-oidcUserInfoUri",
            "config-setting-auth-oidcJwkSetUri",
        ]) {
            expect(screen.queryByTestId(testId)).toBeNull();
        }
        expect(authValues(harness)).toMatchObject({
            oidcIssuerUri: "https://idp.example.com",
        });
    });
});

describe("F-CONFIG-AUTH Users section", () => {
    it("should render the users as a table inside the Users fieldset", () => {
        renderAuth();

        const fieldset = screen.getByTestId("config-fieldset-users");
        expect(
            within(fieldset).getByTestId("config-users-table"),
        ).toBeVisible();
        expect(
            within(fieldset).getByTestId("config-user-username-0"),
        ).toHaveTextContent("alice");
        // The tab body no longer binds a single control to `auth.users.*`:
        // every user is edited through `UserDialog`'s transaction, which is
        // what keeps a half-filled user out of the whole-config form.
        expect(
            screen.queryByTestId("config-input-auth-users-0-username"),
        ).toBeNull();
        expect(
            within(fieldset).getByRole("button", {name: "Add new user"}),
        ).toBeVisible();
    });

    it("should commit a user edited in the dialog into the shared form", async () => {
        const harness = renderAuth();
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(screen.getByTestId("config-user-edit-0"));
        await screen.findByTestId("config-user-dialog");
        fireEvent.change(
            screen.getByTestId("config-input-auth-userDraft-username"),
            {target: {value: "alice-renamed"}},
        );
        fireEvent.click(screen.getByTestId("config-user-dialog-submit"));
        await waitForElementToBeRemoved(() =>
            screen.queryByTestId("config-user-dialog"),
        );

        expect(
            (authValues(harness).users as Record<string, unknown>[])[0],
        ).toMatchObject({
            password: UNCHANGED_SECRET_MARKER,
            username: "alice-renamed",
        });
        expect(harness.form.formState.isDirty).toBe(true);
        // The draft path the dialog wrote to lives in the dialog's own form
        // and must never appear in the configuration this tab would save.
        expect(authValues(harness).userDraft).toBeUndefined();
    });

    it("should keep the users array in the shared form across an unmount and remount of the tab", async () => {
        const harness = renderAuth();

        fireEvent.click(screen.getByTestId("config-users-add"));
        await screen.findByTestId("config-user-dialog");
        fireEvent.change(
            screen.getByTestId("config-input-auth-userDraft-username"),
            {target: {value: "bob"}},
        );
        fireEvent.change(
            screen.getByTestId("config-input-auth-userDraft-password"),
            {target: {value: "typed"}},
        );
        fireEvent.click(screen.getByTestId("config-user-dialog-submit"));
        await waitForElementToBeRemoved(() =>
            screen.queryByTestId("config-user-dialog"),
        );
        expect(
            authValues(harness).users as Record<string, unknown>[],
        ).toHaveLength(2);

        // Simulating a tab switch: the tab body unmounts while the shared
        // form (created outside it) does not.
        cleanup();
        function Remount() {
            return (
                <ThemeProvider theme={createHydraTheme("dark")}>
                    <DialogProvider>
                        <FormProvider {...harness.form}>
                            <ShowAdvancedContext.Provider value={true}>
                                <AuthConfigTab />
                            </ShowAdvancedContext.Provider>
                        </FormProvider>
                    </DialogProvider>
                </ThemeProvider>
            );
        }
        render(<Remount />);

        expect(screen.getByTestId("config-user-username-1")).toHaveTextContent(
            "bob",
        );
    });
});
