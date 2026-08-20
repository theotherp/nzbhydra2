import type {SettingOption} from "../components";
import {patternValidator, type SettingValidator} from "../components";

/**
 * `F-CONFIG-MAIN`'s option lists and field validators, transcribed from
 * `config-fields-service.js:50-735`. They live beside the tab rather than in
 * `C-CONFIG-FIELDS` because they are this tab's vocabulary, not the shared
 * one.
 */

export const PROXY_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "None", value: "NONE"},
    {label: "SOCKS", value: "SOCKS"},
    {label: "HTTP(S)", value: "HTTP"},
];

export const THEME_OPTIONS: readonly SettingOption[] = [
    {label: "Auto", value: "auto"},
    {label: "Grey", value: "grey"},
    {label: "Bright", value: "bright"},
    {label: "Dark", value: "dark"},
    {label: "Dark (Dyschromatopsia)", value: "dark-dyschromatopsia"},
];

export const LOG_LEVEL_OPTIONS: readonly SettingOption[] = [
    {label: "Error", value: "ERROR"},
    {label: "Warning", value: "WARN"},
    {label: "Info", value: "INFO"},
    {label: "Debug", value: "DEBUG"},
];

export const HISTORY_USER_INFO_OPTIONS: readonly SettingOption[] = [
    {label: "IP and username", value: "BOTH"},
    {label: "IP address", value: "IP"},
    {label: "Username", value: "USERNAME"},
    {label: "None", value: "NONE"},
];

export const LOG_MARKER_OPTIONS: readonly SettingOption[] = [
    {label: "API limits", value: "LIMITS"},
    {label: "Category mapping", value: "CATEGORY_MAPPING"},
    {label: "Config file handling", value: "CONFIG_READ_WRITE"},
    {label: "Custom mapping", value: "CUSTOM_MAPPING"},
    {label: "Downloader status updating", value: "DOWNLOADER_STATUS_UPDATE"},
    {label: "Duplicate detection", value: "DUPLICATES"},
    {label: "External tool configuration", value: "EXTERNAL_TOOLS"},
    {label: "History cleanup", value: "HISTORY_CLEANUP"},
    {label: "HTTP", value: "HTTP"},
    {label: "HTTPS", value: "HTTPS"},
    {label: "HTTP Server", value: "SERVER"},
    {label: "Indexer scheduler", value: "SCHEDULER"},
    {label: "Notifications", value: "NOTIFICATIONS"},
    {label: "NZB download status updating", value: "DOWNLOAD_STATUS_UPDATE"},
    {label: "Performance", value: "PERFORMANCE"},
    {label: "Rejected results", value: "RESULT_ACCEPTOR"},
    {label: "Removed trailing words", value: "TRAILING"},
    {label: "URL calculation", value: "URL_CALCULATION"},
    {label: "User agent mapping", value: "USER_AGENT"},
    {label: "VIP expiry", value: "VIP_EXPIRY"},
];

const IPV6 =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
const IPV4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

/** Legacy's `ipValidator`; an empty host is left to the `required` rule. */
export const ipValidator: SettingValidator = (value) => {
    if (value === null || value === undefined || value === "") {
        return true;
    }
    const text = String(value);
    return IPV6.test(text) || IPV4.test(text)
        ? true
        : `${text} is not a valid IP Address`;
};

export const portValidator = patternValidator(
    /^\d{1,5}$/,
    (value) => `${value} is no valid port`,
);

/**
 * Legacy's URL-base pattern. Legacy additionally passes `preventEmpty`, which
 * makes an *empty* URL base invalid and so blocks saving the Main tab on every
 * installation that does not set one — while `MainConfig.urlBase` defaults to
 * `null` and `getUrlBase()` deliberately maps empty to absent
 * (`MainConfig.java:34`, `:133`). That flag is treated as the bug it is: an
 * empty URL base is accepted here, a non-empty one must still start and not
 * end with `/`.
 */
export const urlBaseValidator = patternValidator(
    /^((\/.*[^/])|\/)$/,
    () => "URL base has to start and may not end with /",
);

export const apiKeyValidator = patternValidator(
    /^[a-zA-Z0-9]*$/,
    () => "API key must only contain numbers and digits",
);

export const timeOfDayValidator = patternValidator(
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    (value) => `${value} is not a valid time (use HH:mm format)`,
);

const WIKI = "https://github.com/theotherp/nzbhydra2/wiki";

export const REVERSE_PROXY_WIKI = `${WIKI}/Exposing-Hydra-to-the-internet-and-using-reverse-proxies`;
export const SSL_WIKI = `${WIKI}/SSL`;
export const SSL_VERIFICATION_WIKI = `${WIKI}/SSL-verification-errors`;
export const MEMORY_WIKI = `${WIKI}/Memory-requirements`;
export const CSRF_WIKI =
    "https://en.wikipedia.org/wiki/Cross-site_request_forgery";
export const H2_RETENTION_TIME =
    "https://www.h2database.com/html/commands.html#set_retention_time";
export const H2_WRITE_DELAY =
    "https://www.h2database.com/html/commands.html#set_write_delay";
