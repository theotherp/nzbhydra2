// =============================================================================
// CONFIG TYPES - Extracted from Java BaseConfig and related classes
// =============================================================================

// Enums
export enum ProxyType {
    NONE = "NONE",
    SOCKS = "SOCKS",
    HTTP = "HTTP"
}

export enum HistoryUserInfoType {
    BOTH = "BOTH",
    IP = "IP",
    USERNAME = "USERNAME",
    NONE = "NONE"
}

export enum AuthType {
    NONE = "NONE",
    FORM = "FORM",
    BASIC = "BASIC"
}

export enum BackendType {
    NZEDB = "NZEDB",
    NNTMUX = "NNTMUX",
    NEWZNAB = "NEWZNAB"
}

export enum SearchModuleType {
    ANIZB = "ANIZB",
    BINSEARCH = "BINSEARCH",
    NEWZNAB = "NEWZNAB",
    WTFNZB = "WTFNZB",
    NZBINDEX = "NZBINDEX",
    NZBINDEX_API = "NZBINDEX_API",
    NZBINDEX_BETA = "NZBINDEX_BETA",
    NZBKING = "NZBKING",
    TORZNAB = "TORZNAB",
    DEVONLY = "DEVONLY",
    JACKETT_CONFIG = "JACKETT_CONFIG",
    TORBOX = "TORBOX"
}

export enum DownloadType {
    NZB = "NZB",
    TORRENT = "TORRENT",
    TORBOX = "TORBOX"
}

export enum DownloaderType {
    SABNZBD = "SABNZBD",
    NZBGET = "NZBGET",
    TORBOX = "TORBOX"
}

export enum NzbAddingType {
    UPLOAD = "UPLOAD",
    SEND_LINK = "SEND_LINK"
}

export enum FileDownloadAccessType {
    REDIRECT = "REDIRECT",
    PROXY = "PROXY"
}

export enum MediaIdType {
    TVDB = "TVDB",
    TVRAGE = "TVRAGE",
    TVMAZE = "TVMAZE",
    TRAKT = "TRAKT",
    IMDB = "IMDB",
    TVIMDB = "TVIMDB",
    TMDB = "TMDB",
    TVTITLE = "TVTITLE",
    MOVIETITLE = "MOVIETITLE"
}

export enum OutputType {
    XML = "XML",
    JSON = "JSON"
}

export enum SearchSourceRestriction {
    NONE = "NONE",
    INTERNAL = "INTERNAL",
    API = "API",
    BOTH = "BOTH"
}

export enum SearchType {
    SEARCH = "SEARCH",
    TVSEARCH = "TVSEARCH",
    MOVIE = "MOVIE",
    MUSIC = "MUSIC",
    BOOK = "BOOK"
}

export enum CategorySubtype {
    NONE = "NONE",
    ALL = "ALL",
    ANIME = "ANIME",
    AUDIOBOOK = "AUDIOBOOK",
    COMIC = "COMIC",
    EBOOK = "EBOOK",
    MAGAZINE = "MAGAZINE"
}

export enum NotificationEventType {
    VIP_RENEWAL_REQUIRED = "VIP_RENEWAL_REQUIRED",
    INDEXER_DISABLED = "INDEXER_DISABLED",
    INDEXER_REENABLED = "INDEXER_REENABLED",
    UPDATE_INSTALLED = "UPDATE_INSTALLED",
    AUTH_FAILURE = "AUTH_FAILURE",
    RESULT_DOWNLOAD = "RESULT_DOWNLOAD",
    RESULT_DOWNLOAD_COMPLETION = "RESULT_DOWNLOAD_COMPLETION"
}

export enum NotificationMessageType {
    INFO = "INFO",
    SUCCESS = "SUCCESS",
    WARNING = "WARNING",
    FAILURE = "FAILURE"
}

export enum AppriseType {
    NONE = "NONE",
    API = "API",
    CLI = "CLI"
}

export enum QueryFormat {
    TITLE = "TITLE",
    QUERY = "QUERY"
}

// =============================================================================
// LOGGING CONFIG
// =============================================================================

export interface LoggingConfig {
    consolelevel: string;
    historyUserInfoType: HistoryUserInfoType;
    logIpAddresses: boolean;
    mapIpToHost: boolean;
    logGc: boolean;
    logMaxHistory: number;
    logfilelevel: string;
    logUsername: boolean;
    markersToLog: string[];
}

// =============================================================================
// MAIN CONFIG
// =============================================================================

export interface MainConfig {
    // Config version
    configVersion: number;

    // Hosting settings
    host: string;
    port: number;
    urlBase?: string;

    // Proxy settings
    proxyType: ProxyType;
    proxyHost?: string;
    proxyPort: number;
    proxyIgnoreLocal: boolean;
    proxyIgnoreDomains: string[];
    proxyUsername?: string;
    proxyPassword?: string;
    proxyImages: boolean;

    // Database settings
    backupFolder?: string;
    backupEveryXDays?: number;
    backupBeforeUpdate: boolean;
    deleteBackupsAfterWeeks?: number;

    // History settings
    keepHistory: boolean;
    keepStatsForWeeks?: number;
    keepHistoryForWeeks?: number;

    // SSL settings
    ssl: boolean;
    sslKeyStore?: string;
    sslKeyStorePassword?: string;

    // Security settings
    verifySsl: boolean;
    disableSslLocally: boolean;
    sniDisabledFor: string[];
    verifySslDisabledFor: string[];

    // Update settings
    updateAutomatically: boolean;
    updateToPrereleases: boolean;
    updateCheckEnabled: boolean;
    showUpdateBannerOnDocker: boolean;
    showWhatsNewBanner: boolean;

    // Startup / GUI settings
    showNews: boolean;
    startupBrowser: boolean;
    checkOpenPort: boolean;
    welcomeShown: boolean;
    theme?: string;

    // Database settings
    databaseCompactTime: number;
    databaseRetentionTime: number;
    databaseWriteDelay: number;

    // Other settings
    apiKey?: string;
    dereferer?: string;
    instanceCounterDownloaded: boolean;
    repositoryBase?: string;
    shutdownForRestart: boolean;
    useCsrf: boolean;
    xmx?: number;

    // Logging
    logging: LoggingConfig;
}

// =============================================================================
// AUTH CONFIG
// =============================================================================

export interface UserAuthConfig {
    username: string;
    password?: string;
    maySeeAdmin: boolean;
    maySeeDetailsDl: boolean;
    maySeeStats: boolean;
    showIndexerSelection: boolean;
}

export interface AuthConfig {
    authType: AuthType;
    rememberUsers: boolean;
    rememberMeValidityDays: number;
    authHeader?: string;
    authHeaderIpRanges: string[];
    restrictAdmin: boolean;
    restrictDetailsDl: boolean;
    restrictIndexerSelection: boolean;
    restrictSearch: boolean;
    restrictStats: boolean;
    allowApiStats: boolean;
    users: UserAuthConfig[];
}

// =============================================================================
// CATEGORIES CONFIG
// =============================================================================

export interface Category {
    name: string;
    mayBeSelected: boolean;
    searchType?: SearchType;
    newznabCategories: number[][];
    ignoreResultsFrom: SearchSourceRestriction;
    applyRestrictionsType: SearchSourceRestriction;
    forbiddenRegex?: string;
    forbiddenWords: string[];
    requiredRegex?: string;
    requiredWords: string[];
    maxSizePreset?: number;
    minSizePreset?: number;
    applySizeLimitsToApi: boolean;
    description?: string;
    preselect: boolean;
    subtype: CategorySubtype;
}

export interface CategoriesConfig {
    enableCategorySizes: boolean;
    categories: Category[];
    defaultCategory: string;
}

// =============================================================================
// SEARCHING CONFIG
// =============================================================================

export enum CustomMappingSearchType {
    BOOK = "BOOK",
    MOVIE = "MOVIE",
    MUSIC = "MUSIC",
    SEARCH = "SEARCH",
    TVSEARCH = "TVSEARCH"
}

export enum CustomMappingAffectedValue {
    TITLE = "TITLE",
    QUERY = "QUERY",
    RESULT_TITLE = "RESULT_TITLE"
}

export interface CustomQueryAndTitleMapping {
    searchType: CustomMappingSearchType;
    affectedValue: CustomMappingAffectedValue;
    matchAll: boolean;
    from: string;
    to: string;
}

export interface SearchingConfig {
    applyRestrictions: SearchSourceRestriction;
    coverSize: number;
    customMappings: CustomQueryAndTitleMapping[];
    globalCacheTimeMinutes?: number;
    duplicateAgeThreshold: number;
    duplicateSizeThresholdInPercent: number;
    forbiddenGroups: string[];
    forbiddenPosters: string[];
    forbiddenRegex?: string;
    forbiddenWords: string[];
    alwaysConvertIds: SearchSourceRestriction;
    generateQueries: SearchSourceRestriction;
    generateQueriesFormat: QueryFormat;
    historyForSearching: number;
    idFallbackToQueryGeneration: SearchSourceRestriction;
    ignorePassworded: boolean;
    ignoreTemporarilyDisabled: boolean;
    ignoreLoadLimitingForInternalSearches: boolean;
    keepSearchResultsForDays: number;
    language: string;
    languagesToKeep: string[];
    loadAllCachedOnInternal: boolean;
    loadLimitInternal: number;
    maxAge?: number;
    minSeeders?: number;
    removeTrailing: string[];
    replaceUmlauts: boolean;
    requiredRegex?: string;
    requiredWords: string[];
    sendTorznabCategories: boolean;
    showQuickFilterButtons: boolean;
    alwaysShowQuickFilterButtons: boolean;
    customQuickFilterButtons: string[];
    preselectQuickFilterButtons: string[];
    timeout?: number;
    transformNewznabCategories: boolean;
    userAgent: string;
    userAgents: string[];
    useOriginalCategories: boolean;
    wrapApiErrors: boolean;
}

// =============================================================================
// DOWNLOADING CONFIG
// =============================================================================

export interface DownloaderConfig {
    name: string;
    downloaderType: DownloaderType;
    enabled: boolean;
    host: string;
    port: number;
    username?: string;
    password?: string;
    ssl: boolean;
    sslVerification: boolean;
    apiKey?: string;
    defaultCategory?: string;
    iconCssClass?: string;
    categoriesConfig?: CategoriesConfig;
    indexers?: any[];
    nzbAddingType: NzbAddingType;
    fileDownloadAccessType: FileDownloadAccessType;
}

export interface DownloadingConfig {
    downloaders: DownloaderConfig[];
    saveTorrentsTo?: string;
    saveNzbsTo?: string;
    sendMagnetLinks: boolean;
    updateStatuses: boolean;
    showDownloaderStatus: boolean;
    nzbAccessType: FileDownloadAccessType;
    fallbackForFailed: SearchSourceRestriction;
    externalUrl?: string;
    primaryDownloader?: string;
}

// =============================================================================
// INDEXER CONFIG
// =============================================================================

export interface IndexerCategoryConfig {
    anime?: number;
    audiobook?: number;
    comic?: number;
    ebook?: number;
    magazine?: number;
    categories: MainCategory[];
}

export interface MainCategory {
    id: number;
    name: string;
    subCategories: SubCategory[];
}

export interface SubCategory {
    id: number;
    name: string;
}

export interface IndexerConfig {
    name: string;
    enabled: boolean;
    host: string;
    port: number;
    ssl: boolean;
    sslVerification: boolean;
    username?: string;
    password?: string;
    apiKey?: string;
    apiPath?: string;
    searchModuleType: SearchModuleType;
    backendType: BackendType;
    categoryConfig: IndexerCategoryConfig;
    timeout: number;
    retries: number;
    downloadType: DownloadType;
    iconCssClass?: string;
    searchEnabled: boolean;
    downloadEnabled: boolean;
    statsRetention: number;
    searchSource: string;
    searchSourceType: string;
}

// =============================================================================
// NOTIFICATION CONFIG
// =============================================================================

export interface NotificationConfigEntry {
    eventType: NotificationEventType;
    appriseUrls?: string;
    titleTemplate?: string;
    bodyTemplate?: string;
    messageType: NotificationMessageType;
}

export interface NotificationConfig {
    appriseType: AppriseType;
    appriseApiUrl?: string;
    appriseCliPath?: string;
    displayNotifications: boolean;
    displayNotificationsMax: number;
    entries: NotificationConfigEntry[];
    filterOuts: string[];
}

// =============================================================================
// EMBY CONFIG
// =============================================================================

export interface EmbyConfig {
    embyBaseUrl?: string;
    embyApiKey?: string;
}

// =============================================================================
// BASE CONFIG
// =============================================================================

export interface BaseConfig {
    main: MainConfig;
    auth: AuthConfig;
    searching: SearchingConfig;
    categoriesConfig: CategoriesConfig;
    downloading: DownloadingConfig;
    indexers: IndexerConfig[];
    notificationConfig: NotificationConfig;
    emby: EmbyConfig;
    genericStorage: Record<string, string>;
}

// =============================================================================
// SAFE CONFIG (for frontend use)
// =============================================================================

export interface SafeConfig {
    categoriesConfig: CategoriesConfig;
    authType: string;
    dereferer: string;
    searching: any;
    downloading: any;
    logging: any;
    notificationConfig: any;
    emby: any;
    showNews: boolean;
    keepHistory: boolean;
    indexers: any[];
}

// =============================================================================
// DOWNLOADER INTERFACES
// =============================================================================

export interface Downloader {
    name: string;
    downloaderType: string;
    enabled: boolean;
    defaultCategory?: string;
    iconCssClass?: string;
}

export interface SearchResultDl {
    searchResultId: string;
    originalCategory: string;
    mappedCategory: string;
}

export interface DownloadRequest {
    downloaderName: string;
    searchResults: SearchResultDl[];
    category: string;
}

export interface DownloadResponse {
    successful: boolean;
    addedIds?: string[];
    message?: string;
}

// =============================================================================
// CONFIG VALIDATION
// =============================================================================

export interface ConfigValidationResult {
    ok: boolean;
    errorMessages: string[];
    warningMessages: string[];
    restartNeeded: boolean;
    newConfig?: BaseConfig;
}

// =============================================================================
// API HELP
// =============================================================================

export interface ApiHelpResponse {
    newznabApi: string;
    torznabApi: string;
    apiKey: string;
} 