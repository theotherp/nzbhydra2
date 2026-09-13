import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import {IconButton, Tooltip} from "@mui/material";
import {useLocation, useNavigate} from "@tanstack/react-router";
import {useState} from "react";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {useToasts} from "../../components/toasts/toasts";
import {navigateToApplication} from "./navigation";
import {LOGIN_ROUTE} from "./permissions";
import {
    askForPassword,
    logout,
    previousUsername,
    rememberPreviousUsername,
} from "./session";

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

/** Whether `pathname` is this application's own login route. */
function isLoginRoute(baseUrl: string, pathname: string): boolean {
    const basePath = new URL(baseUrl, window.location.origin).pathname;
    const relative = pathname.startsWith(basePath)
        ? pathname.slice(basePath.length)
        : pathname.replace(/^\//, "");
    return relative.replace(/\/$/, "") === LOGIN_ROUTE.slice(1);
}

type LoginOutButtonProps = {
    bootstrap: BootstrapData;
    transport: ApiTransport;
    /** Test seam for the full document navigation jsdom cannot perform. */
    navigate?: (baseUrl: string, path?: string) => void;
};

export function LoginOutButton({
    bootstrap,
    transport,
    navigate = navigateToApplication,
}: LoginOutButtonProps) {
    const toasts = useToasts();
    const routerNavigate = useNavigate();
    const pathname = useLocation({select: (location) => location.pathname});
    const [busy, setBusy] = useState(false);
    const affordance = loginoutAffordance(
        bootstrap,
        isLoginRoute(bootstrap.baseUrl, pathname),
    );

    if (affordance === null) {
        return null;
    }

    const activate = async () => {
        setBusy(true);
        try {
            if (affordance.loggedIn) {
                const session = await logout(transport);
                rememberPreviousUsername(bootstrap.username);
                // Legacy's post-logout branch: back to the search area, or to
                // the login form when the anonymous session may not search.
                navigate(
                    bootstrap.baseUrl,
                    session.maySeeSearch === true ? "" : "login",
                );
                return;
            }
            if (bootstrap.authType === "BASIC") {
                await askForPassword(transport, previousUsername());
                rememberPreviousUsername(null);
                navigate(bootstrap.baseUrl);
                return;
            }
            if (bootstrap.authType === "FORM") {
                await routerNavigate({to: LOGIN_ROUTE});
                return;
            }
            toasts.showToast({
                message: "You shouldn't need to login but here you go!",
                severity: "info",
            });
        } catch {
            // Legacy left these two requests to the global HTTP error growl;
            // the React app has no such interceptor, so the failure is
            // reported here instead of vanishing.
            toasts.showToast({
                message: affordance.loggedIn
                    ? "Logout failed!"
                    : "Login failed!",
                severity: "error",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Tooltip title={affordance.label}>
            {/*
             * The `<span>` is MUI's own documented pattern, not an ADR-0014
             * design literal: a disabled button fires no events, so the
             * tooltip needs a non-disabled element to listen on. Without it
             * the label vanishes exactly while the request is in flight.
             */}
            <span>
                <IconButton
                    aria-label={affordance.label}
                    color="inherit"
                    data-testid="shell-loginout"
                    disabled={busy}
                    onClick={() => void activate()}
                >
                    <PowerSettingsNewIcon />
                </IconButton>
            </span>
        </Tooltip>
    );
}
