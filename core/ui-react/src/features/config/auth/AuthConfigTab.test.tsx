import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {createHydraTheme} from "../../../app/theme";
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
                    <FormProvider {...form}>
                        <ShowAdvancedContext.Provider value={showAdvanced}>
                            <AuthConfigTab />
                        </ShowAdvancedContext.Provider>
                    </FormProvider>
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
    it("should add a new user with legacy's default permissions and mark the form dirty", () => {
        const harness = renderAuth();
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(screen.getByTestId("config-repeat-add-auth-users"));

        const users = authValues(harness).users as Record<string, unknown>[];
        expect(users).toHaveLength(2);
        expect(users[1]).toEqual({
            maySeeAdmin: true,
            maySeeDetailsDl: true,
            maySeeStats: true,
            password: null,
            showIndexerSelection: true,
            username: null,
        });
        expect(harness.form.formState.isDirty).toBe(true);
        expect(
            screen.getByRole("heading", {level: 3, name: "Authless"}),
        ).toBeVisible();
    });

    it("should remove a user and mark the form dirty", () => {
        const harness = renderAuth();
        // Reading `isDirty` first subscribes this harness to it; React Hook
        // Form only maintains the flag for the fields a consumer observes.
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId("config-repeat-remove-auth-users-0"),
        );

        expect(authValues(harness).users).toEqual([]);
        expect(harness.form.formState.isDirty).toBe(true);
        expect(
            screen.queryByTestId("config-repeat-entry-auth-users-0"),
        ).toBeNull();
    });

    it("should rename an existing user without touching the masked password field", () => {
        const harness = renderAuth();

        fireEvent.change(
            screen.getByTestId("config-input-auth-users-0-username"),
            {target: {value: "alice-renamed"}},
        );

        const users = authValues(harness).users as Record<string, unknown>[];
        expect(users[0]).toMatchObject({
            password: UNCHANGED_SECRET_MARKER,
            username: "alice-renamed",
        });
        expect(
            screen.getByRole("heading", {level: 3, name: "alice-renamed"}),
        ).toBeVisible();
    });

    it("should hide the password field for OIDC and never require it there", () => {
        const oidcValues: ConfigValues = {
            auth: {...fullyVisibleConfig.auth, authType: "OIDC"},
        };
        renderAuth({values: oidcValues});

        expect(
            screen.queryByTestId("config-input-auth-users-0-password"),
        ).toBeNull();
    });

    it("should require a password only for a newly added user", async () => {
        const harness = renderAuth();

        fireEvent.click(screen.getByTestId("config-repeat-add-auth-users"));
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-auth-users-1-password"),
        ).toBeVisible();
        // The existing user's password is the unchanged marker, never empty,
        // so it never trips the same rule.
        expect(
            screen.queryByTestId("config-error-auth-users-0-password"),
        ).toBeNull();

        fireEvent.change(
            screen.getByTestId("config-input-auth-users-1-username"),
            {target: {value: "bob"}},
        );
        fireEvent.change(
            screen.getByTestId("config-input-auth-users-1-password"),
            {target: {value: "s3cret"}},
        );
        expect(await harness.form.trigger()).toBe(true);
    });

    it("should hide the three dependent permission switches while may-see-admin is on", () => {
        renderAuth();
        const entry = screen.getByTestId("config-repeat-entry-auth-users-0");
        expect(
            within(entry).getByTestId(
                "config-setting-auth-users-0-maySeeStats",
            ),
        ).toBeVisible();

        fireEvent.click(
            within(entry).getByRole("switch", {name: "May see admin area"}),
        );

        expect(
            within(entry).queryByTestId(
                "config-setting-auth-users-0-maySeeStats",
            ),
        ).toBeNull();
        expect(
            within(entry).queryByTestId(
                "config-setting-auth-users-0-maySeeDetailsDl",
            ),
        ).toBeNull();
        expect(
            within(entry).queryByTestId(
                "config-setting-auth-users-0-showIndexerSelection",
            ),
        ).toBeNull();
    });

    it("should keep the users array in the shared form across an unmount and remount of the tab", () => {
        const harness = renderAuth();

        fireEvent.click(screen.getByTestId("config-repeat-add-auth-users"));
        fireEvent.change(
            screen.getByTestId("config-input-auth-users-1-username"),
            {target: {value: "bob"}},
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
                    <FormProvider {...harness.form}>
                        <ShowAdvancedContext.Provider value={true}>
                            <AuthConfigTab />
                        </ShowAdvancedContext.Provider>
                    </FormProvider>
                </ThemeProvider>
            );
        }
        render(<Remount />);

        expect(
            screen.getByTestId("config-input-auth-users-1-username"),
        ).toHaveValue("bob");
    });
});
