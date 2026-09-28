import type {BootstrapData} from "../../bootstrap";

export type LoginoutAffordance = {
    label: string;
    loggedIn: boolean;
};

/**
 * Legacy's `header-controller.js` `update()` truth table for the single
 * login/logout affordance, line by line:
 *
 * - no authentication configured: never shown;
 * - logged in: shown exactly when the backend says `showLogout`, labelled
 *   `Logout {username}`;
 * - anonymous: shown when any of the admin, stats, or search areas is
 *   restricted (there is something to log in *for*) and the login page is not
 *   the current route, labelled `Login`.
 *
 * Legacy additionally suppressed the anonymous affordance for the remainder of
 * the page life after an in-page logout (`event !== "loggedOut"`). FM-078's
 * session transitions always leave the page (see `navigation.ts`), so that
 * branch has no equivalent here: the affordance is recomputed by the server's
 * next bootstrap instead.
 */
export function loginoutAffordance(
    bootstrap: BootstrapData,
    onLoginRoute: boolean,
): LoginoutAffordance | null {
    if (bootstrap.authConfigured !== true) {
        return null;
    }
    if (bootstrap.username !== null) {
        return bootstrap.showLogout === true
            ? {label: `Logout ${bootstrap.username}`, loggedIn: true}
            : null;
    }
    const anythingRestricted =
        bootstrap.adminRestricted === true ||
        bootstrap.statsRestricted === true ||
        bootstrap.searchRestricted === true;
    return anythingRestricted && !onLoginRoute
        ? {label: "Login", loggedIn: false}
        : null;
}
