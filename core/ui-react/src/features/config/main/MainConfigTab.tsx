import {Box} from "@mui/material";
import {useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {
    ApiKeySetting,
    ChipsSetting,
    ConfigFieldset,
    FileBrowserSetting,
    MultiSelectSetting,
    NumberSetting,
    SecretInput,
    SelectSetting,
    SwitchSetting,
    TextSetting,
} from "../components";
import {indexedSetting} from "../settingsSearch/settingsIndex";
import {
    apiKeyValidator,
    HISTORY_USER_INFO_OPTIONS,
    ipValidator,
    LOG_LEVEL_OPTIONS,
    LOG_MARKER_OPTIONS,
    portValidator,
    PROXY_TYPE_OPTIONS,
    timeOfDayValidator,
    urlBaseValidator,
} from "./mainSettings";

/**
 * `F-CONFIG-MAIN`: the Main configuration tab — the 52 fields of
 * `config-fields-service.js:50-735`, in legacy's order and grouping, bound to
 * `C-CONFIG-FORM`'s whole-config form through the `C-CONFIG-FIELDS`
 * vocabulary.
 *
 * Legacy's `hideExpression`s become plain conditional rendering driven by
 * `useWatch`. A hidden field keeps its value: the shell's form is created with
 * `shouldUnregister: false`, so unmounting a row neither clears the value nor
 * lets its validation rules block a save (`validateField` skips unmounted
 * fields). That is what keeps saving a config whose conditions are unmet — SSL
 * off, no proxy — from deleting the settings behind them.
 */
export function MainConfigTab({transport}: {transport: ApiTransport}) {
    const ssl = useWatch<ConfigValues>({name: "main.ssl"}) === true;
    const proxyEnabled =
        useWatch<ConfigValues>({name: "main.proxyType"}) !== "NONE";
    const logIpAddresses =
        useWatch<ConfigValues>({name: "main.logging.logIpAddresses"}) === true;
    const consoleLevel = useWatch<ConfigValues>({
        name: "main.logging.consolelevel",
    });
    const logfileLevel = useWatch<ConfigValues>({
        name: "main.logging.logfilelevel",
    });
    const keepHistory =
        useWatch<ConfigValues>({name: "main.keepHistory"}) === true;
    const debugLogging = consoleLevel === "DEBUG" || logfileLevel === "DEBUG";

    return (
        <Box data-testid="config-main">
            <ConfigFieldset label="Hosting">
                <TextSetting
                    {...indexedSetting("main.host")}
                    placeholder="IPv4 address to bind to"
                    required
                    validate={ipValidator}
                />
                <NumberSetting
                    {...indexedSetting("main.port")}
                    placeholder="5076"
                    required
                    validate={portValidator}
                />
                <TextSetting
                    {...indexedSetting("main.urlBase")}
                    advanced
                    placeholder="/nzbhydra"
                    tooltip='If you use Hydra behind a reverse proxy you might want to set the URL base to a value like "/nzbhydra". If you accesses Hydra with tools running outside your network (for example from your phone) set the external URL so that it matches the full Hydra URL. That way the NZB links returned in the search results refer to your global URL and not your local address.'
                    validate={urlBaseValidator}
                />
                <SwitchSetting
                    {...indexedSetting("main.ssl")}
                    advanced
                    tooltip="You can use SSL but I recommend using a reverse proxy with SSL. See the wiki for notes regarding reverse proxies and SSL. It's more secure and can be configured better."
                />
                {ssl ? (
                    <>
                        <FileBrowserSetting
                            {...indexedSetting("main.sslKeyStore")}
                            mode="file"
                            required
                            transport={transport}
                        />
                        <SecretInput
                            {...indexedSetting("main.sslKeyStorePassword")}
                        />
                    </>
                ) : null}
            </ConfigFieldset>

            <ConfigFieldset
                advanced
                label="Proxy"
                tooltip="You can select to use either a SOCKS or an HTTPS proxy. All outside connections will be done via the configured proxy."
            >
                <SelectSetting
                    {...indexedSetting("main.proxyType")}
                    options={PROXY_TYPE_OPTIONS}
                />
                {proxyEnabled ? (
                    <>
                        <TextSetting
                            {...indexedSetting("main.proxyHost")}
                            placeholder="Set to use a SOCKS proxy"
                        />
                        <NumberSetting
                            {...indexedSetting("main.proxyPort")}
                            placeholder="1080"
                        />
                        <SecretInput
                            {...indexedSetting("main.proxyUsername")}
                        />
                        <SecretInput
                            {...indexedSetting("main.proxyPassword")}
                        />
                        <SwitchSetting
                            {...indexedSetting("main.proxyIgnoreLocal")}
                        />
                        <ChipsSetting
                            {...indexedSetting("main.proxyIgnoreDomains")}
                        />
                    </>
                ) : null}
            </ConfigFieldset>

            {/*
             * FM-155 (ADR-0049): the Theme dropdown is gone from here. The
             * theme is a per-user preference chosen from the nav-bar selector
             * and stored through `C-THEME-PREFERENCE`, not a shared,
             * admin-saved config field -- so an instance-wide `main.theme` in
             * the config UI could only contradict what each user actually
             * sees. The Java field stays, deprecated and unread by this UI.
             */}
            <ConfigFieldset label="UI">
                <SwitchSetting
                    {...indexedSetting("main.indexerSelectionAsCheckboxes")}
                    advanced
                />
            </ConfigFieldset>

            <ConfigFieldset label="Security">
                <ApiKeySetting
                    {...indexedSetting("main.apiKey")}
                    required
                    validate={apiKeyValidator}
                />
                <TextSetting {...indexedSetting("main.dereferer")} advanced />
                <SwitchSetting {...indexedSetting("main.verifySsl")} advanced />
                <ChipsSetting
                    {...indexedSetting("main.verifySslDisabledFor")}
                    advanced
                />
                <SwitchSetting
                    {...indexedSetting("main.disableSslLocally")}
                    advanced
                />
                <ChipsSetting
                    {...indexedSetting("main.sniDisabledFor")}
                    advanced
                />
                <SwitchSetting {...indexedSetting("main.useCsrf")} advanced />
            </ConfigFieldset>

            {/*
             * The Logging fieldset carries `key: 'logging'`
             * (`config-fields-service.js:326`), so all nine of its fields bind
             * under `main.logging.*` (`LoggingConfig.java`) -- including
             * `historyUserInfoType`, which lives here despite its name.
             */}
            <ConfigFieldset
                advanced
                label="Logging"
                tooltip="The base settings should suffice for most users. If you want you can enable logging of IP adresses for failed logins and NZB downloads."
            >
                <SelectSetting
                    {...indexedSetting("main.logging.logfilelevel")}
                    options={LOG_LEVEL_OPTIONS}
                />
                <NumberSetting
                    {...indexedSetting("main.logging.logMaxHistory")}
                />
                <SelectSetting
                    {...indexedSetting("main.logging.consolelevel")}
                    options={LOG_LEVEL_OPTIONS}
                />
                <SwitchSetting {...indexedSetting("main.logging.logGc")} />
                <SwitchSetting
                    {...indexedSetting("main.logging.logIpAddresses")}
                />
                {logIpAddresses ? (
                    <SwitchSetting
                        {...indexedSetting("main.logging.mapIpToHost")}
                        tooltip="Enabling this may cause NZBHydra to load very, very slowly when accessed remotely."
                    />
                ) : null}
                <SwitchSetting
                    {...indexedSetting("main.logging.logUsername")}
                />
                {debugLogging ? (
                    <MultiSelectSetting
                        {...indexedSetting("main.logging.markersToLog")}
                        options={LOG_MARKER_OPTIONS}
                    />
                ) : null}
                {/*
                 * Legacy declares this field's `hideExpression` *inside*
                 * `templateOptions` (`config-fields-service.js:453`), where
                 * Formly never reads it, so the field is always visible in the
                 * legacy UI too. Rendering it unconditionally is the parity
                 * behaviour, not an oversight.
                 */}
                <SelectSetting
                    {...indexedSetting("main.logging.historyUserInfoType")}
                    options={HISTORY_USER_INFO_OPTIONS}
                />
            </ConfigFieldset>

            <ConfigFieldset advanced label="Backup">
                {/*
                 * Legacy renders this as a bare text input, but the value is a
                 * folder on the *server*, which is exactly what
                 * `API-CONFIG-FOLDER-LISTING` exists to browse; the field stays
                 * freely typeable, so a relative path like the default
                 * `backup` can still be entered by hand.
                 */}
                <FileBrowserSetting
                    {...indexedSetting("main.backupFolder")}
                    mode="folder"
                    transport={transport}
                />
                <NumberSetting
                    {...indexedSetting("main.backupEveryXDays")}
                    unit="days"
                />
                <SwitchSetting {...indexedSetting("main.backupBeforeUpdate")} />
            </ConfigFieldset>

            <ConfigFieldset label="Updates">
                <SwitchSetting
                    {...indexedSetting("main.updateAutomatically")}
                />
                <SwitchSetting
                    {...indexedSetting("main.updateToPrereleases")}
                    advanced
                />
                <NumberSetting
                    {...indexedSetting("main.deleteBackupsAfterWeeks")}
                    advanced
                    unit="weeks"
                />
                <SwitchSetting
                    {...indexedSetting("main.showUpdateBannerOnDocker")}
                    advanced
                />
                <SwitchSetting
                    {...indexedSetting("main.showWhatsNewBanner")}
                    advanced
                />
            </ConfigFieldset>

            <ConfigFieldset advanced label="History">
                <SwitchSetting
                    {...indexedSetting("main.keepHistory")}
                    tooltip="If disabled no search or download history will be kept. These sections will be hidden in the GUI. You won't be able to see stats. The database will still contain a short-lived history of transactions that are kept for 24 hours."
                />
                {keepHistory ? (
                    <>
                        <NumberSetting
                            {...indexedSetting("main.keepHistoryForWeeks")}
                            minimum={1}
                            unit="weeks"
                        />
                        <NumberSetting
                            {...indexedSetting("main.keepStatsForWeeks")}
                            minimum={1}
                            unit="weeks"
                        />
                    </>
                ) : null}
            </ConfigFieldset>

            <ConfigFieldset
                advanced
                label="Database"
                tooltip="You should not change these values unless you're either told to or really know what you're doing."
            >
                <NumberSetting
                    {...indexedSetting("main.databaseCompactTime")}
                    minimum={200}
                    unit="ms"
                />
                <NumberSetting
                    {...indexedSetting("main.databaseRetentionTime")}
                    unit="ms"
                />
                <NumberSetting
                    {...indexedSetting("main.databaseWriteDelay")}
                    unit="ms"
                />
            </ConfigFieldset>

            <ConfigFieldset label="Other">
                <SwitchSetting {...indexedSetting("main.startupBrowser")} />
                <SwitchSetting {...indexedSetting("main.showNews")} advanced />
                <SwitchSetting
                    {...indexedSetting("main.disableTour")}
                    advanced
                />
                <SwitchSetting {...indexedSetting("main.proxyImages")} />
                <SwitchSetting
                    {...indexedSetting("main.checkOpenPort")}
                    advanced
                />
                <NumberSetting
                    {...indexedSetting("main.xmx")}
                    advanced
                    minimum={128}
                    unit="MB"
                />
                <TextSetting
                    {...indexedSetting("main.customVmOptions")}
                    advanced
                />
                <TextSetting
                    {...indexedSetting("main.scheduledRestartTime")}
                    advanced
                    placeholder="HH:mm"
                    validate={timeOfDayValidator}
                />
            </ConfigFieldset>
        </Box>
    );
}
