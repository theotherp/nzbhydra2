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
import {
    apiKeyValidator,
    CSRF_WIKI,
    H2_RETENTION_TIME,
    H2_WRITE_DELAY,
    HISTORY_USER_INFO_OPTIONS,
    ipValidator,
    LOG_LEVEL_OPTIONS,
    LOG_MARKER_OPTIONS,
    MEMORY_WIKI,
    portValidator,
    PROXY_TYPE_OPTIONS,
    REVERSE_PROXY_WIKI,
    SSL_VERIFICATION_WIKI,
    SSL_WIKI,
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
                    help={[
                        "I strongly recommend ",
                        {
                            href: REVERSE_PROXY_WIKI,
                            text: "using a reverse proxy",
                        },
                        " instead of exposing this directly. Requires restart.",
                    ]}
                    label="Host"
                    name="main.host"
                    placeholder="IPv4 address to bind to"
                    required
                    validate={ipValidator}
                />
                <NumberSetting
                    help="Requires restart."
                    label="Port"
                    name="main.port"
                    placeholder="5076"
                    required
                    validate={portValidator}
                />
                <TextSetting
                    advanced
                    help={[
                        "Adapt when using a reverse proxy. See ",
                        {href: REVERSE_PROXY_WIKI, text: "wiki"},
                        ". Always use when calling Hydra, even locally.",
                    ]}
                    label="URL base"
                    name="main.urlBase"
                    placeholder="/nzbhydra"
                    tooltip='If you use Hydra behind a reverse proxy you might want to set the URL base to a value like "/nzbhydra". If you accesses Hydra with tools running outside your network (for example from your phone) set the external URL so that it matches the full Hydra URL. That way the NZB links returned in the search results refer to your global URL and not your local address.'
                    validate={urlBaseValidator}
                />
                <SwitchSetting
                    advanced
                    help="Requires restart."
                    label="Use SSL"
                    name="main.ssl"
                    tooltip="You can use SSL but I recommend using a reverse proxy with SSL. See the wiki for notes regarding reverse proxies and SSL. It's more secure and can be configured better."
                />
                {ssl ? (
                    <>
                        <FileBrowserSetting
                            help={[
                                "Requires restart. See ",
                                {href: SSL_WIKI, text: "wiki"},
                                ".",
                            ]}
                            label="SSL keystore file"
                            mode="file"
                            name="main.sslKeyStore"
                            required
                            transport={transport}
                        />
                        <SecretInput
                            help="Requires restart."
                            label="SSL keystore password"
                            name="main.sslKeyStorePassword"
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
                    label="Use proxy"
                    name="main.proxyType"
                    options={PROXY_TYPE_OPTIONS}
                />
                {proxyEnabled ? (
                    <>
                        <TextSetting
                            help="IPv4 only"
                            label="SOCKS proxy host"
                            name="main.proxyHost"
                            placeholder="Set to use a SOCKS proxy"
                        />
                        <NumberSetting
                            label="Proxy port"
                            name="main.proxyPort"
                            placeholder="1080"
                        />
                        <SecretInput
                            label="Proxy username"
                            name="main.proxyUsername"
                        />
                        <SecretInput
                            label="Proxy password"
                            name="main.proxyPassword"
                        />
                        <SwitchSetting
                            label="Bypass local network addresses"
                            name="main.proxyIgnoreLocal"
                        />
                        <ChipsSetting
                            help="Separate by comma. You can use wildcards (*). Case insensitive. Apply values with enter key."
                            label="Bypass domains"
                            name="main.proxyIgnoreDomains"
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
                    advanced
                    help="Show indexer selection on the search page as a checkbox list with a separate action menu instead of a multiselect dropdown."
                    label="Indexer checkbox list"
                    name="main.indexerSelectionAsCheckboxes"
                />
            </ConfigFieldset>

            <ConfigFieldset label="Security">
                <ApiKeySetting
                    help="Alphanumeric only."
                    label="API key"
                    name="main.apiKey"
                    required
                    validate={apiKeyValidator}
                />
                <TextSetting
                    advanced
                    help="Redirect external links to hide your instance. Insert $s for escaped target URL and $us for unescaped target URL. Use empty value to disable."
                    label="Dereferer"
                    name="main.dereferer"
                />
                <SwitchSetting
                    advanced
                    help={[
                        "If enabled only valid/known SSL certificates will be accepted when accessing indexers. Change requires restart. See ",
                        {href: SSL_VERIFICATION_WIKI, text: "wiki"},
                        ".",
                    ]}
                    label="Verify SSL certificates"
                    name="main.verifySsl"
                />
                <ChipsSetting
                    advanced
                    help="Add hosts for which to disable SSL verification. Apply words with return key."
                    label="Disable SSL for..."
                    name="main.verifySslDisabledFor"
                />
                <SwitchSetting
                    advanced
                    help="Disable SSL for local hosts."
                    label="Disable SSL locally"
                    name="main.disableSslLocally"
                />
                <ChipsSetting
                    advanced
                    help={[
                        'Add a host if you get an "unrecognized_name" error. Apply words with return key. See ',
                        {href: SSL_VERIFICATION_WIKI, text: "wiki"},
                        ".",
                    ]}
                    label="Disable SNI"
                    name="main.sniDisabledFor"
                />
                <SwitchSetting
                    advanced
                    help={[
                        "Use ",
                        {href: CSRF_WIKI, text: "CSRF protection"},
                        ".",
                    ]}
                    label="Use CSRF protection"
                    name="main.useCsrf"
                />
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
                    help="Takes effect on next restart."
                    label="Logfile level"
                    name="main.logging.logfilelevel"
                    options={LOG_LEVEL_OPTIONS}
                />
                <NumberSetting
                    help="How many daily log files will be kept."
                    label="Max log history"
                    name="main.logging.logMaxHistory"
                />
                <SelectSetting
                    help="Takes effect on next restart."
                    label="Console log level"
                    name="main.logging.consolelevel"
                    options={LOG_LEVEL_OPTIONS}
                />
                <SwitchSetting
                    help="Enable garbage collection logging. Only for debugging of memory issues."
                    label="Log GC"
                    name="main.logging.logGc"
                />
                <SwitchSetting
                    label="Log IP addresses"
                    name="main.logging.logIpAddresses"
                />
                {logIpAddresses ? (
                    <SwitchSetting
                        help="Try to map logged IP addresses to host names."
                        label="Map hosts"
                        name="main.logging.mapIpToHost"
                        tooltip="Enabling this may cause NZBHydra to load very, very slowly when accessed remotely."
                    />
                ) : null}
                <SwitchSetting
                    label="Log user names"
                    name="main.logging.logUsername"
                />
                {debugLogging ? (
                    <MultiSelectSetting
                        help="Select certain sections for more output on debug level. Please enable only when asked for."
                        label="Log markers"
                        name="main.logging.markersToLog"
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
                    help="Only affects if value is displayed in the search/download history."
                    label="History user info"
                    name="main.logging.historyUserInfoType"
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
                    help="Either relative to the NZBHydra data folder or an absolute folder."
                    label="Backup folder"
                    mode="folder"
                    name="main.backupFolder"
                    transport={transport}
                />
                <NumberSetting
                    label="Backup every..."
                    name="main.backupEveryXDays"
                    unit="days"
                />
                <SwitchSetting
                    label="Backup before update"
                    name="main.backupBeforeUpdate"
                />
            </ConfigFieldset>

            <ConfigFieldset label="Updates">
                <SwitchSetting
                    label="Install updates automatically"
                    name="main.updateAutomatically"
                />
                <SwitchSetting
                    advanced
                    label="Install prereleases"
                    name="main.updateToPrereleases"
                />
                <NumberSetting
                    advanced
                    label="Delete backups after..."
                    name="main.deleteBackupsAfterWeeks"
                    unit="weeks"
                />
                <SwitchSetting
                    advanced
                    help="If enabled a banner will be shown when new versions are available even when NZBHydra is run inside docker or is installed using a package manager (where you wouldn't let NZBHydra update itself)."
                    label="Show update banner when managed externally"
                    name="main.showUpdateBannerOnDocker"
                />
                <SwitchSetting
                    advanced
                    help="Please keep it enabled, I put some effort into the changelog ;-)"
                    label="Show info banner after automatic updates"
                    name="main.showWhatsNewBanner"
                />
            </ConfigFieldset>

            <ConfigFieldset advanced label="History">
                <SwitchSetting
                    help="Controls search and download history."
                    label="Keep history"
                    name="main.keepHistory"
                    tooltip="If disabled no search or download history will be kept. These sections will be hidden in the GUI. You won't be able to see stats. The database will still contain a short-lived history of transactions that are kept for 24 hours."
                />
                {keepHistory ? (
                    <>
                        <NumberSetting
                            help="Only keep history (searches, downloads) for a certain time. Will decrease database size and may improve performance a bit. Rather reduce how long stats are kept."
                            label="Keep history for..."
                            minimum={1}
                            name="main.keepHistoryForWeeks"
                            unit="weeks"
                        />
                        <NumberSetting
                            help="Only keep stats for a certain time. Will decrease database size."
                            label="Keep stats for..."
                            minimum={1}
                            name="main.keepStatsForWeeks"
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
                    help="The time the database is given to compact (reduce size) when shutting down. Reduce this if shutting down NZBHydra takes too long (database size may increase). Takes effect on next restart."
                    label="Database compact time"
                    minimum={200}
                    name="main.databaseCompactTime"
                    unit="ms"
                />
                <NumberSetting
                    help={[
                        "How long the db should retain old, persisted data. See ",
                        {href: H2_RETENTION_TIME, text: "here"},
                        ".",
                    ]}
                    label="Database retention time"
                    name="main.databaseRetentionTime"
                    unit="ms"
                />
                <NumberSetting
                    help={[
                        "Maximum delay between a commit and flushing the log, in milliseconds. See ",
                        {href: H2_WRITE_DELAY, text: "here"},
                        ".",
                    ]}
                    label="Database write delay"
                    name="main.databaseWriteDelay"
                    unit="ms"
                />
            </ConfigFieldset>

            <ConfigFieldset label="Other">
                <SwitchSetting
                    label="Open browser on startup"
                    name="main.startupBrowser"
                />
                <SwitchSetting
                    advanced
                    help="Hydra will occasionally show news when opened. You can always find them in the system section"
                    label="Show news"
                    name="main.showNews"
                />
                <SwitchSetting
                    advanced
                    help="Hide the guided tour button and prevent starting the tour."
                    label="Disable guided tour"
                    name="main.disableTour"
                />
                <SwitchSetting
                    help="Download images from indexers and info providers (e.g. TMBD) and serve them via NZBHydra. Will only affect searches via UI, not API searches."
                    label="Proxy images"
                    name="main.proxyImages"
                />
                <SwitchSetting
                    advanced
                    help="Check if NZBHydra is reachable from the internet and not protected"
                    label="Check for open port"
                    name="main.checkOpenPort"
                />
                <NumberSetting
                    advanced
                    help={[
                        "256 should suffice except when working with big databases / many indexers. See ",
                        {href: MEMORY_WIKI, text: "wiki"},
                        ".",
                    ]}
                    label="JVM memory"
                    minimum={128}
                    name="main.xmx"
                    unit="MB"
                />
                <TextSetting
                    advanced
                    help='Additional JVM options to pass to the main process. Separate multiple options with spaces. Example: "-Djava.net.preferIPv6Addresses=true -Dother.property=value"'
                    label="Custom VM options"
                    name="main.customVmOptions"
                />
                <TextSetting
                    advanced
                    help="Time of day when NZBHydra should automatically restart. Leave empty to disable. May help with keeping database size low(er)."
                    label="Scheduled restart time"
                    name="main.scheduledRestartTime"
                    placeholder="HH:mm"
                    validate={timeOfDayValidator}
                />
            </ConfigFieldset>
        </Box>
    );
}
