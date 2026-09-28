/**
 * The bootstrap's API base, read the same way for every transport this feature
 * builds. Exported since FM-082, which needs one shared transport for the
 * rows' `API-SEARCH-NFO` requests rather than one per row.
 */
export function bootstrapBase(): string {
    const value = window.__NZBHYDRA_BOOTSTRAP__;
    return typeof value === "object" &&
        value !== null &&
        "baseUrl" in value &&
        typeof value.baseUrl === "string"
        ? value.baseUrl
        : "/";
}
