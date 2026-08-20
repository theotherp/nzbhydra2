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
                    label="Auth type"
                    name="auth.authType"
                    options={AUTH_TYPE_OPTIONS}
                    tooltip={AUTH_TYPE_TOOLTIP}
                />
                {headerFieldsVisible ? (
                    <TextSetting
                        advanced
                        help="Name of header that provides the username in requests from secure sources."
                        label="Auth header"
                        name="auth.authHeader"
                    />
                ) : null}
                {ipRangesVisible ? (
                    <ChipsSetting
                        advanced
                        help='IP ranges from which the auth header will be accepted. Apply with return key. Use IPv4 or IPv6 ranges like "192.168.0.1-192.168.0.100", CIDRs like 192.168.0.0/24 or single IP addresses like "127.0.0.1".'
                        label="Secure IP ranges"
                        name="auth.authHeaderIpRanges"
                    />
                ) : null}
                {headerFieldsVisible ? (
                    <SwitchSetting
                        help="Remember users with cookie for 14 days."
                        label="Remember users"
                        name="auth.rememberUsers"
                    />
                ) : null}
                {headerFieldsVisible ? (
                    <NumberSetting
                        advanced
                        help="How long users are remembered."
                        label="Cookie expiry"
                        name="auth.rememberMeValidityDays"
                        unit="days"
                    />
                ) : null}
            </ConfigFieldset>

            {oidcVisible ? (
                <ConfigFieldset label="OpenID Connect" tooltip={OIDC_TOOLTIP}>
                    <TextSetting
                        help="OIDC issuer URI used for provider discovery, for example https://idp.example.com/realms/master. Requires restart."
                        label="Issuer URI"
                        name="auth.oidcIssuerUri"
                    />
                    {explicitOidcEndpointsVisible ? (
                        <>
                            <TextSetting
                                advanced
                                help="Manual provider authorization endpoint. Required only when issuer URI is empty. Requires restart."
                                label="Authorization URI"
                                name="auth.oidcAuthorizationUri"
                            />
                            <TextSetting
                                advanced
                                help="Manual provider token endpoint. Required only when issuer URI is empty. Requires restart."
                                label="Token URI"
                                name="auth.oidcTokenUri"
                            />
                            <TextSetting
                                advanced
                                help="Manual provider user info endpoint. Required only when issuer URI is empty. Requires restart."
                                label="User info URI"
                                name="auth.oidcUserInfoUri"
                            />
                            <TextSetting
                                advanced
                                help="Manual provider JWK set endpoint. Required only when issuer URI is empty. Requires restart."
                                label="JWK set URI"
                                name="auth.oidcJwkSetUri"
                            />
                        </>
                    ) : null}
                    <TextSetting
                        help="OIDC client ID. Requires restart."
                        label="Client ID"
                        name="auth.oidcClientId"
                        required
                    />
                    <SecretInput
                        help="OIDC client secret. Requires restart."
                        label="Client secret"
                        name="auth.oidcClientSecret"
                        required
                    />
                    <TextSetting
                        help="Claim used to match OIDC users to Hydra users, for example preferred_username, email or sub. Requires restart."
                        label="Username claim"
                        name="auth.oidcUsernameClaim"
                        required
                    />
                    <ChipsSetting
                        help="OIDC scopes. Must include openid. Apply with return key. Requires restart."
                        label="Scopes"
                        name="auth.oidcScopes"
                    />
                    <TextSetting
                        advanced
                        help="Redirect URI template. Register the resolved URL at the provider. The default is {baseUrl}/login/oauth2/code/{registrationId}. Requires restart."
                        label="Redirect URI"
                        name="auth.oidcRedirectUri"
                        required
                    />
                </ConfigFieldset>
            ) : null}

            {restrictionsAndUsersVisible ? (
                <ConfigFieldset
                    label="Restrictions"
                    tooltip={RESTRICTIONS_TOOLTIP}
                >
                    <SwitchSetting
                        help="Restrict access to searching."
                        label="Restrict searching"
                        name="auth.restrictSearch"
                    />
                    <SwitchSetting
                        help="Restrict access to stats."
                        label="Restrict stats"
                        name="auth.restrictStats"
                    />
                    <SwitchSetting
                        help="Restrict access to admin functions."
                        label="Restrict admin"
                        name="auth.restrictAdmin"
                    />
                    <SwitchSetting
                        help="Restrict NZB details, comments and download links."
                        label="Restrict NZB details & DL"
                        name="auth.restrictDetailsDl"
                    />
                    <SwitchSetting
                        help="Restrict visibility of indexer selection box in search. Affects only GUI."
                        label="Restrict indexer selection box"
                        name="auth.restrictIndexerSelection"
                    />
                    <SwitchSetting
                        help="Allow access to stats via external API."
                        label="Allow stats access"
                        name="auth.allowApiStats"
                    />
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
