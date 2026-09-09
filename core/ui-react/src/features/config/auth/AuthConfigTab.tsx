import {Box} from "@mui/material";
import {useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {
    ChipsSetting,
    ConfigFieldset,
    NumberSetting,
    SecretInput,
    SelectSetting,
    SwitchSetting,
    TextSetting,
} from "../components";
import {indexedSetting} from "../settingsSearch/settingsIndex";
import {AuthUsersSection} from "./AuthUsersSection";
import {
    AUTH_TYPE_OPTIONS,
    AUTH_TYPE_TOOLTIP,
    OIDC_TOOLTIP,
    RESTRICTIONS_TOOLTIP,
} from "./authSettings";

/**
 * `F-CONFIG-AUTH`: the Authorization configuration tab -- every field of
 * `config-fields-service.js:2011-2375`, in legacy's order and grouping, bound
 * to `C-CONFIG-FORM`'s whole-config form through the `C-CONFIG-FIELDS`
 * vocabulary.
 *
 * Legacy's `hideExpression`s become plain conditional rendering driven by
 * `useWatch`, exactly as `F-CONFIG-MAIN` does: the shell's form is created
 * with `shouldUnregister: false`, so hiding a row never clears the value
 * behind it and never lets its validation rules block a save.
 */
export function AuthConfigTab() {
    const authType = useWatch<ConfigValues>({name: "auth.authType"});
    const authHeader = useWatch<ConfigValues>({name: "auth.authHeader"});
    const oidcIssuerUri = useWatch<ConfigValues>({name: "auth.oidcIssuerUri"});

    // `config-fields-service.js:2047-2090`.
    const headerFieldsVisible = authType !== "NONE" && authType !== "OIDC";
    const ipRangesVisible = headerFieldsVisible && !isEmpty(authHeader);
    // `config-fields-service.js:2102`.
    const oidcVisible = authType === "OIDC";
    // `config-fields-service.js:2118-2166`: the explicit endpoint fields hide
    // once an issuer URI is set, because discovery makes them redundant.
    const explicitOidcEndpointsVisible = isEmpty(oidcIssuerUri);
    // `config-fields-service.js:2234`, `:2299`.
    const restrictionsAndUsersVisible = authType !== "NONE";

    return (
        <Box data-testid="config-auth">
            <ConfigFieldset label="Main">
                <SelectSetting
                    {...indexedSetting("auth.authType")}
                    options={AUTH_TYPE_OPTIONS}
                    tooltip={AUTH_TYPE_TOOLTIP}
                />
                {headerFieldsVisible ? (
                    <TextSetting
                        {...indexedSetting("auth.authHeader")}
                        advanced
                    />
                ) : null}
                {ipRangesVisible ? (
                    <ChipsSetting
                        {...indexedSetting("auth.authHeaderIpRanges")}
                        advanced
                    />
                ) : null}
                {headerFieldsVisible ? (
                    <SwitchSetting {...indexedSetting("auth.rememberUsers")} />
                ) : null}
                {headerFieldsVisible ? (
                    <NumberSetting
                        {...indexedSetting("auth.rememberMeValidityDays")}
                        advanced
                        unit="days"
                    />
                ) : null}
            </ConfigFieldset>

            {oidcVisible ? (
                <ConfigFieldset label="OpenID Connect" tooltip={OIDC_TOOLTIP}>
                    <TextSetting {...indexedSetting("auth.oidcIssuerUri")} />
                    {explicitOidcEndpointsVisible ? (
                        <>
                            <TextSetting
                                {...indexedSetting("auth.oidcAuthorizationUri")}
                                advanced
                            />
                            <TextSetting
                                {...indexedSetting("auth.oidcTokenUri")}
                                advanced
                            />
                            <TextSetting
                                {...indexedSetting("auth.oidcUserInfoUri")}
                                advanced
                            />
                            <TextSetting
                                {...indexedSetting("auth.oidcJwkSetUri")}
                                advanced
                            />
                        </>
                    ) : null}
                    <TextSetting
                        {...indexedSetting("auth.oidcClientId")}
                        required
                    />
                    <SecretInput
                        {...indexedSetting("auth.oidcClientSecret")}
                        required
                    />
                    <TextSetting
                        {...indexedSetting("auth.oidcUsernameClaim")}
                        required
                    />
                    <ChipsSetting {...indexedSetting("auth.oidcScopes")} />
                    <TextSetting
                        {...indexedSetting("auth.oidcRedirectUri")}
                        advanced
                        required
                    />
                </ConfigFieldset>
            ) : null}

            {restrictionsAndUsersVisible ? (
                <ConfigFieldset
                    label="Restrictions"
                    tooltip={RESTRICTIONS_TOOLTIP}
                >
                    <SwitchSetting {...indexedSetting("auth.restrictSearch")} />
                    <SwitchSetting {...indexedSetting("auth.restrictStats")} />
                    <SwitchSetting {...indexedSetting("auth.restrictAdmin")} />
                    <SwitchSetting
                        {...indexedSetting("auth.restrictDetailsDl")}
                    />
                    <SwitchSetting
                        {...indexedSetting("auth.restrictIndexerSelection")}
                    />
                    <SwitchSetting {...indexedSetting("auth.allowApiStats")} />
                </ConfigFieldset>
            ) : null}

            {restrictionsAndUsersVisible ? (
                <ConfigFieldset label="Users">
                    <AuthUsersSection />
                </ConfigFieldset>
            ) : null}
        </Box>
    );
}

function isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === "";
}
