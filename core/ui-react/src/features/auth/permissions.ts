import type {BootstrapData} from "../../bootstrap";

/**
 * The three protected areas legacy's `loginRequired` knows
 * (`core/ui-src/js/nzbhydra.js`): every `root.*` state resolves one of them
 * before it is entered.
 */
export type ProtectedArea = "admin" | "search" | "stats";

/** The route the login form lives at, relative to the router's base path. */
export const LOGIN_ROUTE = "/login";

/**
 * Legacy's `loginRequired` permission test, verbatim: an area is visible when
 * it is not restricted at all, or when this session carries the matching
 * permission. Note this deliberately does *not* consult `authConfigured` —
 * with authentication switched off the backend reports every area as
 * unrestricted, so the same expression already answers "yes".
 */
function maySeeArea(bootstrap: BootstrapData, area: ProtectedArea): boolean {
    if (area === "search") {
        return !bootstrap.searchRestricted || bootstrap.maySeeSearch === true;
    }
    if (area === "stats") {
        return !bootstrap.statsRestricted || bootstrap.maySeeStats === true;
    }
    return !bootstrap.adminRestricted || bootstrap.maySeeAdmin === true;
}

/**
 * Legacy's `loginRequired` outcome: a session that may not see the area is
 * sent to the login form, but only under FORM authentication — with any other
 * authentication type legacy resolved the state anyway (`allowed ||
 * userInfos.authType !== "FORM"`) and let the backend's own challenge or
 * rejection happen.
 */
export function redirectsToLogin(
    bootstrap: BootstrapData,
    area: ProtectedArea,
): boolean {
    return bootstrap.authType === "FORM" && !maySeeArea(bootstrap, area);
}
