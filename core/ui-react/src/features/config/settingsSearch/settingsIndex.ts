import {settingRowTestId, settingTestId} from "../components/settings";
import {CONFIG_TABS, configTabHref, type ConfigTab} from "../configTabs";

/**
 * `C-CONFIG-SETTINGS-INDEX`: searchable metadata for every setting the eight
 * configuration tabs render *directly*.
 *
 * The tabs define their fields as JSX, not as data (ADR-0002: "a small typed
 * field vocabulary, not a generic schema framework"), so there is nothing to
 * read the labels and help text off at runtime. This module is therefore
 * hand-maintained, and its only defence against rotting is
 * `settingsIndexDrift.test.tsx`, which renders every tab and compares the
 * rendered `config-setting-*` test ids against this array in both directions.
 * A future task that adds a setting without indexing it fails that test by
 * name rather than silently missing from search.
 *
 * Out of its vocabulary, deliberately: dialog-internal fields (the indexer,
 * downloader, external-tool and custom-mapping editors) and the per-entry
 * fields of a list section. A list section contributes exactly one navigable
 * entry, pointing at the list itself.
 */

/** The kind of thing an entry points at. */
type SettingsIndexKind =
    /** One setting row rendered by a tab, anchored on its `config-setting-*` id. */
    | "row"
    /**
     * A whole list of entries edited as its own section (indexers, users,
     * downloaders, …). It has no single row to scroll to, so it carries its
     * own anchor and is exempt from the drift test's row-by-row direction.
     */
    | "section";

export type SettingsIndexEntry = {
    /**
     * Effective advanced flag: the row's own `advanced` prop *or* its
     * fieldset's, since `ConfigFieldset` hides a whole advanced group. This is
     * what decides whether a hit has to be revealed before it can be scrolled
     * to, and it is deliberately the same reading `MainConfigTab.test.tsx`
     * already uses for its inventory.
     */
    advanced: boolean;
    /** The `data-testid` a hit scrolls to and highlights. */
    anchorTestId: string;
    /**
     * The row renders only while another field holds a particular value
     * (legacy's `hideExpression`, now plain conditional rendering driven by
     * `useWatch`). Such a row cannot be asserted present over a single fixture
     * config, so the drift test excludes it from its index-to-DOM direction.
     */
    conditional: boolean;
    /** Enclosing `ConfigFieldset` label, or `null` for a tab-level row. */
    fieldset: string | null;
    /** The row's help text as plain prose, with any link text inlined. */
    helpText: string;
    kind: SettingsIndexKind;
    label: string;
    /** React Hook Form path, e.g. `main.logging.logGc`. */
    path: string;
    /** The owning tab's URL segment (`configTabs.ts`). */
    tab: string;
};

type EntryInput = {
    advanced?: boolean;
    conditional?: boolean;
    fieldset?: string | null;
    help?: string;
    label: string;
    path: string;
};

/**
 * The per-tab collector. Tab and fieldset are ambient while a tab's rows are
 * being listed, so a row is written as the four things that actually differ
 * between rows and cannot drift away from its group by being edited in the
 * wrong place.
 */
function tabEntries(
    tab: string,
    build: (add: {
        fieldset: (
            label: string | null,
            options: {advanced?: boolean},
            rows: readonly EntryInput[],
        ) => void;
        section: (entry: EntryInput & {anchorTestId: string}) => void;
    }) => void,
): SettingsIndexEntry[] {
    const entries: SettingsIndexEntry[] = [];
    build({
        fieldset: (fieldsetLabel, options, rows) => {
            for (const row of rows) {
                entries.push({
                    advanced:
                        options.advanced === true || row.advanced === true,
                    anchorTestId: settingRowTestId(row.path),
                    conditional: row.conditional === true,
                    fieldset: fieldsetLabel,
                    helpText: row.help ?? "",
                    kind: "row",
                    label: row.label,
                    path: row.path,
                    tab,
                });
            }
        },
        section: (entry) => {
            entries.push({
                advanced: entry.advanced === true,
                anchorTestId: entry.anchorTestId,
                conditional: entry.conditional === true,
                fieldset: entry.fieldset ?? null,
                helpText: entry.help ?? "",
                kind: "section",
                label: entry.label,
                path: entry.path,
                tab,
            });
        },
    });
    return entries;
}

/** The anchor of a list section rendered through `RepeatSection`. */
function repeatAnchor(path: string): string {
    return `config-repeat-${settingTestId(path)}`;
}

// ---------------------------------------------------------------------------
// Main -- `MainConfigTab.tsx`
// ---------------------------------------------------------------------------

const MAIN_ENTRIES = tabEntries("main", ({fieldset}) => {
    fieldset("Hosting", {}, [
        {
            help: "I strongly recommend using a reverse proxy instead of exposing this directly. Requires restart.",
            label: "Host",
            path: "main.host",
        },
        {help: "Requires restart.", label: "Port", path: "main.port"},
        {
            advanced: true,
            help: "Adapt when using a reverse proxy. See wiki. Always use when calling Hydra, even locally.",
            label: "URL base",
            path: "main.urlBase",
        },
        {
            advanced: true,
            help: "Requires restart.",
            label: "Use SSL",
            path: "main.ssl",
        },
        {
            conditional: true,
            help: "Requires restart. See wiki.",
            label: "SSL keystore file",
            path: "main.sslKeyStore",
        },
        {
            conditional: true,
            help: "Requires restart.",
            label: "SSL keystore password",
            path: "main.sslKeyStorePassword",
        },
    ]);
    fieldset("Proxy", {advanced: true}, [
        {label: "Use proxy", path: "main.proxyType"},
        {
            conditional: true,
            help: "IPv4 only",
            label: "SOCKS proxy host",
            path: "main.proxyHost",
        },
        {conditional: true, label: "Proxy port", path: "main.proxyPort"},
        {
            conditional: true,
            label: "Proxy username",
            path: "main.proxyUsername",
        },
        {
            conditional: true,
            label: "Proxy password",
            path: "main.proxyPassword",
        },
        {
            conditional: true,
            label: "Bypass local network addresses",
            path: "main.proxyIgnoreLocal",
        },
        {
            conditional: true,
            help: "Separate by comma. You can use wildcards (*). Case insensitive. Apply values with enter key.",
            label: "Bypass domains",
            path: "main.proxyIgnoreDomains",
        },
    ]);
    fieldset("UI", {}, [
        {label: "Theme", path: "main.theme"},
        {
            advanced: true,
            help: "Show indexer selection on the search page as a checkbox list with a separate action menu instead of a multiselect dropdown.",
            label: "Indexer checkbox list",
            path: "main.indexerSelectionAsCheckboxes",
        },
    ]);
    fieldset("Security", {}, [
        {help: "Alphanumeric only.", label: "API key", path: "main.apiKey"},
        {
            advanced: true,
            help: "Redirect external links to hide your instance. Insert $s for escaped target URL and $us for unescaped target URL. Use empty value to disable.",
            label: "Dereferer",
            path: "main.dereferer",
        },
        {
            advanced: true,
            help: "If enabled only valid/known SSL certificates will be accepted when accessing indexers. Change requires restart. See wiki.",
            label: "Verify SSL certificates",
            path: "main.verifySsl",
        },
        {
            advanced: true,
            help: "Add hosts for which to disable SSL verification. Apply words with return key.",
            label: "Disable SSL for...",
            path: "main.verifySslDisabledFor",
        },
        {
            advanced: true,
            help: "Disable SSL for local hosts.",
            label: "Disable SSL locally",
            path: "main.disableSslLocally",
        },
        {
            advanced: true,
            help: 'Add a host if you get an "unrecognized_name" error. Apply words with return key. See wiki.',
            label: "Disable SNI",
            path: "main.sniDisabledFor",
        },
        {
            advanced: true,
            help: "Use CSRF protection.",
            label: "Use CSRF protection",
            path: "main.useCsrf",
        },
    ]);
    fieldset("Logging", {advanced: true}, [
        {
            help: "Takes effect on next restart.",
            label: "Logfile level",
            path: "main.logging.logfilelevel",
        },
        {
            help: "How many daily log files will be kept.",
            label: "Max log history",
            path: "main.logging.logMaxHistory",
        },
        {
            help: "Takes effect on next restart.",
            label: "Console log level",
            path: "main.logging.consolelevel",
        },
        {
            help: "Enable garbage collection logging. Only for debugging of memory issues.",
            label: "Log GC",
            path: "main.logging.logGc",
        },
        {label: "Log IP addresses", path: "main.logging.logIpAddresses"},
        {
            conditional: true,
            help: "Try to map logged IP addresses to host names.",
            label: "Map hosts",
            path: "main.logging.mapIpToHost",
        },
        {label: "Log user names", path: "main.logging.logUsername"},
        {
            conditional: true,
            help: "Select certain sections for more output on debug level. Please enable only when asked for.",
            label: "Log markers",
            path: "main.logging.markersToLog",
        },
        {
            help: "Only affects if value is displayed in the search/download history.",
            label: "History user info",
            path: "main.logging.historyUserInfoType",
        },
    ]);
    fieldset("Backup", {advanced: true}, [
        {
            help: "Either relative to the NZBHydra data folder or an absolute folder.",
            label: "Backup folder",
            path: "main.backupFolder",
        },
        {label: "Backup every...", path: "main.backupEveryXDays"},
        {label: "Backup before update", path: "main.backupBeforeUpdate"},
    ]);
    fieldset("Updates", {}, [
        {
            label: "Install updates automatically",
            path: "main.updateAutomatically",
        },
        {
            advanced: true,
            label: "Install prereleases",
            path: "main.updateToPrereleases",
        },
        {
            advanced: true,
            label: "Delete backups after...",
            path: "main.deleteBackupsAfterWeeks",
        },
        {
            advanced: true,
            help: "If enabled a banner will be shown when new versions are available even when NZBHydra is run inside docker or is installed using a package manager (where you wouldn't let NZBHydra update itself).",
            label: "Show update banner when managed externally",
            path: "main.showUpdateBannerOnDocker",
        },
        {
            advanced: true,
            help: "Please keep it enabled, I put some effort into the changelog ;-)",
            label: "Show info banner after automatic updates",
            path: "main.showWhatsNewBanner",
        },
    ]);
    fieldset("History", {advanced: true}, [
        {
            help: "Controls search and download history.",
            label: "Keep history",
            path: "main.keepHistory",
        },
        {
            conditional: true,
            help: "Only keep history (searches, downloads) for a certain time. Will decrease database size and may improve performance a bit. Rather reduce how long stats are kept.",
            label: "Keep history for...",
            path: "main.keepHistoryForWeeks",
        },
        {
            conditional: true,
            help: "Only keep stats for a certain time. Will decrease database size.",
            label: "Keep stats for...",
            path: "main.keepStatsForWeeks",
        },
    ]);
    fieldset("Database", {advanced: true}, [
        {
            help: "The time the database is given to compact (reduce size) when shutting down. Reduce this if shutting down NZBHydra takes too long (database size may increase). Takes effect on next restart.",
            label: "Database compact time",
            path: "main.databaseCompactTime",
        },
        {
            help: "How long the db should retain old, persisted data. See here.",
            label: "Database retention time",
            path: "main.databaseRetentionTime",
        },
        {
            help: "Maximum delay between a commit and flushing the log, in milliseconds. See here.",
            label: "Database write delay",
            path: "main.databaseWriteDelay",
        },
    ]);
    fieldset("Other", {}, [
        {label: "Open browser on startup", path: "main.startupBrowser"},
        {
            advanced: true,
            help: "Hydra will occasionally show news when opened. You can always find them in the system section",
            label: "Show news",
            path: "main.showNews",
        },
        {
            advanced: true,
            help: "Hide the guided tour button and prevent starting the tour.",
            label: "Disable guided tour",
            path: "main.disableTour",
        },
        {
            help: "Download images from indexers and info providers (e.g. TMBD) and serve them via NZBHydra. Will only affect searches via UI, not API searches.",
            label: "Proxy images",
            path: "main.proxyImages",
        },
        {
            advanced: true,
            help: "Check if NZBHydra is reachable from the internet and not protected",
            label: "Check for open port",
            path: "main.checkOpenPort",
        },
        {
            advanced: true,
            help: "256 should suffice except when working with big databases / many indexers. See wiki.",
            label: "JVM memory",
            path: "main.xmx",
        },
        {
            advanced: true,
            help: 'Additional JVM options to pass to the main process. Separate multiple options with spaces. Example: "-Djava.net.preferIPv6Addresses=true -Dother.property=value"',
            label: "Custom VM options",
            path: "main.customVmOptions",
        },
        {
            advanced: true,
            help: "Time of day when NZBHydra should automatically restart. Leave empty to disable. May help with keeping database size low(er).",
            label: "Scheduled restart time",
            path: "main.scheduledRestartTime",
        },
    ]);
});

// ---------------------------------------------------------------------------
// Authorization -- `AuthConfigTab.tsx`
// ---------------------------------------------------------------------------

const AUTH_ENTRIES = tabEntries("auth", ({fieldset, section}) => {
    fieldset("Main", {}, [
        {label: "Auth type", path: "auth.authType"},
        {
            advanced: true,
            conditional: true,
            help: "Name of header that provides the username in requests from secure sources.",
            label: "Auth header",
            path: "auth.authHeader",
        },
        {
            advanced: true,
            conditional: true,
            help: 'IP ranges from which the auth header will be accepted. Apply with return key. Use IPv4 or IPv6 ranges like "192.168.0.1-192.168.0.100", CIDRs like 192.168.0.0/24 or single IP addresses like "127.0.0.1".',
            label: "Secure IP ranges",
            path: "auth.authHeaderIpRanges",
        },
        {
            conditional: true,
            help: "Remember users with cookie for 14 days.",
            label: "Remember users",
            path: "auth.rememberUsers",
        },
        {
            advanced: true,
            conditional: true,
            help: "How long users are remembered.",
            label: "Cookie expiry",
            path: "auth.rememberMeValidityDays",
        },
    ]);
    // The whole fieldset renders only for `authType === "OIDC"`, so every row
    // in it is conditional regardless of its own gate.
    fieldset("OpenID Connect", {}, [
        {
            conditional: true,
            help: "OIDC issuer URI used for provider discovery, for example https://idp.example.com/realms/master. Requires restart.",
            label: "Issuer URI",
            path: "auth.oidcIssuerUri",
        },
        {
            advanced: true,
            conditional: true,
            help: "Manual provider authorization endpoint. Required only when issuer URI is empty. Requires restart.",
            label: "Authorization URI",
            path: "auth.oidcAuthorizationUri",
        },
        {
            advanced: true,
            conditional: true,
            help: "Manual provider token endpoint. Required only when issuer URI is empty. Requires restart.",
            label: "Token URI",
            path: "auth.oidcTokenUri",
        },
        {
            advanced: true,
            conditional: true,
            help: "Manual provider user info endpoint. Required only when issuer URI is empty. Requires restart.",
            label: "User info URI",
            path: "auth.oidcUserInfoUri",
        },
        {
            advanced: true,
            conditional: true,
            help: "Manual provider JWK set endpoint. Required only when issuer URI is empty. Requires restart.",
            label: "JWK set URI",
            path: "auth.oidcJwkSetUri",
        },
        {
            conditional: true,
            help: "OIDC client ID. Requires restart.",
            label: "Client ID",
            path: "auth.oidcClientId",
        },
        {
            conditional: true,
            help: "OIDC client secret. Requires restart.",
            label: "Client secret",
            path: "auth.oidcClientSecret",
        },
        {
            conditional: true,
            help: "Claim used to match OIDC users to Hydra users, for example preferred_username, email or sub. Requires restart.",
            label: "Username claim",
            path: "auth.oidcUsernameClaim",
        },
        {
            conditional: true,
            help: "OIDC scopes. Must include openid. Apply with return key. Requires restart.",
            label: "Scopes",
            path: "auth.oidcScopes",
        },
        {
            advanced: true,
            conditional: true,
            help: "Redirect URI template. Register the resolved URL at the provider. The default is {baseUrl}/login/oauth2/code/{registrationId}. Requires restart.",
            label: "Redirect URI",
            path: "auth.oidcRedirectUri",
        },
    ]);
    // Rendered only while `authType !== "NONE"`.
    fieldset("Restrictions", {}, [
        {
            conditional: true,
            help: "Restrict access to searching.",
            label: "Restrict searching",
            path: "auth.restrictSearch",
        },
        {
            conditional: true,
            help: "Restrict access to stats.",
            label: "Restrict stats",
            path: "auth.restrictStats",
        },
        {
            conditional: true,
            help: "Restrict access to admin functions.",
            label: "Restrict admin",
            path: "auth.restrictAdmin",
        },
        {
            conditional: true,
            help: "Restrict NZB details, comments and download links.",
            label: "Restrict NZB details & DL",
            path: "auth.restrictDetailsDl",
        },
        {
            conditional: true,
            help: "Restrict visibility of indexer selection box in search. Affects only GUI.",
            label: "Restrict indexer selection box",
            path: "auth.restrictIndexerSelection",
        },
        {
            conditional: true,
            help: "Allow access to stats via external API.",
            label: "Allow stats access",
            path: "auth.allowApiStats",
        },
    ]);
    section({
        anchorTestId: repeatAnchor("auth.users"),
        conditional: true,
        fieldset: "Users",
        help: "Add, edit and remove the users who may log in, and what each of them may see.",
        label: "Users",
        path: "auth.users",
    });
});

// ---------------------------------------------------------------------------
// Searching -- `SearchingConfigTab.tsx`
// ---------------------------------------------------------------------------

const SEARCHING_ENTRIES = tabEntries("searching", ({fieldset, section}) => {
    fieldset("Indexer access", {advanced: true}, [
        {
            help: "Any web call to an indexer taking longer than this is aborted.",
            label: "Timeout when accessing indexers",
            path: "searching.timeout",
        },
        {
            help: "Used when accessing indexers.",
            label: "User agent",
            path: "searching.userAgent",
        },
        {
            help: "Used to map the user agent from accessing services to the service names. Apply words with return key.",
            label: "Map user agents",
            path: "searching.userAgents",
        },
        {
            help: "When enabled load limiting defined for indexers will be ignored for internal searches.",
            label: "Ignore load limiting internally",
            path: "searching.ignoreLoadLimitingForInternalSearches",
        },
        {
            help: "When enabled load limiting defined for indexers will be ignored for API searches that have identifiers or a query.",
            label: "Ignore load limiting for concrete API searches",
            path: "searching.ignoreLoadLimitingForConcreteApiSearches",
        },
        {
            label: "Ignore temporary errors",
            path: "searching.ignoreTemporarilyDisabled",
        },
    ]);
    fieldset("Category handling", {advanced: true}, [
        {
            help: "Map newznab categories from API searches to configured categories and use all configured newznab categories in searches.",
            label: "Transform newznab categories",
            path: "searching.transformNewznabCategories",
        },
        {
            help: "If disabled no categories will be included in queries to torznab indexers (trackers).",
            label: "Send categories to trackers",
            path: "searching.sendTorznabCategories",
        },
    ]);
    fieldset("Media IDs / Query generation / Query processing", {}, [
        {
            advanced: true,
            help: "When enabled media ID conversions will always be done even when an indexer supports the already known ID(s).",
            label: "Convert media IDs for...",
            path: "searching.alwaysConvertIds",
        },
        {
            help: "Generate queries for indexers which do not support ID based searches.",
            label: "Generate queries",
            path: "searching.generateQueries",
        },
        {
            help: "When no results were found for a query ID search again using a generated query (on indexer level).",
            label: "Fallback to generated queries",
            path: "searching.idFallbackToQueryGeneration",
        },
        {
            help: "Used for movie query generation and autocomplete only.",
            label: "Language",
            path: "searching.language",
        },
        {
            help: "Replace diacritics (e.g. è) and german umlauts and special characters (ä, ö, ü and ß) in external request queries.",
            label: "Replace umlauts and diacritics",
            path: "searching.replaceUmlauts",
        },
    ]);
    fieldset("Result filters", {}, [
        {
            help: "For which type of search word/regex filters will be applied",
            label: "Apply word filters",
            path: "searching.applyRestrictions",
        },
        {
            conditional: true,
            help: "Results with any of these words in the title will be ignored. Title is converted to lowercase before. Apply words with return key.",
            label: "Forbidden words",
            path: "searching.forbiddenWords",
        },
        {
            advanced: true,
            conditional: true,
            help: "Must not be present in a title (case is ignored).",
            label: "Forbidden regex",
            path: "searching.forbiddenRegex",
        },
        {
            conditional: true,
            help: "Only results with titles that contain *all* words will be used. Title is converted to lowercase before. Apply words with return key.",
            label: "Required words",
            path: "searching.requiredWords",
        },
        {
            advanced: true,
            conditional: true,
            help: "Must be present in a title (case is ignored).",
            label: "Required regex",
            path: "searching.requiredRegex",
        },
        {
            advanced: true,
            conditional: true,
            help: "Posts from any groups containing any of these words will be ignored. Apply words with return key.",
            label: "Forbidden groups",
            path: "searching.forbiddenGroups",
        },
        {
            // Legacy has no `hideExpression` on the posters list even though
            // the groups list above it has one, so this row is unconditional.
            advanced: true,
            help: "Posts from any posters containing any of these words will be ignored. Apply words with return key.",
            label: "Forbidden posters",
            path: "searching.forbiddenPosters",
        },
        {
            help: "If an indexer returns the language in the results only those results with configured languages will be used. Apply words with return key.",
            label: "Languages to keep",
            path: "searching.languagesToKeep",
        },
        {
            help: "Results older than this are ignored. Can be overwritten per search. Apply words with return key.",
            label: "Maximum results age",
            path: "searching.maxAge",
        },
        {
            help: "Torznab results with fewer seeders will be ignored.",
            label: "Minimum # seeders",
            path: "searching.minSeeders",
        },
        {
            help: "Not all indexers provide this information",
            label: "Ignore passworded releases",
            path: "searching.ignorePassworded",
        },
    ]);
    fieldset("Result processing", {}, [
        {
            advanced: true,
            help: "When enabled accessing tools will think the search was completed successfully but without results.",
            label: "Wrap API errors in empty results page",
            path: "searching.wrapApiErrors",
        },
        {
            help: 'Removed from title if it ends with either of these. Case insensitive and disregards leading/trailing spaces. Allows wildcards ("*"). Apply words with return key.',
            label: "Remove trailing...",
            path: "searching.removeTrailing",
        },
        {
            advanced: true,
            help: "Enable to use the category descriptions provided by the indexer.",
            label: "Use original categories",
            path: "searching.useOriginalCategories",
        },
    ]);
    section({
        // `CustomMappingsSection` renders its own heading rather than a
        // `ConfigFieldset`, so it has no fieldset label and nothing can gate it
        // behind an advanced expander.
        anchorTestId: repeatAnchor("searching.customMappings"),
        help: "Rewrite result titles before they are processed, matching on a regex and building a new title from its groups.",
        label: "Custom mappings",
        path: "searching.customMappings",
    });
    fieldset("Result display", {}, [
        {
            advanced: true,
            help: "Load all results already retrieved from indexers. Might make sorting / filtering a bit slower. Will still be paged according to the limit set above.",
            label: "Display all retrieved results",
            path: "searching.loadAllCachedOnInternal",
        },
        {
            advanced: true,
            help: "Determines the number of results shown on one page. This might also cause more API hits because indexers are queried until the number of results is matched or all indexers are exhausted. Limit is 500.",
            label: "Display...",
            path: "searching.loadLimitInternal",
        },
        {
            help: "Determines width of covers in search results (when enabled in display options).",
            label: "Cover width",
            path: "searching.coverSize",
        },
        {
            help: "Analyze movie release titles and show a quality score (1-10) with details on hover.",
            label: "Show movie quality indicator",
            path: "searching.showMovieQualityIndicator",
        },
    ]);
    fieldset("Quick filters", {}, [
        {
            help: "Show quick filter buttons for movie and TV results.",
            label: "Show quick filters",
            path: "searching.showQuickFilterButtons",
        },
        {
            advanced: true,
            conditional: true,
            help: "Show all quick filter buttons for all types of searches.",
            label: "Always show quick filters",
            path: "searching.alwaysShowQuickFilterButtons",
        },
        {
            advanced: true,
            conditional: true,
            help: "Enter in the format DisplayName=Required1,Required2. Prefix words with ! to exclude them. Surround with / to mark as a regex. Apply values with enter key.",
            label: "Custom quick filters",
            path: "searching.customQuickFilterButtons",
        },
        {
            advanced: true,
            conditional: true,
            help: "Choose which quickfilters will be selected by default.",
            label: "Preselect quickfilters",
            path: "searching.preselectQuickFilterButtons",
        },
    ]);
    fieldset("Duplicate detection", {advanced: true}, [
        {
            label: "Duplicate size threshold",
            path: "searching.duplicateSizeThresholdInPercent",
        },
        {
            label: "Duplicate age threshold",
            path: "searching.duplicateAgeThreshold",
        },
    ]);
    fieldset("Other", {advanced: true}, [
        {
            label: "Store results for ...",
            path: "searching.keepSearchResultsForDays",
        },
        {
            label: "recent searches in search bar",
            path: "searching.historyForSearching",
        },
        {
            help: "When set search results will be cached for this time. Any search with the same parameters will return the cached results. API cache time parameters will be preferred. See wiki.",
            label: "Results cache time",
            path: "searching.globalCacheTimeMinutes",
        },
    ]);
});

// ---------------------------------------------------------------------------
// Categories -- `CategoriesConfigTab.tsx`
// ---------------------------------------------------------------------------

const CATEGORIES_ENTRIES = tabEntries("categories", ({fieldset, section}) => {
    // The three catalogue-wide settings are rendered straight into the tab,
    // outside any `ConfigFieldset` -- hence a `null` fieldset, which also means
    // nothing could reveal them if they were advanced (they are not).
    fieldset(null, {}, [
        {
            help: "Preset min and max sizes depending on the selected category",
            label: "Category sizes",
            path: "categoriesConfig.enableCategorySizes",
        },
        {
            help: "Set a default category.",
            label: "Default category",
            path: "categoriesConfig.defaultCategory",
        },
        {
            help: "Use search category for items with N/A category",
            label: "Overwrite N/A with search category",
            path: "categoriesConfig.overwriteNaWithSearchCategory",
        },
    ]);
    section({
        advanced: true,
        anchorTestId: repeatAnchor("categoriesConfig.categories"),
        fieldset: "Categories",
        help: "The configured categories, their newznab category IDs, size limits and per-category word filters.",
        label: "Categories",
        path: "categoriesConfig.categories",
    });
});

// ---------------------------------------------------------------------------
// Downloading -- `DownloadingConfigTab.tsx`
// ---------------------------------------------------------------------------

const DOWNLOADING_ENTRIES = tabEntries("downloading", ({fieldset, section}) => {
    fieldset("General", {}, [
        {
            help: "Allow torrents to be saved in this folder from the search results. Ignored if not set.",
            label: "Torrent black hole",
            path: "downloading.saveTorrentsTo",
        },
        {
            help: "Allow NZBs to be saved in this folder from the search results. Ignored if not set.",
            label: "NZB black hole",
            path: "downloading.saveNzbsTo",
        },
        {
            advanced: true,
            help: "How access to NZBs is provided when NZBs are downloaded (by the user or external tools). Proxying is recommended as it allows fallback for failed downloads (see below)..",
            label: "NZB access type",
            path: "downloading.nzbAccessType",
        },
        {
            advanced: true,
            conditional: true,
            help: "Used for links when sending links to the downloader and as link target for the downloader icon in the footer (when set).",
            label: "External URL",
            path: "downloading.externalUrl",
        },
        {
            conditional: true,
            help: "Fallback to similar results when a download fails. Only available when proxying NZBs (see above).",
            label: "Fallback for failed downloads",
            path: "downloading.fallbackForFailed",
        },
        {
            help: "Enable to send magnet links to the associated program on the server machine. Won't work with docker",
            label: "Send magnet links",
            path: "downloading.sendMagnetLinks",
        },
        {
            advanced: true,
            help: "Query your downloader for status updates of downloads",
            label: "Update statuses",
            path: "downloading.updateStatuses",
        },
        {
            advanced: true,
            help: "Show footer with downloader status",
            label: "Show downloader footer",
            path: "downloading.showDownloaderStatus",
        },
        {
            conditional: true,
            help: "This downloader's state will be shown in the footer.",
            label: "Primary downloader",
            path: "downloading.primaryDownloader",
        },
    ]);
    section({
        anchorTestId: repeatAnchor("downloading.downloaders"),
        fieldset: "Downloaders",
        help: "The configured downloaders NZBs and torrents can be sent to.",
        label: "Downloaders",
        path: "downloading.downloaders",
    });
});

// ---------------------------------------------------------------------------
// External Tools -- `ExternalToolsConfigTab.tsx`
// ---------------------------------------------------------------------------

const EXTERNAL_TOOLS_ENTRIES = tabEntries(
    "externalTools",
    ({fieldset, section}) => {
        fieldset("External Tool Sync Settings", {}, [
            {
                help: "Automatically sync indexers to external tools when configuration is saved",
                label: "Sync on config change",
                path: "externalTools.syncOnConfigChange",
            },
        ]);
        section({
            anchorTestId: repeatAnchor("externalTools.externalTools"),
            fieldset: "External tools",
            help: "The Sonarr, Radarr and Lidarr instances Hydra can add itself to as an indexer.",
            label: "External tools",
            path: "externalTools.externalTools",
        });
    },
);

// ---------------------------------------------------------------------------
// Indexers -- `IndexersConfigTab.tsx`
// ---------------------------------------------------------------------------

const INDEXERS_ENTRIES = tabEntries("indexers", ({section}) => {
    // The tab renders no setting row of its own: everything is the list and
    // the dialog behind it, and dialog-internal fields are out of scope.
    section({
        anchorTestId: "config-fieldset-indexers",
        fieldset: "Indexers",
        help: "The configured indexers, their capabilities, priorities and per-indexer settings.",
        label: "Indexers",
        path: "indexers",
    });
});

// ---------------------------------------------------------------------------
// Notifications -- `NotificationsConfigTab.tsx`
// ---------------------------------------------------------------------------

const NOTIFICATIONS_ENTRIES = tabEntries(
    "notifications",
    ({fieldset, section}) => {
        fieldset("Main", {}, [
            {label: "Apprise type", path: "notificationConfig.appriseType"},
            {
                conditional: true,
                help: "URL of Apprise API to send notifications to.",
                label: "Apprise API URL",
                path: "notificationConfig.appriseApiUrl",
            },
            {
                conditional: true,
                help: "Full path of of Apprise runnable to execute.",
                label: "Apprise runnable",
                path: "notificationConfig.appriseCliPath",
            },
            {
                help: "If enabled notifications will be shown on the GUI.",
                label: "Display notifications",
                path: "notificationConfig.displayNotifications",
            },
            {
                conditional: true,
                help: "Max number of notifications to show on the GUI. If more have piled up a notification will indicate this and link to the notification history.",
                label: "Show max notifications",
                path: "notificationConfig.displayNotificationsMax",
            },
            {
                help: "Show a warning with search results when an indexer has this many API hits or fewer remaining.",
                label: "Warn when API hits left",
                path: "notificationConfig.indexerHitLimitWarningThreshold",
            },
            {
                help: "Show a warning with search results when an indexer has this many downloads or fewer remaining.",
                label: "Warn when downloads left",
                path: "notificationConfig.indexerDownloadLimitWarningThreshold",
            },
            {
                conditional: true,
                help: 'Apply values with return key. Surround with "/" for regex (e.g. /contains[0-9]This/). Case insensitive.',
                label: "Hide if message contains...",
                path: "notificationConfig.filterOuts",
            },
        ]);
        section({
            anchorTestId: repeatAnchor("notificationConfig.entries"),
            fieldset: "Notifications",
            help: "The configured notifications: which event each one reacts to and the message it sends.",
            label: "Notifications",
            path: "notificationConfig.entries",
        });
    },
);

/**
 * The whole index, in tab order and, within a tab, in the order the tab
 * renders its rows. `Autocomplete`'s `groupBy` requires options pre-sorted by
 * group, and this order is also what the drift test compares against.
 */
export const SETTINGS_INDEX: readonly SettingsIndexEntry[] = [
    ...MAIN_ENTRIES,
    ...AUTH_ENTRIES,
    ...SEARCHING_ENTRIES,
    ...CATEGORIES_ENTRIES,
    ...DOWNLOADING_ENTRIES,
    ...EXTERNAL_TOOLS_ENTRIES,
    ...INDEXERS_ENTRIES,
    ...NOTIFICATIONS_ENTRIES,
];

/** The entries belonging to one tab, by URL segment. */
export function settingsIndexForTab(
    tab: string,
): readonly SettingsIndexEntry[] {
    return SETTINGS_INDEX.filter((entry) => entry.tab === tab);
}

/** The tab record an entry belongs to. */
export function settingsIndexTab(entry: SettingsIndexEntry): ConfigTab {
    const tab = CONFIG_TABS.find((candidate) => candidate.path === entry.tab);
    if (tab === undefined) {
        throw new Error(`Unknown config tab in settings index: ${entry.tab}`);
    }
    return tab;
}

/** The route a hit navigates to. */
export function settingsIndexHref(entry: SettingsIndexEntry): string {
    return configTabHref(settingsIndexTab(entry));
}

/** The option's `data-testid` in the search listbox. */
export function settingsSearchOptionTestId(entry: SettingsIndexEntry): string {
    return `config-search-option-${settingTestId(entry.path)}`;
}
